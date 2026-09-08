import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import rateLimit from 'express-rate-limit';

const app = express();
const port = Number(process.env.PORT || 8787);
const maxMb = Math.max(1, Math.min(100, Number(process.env.MAX_FILE_MB || 50)));
const convertApiToken = process.env.CONVERTAPI_TOKEN || '';
const cloudConvertToken = process.env.CLOUDCONVERT_API_KEY || '';
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*').split(',').map(x=>x.trim()).filter(Boolean);

app.disable('x-powered-by');
app.use(cors({origin(origin, cb){
  if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return cb(null,true);
  cb(new Error('Origin not allowed'));
}}));
app.use(rateLimit({windowMs:60_000, limit:30, standardHeaders:'draft-7', legacyHeaders:false}));
app.use(express.json({limit:'64kb'}));

const upload = multer({storage:multer.memoryStorage(), limits:{fileSize:maxMb*1024*1024, files:1}});
const allowed = new Set([
  'docx:pdf','doc:pdf','pdf:docx','xlsx:pdf','xls:pdf','pdf:xlsx',
  'pptx:pdf','ppt:pdf','pdf:pptx','pdf:jpg','pdf:png','html:pdf','txt:pdf'
]);
const pdfOps = new Set(['ocr','compress','extract','split','encrypt','decrypt','pdfa','rotate']);

app.get('/health', (_req,res)=>res.json({
  ok:true, service:'Ethan Office Document Utility Conversion Gateway',
  convertApiConfigured:Boolean(convertApiToken), cloudConvertConfigured:Boolean(cloudConvertToken),
  maxFileMb:maxMb
}));

function safeExt(name=''){return (name.split('.').pop()||'').toLowerCase().replace(/[^a-z0-9]/g,'');}
function cleanPages(v=''){v=String(v).trim();return /^[0-9,\- ]{1,120}$/.test(v)?v.replace(/\s+/g,''):'';}
function cleanPassword(v=''){v=String(v);return v.length>=1&&v.length<=128?v:'';}
async function ccFetch(path, options={}){
  const r=await fetch(`https://api.cloudconvert.com/v2${path}`,{
    ...options,
    headers:{Authorization:`Bearer ${cloudConvertToken}`,'Content-Type':'application/json',...(options.headers||{})}
  });
  const text=await r.text();let data;try{data=JSON.parse(text)}catch{data=null}
  if(!r.ok){const msg=data?.message||data?.error||`CloudConvert returned ${r.status}`;throw new Error(msg)}
  return data;
}
async function createCcJob(processTask){
  const body={tasks:{
    'upload-my-file':{operation:'import/upload'},
    'process-my-file':{...processTask,input:'upload-my-file'},
    'export-my-file':{operation:'export/url',input:'process-my-file'}
  },tag:'ethan-documents'};
  const out=await ccFetch('/jobs',{method:'POST',body:JSON.stringify(body)});
  return out?.data;
}
async function uploadCcFile(job, file){
  const task=(job?.tasks||[]).find(t=>t.name==='upload-my-file');
  const form=task?.result?.form;if(!form?.url||!form?.parameters) throw new Error('Cloud upload form was not returned.');
  const fd=new FormData();
  for(const [k,v] of Object.entries(form.parameters)) fd.append(k,String(v));
  fd.append('file',new Blob([file.buffer],{type:file.mimetype||'application/pdf'}),file.originalname||'document.pdf');
  const r=await fetch(form.url,{method:'POST',body:fd});
  if(!r.ok) throw new Error(`Secure PDF upload failed (${r.status}).`);
}
async function waitCcJob(jobId){
  const deadline=Date.now()+180000;
  while(Date.now()<deadline){
    const out=await ccFetch(`/jobs/${jobId}`,{method:'GET'});const job=out?.data;
    if(job?.status==='finished') return job;
    if(job?.status==='error'){
      const failed=(job.tasks||[]).find(t=>t.status==='error');
      throw new Error(failed?.message||'PDF operation failed.');
    }
    await new Promise(r=>setTimeout(r,1200));
  }
  throw new Error('PDF processing timed out. Try a smaller file or retry later.');
}
function exportFiles(job){
  const task=(job?.tasks||[]).find(t=>t.name==='export-my-file');
  return (task?.result?.files||[]).map(f=>({name:f.filename||'processed.pdf',size:f.size||null,url:f.url||null})).filter(x=>x.url);
}




