import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import nodemailer from 'nodemailer';
import crypto from 'node:crypto';
import helmet from 'helmet';

const app = express();
const port = Number(process.env.PORT || 8787);
const maxMb = Math.max(1, Math.min(100, Number(process.env.MAX_FILE_MB || 50)));
const convertApiToken = process.env.CONVERTAPI_TOKEN || '';
const cloudConvertToken = process.env.CLOUDCONVERT_API_KEY || '';
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*').split(',').map(x=>x.trim()).filter(Boolean);
const authSecret = process.env.AUTH_SECRET || '';
const smtpHost = process.env.SMTP_HOST || '';
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure = String(process.env.SMTP_SECURE || 'false').toLowerCase()==='true';
const smtpUser = process.env.SMTP_USER || '';
const smtpPass = process.env.SMTP_PASS || '';
const mailFrom = process.env.MAIL_FROM || smtpUser;
const allowedEmails = new Set((process.env.AUTH_ALLOWED_EMAILS || '').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean));
const allowedDomains = new Set((process.env.AUTH_ALLOWED_DOMAINS || '').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean));
const otpStore = new Map();
const revokedSessions = new Map();
const OTP_TTL = 10*60*1000;
const SESSION_TTL = Math.max(15,Math.min(1440,Number(process.env.AUTH_SESSION_MINUTES||720)))*60*1000;


app.disable('x-powered-by');
app.use(helmet({contentSecurityPolicy:false,crossOriginEmbedderPolicy:false}));
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
  maxFileMb:maxMb, authConfigured:Boolean(authSecret&&smtpHost&&mailFrom)
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





const authRequestLimiter=rateLimit({windowMs:15*60_000,limit:5,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Too many OTP requests. Try again later.'}});
const authVerifyLimiter=rateLimit({windowMs:15*60_000,limit:12,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Too many verification attempts. Try again later.'}});
const mailer=()=>nodemailer.createTransport({host:smtpHost,port:smtpPort,secure:smtpSecure,auth:smtpUser?{user:smtpUser,pass:smtpPass}:undefined});
function normEmail(v=''){return String(v).trim().toLowerCase()}
function validEmail(v=''){return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)&&v.length<=254}
function emailAllowed(email){
  if(!allowedEmails.size&&!allowedDomains.size)return true;
  const domain=email.split('@')[1]||'';
  return allowedEmails.has(email)||allowedDomains.has(domain);
}
function b64url(v){return Buffer.from(v).toString('base64url')}
function sign(v){return crypto.createHmac('sha256',authSecret).update(v).digest('base64url')}
function makeToken(email){
  const payload=b64url(JSON.stringify({email,iat:Date.now(),exp:Date.now()+SESSION_TTL,jti:crypto.randomUUID()}));
  return payload+'.'+sign(payload);
}
function readToken(token=''){
  if(!authSecret||typeof token!=='string'||!token.includes('.'))return null;
  const [p,sig]=token.split('.');
  const expected=sign(p);
  if(sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null;
  try{const d=JSON.parse(Buffer.from(p,'base64url').toString('utf8'));if(!d.email||!d.exp||Date.now()>d.exp||revokedSessions.has(d.jti))return null;return d}catch{return null}
}
function bearer(req){const h=String(req.headers.authorization||'');return h.startsWith('Bearer ')?h.slice(7):''}
function requireAuth(req,res,next){const d=readToken(bearer(req));if(!d)return res.status(401).json({error:'Secure Ethan Office session required.'});req.auth=d;next()}
function hashOtp(email,code,salt){return crypto.createHmac('sha256',authSecret).update(email+'|'+code+'|'+salt).digest('hex')}
function pruneAuth(){
  const now=Date.now();for(const [k,v] of otpStore)if(now>v.expires)otpStore.delete(k);
  for(const [k,v] of revokedSessions)if(now>v)revokedSessions.delete(k);
}
setInterval(pruneAuth,5*60_000).unref();

app.post('/api/auth/request',authRequestLimiter,async(req,res)=>{
  try{
    if(!authSecret||authSecret.length<32||!smtpHost||!mailFrom)return res.status(503).json({error:'Email OTP is not configured on the Ethan Office server.'});
    const email=normEmail(req.body?.email);
    if(!validEmail(email)||!emailAllowed(email))return res.status(400).json({error:'This email address is not permitted to access Ethan Office.'});
    const code=String(crypto.randomInt(0,1000000)).padStart(6,'0');
    const salt=crypto.randomBytes(16).toString('hex');
    otpStore.set(email,{hash:hashOtp(email,code,salt),salt,expires:Date.now()+OTP_TTL,attempts:0});
    await mailer().sendMail({from:mailFrom,to:email,subject:'Your Ethan Office verification code',text:`Your Ethan Office verification code is ${code}. It expires in 10 minutes. If you did not request this code, ignore this email.`});
    res.json({ok:true,expiresIn:600});
  }catch(err){console.error('OTP mail error',err);res.status(502).json({error:'The verification email could not be sent.'})}
});
app.post('/api/auth/verify',authVerifyLimiter,(req,res)=>{
  const email=normEmail(req.body?.email),code=String(req.body?.code||'').replace(/\D/g,'').slice(0,6);
  const item=otpStore.get(email);
  if(!item||Date.now()>item.expires){otpStore.delete(email);return res.status(400).json({error:'The code expired or is no longer valid. Request a new code.'})}
  item.attempts++;
  if(item.attempts>5){otpStore.delete(email);return res.status(429).json({error:'Too many incorrect codes. Request a new OTP.'})}
  const got=hashOtp(email,code,item.salt);
  if(got.length!==item.hash.length||!crypto.timingSafeEqual(Buffer.from(got),Buffer.from(item.hash)))return res.status(400).json({error:'Incorrect verification code.'});
  otpStore.delete(email);
  const token=makeToken(email);
  res.setHeader('Cache-Control','no-store');
  res.json({ok:true,token,email,expiresIn:Math.floor(SESSION_TTL/1000)});
});
app.get('/api/auth/session',(req,res)=>{
  const d=readToken(bearer(req));if(!d)return res.status(401).json({error:'Session expired.'});
  res.setHeader('Cache-Control','no-store');res.json({ok:true,email:d.email,expiresAt:d.exp});
});
app.post('/api/auth/logout',(req,res)=>{
  const d=readToken(bearer(req));if(d?.jti)revokedSessions.set(d.jti,d.exp);
  res.json({ok:true});
});

app.post('/api/convert', requireAuth, upload.single('file'), async (req,res)=>{
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

app.post('/api/pdf', requireAuth, upload.single('file'), async (req,res)=>{
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