app.post('/api/convert', upload.single('file'), async (req,res)=>{
  try{
    if(!convertApiToken) return res.status(503).json({error:'Office conversion provider is not configured on this gateway.'});
    if(!req.file) return res.status(400).json({error:'Choose a file to convert.'});
    const from=String(req.body.from||'').toLowerCase().replace(/[^a-z0-9]/g,'');
    const to=String(req.body.to||'').toLowerCase().replace(/[^a-z0-9]/g,'');
    if(!allowed.has(`${from}:${to}`)) return res.status(400).json({error:'That conversion is not enabled in this Ethan gateway build.'});
    const filename=req.file.originalname||`input.${from}`;if(safeExt(filename)!==from) return res.status(400).json({error:`Selected file must have .${from} extension.`});
    const form=new FormData();form.append('File',new Blob([req.file.buffer],{type:req.file.mimetype||'application/octet-stream'}),filename);form.append('StoreFile','true');
    const upstream=await fetch(`https://v2.convertapi.com/convert/${from}/to/${to}`,{method:'POST',headers:{Authorization:`Bearer ${convertApiToken}`},body:form});
    const text=await upstream.text();let data;try{data=JSON.parse(text)}catch{data=null}
    if(!upstream.ok){const msg=data?.Message||data?.message||`Conversion provider returned ${upstream.status}`;return res.status(upstream.status>=500?502:upstream.status).json({error:msg});}
    const files=(data?.Files||[]).map(f=>({name:f.FileName||(f.FileExt?`converted.${f.FileExt}`:`converted.${to}`),size:f.FileSize||null,url:f.Url||f.FileUrl||null})).filter(f=>f.url);
    if(!files.length) return res.status(502).json({error:'Provider completed the conversion but returned no temporary download URL.'});
    res.json({ok:true,files,conversionCost:data?.ConversionCost??null,temporary:true});
  }catch(err){console.error(err);res.status(500).json({error:'Conversion failed safely. No provider token was exposed to the client.'});}
});

app.post('/api/pdf', upload.single('file'), async (req,res)=>{
  try{
    if(!cloudConvertToken) return res.status(503).json({error:'Advanced PDF engine is not configured. Add CLOUDCONVERT_API_KEY on the gateway server.'});
    if(!req.file) return res.status(400).json({error:'Choose a PDF file.'});
    if(safeExt(req.file.originalname||'')!=='pdf') return res.status(400).json({error:'Advanced PDF tools accept PDF files only.'});
    const op=String(req.body.operation||'').toLowerCase();if(!pdfOps.has(op)) return res.status(400).json({error:'That PDF operation is not enabled.'});
    let task;
    if(op==='ocr'){
      const lang=String(req.body.language||'eng').replace(/[^a-z]/g,'').slice(0,3)||'eng';
      task={operation:'pdf/ocr',language:[lang]};
    }else if(op==='compress'){
      const profile=['web','print','archive','mrc','max'].includes(req.body.profile)?req.body.profile:'web';
      task={operation:'optimize',input_format:'pdf',profile};
    }else if(op==='extract'){
      const pages=cleanPages(req.body.pages);if(!pages) return res.status(400).json({error:'Enter valid pages such as 1,2,5-8.'});
      task={operation:'pdf/extract-pages',pages};
    }else if(op==='split'){
      task={operation:'pdf/split-pages'};
    }else if(op==='rotate'){
      const pages=cleanPages(req.body.pages);if(!pages) return res.status(400).json({error:'Enter valid pages such as 1,2,5-8.'});
      const rotation=['+90','90','180','-90','270'].includes(String(req.body.rotation))?String(req.body.rotation):'+90';
      task={operation:'pdf/rotate-pages',pages,rotation};
    }else if(op==='pdfa'){
      const conformance=['1b','2b','3b'].includes(req.body.conformance)?req.body.conformance:'2b';
      task={operation:'pdf/a',conformance_level:conformance};
    }else if(op==='encrypt'){
      const password=cleanPassword(req.body.password);if(!password) return res.status(400).json({error:'Enter a password between 1 and 128 characters.'});
      task={operation:'pdf/encrypt',set_password:password,allow_extract:false,allow_accessibility:true,allow_modify:'none',allow_print:'full'};
    }else if(op==='decrypt'){
      const password=cleanPassword(req.body.password);if(!password) return res.status(400).json({error:'Enter the current PDF password.'});
      task={operation:'pdf/decrypt',password};
    }
    const job=await createCcJob(task);if(!job?.id) throw new Error('PDF job could not be created.');
    await uploadCcFile(job,req.file);
    const finished=await waitCcJob(job.id);const files=exportFiles(finished);
    if(!files.length) throw new Error('PDF processing finished but no output URL was returned.');
    res.json({ok:true,files,temporary:true,operation:op});
  }catch(err){console.error(err);res.status(502).json({error:err?.message||'Advanced PDF processing failed safely.'});}
});

app.use((err,_req,res,_next)=>{
  if(err?.code==='LIMIT_FILE_SIZE') return res.status(413).json({error:`File exceeds the ${maxMb} MB gateway limit.`});
  res.status(400).json({error:err?.message||'Request could not be processed.'});
});

app.listen(port,()=>console.log(`Ethan Office Document Utility gateway listening on ${port}`));
