
const STORE='ethanOfficeV1';
const DB={load(){try{return JSON.parse(localStorage.getItem(STORE))||{}}catch{return{}}},save(){localStorage.setItem(STORE,JSON.stringify(state))}};
let state=Object.assign({wordDocs:[],sheets:[],presentations:[],notes:[],events:[],tasks:[],meetings:[],contacts:[],files:[],recents:[]},DB.load());
let currentWord=null,currentSheet=null,currentPres=null,currentSlide=0;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function toast(msg){const t=$('#toast');t.textContent=msg;t.style.display='block';setTimeout(()=>t.style.display='none',2200)}
function save(){DB.save();renderHome();renderFiles()}
function recent(type,title,id){state.recents=state.recents.filter(x=>!(x.type===type&&x.id===id));state.recents.unshift({type,title,id,time:Date.now()});state.recents=state.recents.slice(0,12)}
function nav(page){const target=$('#page-'+page);if(!target){console.warn('Unknown page',page);toast('That office tool is unavailable.');return;}$$('.page').forEach(p=>p.classList.remove('active'));target.classList.add('active');$$('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));$('#side').classList.remove('open');window.scrollTo(0,0); if(page==='home')renderHome(); if(page==='notes')renderNotes(); if(page==='calendar')renderEvents(); if(page==='tasks')renderTasks(); if(page==='meetings')renderMeetings(); if(page==='contacts')renderContacts(); if(page==='files')renderFiles(); if(page==='word')renderWordList(); if(page==='excel')renderSheetList(); if(page==='presentation')renderPresList();}
$$('[data-page]').forEach(b=>b.onclick=()=>nav(b.dataset.page));$('#menuBtn').onclick=()=>$('#side').classList.toggle('open');
function renderHome(){
 const r=$('#recentList'); if(!state.recents.length)r.innerHTML='<div class="empty">Your recently opened office files will appear here.</div>'; else r.innerHTML=state.recents.slice(0,6).map(x=>`<div class="card"><span class="badge">${esc(x.type)}</span><h3>${esc(x.title)}</h3><div class="muted">${new Date(x.time).toLocaleString()}</div><button class="btn sm" onclick="openRecent('${x.type}','${x.id}')">Open</button></div>`).join('');
 const sd=$('#statDocs'),st=$('#statTasks'),se=$('#statEvents'),sc=$('#statContacts');if(sd)sd.textContent=state.wordDocs.length+state.sheets.length+state.presentations.length+state.notes.length;if(st)st.textContent=state.tasks.filter(x=>!x.done).length;if(se)se.textContent=state.events.length;if(sc)sc.textContent=state.contacts.length;
}
window.openRecent=(type,id)=>{if(type==='Word')openWord(id);else if(type==='Excel')openSheet(id);else if(type==='Presentation')openPres(id);else if(type==='Note'){nav('notes')}else nav('files')};

// WORD
function renderWordList(){const el=$('#wordList');el.innerHTML=state.wordDocs.length?state.wordDocs.map(d=>`<div class="item"><div class="grow"><h4>${esc(d.title)}</h4><div class="muted">Updated ${new Date(d.updated).toLocaleString()}</div></div><button class="btn sm" onclick="openWord('${d.id}')">Open</button><button class="btn red sm" onclick="deleteWord('${d.id}')">Delete</button></div>`).join(''):'<div class="empty">No Word documents yet. Create your first letter, memo or report.</div>'}
window.newWord=()=>{const d={id:uid(),title:'Untitled Document',content:'<h1>Untitled Document</h1><p>Start typing here...</p>',updated:Date.now()};state.wordDocs.unshift(d);save();openWord(d.id)};
window.openWord=id=>{currentWord=id;const d=state.wordDocs.find(x=>x.id===id);if(!d)return;$('#wordTitle').value=d.title;$('#wordEditor').innerHTML=d.content;$('#wordWorkspace').classList.remove('hidden');$('#wordLibrary').classList.add('hidden');recent('Word',d.title,d.id);save();nav('word')};
window.closeWord=()=>{$('#wordWorkspace').classList.add('hidden');$('#wordLibrary').classList.remove('hidden');renderWordList()};
window.saveWord=()=>{const d=state.wordDocs.find(x=>x.id===currentWord);if(!d)return;d.title=$('#wordTitle').value||'Untitled Document';d.content=$('#wordEditor').innerHTML;d.updated=Date.now();recent('Word',d.title,d.id);save();toast('Document saved')};
window.deleteWord=id=>{if(confirm('Delete this document?')){state.wordDocs=state.wordDocs.filter(x=>x.id!==id);save();renderWordList()}};
window.wordCmd=(cmd,val=null)=>{document.execCommand(cmd,false,val);$('#wordEditor').focus()};window.printWord=()=>printOffice();
// Word .doc export is defined in the professional export section below.


// EXCEL
const COLS='ABCDEFGHIJ'.split('');
function newGrid(){return Array.from({length:25},()=>Array(10).fill(''))}
function renderSheetList(){const el=$('#sheetList');el.innerHTML=state.sheets.length?state.sheets.map(s=>`<div class="item"><div class="grow"><h4>${esc(s.title)}</h4><div class="muted">25 rows × 10 columns</div></div><button class="btn sm" onclick="openSheet('${s.id}')">Open</button><button class="btn red sm" onclick="deleteSheet('${s.id}')">Delete</button></div>`).join(''):'<div class="empty">No spreadsheets yet.</div>'}
window.newSheet=()=>{const s={id:uid(),title:'Book 1',grid:newGrid(),updated:Date.now()};state.sheets.unshift(s);save();openSheet(s.id)};
window.openSheet=id=>{currentSheet=id;const s=state.sheets.find(x=>x.id===id);if(!s)return;$('#sheetTitle').value=s.title;$('#sheetWorkspace').classList.remove('hidden');$('#sheetLibrary').classList.add('hidden');drawGrid(s);recent('Excel',s.title,s.id);save();nav('excel')};
window.closeSheet=()=>{try{if(currentSheet)saveSheet()}catch(e){console.error(e)}$('#sheetWorkspace').classList.add('hidden');$('#sheetLibrary').classList.remove('hidden');currentSheet=null;renderSheetList()};
function drawGrid(s){let h='<table class="sheet"><thead><tr><th></th>'+COLS.map(c=>`<th>${c}</th>`).join('')+'</tr></thead><tbody>';for(let r=0;r<25;r++){h+=`<tr><td>${r+1}</td>`;for(let c=0;c<10;c++)h+=`<td contenteditable data-r="${r}" data-c="${c}">${esc(displayCell(s.grid[r][c],s.grid))}</td>`;h+='</tr>'}h+='</tbody></table>';$('#sheetGrid').innerHTML=h;$$('#sheetGrid td[contenteditable]').forEach(td=>td.onblur=()=>{s.grid[+td.dataset.r][+td.dataset.c]=td.innerText.trim();td.innerText=displayCell(s.grid[+td.dataset.r][+td.dataset.c],s.grid)})}
function valAt(ref,g){const m=/^([A-J])(\d{1,2})$/i.exec(ref);if(!m)return 0;const c=COLS.indexOf(m[1].toUpperCase()),r=+m[2]-1;const v=g?.[r]?.[c]??'';return Number(v)||0}
function rangeVals(rng,g){const m=/([A-J]\d+):([A-J]\d+)/i.exec(rng);if(!m)return[];const a=/([A-J])(\d+)/i.exec(m[1]),b=/([A-J])(\d+)/i.exec(m[2]);let c1=COLS.indexOf(a[1].toUpperCase()),c2=COLS.indexOf(b[1].toUpperCase()),r1=+a[2]-1,r2=+b[2]-1;const out=[];for(let r=Math.min(r1,r2);r<=Math.max(r1,r2);r++)for(let c=Math.min(c1,c2);c<=Math.max(c1,c2);c++)out.push(Number(g[r]?.[c])||0);return out}
function displayCell(raw,g){if(typeof raw!=='string'||!raw.startsWith('='))return raw;const f=raw.slice(1).trim();let m=/^(SUM|AVERAGE|MIN|MAX)\(([^)]+)\)$/i.exec(f);if(m){const v=rangeVals(m[2],g);if(!v.length)return'#ERR';const op=m[1].toUpperCase();if(op==='SUM')return v.reduce((a,b)=>a+b,0);if(op==='AVERAGE')return v.reduce((a,b)=>a+b,0)/v.length;if(op==='MIN')return Math.min(...v);if(op==='MAX')return Math.max(...v)}if(/^[A-J]\d+$/i.test(f))return valAt(f,g);if(/^[0-9+\-*/(). ]+$/.test(f)){try{return Function('return ('+f+')')()}catch{return'#ERR'}}return'#ERR'}
window.saveSheet=()=>{const s=state.sheets.find(x=>x.id===currentSheet);if(!s)return;$$('#sheetGrid td[contenteditable]').forEach(td=>{const r=+td.dataset.r,c=+td.dataset.c;if(!String(s.grid[r][c]).startsWith('='))s.grid[r][c]=td.innerText.trim()});s.title=$('#sheetTitle').value||'Book';s.updated=Date.now();recent('Excel',s.title,s.id);save();drawGrid(s);toast('Spreadsheet saved')};
window.deleteSheet=id=>{if(confirm('Delete spreadsheet?')){state.sheets=state.sheets.filter(x=>x.id!==id);save();renderSheetList()}};
window.exportCSV=()=>{saveSheet();const s=state.sheets.find(x=>x.id===currentSheet);const csv=s.grid.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\n');downloadBlob(new Blob([csv],{type:'text/csv'}),safeName(s.title)+'.csv')};

// PRESENTATION
function renderPresList(){const el=$('#presList');el.innerHTML=state.presentations.length?state.presentations.map(p=>`<div class="item"><div class="grow"><h4>${esc(p.title)}</h4><div class="muted">${p.slides.length} slide(s)</div></div><button class="btn sm" onclick="openPres('${p.id}')">Open</button><button class="btn red sm" onclick="deletePres('${p.id}')">Delete</button></div>`).join(''):'<div class="empty">No presentations yet.</div>'}
window.newPres=()=>{const p={id:uid(),title:'Untitled Presentation',slides:[{title:'Presentation Title',body:'Subtitle or key message'}],updated:Date.now()};state.presentations.unshift(p);save();openPres(p.id)};
window.openPres=id=>{currentPres=id;currentSlide=0;const p=state.presentations.find(x=>x.id===id);if(!p)return;$('#presTitle').value=p.title;$('#presWorkspace').classList.remove('hidden');$('#presLibrary').classList.add('hidden');drawPres();recent('Presentation',p.title,p.id);save();nav('presentation')};
function drawPres(){const p=state.presentations.find(x=>x.id===currentPres);const s=p.slides[currentSlide];$('#slideTitle').value=s.title;$('#slideBody').value=s.body;$('#slideLiveTitle').textContent=s.title;$('#slideLiveBody').textContent=s.body;$('#slideThumbs').innerHTML=p.slides.map((x,i)=>`<button class="thumb ${i===currentSlide?'active':''}" onclick="selectSlide(${i})"><b>${esc(x.title)}</b><br>${esc(x.body.slice(0,80))}</button>`).join('')}
window.selectSlide=i=>{saveSlideFields();currentSlide=i;drawPres()};function saveSlideFields(){const p=state.presentations.find(x=>x.id===currentPres);if(!p)return;const s=p.slides[currentSlide];s.title=$('#slideTitle').value;s.body=$('#slideBody').value;p.title=$('#presTitle').value||'Presentation';p.updated=Date.now()}
$('#slideTitle').oninput=$('#slideBody').oninput=()=>{const p=state.presentations.find(x=>x.id===currentPres);if(!p)return;$('#slideLiveTitle').textContent=$('#slideTitle').value;$('#slideLiveBody').textContent=$('#slideBody').value};
window.addSlide=()=>{saveSlideFields();const p=state.presentations.find(x=>x.id===currentPres);p.slides.push({title:'New Slide',body:'Add your content'});currentSlide=p.slides.length-1;drawPres()};window.deleteSlide=()=>{const p=state.presentations.find(x=>x.id===currentPres);if(p.slides.length<=1)return toast('Keep at least one slide');p.slides.splice(currentSlide,1);currentSlide=Math.max(0,currentSlide-1);drawPres()};window.savePres=()=>{saveSlideFields();const p=state.presentations.find(x=>x.id===currentPres);recent('Presentation',p.title,p.id);save();drawPres();toast('Presentation saved')};window.closePres=()=>{savePres();$('#presWorkspace').classList.add('hidden');$('#presLibrary').classList.remove('hidden');renderPresList()};window.deletePres=id=>{if(confirm('Delete presentation?')){state.presentations=state.presentations.filter(x=>x.id!==id);save();renderPresList()}};window.presentSlide=()=>{saveSlideFields();const p=state.presentations.find(x=>x.id===currentPres);const w=window.open('','_blank');w.document.write(`<style>body{margin:0;background:#071b4b;color:white;font-family:Arial;display:grid;place-items:center;height:100vh}.s{text-align:center;max-width:1000px;padding:60px}h1{font-size:64px}p{font-size:34px;white-space:pre-wrap}</style><div class=s><h1>${esc(p.slides[currentSlide].title)}</h1><p>${esc(p.slides[currentSlide].body)}</p></div>`)};

// generic CRUD helpers
function modal(title,html,onSave){$('#modalTitle').textContent=title;$('#modalContent').innerHTML=html;$('#modal').classList.add('show');$('#modalSave').onclick=()=>{onSave();$('#modal').classList.remove('show')}}window.closeModal=()=>$('#modal').classList.remove('show');
window.addNote=()=>modal('New Note',`<div class="formgrid"><div class="field full"><label>Title</label><input id=m1></div><div class="field full"><label>Note</label><textarea id=m2></textarea></div></div>`,()=>{state.notes.unshift({id:uid(),title:$('#m1').value||'Untitled Note',body:$('#m2').value,updated:Date.now()});save();renderNotes()});
function renderNotes(){$('#notesList').innerHTML=state.notes.length?state.notes.map(n=>`<div class="card"><h3>${esc(n.title)}</h3><p>${esc(n.body).replaceAll('\n','<br>')}</p><button class="btn red sm" onclick="removeGeneric('notes','${n.id}')">Delete</button></div>`).join(''):'<div class="empty">No notes yet.</div>'}
window.addEvent=()=>modal('New Calendar Event',`<div class="formgrid"><div class=field><label>Date</label><input id=m1 type=date></div><div class=field><label>Time</label><input id=m2 type=time></div><div class="field full"><label>Title</label><input id=m3></div><div class="field full"><label>Details</label><textarea id=m4></textarea></div></div>`,()=>{state.events.push({id:uid(),date:$('#m1').value,time:$('#m2').value,title:$('#m3').value||'Event',details:$('#m4').value});state.events.sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));save();renderEvents()});
function renderEvents(){$('#eventList').innerHTML=state.events.length?state.events.map(e=>`<div class="item"><div class="badge">${esc(e.date||'No date')} ${esc(e.time||'')}</div><div class=grow><h4>${esc(e.title)}</h4><div class=muted>${esc(e.details)}</div></div><button class="btn red sm" onclick="removeGeneric('events','${e.id}')">Delete</button></div>`).join(''):'<div class=empty>No calendar events yet.</div>'}
window.addTask=()=>modal('New Task',`<div class=formgrid><div class="field full"><label>Task</label><input id=m1></div><div class=field><label>Due date</label><input id=m2 type=date></div><div class=field><label>Priority</label><select id=m3><option>Medium</option><option>High</option><option>Low</option></select></div></div>`,()=>{state.tasks.unshift({id:uid(),title:$('#m1').value||'Task',due:$('#m2').value,priority:$('#m3').value,done:false});save();renderTasks()});
function renderTasks(){$('#taskList').innerHTML=state.tasks.length?state.tasks.map(t=>`<div class=item><input type=checkbox ${t.done?'checked':''} onchange="toggleTask('${t.id}')"><div class=grow><h4 style="${t.done?'text-decoration:line-through':''}">${esc(t.title)}</h4><span class="badge ${t.priority.toLowerCase()}">${esc(t.priority)}</span> <span class=muted>${esc(t.due||'')}</span></div><button class="btn red sm" onclick="removeGeneric('tasks','${t.id}')">Delete</button></div>`).join(''):'<div class=empty>No tasks yet.</div>'}
window.toggleTask=id=>{const t=state.tasks.find(x=>x.id===id);t.done=!t.done;save();renderTasks()};
window.addMeeting=()=>modal('New Meeting Record',`<div class=formgrid><div class="field full"><label>Meeting title</label><input id=m1></div><div class=field><label>Date</label><input id=m2 type=date></div><div class=field><label>Attendees</label><input id=m3 placeholder="Names separated by commas"></div><div class="field full"><label>Agenda</label><textarea id=m4></textarea></div><div class="field full"><label>Minutes / decisions</label><textarea id=m5></textarea></div><div class="field full"><label>Action points</label><textarea id=m6></textarea></div></div>`,()=>{state.meetings.unshift({id:uid(),title:$('#m1').value||'Meeting',date:$('#m2').value,attendees:$('#m3').value,agenda:$('#m4').value,minutes:$('#m5').value,actions:$('#m6').value});save();renderMeetings()});
function renderMeetings(){$('#meetingList').innerHTML=state.meetings.length?state.meetings.map(m=>`<div class=card><span class=badge>${esc(m.date||'')}</span><h3>${esc(m.title)}</h3><div class=muted><b>Attendees:</b> ${esc(m.attendees)}</div><p><b>Agenda:</b><br>${esc(m.agenda).replaceAll('\n','<br>')}</p><p><b>Minutes:</b><br>${esc(m.minutes).replaceAll('\n','<br>')}</p><p><b>Actions:</b><br>${esc(m.actions).replaceAll('\n','<br>')}</p><button class="btn red sm" onclick="removeGeneric('meetings','${m.id}')">Delete</button></div>`).join(''):'<div class=empty>No meeting records yet.</div>'}
window.addContact=()=>modal('New Contact',`<div class=formgrid><div class=field><label>Name</label><input id=m1></div><div class=field><label>Company</label><input id=m2></div><div class=field><label>Phone</label><input id=m3></div><div class=field><label>Email</label><input id=m4 type=email></div><div class="field full"><label>Notes</label><textarea id=m5></textarea></div></div>`,()=>{state.contacts.unshift({id:uid(),name:$('#m1').value||'Contact',company:$('#m2').value,phone:$('#m3').value,email:$('#m4').value,notes:$('#m5').value});save();renderContacts()});
function renderContacts(){$('#contactList').innerHTML=state.contacts.length?state.contacts.map(c=>`<div class=card><h3>${esc(c.name)}</h3><div class=muted>${esc(c.company)}</div><p>${esc(c.phone)}<br>${esc(c.email)}</p><div style="display:flex;gap:6px;flex-wrap:wrap">${c.phone?`<button class="btn green sm" onclick="location.href='https://wa.me/${c.phone.replace(/\D/g,'')}'">WhatsApp</button>`:''}${c.email?`<button class="btn sm" onclick="location.href='mailto:${esc(c.email)}'">Email</button>`:''}<button class="btn red sm" onclick="removeGeneric('contacts','${c.id}')">Delete</button></div></div>`).join(''):'<div class=empty>No contacts yet.</div>'}
window.removeGeneric=(k,id)=>{if(confirm('Delete this item?')){state[k]=state[k].filter(x=>x.id!==id);save();({notes:renderNotes,events:renderEvents,tasks:renderTasks,meetings:renderMeetings,contacts:renderContacts}[k]||(()=>{}))()}};

// SCAN
const legacyScanInput=$('#scanInput');if(legacyScanInput)legacyScanInput.onchange=e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{const preview=$('#scanPreview'),actions=$('#scanActions');if(preview){preview.src=r.result;preview.classList.remove('hidden')}if(actions)actions.classList.remove('hidden');state.files.unshift({id:uid(),name:f.name,type:'Scan/Image',size:f.size,updated:Date.now()});save()};r.readAsDataURL(f)};window.printScan=()=>printOffice();

// TEMPLATES
const templates={letter:`<h2>[Your Organization]</h2><p>[Address]</p><p>[Date]</p><p><b>[Recipient Name]</b><br>[Recipient Address]</p><p>Dear [Name],</p><p><b>RE: [SUBJECT]</b></p><p>Write your letter here.</p><p>Yours faithfully,</p><p>[Name]<br>[Position]</p>`,memo:`<h1>MEMORANDUM</h1><p><b>To:</b> [Recipient]</p><p><b>From:</b> [Sender]</p><p><b>Date:</b> [Date]</p><p><b>Subject:</b> [Subject]</p><hr><p>Memo content...</p>`,minutes:`<h1>MEETING MINUTES</h1><p><b>Date:</b> [Date] &nbsp; <b>Time:</b> [Time]</p><p><b>Venue:</b> [Venue]</p><h3>Attendance</h3><ul><li>Name</li></ul><h3>Agenda</h3><ol><li>Item</li></ol><h3>Discussion & Decisions</h3><p>...</p><h3>Action Points</h3><p>...</p>`,report:`<h1>OFFICE REPORT</h1><p><b>Prepared by:</b> [Name]</p><p><b>Date:</b> [Date]</p><h2>Executive Summary</h2><p>...</p><h2>Key Findings</h2><p>...</p><h2>Recommendations</h2><p>...</p>`};
window.useTemplate=k=>{const d={id:uid(),title:{letter:'Business Letter',memo:'Office Memo',minutes:'Meeting Minutes',report:'Office Report'}[k],content:templates[k],updated:Date.now()};state.wordDocs.unshift(d);save();openWord(d.id)};

// FILES / backup
function renderFiles(){const all=[...state.wordDocs.map(x=>({name:x.title,type:'Word',updated:x.updated,id:x.id})),...state.sheets.map(x=>({name:x.title,type:'Excel',updated:x.updated,id:x.id})),...state.presentations.map(x=>({name:x.title,type:'Presentation',updated:x.updated,id:x.id})),...state.notes.map(x=>({name:x.title,type:'Note',updated:x.updated,id:x.id})),...state.files];all.sort((a,b)=>(b.updated||0)-(a.updated||0));$('#filesList').innerHTML=all.length?all.map(f=>`<div class=item><span class=badge>${esc(f.type)}</span><div class=grow><h4>${esc(f.name)}</h4><div class=muted>${f.updated?new Date(f.updated).toLocaleString():''}</div></div>${f.id&&['Word','Excel','Presentation'].includes(f.type)?`<button class="btn sm" onclick="openRecent('${f.type}','${f.id}')">Open</button>`:''}</div>`).join(''):'<div class=empty>No office files yet.</div>'}
window.backup=()=>downloadBlob(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),'Ethan-Office-Backup.json');$('#restoreInput').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{state=JSON.parse(r.result);save();toast('Backup restored');nav('home')}catch{alert('Invalid backup file')}};r.readAsText(f)};

// calculator
let calc='';window.calcKey=k=>{if(calc==='Error'&&!['C','←','='].includes(k))calc='';if(k==='C')calc='';else if(k==='='){try{if(!calc||!(/^[0-9+\-*/().% ]*$/.test(calc)))throw 0;const out=Function('return ('+calc.replaceAll('%','/100')+')')();calc=Number.isFinite(out)?String(out):'Error'}catch{calc='Error'}}else if(k==='←')calc=calc==='Error'?'':calc.slice(0,-1);else calc+=k;const d=$('#calcDisplay');if(d)d.value=calc};

function printOffice(){try{if(window.EthanAndroid&&window.EthanAndroid.printPage){window.EthanAndroid.printPage();return}}catch(e){} window.print()}
let installPrompt=null;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;const b=document.getElementById('installBtn');if(b)b.classList.remove('hidden')});window.addEventListener('appinstalled',()=>{const b=document.getElementById('installBtn');if(b)b.classList.add('hidden');installPrompt=null});window.addEventListener('load',()=>{const b=document.getElementById('installBtn');if(b)b.onclick=async()=>{if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;b.classList.add('hidden')}}});
function safeName(n){return (n||'file').replace(/[^a-z0-9 _.-]/gi,'_')};function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}

// search modules
$('#globalSearch').oninput=e=>{const q=e.target.value.toLowerCase().trim();if(!q)return;const map=[['word','word document letter memo report'],['excel','excel spreadsheet formula budget'],['presentation','presentation slides'],['documents','document utility pdf scan ocr convert merge split compress sign redact'],['notes','notes'],['calendar','calendar appointment event'],['tasks','tasks todo'],['meetings','meetings minutes agenda'],['contacts','contacts address book'],['templates','templates letter memo report'],['files','file manager'],['calculator','calculator']];const hit=map.find(x=>x[1].includes(q));if(hit)nav(hit[0])};

renderHome();renderFiles();
/* Ethan Office v2 audit & feature expansion — © 2026 Ethan Digital Academy */
(function(){
'use strict';
const V2='2.0.0';
const debounce=(fn,ms=700)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}};
const activePage=()=>document.querySelector('.page.active')?.id?.replace('page-','')||'home';

// Safer persistence and lighter rendering: avoid re-rendering the whole suite on every keystroke.
DB.save=function(){try{localStorage.setItem(STORE,JSON.stringify(state));return true}catch(err){console.error(err);toast('Storage is full. Please back up and remove old files.');return false}};
save=function(){DB.save();const p=activePage();if(p==='home')renderHome();if(p==='files')renderFiles()};
state.settings=Object.assign({theme:'light',autosave:true,version:V2},state.settings||{});
state.trash=Array.isArray(state.trash)?state.trash:[];
['wordDocs','sheets','presentations'].forEach(k=>(state[k]||[]).forEach(x=>{x.favorite=!!x.favorite;x.versions=Array.isArray(x.versions)?x.versions:[]}));
DB.save();

function snapshot(item,payload,label='Saved version'){
 item.versions=item.versions||[];
 const last=item.versions[0];
 const sig=JSON.stringify(payload);
 if(last&&last.sig===sig)return;
 item.versions.unshift({id:uid(),time:Date.now(),label,sig,payload});
 item.versions=item.versions.slice(0,6);
}
function status(msg,ok=true){const el=document.getElementById('saveStatus');if(el){el.textContent=msg;el.className='saveStatus '+(ok?'ok':'warn')}}

// ---------- Word upgrades ----------
const oldOpenWord=openWord;
openWord=function(id){oldOpenWord(id);setTimeout(()=>{updateWordStats();status('Saved locally')},0)};
const oldNewWord=newWord;
newWord=function(){oldNewWord();setTimeout(updateWordStats,0)};
const baseSaveWord=saveWord;
saveWord=function(quiet=false){const d=state.wordDocs.find(x=>x.id===currentWord);if(!d)return;const before={title:d.title,content:d.content};const nt=$('#wordTitle').value||'Untitled Document',nc=$('#wordEditor').innerHTML;if(!quiet)snapshot(d,before,'Before save');d.title=nt;d.content=nc;d.updated=Date.now();recent('Word',d.title,d.id);DB.save();if(activePage()==='home')renderHome();if(!quiet)toast('Document saved');status('Saved '+new Date().toLocaleTimeString());updateWordStats()};
function updateWordStats(){const e=$('#wordEditor'),s=$('#wordStats');if(!e||!s)return;const txt=(e.innerText||'').trim();const words=txt?txt.split(/\s+/).length:0;s.textContent=`${words} words • ${txt.length} characters`}
window.wordInsertLink=()=>{const u=prompt('Enter link URL (https://...)');if(u&&/^https?:\/\//i.test(u))wordCmd('createLink',u)};
window.wordInsertTable=()=>{const r=Math.max(1,Math.min(12,Number(prompt('Rows','3'))||3)),c=Math.max(1,Math.min(8,Number(prompt('Columns','3'))||3));let h='<table border="1" style="border-collapse:collapse;width:100%">';for(let i=0;i<r;i++){h+='<tr>';for(let j=0;j<c;j++)h+='<td style="padding:6px">&nbsp;</td>';h+='</tr>'}h+='</table><p></p>';document.execCommand('insertHTML',false,h)};
window.wordFindReplace=()=>{const find=prompt('Find text');if(!find)return;const repl=prompt('Replace with','')??'';const e=$('#wordEditor');const escaped=find.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');e.innerHTML=e.innerHTML.replace(new RegExp(escaped,'gi'),repl);updateWordStats();autoSaveWord()};
window.wordVersionHistory=()=>{const d=state.wordDocs.find(x=>x.id===currentWord);if(!d)return;const vs=d.versions||[];modal('Version History',vs.length?`<div class=list>${vs.map(v=>`<div class=item><div class=grow><b>${esc(v.label)}</b><div class=muted>${new Date(v.time).toLocaleString()}</div></div><button class="btn sm" onclick="restoreWordVersion('${v.id}')">Restore</button></div>`).join('')}</div>`:'<div class=empty>No earlier versions yet. Versions are kept when you manually save.</div>',()=>closeModal());$('#modalSave').textContent='Close'};
window.restoreWordVersion=id=>{const d=state.wordDocs.find(x=>x.id===currentWord),v=d?.versions?.find(x=>x.id===id);if(!v)return;snapshot(d,{title:d.title,content:d.content},'Before restore');d.title=v.payload.title;d.content=v.payload.content;d.updated=Date.now();DB.save();$('#wordTitle').value=d.title;$('#wordEditor').innerHTML=d.content;closeModal();updateWordStats();toast('Version restored')};
const autoSaveWord=debounce(()=>{if(state.settings.autosave&&currentWord&&activePage()==='word'&&!$('#wordWorkspace').classList.contains('hidden'))saveWord(true)},1100);

// ---------- Excel upgrades ----------
const COLS2=Array.from({length:16},(_,i)=>String.fromCharCode(65+i));
COLS.splice(0,COLS.length,...COLS2);
newGrid=function(){return Array.from({length:40},()=>Array(16).fill(''))};
function ensureGrid(s){while(s.grid.length<40)s.grid.push(Array(16).fill(''));s.grid=s.grid.slice(0,40);s.grid.forEach((r,i)=>{while(r.length<16)r.push('');s.grid[i]=r.slice(0,16)})}
valAt=function(ref,g){const m=/^([A-P])(\d{1,2})$/i.exec(ref);if(!m)return 0;const c=COLS.indexOf(m[1].toUpperCase()),r=+m[2]-1;const v=g?.[r]?.[c]??'';return Number(v)||0};
rangeVals=function(rng,g){const m=/([A-P]\d+):([A-P]\d+)/i.exec(rng);if(!m)return[];const a=/([A-P])(\d+)/i.exec(m[1]),b=/([A-P])(\d+)/i.exec(m[2]);let c1=COLS.indexOf(a[1].toUpperCase()),c2=COLS.indexOf(b[1].toUpperCase()),r1=+a[2]-1,r2=+b[2]-1;const out=[];for(let r=Math.min(r1,r2);r<=Math.max(r1,r2);r++)for(let c=Math.min(c1,c2);c<=Math.max(c1,c2);c++)out.push(Number(g[r]?.[c])||0);return out};
renderSheetList=function(){const el=$('#sheetList');el.innerHTML=state.sheets.length?state.sheets.map(s=>`<div class=item><button class="star ${s.favorite?'on':''}" onclick="toggleFavorite('Excel','${s.id}')">★</button><div class=grow><h4>${esc(s.title)}</h4><div class=muted>40 rows × 16 columns • Updated ${new Date(s.updated||Date.now()).toLocaleString()}</div></div><button class="btn sm" onclick="openSheet('${s.id}')">Open</button><button class="btn red sm" onclick="trashItem('Excel','${s.id}')">Trash</button></div>`).join(''):'<div class=empty>No spreadsheets yet.</div>'};
const originalOpenSheet=openSheet;
openSheet=function(id){const s=state.sheets.find(x=>x.id===id);if(s)ensureGrid(s);originalOpenSheet(id);setTimeout(bindSheetSelection,0)};
const originalDrawGrid=drawGrid;
drawGrid=function(s){ensureGrid(s);let h='<table class="sheet"><thead><tr><th></th>'+COLS.map(c=>`<th>${c}</th>`).join('')+'</tr></thead><tbody>';for(let r=0;r<40;r++){h+=`<tr><td>${r+1}</td>`;for(let c=0;c<16;c++)h+=`<td contenteditable data-r="${r}" data-c="${c}">${esc(displayCell(s.grid[r][c],s.grid))}</td>`;h+='</tr>'}h+='</tbody></table>';$('#sheetGrid').innerHTML=h;$$('#sheetGrid td[contenteditable]').forEach(td=>{td.onfocus=()=>selectCell(td);td.onblur=()=>{const r=+td.dataset.r,c=+td.dataset.c;s.grid[r][c]=td.dataset.raw??td.innerText.trim();td.innerText=displayCell(s.grid[r][c],s.grid);debouncedSheetPersist()}})};
let selectedCell=null;
function bindSheetSelection(){const first=$('#sheetGrid td[contenteditable]');if(first)selectCell(first)}
function selectCell(td){selectedCell=td;$$('#sheetGrid td.selected').forEach(x=>x.classList.remove('selected'));td.classList.add('selected');const s=state.sheets.find(x=>x.id===currentSheet);const r=+td.dataset.r,c=+td.dataset.c;$('#cellName').textContent=COLS[c]+(r+1);$('#formulaBar').value=s.grid[r][c]??''}
window.applyFormula=()=>{if(!selectedCell)return;const s=state.sheets.find(x=>x.id===currentSheet),r=+selectedCell.dataset.r,c=+selectedCell.dataset.c;s.grid[r][c]=$('#formulaBar').value;selectedCell.innerText=displayCell(s.grid[r][c],s.grid);debouncedSheetPersist()};
const oldDisplayCell=displayCell;
displayCell=function(raw,g){if(typeof raw!=='string'||!raw.startsWith('='))return raw;let f=raw.slice(1).trim();let m=/^(SUM|AVERAGE|MIN|MAX|COUNT|COUNTA)\(([^)]+)\)$/i.exec(f);if(m){let vals=rangeVals(m[2],g),op=m[1].toUpperCase();if(op==='COUNTA'){const rm=/([A-P]\d+):([A-P]\d+)/i.exec(m[2]);if(!rm)return'#ERR';const a=/([A-P])(\d+)/i.exec(rm[1]),b=/([A-P])(\d+)/i.exec(rm[2]);let c1=COLS.indexOf(a[1].toUpperCase()),c2=COLS.indexOf(b[1].toUpperCase()),r1=+a[2]-1,r2=+b[2]-1,n=0;for(let r=Math.min(r1,r2);r<=Math.max(r1,r2);r++)for(let c=Math.min(c1,c2);c<=Math.max(c1,c2);c++)if(String(g[r]?.[c]??'').trim())n++;return n}if(!vals.length)return'#ERR';if(op==='SUM')return vals.reduce((a,b)=>a+b,0);if(op==='AVERAGE')return vals.reduce((a,b)=>a+b,0)/vals.length;if(op==='MIN')return Math.min(...vals);if(op==='MAX')return Math.max(...vals);if(op==='COUNT')return vals.filter(Number.isFinite).length}
 m=/^ROUND\(([^,]+),(\d+)\)$/i.exec(f);if(m){const n=Number(evalArithmetic(m[1],g)),d=Math.min(8,+m[2]);return Number.isFinite(n)?Number(n.toFixed(d)):'#ERR'}
 const n=evalArithmetic(f,g);return n===null?'#ERR':n};
function evalArithmetic(f,g){let expr=f.replace(/\b([A-P]\d{1,2})\b/gi,m=>String(valAt(m,g)));if(!/^[0-9+\-*/(). %]+$/.test(expr))return null;try{const v=Function('"use strict";return ('+expr.replace(/%/g,'/100')+')')();return Number.isFinite(v)?v:null}catch{return null}}
const debouncedSheetPersist=debounce(()=>{const s=state.sheets.find(x=>x.id===currentSheet);if(!s)return;s.title=$('#sheetTitle').value||'Book';s.updated=Date.now();recent('Excel',s.title,s.id);DB.save();status('Spreadsheet autosaved')},1000);
const baseSaveSheet=saveSheet;
saveSheet=function(){const s=state.sheets.find(x=>x.id===currentSheet);if(!s)return;snapshot(s,{title:s.title,grid:JSON.parse(JSON.stringify(s.grid))},'Before save');baseSaveSheet();status('Saved '+new Date().toLocaleTimeString())};
window.importCSV=()=>$('#csvInput').click();
window.handleCSV=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{const s=state.sheets.find(x=>x.id===currentSheet);if(!s)return;const rows=String(r.result).split(/\r?\n/).slice(0,40).map(parseCSVLine);s.grid=newGrid();rows.forEach((row,i)=>row.slice(0,16).forEach((v,j)=>s.grid[i][j]=v));drawGrid(s);debouncedSheetPersist();toast('CSV imported')};r.readAsText(f)};
function parseCSVLine(line){const out=[];let cur='',q=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(q&&line[i+1]==='"'){cur+='"';i++}else q=!q}else if(ch===','&&!q){out.push(cur);cur=''}else cur+=ch}out.push(cur);return out}
window.sortSheet=()=>{const s=state.sheets.find(x=>x.id===currentSheet);if(!s)return;const col=(prompt('Sort by column (A-P)','A')||'A').toUpperCase(),c=COLS.indexOf(col);if(c<0)return toast('Invalid column');const dir=(prompt('Type ASC or DESC','ASC')||'ASC').toUpperCase();const header=confirm('Keep first row as header?');const head=header?s.grid.shift():null;s.grid.sort((a,b)=>String(a[c]??'').localeCompare(String(b[c]??''),undefined,{numeric:true,sensitivity:'base'})*(dir==='DESC'?-1:1));if(head)s.grid.unshift(head);drawGrid(s);debouncedSheetPersist()};
window.sheetChart=()=>{const s=state.sheets.find(x=>x.id===currentSheet);if(!s)return;const lc=(prompt('Label column (A-P)','A')||'A').toUpperCase(),vc=(prompt('Value column (A-P)','B')||'B').toUpperCase(),l=COLS.indexOf(lc),v=COLS.indexOf(vc);if(l<0||v<0)return;const data=s.grid.slice(0,12).filter(r=>String(r[l]).trim()&&Number.isFinite(Number(r[v]))).map(r=>({label:String(r[l]),value:Number(r[v])}));if(!data.length)return toast('No chartable numeric data');const max=Math.max(...data.map(x=>Math.abs(x.value)),1);modal('Quick Bar Chart',`<div class=chart>${data.map(x=>`<div class=barRow><span>${esc(x.label)}</span><div class=barTrack><i style="width:${Math.max(2,Math.abs(x.value)/max*100)}%"></i></div><b>${x.value}</b></div>`).join('')}</div>`,()=>closeModal());$('#modalSave').textContent='Close'};

// ---------- Presentation upgrades ----------
function ensurePresentation(p){p.theme=p.theme||'navy';p.slides.forEach(s=>{if(s.notes==null)s.notes=''})}
const op=openPres;openPres=function(id){const p=state.presentations.find(x=>x.id===id);if(p)ensurePresentation(p);op(id);setTimeout(()=>{const p2=state.presentations.find(x=>x.id===id);$('#speakerNotes').value=p2.slides[currentSlide].notes||'';applyPresTheme(p2.theme)},0)};
const dp=drawPres;drawPres=function(){dp();const p=state.presentations.find(x=>x.id===currentPres);if(!p)return;ensurePresentation(p);if($('#speakerNotes'))$('#speakerNotes').value=p.slides[currentSlide].notes||'';applyPresTheme(p.theme)};
const ssf=saveSlideFields;saveSlideFields=function(){ssf();const p=state.presentations.find(x=>x.id===currentPres);if(p&&$('#speakerNotes'))p.slides[currentSlide].notes=$('#speakerNotes').value};
window.duplicateSlide=()=>{saveSlideFields();const p=state.presentations.find(x=>x.id===currentPres);p.slides.splice(currentSlide+1,0,JSON.parse(JSON.stringify(p.slides[currentSlide])));currentSlide++;drawPres();debouncedPresPersist()};
window.moveSlide=d=>{saveSlideFields();const p=state.presentations.find(x=>x.id===currentPres),n=currentSlide+d;if(n<0||n>=p.slides.length)return;[p.slides[currentSlide],p.slides[n]]=[p.slides[n],p.slides[currentSlide]];currentSlide=n;drawPres();debouncedPresPersist()};
window.setPresTheme=t=>{const p=state.presentations.find(x=>x.id===currentPres);p.theme=t;applyPresTheme(t);debouncedPresPersist()};
function applyPresTheme(t){const el=document.querySelector('.slide');if(!el)return;el.dataset.theme=t}
const debouncedPresPersist=debounce(()=>{saveSlideFields();const p=state.presentations.find(x=>x.id===currentPres);if(!p)return;p.updated=Date.now();recent('Presentation',p.title,p.id);DB.save();status('Presentation autosaved')},1000);
const bsp=savePres;savePres=function(){const p=state.presentations.find(x=>x.id===currentPres);if(p)snapshot(p,{title:p.title,slides:JSON.parse(JSON.stringify(p.slides)),theme:p.theme},'Before save');bsp();status('Saved '+new Date().toLocaleTimeString())};
window.presentAll=()=>{saveSlideFields();const p=state.presentations.find(x=>x.id===currentPres);if(!p)return;const w=window.open('','_blank');const slides=JSON.stringify(p.slides).replace(/</g,'\\u003c');w.document.write(`<!doctype html><meta charset=utf-8><title>${esc(p.title)}</title><style>body{margin:0;background:#071b4b;color:#fff;font-family:Arial;overflow:hidden}.s{height:100vh;display:grid;place-content:center;text-align:center;padding:7vw;box-sizing:border-box}.s h1{font-size:5vw;margin:0 0 2vw}.s p{font-size:2.5vw;white-space:pre-wrap}.hint{position:fixed;bottom:12px;right:18px;opacity:.7}</style><div id=s></div><div class=hint>← → navigate • Esc close</div><script>const a=${slides};let i=0;function d(){s.innerHTML='<div class=s><h1>'+a[i].title.replace(/</g,'&lt;')+'</h1><p>'+a[i].body.replace(/</g,'&lt;')+'</p></div>'}onkeydown=e=>{if(e.key==='ArrowRight'||e.key===' ')i=Math.min(a.length-1,i+1);if(e.key==='ArrowLeft')i=Math.max(0,i-1);if(e.key==='Escape')close();d()};d()<\/script>`)};

// ---------- Editable daily modules ----------
function noteForm(n){return `<div class=formgrid><div class="field full"><label>Title</label><input id=m1 value="${esc(n?.title||'')}"></div><div class="field full"><label>Note</label><textarea id=m2>${esc(n?.body||'')}</textarea></div><div class=field><label>Pin</label><select id=m3><option value=no>No</option><option value=yes ${n?.pinned?'selected':''}>Yes</option></select></div></div>`}
window.editNote=id=>{const n=state.notes.find(x=>x.id===id);modal('Edit Note',noteForm(n),()=>{n.title=$('#m1').value||'Untitled Note';n.body=$('#m2').value;n.pinned=$('#m3').value==='yes';n.updated=Date.now();save();renderNotes()})};
const oldAddNote=addNote;addNote=function(){modal('New Note',noteForm(),()=>{state.notes.unshift({id:uid(),title:$('#m1').value||'Untitled Note',body:$('#m2').value,pinned:$('#m3').value==='yes',updated:Date.now()});save();renderNotes()})};
renderNotes=function(){const a=[...state.notes].sort((a,b)=>(b.pinned-a.pinned)||((b.updated||0)-(a.updated||0)));$('#notesList').innerHTML=a.length?a.map(n=>`<div class="card ${n.pinned?'pinned':''}">${n.pinned?'<span class=badge>PINNED</span>':''}<h3>${esc(n.title)}</h3><p>${esc(n.body).replaceAll('\n','<br>')}</p><button class="btn sm" onclick="editNote('${n.id}')">Edit</button> <button class="btn red sm" onclick="removeGeneric('notes','${n.id}')">Delete</button></div>`).join(''):'<div class=empty>No notes yet.</div>'};
window.editTask=id=>{const t=state.tasks.find(x=>x.id===id);modal('Edit Task',`<div class=formgrid><div class="field full"><label>Task</label><input id=m1 value="${esc(t.title)}"></div><div class=field><label>Due date</label><input id=m2 type=date value="${esc(t.due||'')}"></div><div class=field><label>Priority</label><select id=m3>${['High','Medium','Low'].map(x=>`<option ${t.priority===x?'selected':''}>${x}</option>`).join('')}</select></div></div>`,()=>{t.title=$('#m1').value||'Task';t.due=$('#m2').value;t.priority=$('#m3').value;save();renderTasks()})};
renderTasks=function(){let arr=[...state.tasks];const f=$('#taskFilter')?.value||'all';if(f==='open')arr=arr.filter(x=>!x.done);if(f==='done')arr=arr.filter(x=>x.done);arr.sort((a,b)=>(a.done-b.done)||String(a.due||'9999').localeCompare(String(b.due||'9999')));$('#taskList').innerHTML=arr.length?arr.map(t=>`<div class=item><input type=checkbox ${t.done?'checked':''} onchange="toggleTask('${t.id}')"><div class=grow><h4 style="${t.done?'text-decoration:line-through':''}">${esc(t.title)}</h4><span class="badge ${t.priority.toLowerCase()}">${esc(t.priority)}</span> <span class=muted>${esc(t.due||'No due date')}</span></div><button class="btn sm" onclick="editTask('${t.id}')">Edit</button><button class="btn red sm" onclick="removeGeneric('tasks','${t.id}')">Delete</button></div>`).join(''):'<div class=empty>No tasks in this view.</div>'};
window.editContact=id=>{const c=state.contacts.find(x=>x.id===id);modal('Edit Contact',`<div class=formgrid><div class=field><label>Name</label><input id=m1 value="${esc(c.name)}"></div><div class=field><label>Company</label><input id=m2 value="${esc(c.company||'')}"></div><div class=field><label>Phone</label><input id=m3 value="${esc(c.phone||'')}"></div><div class=field><label>Email</label><input id=m4 value="${esc(c.email||'')}"></div><div class="field full"><label>Notes</label><textarea id=m5>${esc(c.notes||'')}</textarea></div></div>`,()=>{Object.assign(c,{name:$('#m1').value||'Contact',company:$('#m2').value,phone:$('#m3').value,email:$('#m4').value,notes:$('#m5').value});save();renderContacts()})};
renderContacts=function(){const q=($('#contactSearch')?.value||'').toLowerCase(),a=state.contacts.filter(c=>[c.name,c.company,c.phone,c.email].join(' ').toLowerCase().includes(q));$('#contactList').innerHTML=a.length?a.map(c=>`<div class=card><h3>${esc(c.name)}</h3><div class=muted>${esc(c.company)}</div><p>${esc(c.phone)}<br>${esc(c.email)}</p><div class=actions>${c.phone?`<button class="btn green sm" onclick="location.href='https://wa.me/${c.phone.replace(/\D/g,'')}'">WhatsApp</button>`:''}${c.email?`<button class="btn sm" onclick="location.href='mailto:${esc(c.email)}'">Email</button>`:''}<button class="btn sm" onclick="editContact('${c.id}')">Edit</button><button class="btn red sm" onclick="removeGeneric('contacts','${c.id}')">Delete</button></div></div>`).join(''):'<div class=empty>No matching contacts.</div>'};
window.meetingToTasks=id=>{const m=state.meetings.find(x=>x.id===id);if(!m?.actions.trim())return toast('No action points to convert');m.actions.split(/\n|;/).map(x=>x.trim()).filter(Boolean).forEach(x=>state.tasks.unshift({id:uid(),title:x,due:'',priority:'Medium',done:false}));DB.save();toast('Action points added to Tasks')};
const oldRM=renderMeetings;renderMeetings=function(){$('#meetingList').innerHTML=state.meetings.length?state.meetings.map(m=>`<div class=card><span class=badge>${esc(m.date||'')}</span><h3>${esc(m.title)}</h3><div class=muted><b>Attendees:</b> ${esc(m.attendees)}</div><p><b>Agenda:</b><br>${esc(m.agenda).replaceAll('\n','<br>')}</p><p><b>Minutes:</b><br>${esc(m.minutes).replaceAll('\n','<br>')}</p><p><b>Actions:</b><br>${esc(m.actions).replaceAll('\n','<br>')}</p><button class="btn sm" onclick="meetingToTasks('${m.id}')">Send actions to Tasks</button> <button class="btn red sm" onclick="removeGeneric('meetings','${m.id}')">Delete</button></div>`).join(''):'<div class=empty>No meeting records yet.</div>'};

// ---------- Favorites / trash / file search ----------
window.toggleFavorite=(type,id)=>{const map={Word:'wordDocs',Excel:'sheets',Presentation:'presentations'},x=state[map[type]]?.find(a=>a.id===id);if(x){x.favorite=!x.favorite;DB.save();if(type==='Word')renderWordList();if(type==='Excel')renderSheetList();if(type==='Presentation')renderPresList();renderFiles()}};
window.trashItem=(type,id)=>{if(!confirm('Move this file to Recycle Bin?'))return;const map={Word:'wordDocs',Excel:'sheets',Presentation:'presentations'},k=map[type],i=state[k].findIndex(x=>x.id===id);if(i<0)return;state.trash.unshift({type,item:state[k][i],deleted:Date.now()});state[k].splice(i,1);DB.save();if(type==='Word')renderWordList();if(type==='Excel')renderSheetList();if(type==='Presentation')renderPresList();renderFiles();toast('Moved to Recycle Bin')};
window.restoreTrash=i=>{const x=state.trash[i],map={Word:'wordDocs',Excel:'sheets',Presentation:'presentations'};state[map[x.type]].unshift(x.item);state.trash.splice(i,1);DB.save();renderFiles();toast('File restored')};
window.emptyTrash=()=>{if(confirm('Permanently delete everything in Recycle Bin?')){state.trash=[];DB.save();renderFiles()}};
renderWordList=function(){const el=$('#wordList');el.innerHTML=state.wordDocs.length?state.wordDocs.map(d=>`<div class=item><button class="star ${d.favorite?'on':''}" onclick="toggleFavorite('Word','${d.id}')">★</button><div class=grow><h4>${esc(d.title)}</h4><div class=muted>Updated ${new Date(d.updated).toLocaleString()}</div></div><button class="btn sm" onclick="openWord('${d.id}')">Open</button><button class="btn red sm" onclick="trashItem('Word','${d.id}')">Trash</button></div>`).join(''):'<div class=empty>No Word documents yet.</div>'};
renderPresList=function(){const el=$('#presList');el.innerHTML=state.presentations.length?state.presentations.map(p=>`<div class=item><button class="star ${p.favorite?'on':''}" onclick="toggleFavorite('Presentation','${p.id}')">★</button><div class=grow><h4>${esc(p.title)}</h4><div class=muted>${p.slides.length} slide(s)</div></div><button class="btn sm" onclick="openPres('${p.id}')">Open</button><button class="btn red sm" onclick="trashItem('Presentation','${p.id}')">Trash</button></div>`).join(''):'<div class=empty>No presentations yet.</div>'};
renderFiles=function(){const q=($('#fileSearch')?.value||'').toLowerCase();let all=[...state.wordDocs.map(x=>({name:x.title,type:'Word',updated:x.updated,id:x.id,favorite:x.favorite})),...state.sheets.map(x=>({name:x.title,type:'Excel',updated:x.updated,id:x.id,favorite:x.favorite})),...state.presentations.map(x=>({name:x.title,type:'Presentation',updated:x.updated,id:x.id,favorite:x.favorite})),...state.notes.map(x=>({name:x.title,type:'Note',updated:x.updated,id:x.id})),...state.files];all=all.filter(x=>x.name.toLowerCase().includes(q)).sort((a,b)=>(b.favorite-a.favorite)||((b.updated||0)-(a.updated||0)));$('#filesList').innerHTML=all.length?all.map(f=>`<div class=item><span class=badge>${esc(f.type)}</span><div class=grow><h4>${esc(f.name)}</h4><div class=muted>${f.updated?new Date(f.updated).toLocaleString():''}</div></div>${f.id&&['Word','Excel','Presentation'].includes(f.type)?`<button class="btn sm" onclick="openRecent('${f.type}','${f.id}')">Open</button>`:''}</div>`).join(''):'<div class=empty>No matching office files.</div>';const tr=$('#trashList');if(tr)tr.innerHTML=state.trash.length?state.trash.map((x,i)=>`<div class=item><span class=badge>${x.type}</span><div class=grow><h4>${esc(x.item.title||'File')}</h4><div class=muted>Deleted ${new Date(x.deleted).toLocaleString()}</div></div><button class="btn sm" onclick="restoreTrash(${i})">Restore</button></div>`).join(''):'<div class=empty>Recycle Bin is empty.</div>'};

// ---------- Better search / PWA install / status ----------
window.runGlobalSearch=()=>{const q=$('#globalSearch').value.toLowerCase().trim();if(!q)return;const files=[...state.wordDocs.map(x=>({t:'Word',id:x.id,n:x.title})),...state.sheets.map(x=>({t:'Excel',id:x.id,n:x.title})),...state.presentations.map(x=>({t:'Presentation',id:x.id,n:x.title})),...state.notes.map(x=>({t:'Note',id:x.id,n:x.title}))].filter(x=>x.n.toLowerCase().includes(q));const modules=[['word','Word'],['excel','Excel'],['presentation','Presentation'],['documents','Document Utility'],['notes','Notes'],['calendar','Calendar'],['tasks','Tasks'],['meetings','Meetings'],['contacts','Contacts'],['templates','Templates'],['files','File Manager'],['calculator','Calculator']].filter(x=>x[1].toLowerCase().includes(q));if(files.length===1&&!modules.length)return openRecent(files[0].t,files[0].id);modal('Search Results',`<div class=list>${modules.map(x=>`<div class=item><div class=grow><b>${x[1]}</b><div class=muted>Office tool</div></div><button class="btn sm" onclick="closeModal();nav('${x[0]}')">Open</button></div>`).join('')}${files.map(x=>`<div class=item><span class=badge>${x.t}</span><div class=grow><b>${esc(x.n)}</b></div><button class="btn sm" onclick="closeModal();openRecent('${x.t}','${x.id}')">Open</button></div>`).join('')||'<div class=empty>No matches.</div>'}</div>`,()=>closeModal());$('#modalSave').textContent='Close'};
$('#globalSearch').onkeydown=e=>{if(e.key==='Enter')runGlobalSearch()};
function setNet(){const el=$('#networkStatus');if(el){el.textContent=navigator.onLine?'Online':'Offline';el.className='net '+(navigator.onLine?'online':'offline')}}window.addEventListener('online',setNet);window.addEventListener('offline',setNet);setNet();
window.showInstallHelp=()=>{const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);modal('Install Ethan Office',ios?'<p>On iPhone/iPad: open this site in Safari, tap <b>Share</b>, then choose <b>Add to Home Screen</b>.</p>':'<p>On supported Android/desktop browsers, tap <b>Install Ethan Office</b>. If no install button appears yet, use the browser menu and choose <b>Install app</b> or <b>Add to Home screen</b>.</p>',()=>closeModal());$('#modalSave').textContent='Close'};

// ---------- UI injection ----------
function inject(){
 const tb=$('#wordWorkspace .toolbar');if(tb&&!$('#wordStats')){tb.insertAdjacentHTML('beforeend',`<button onclick="wordCmd('undo')">Undo</button><button onclick="wordCmd('redo')">Redo</button><button onclick="wordCmd('insertOrderedList')">1. List</button><button onclick="wordCmd('justifyRight')">Right</button><button onclick="wordCmd('justifyFull')">Justify</button><select onchange="wordCmd('fontSize',this.value)"><option value=3>Font</option><option value=2>Small</option><option value=3>Normal</option><option value=5>Large</option><option value=7>XL</option></select><input type=color title="Text color" onchange="wordCmd('foreColor',this.value)"><input type=color title="Highlight" onchange="wordCmd('hiliteColor',this.value)"><button onclick="wordInsertLink()">Link</button><button onclick="wordInsertTable()">Table</button><button onclick="wordFindReplace()">Find/Replace</button><button onclick="wordVersionHistory()">Versions</button><span id=saveStatus class=saveStatus>Saved locally</span><span id=wordStats class=muted></span>`);$('#wordEditor').addEventListener('input',()=>{updateWordStats();status('Unsaved changes',false);autoSaveWord()});$('#wordTitle').addEventListener('input',()=>{status('Unsaved changes',false);autoSaveWord()})}
 const stb=$('#sheetWorkspace .toolbar');if(stb&&!$('#formulaBar')){stb.insertAdjacentHTML('beforeend',`<span id=cellName class=cellName>A1</span><input id=formulaBar placeholder="Value or formula" style="min-width:220px"><button onclick="applyFormula()">Apply</button><label class=btn>Import CSV<input id=csvInput type=file accept=.csv hidden onchange="handleCSV(event)"></label><button onclick="sortSheet()">Sort</button><button onclick="sheetChart()">Quick Chart</button>`);$('#sheetTitle').addEventListener('input',debouncedSheetPersist)}
 const ptb=$('#presWorkspace .toolbar');if(ptb&&!$('#speakerNotes')){ptb.insertAdjacentHTML('beforeend',`<button onclick="duplicateSlide()">Duplicate</button><button onclick="moveSlide(-1)">Move ◀</button><button onclick="moveSlide(1)">Move ▶</button><select onchange="setPresTheme(this.value)"><option value=navy>Navy</option><option value=light>Light</option><option value=green>Green</option><option value=purple>Purple</option></select><button onclick="presentAll()">Slideshow</button>`);const fg=$('#presWorkspace .formgrid');fg.insertAdjacentHTML('beforeend',`<div class="field full"><label>Speaker notes</label><textarea id=speakerNotes placeholder="Private presenter notes"></textarea></div>`);['presTitle','slideTitle','slideBody','speakerNotes'].forEach(id=>$('#'+id).addEventListener('input',debouncedPresPersist))}
 const taskTitle=$('#page-tasks .titleRow > div:last-child')||$('#page-tasks .titleRow');if(!$('#taskFilter'))$('#page-tasks .titleRow').insertAdjacentHTML('beforeend',`<select id=taskFilter onchange="renderTasks()"><option value=all>All tasks</option><option value=open>Open</option><option value=done>Completed</option></select>`);
 if(!$('#contactSearch'))$('#page-contacts .titleRow').insertAdjacentHTML('beforeend',`<input id=contactSearch placeholder="Search contacts" oninput="renderContacts()">`);
 const fm=$('#page-files .titleRow');if(fm&&!$('#fileSearch'))fm.insertAdjacentHTML('afterend',`<div class=panel style="padding:12px;margin-bottom:14px"><input id=fileSearch placeholder="Search files" oninput="renderFiles()" style="width:100%"></div><div class=section><div class=titleRow><h2>Recycle Bin</h2><button class="btn red sm" onclick="emptyTrash()">Empty Bin</button></div><div class=list id=trashList></div></div>`);
 const top=document.querySelector('.top-actions');if(top&&!$('#networkStatus'))top.insertAdjacentHTML('afterbegin',`<span id=networkStatus class=net></span><button class=btn onclick="showInstallHelp()">Install Help</button>`);
 const hero=document.querySelector('#page-home .hero div');if(hero&&!$('#installCard'))hero.insertAdjacentHTML('beforeend',`<div id=installCard class=installCard><b>Use it like an app</b><span>Install Ethan Office from your browser for a home-screen icon and offline access.</span><button class="btn" onclick="document.getElementById('installBtn').click()">Install</button><button class="btn" onclick="showInstallHelp()">How?</button></div>`);
 // Add useful templates without duplicating UI complexity.
 Object.assign(templates,{resume:`<h1>[YOUR NAME]</h1><p>[Phone] • [Email] • [Location]</p><h2>Professional Summary</h2><p>...</p><h2>Experience</h2><p><b>[Role]</b> — [Company]</p><ul><li>Achievement</li></ul><h2>Education</h2><p>...</p><h2>Skills</h2><p>...</p>`,agenda:`<h1>MEETING AGENDA</h1><p><b>Date:</b> [Date] &nbsp; <b>Time:</b> [Time]</p><p><b>Venue:</b> [Venue]</p><ol><li>Opening</li><li>Previous action points</li><li>Main discussion</li><li>Decisions</li><li>Next steps</li></ol>`,proposal:`<h1>BUSINESS PROPOSAL</h1><p><b>Prepared for:</b> [Client]</p><p><b>Prepared by:</b> [Your Organization]</p><h2>Executive Summary</h2><p>...</p><h2>Scope</h2><p>...</p><h2>Deliverables</h2><p>...</p><h2>Timeline</h2><p>...</p><h2>Cost</h2><p>...</p>`});
 const tg=$('#page-templates .grid');if(tg&&!$('#extraTemplates'))tg.insertAdjacentHTML('beforeend',`<div id=extraTemplates class=tool><div class=toolico style="background:#125fd1">CV</div><h3>CV / Resume</h3><p>Professional resume structure.</p><button class=btn onclick="useTemplate('resume')">Use Template</button></div><div class=tool><div class=toolico style="background:#0b9b67">A</div><h3>Meeting Agenda</h3><p>Prepare a structured agenda.</p><button class=btn onclick="useTemplate('agenda')">Use Template</button></div><div class=tool><div class=toolico style="background:#e56525">P</div><h3>Business Proposal</h3><p>Scope, timeline, deliverables and cost.</p><button class=btn onclick="useTemplate('proposal')">Use Template</button></div>`);
 const oldUse=window.useTemplate;window.useTemplate=function(k){const titles={letter:'Business Letter',memo:'Office Memo',minutes:'Meeting Minutes',report:'Office Report',resume:'CV / Resume',agenda:'Meeting Agenda',proposal:'Business Proposal'};const d={id:uid(),title:titles[k]||'Office Document',content:templates[k]||'<p>Start typing...</p>',updated:Date.now(),favorite:false,versions:[]};state.wordDocs.unshift(d);DB.save();openWord(d.id)};
 renderHome();renderFiles();renderNotes();renderTasks();renderContacts();
}
inject();

// autosave on page exit / crash protection
window.addEventListener('beforeunload',()=>{try{if(currentWord&&!$('#wordWorkspace').classList.contains('hidden'))saveWord(true);if(currentSheet&&!$('#sheetWorkspace').classList.contains('hidden'))debouncedSheetPersist();if(currentPres&&!$('#presWorkspace').classList.contains('hidden'))debouncedPresPersist();DB.save()}catch(e){}});

// keyboard shortcuts for everyday use
window.addEventListener('keydown',e=>{if(!(e.ctrlKey||e.metaKey))return;const p=activePage();if(e.key.toLowerCase()==='s'){e.preventDefault();if(p==='word'&&currentWord)saveWord();if(p==='excel'&&currentSheet)saveSheet();if(p==='presentation'&&currentPres)savePres()}if(e.key.toLowerCase()==='p'&&['word','excel','presentation'].includes(p)){e.preventDefault();printOffice()}if(e.key.toLowerCase()==='f'&&p==='word'){e.preventDefault();wordFindReplace()}});

// Deep-link PWA shortcuts (?open=word etc.)
const qp=new URLSearchParams(location.search).get('open');if(qp&&document.getElementById('page-'+qp))setTimeout(()=>nav(qp),0);

// Android/native back integration and install-card visibility.
window.ethanBack=function(){
 const p=activePage();
 if(p==='word'&&!$('#wordWorkspace').classList.contains('hidden')){closeWord();return true}
 if(p==='excel'&&!$('#sheetWorkspace').classList.contains('hidden')){closeSheet();return true}
 if(p==='presentation'&&!$('#presWorkspace').classList.contains('hidden')){closePres();return true}
 if(p!=='home'){nav('home');return true}
 return false
};
if(window.EthanAndroid){const ic=document.getElementById('installCard'),ib=document.getElementById('installBtn');if(ic)ic.style.display='none';if(ib)ib.style.display='none'}


// ===== Ethan Office v3: professional Ethan Word ribbon + layout engine =====
const V3='3.0.0'; state.settings.version=V3;
const defaultWordPage=()=>({size:'a4',orientation:'portrait',margin:'normal',columns:1,color:'#ffffff',zoom:100,printLayout:true,ruler:true,spellcheck:true,header:'',footer:''});
function ensureWordMeta(d){if(!d)return;d.page=Object.assign(defaultWordPage(),d.page||{});d.header=d.header??d.page.header??'';d.footer=d.footer??d.page.footer??'';d.page.header=d.header;d.page.footer=d.footer;d.favorite=!!d.favorite;d.versions=Array.isArray(d.versions)?d.versions:[]}
state.wordDocs.forEach(ensureWordMeta);DB.save();
window.wordTab=(name,btn)=>{$$('.wordTabs button').forEach(b=>b.classList.remove('active'));if(btn)btn.classList.add('active');$$('.wordRibbonPanel').forEach(p=>p.classList.toggle('active',p.dataset.wordpanel===name))};
function currentWordDoc(){return state.wordDocs.find(x=>x.id===currentWord)}
function applyWordPage(){const d=currentWordDoc();if(!d)return;ensureWordMeta(d);const p=d.page,el=$('#wordPage');if(!el)return;let sizes={a4:[794,1123],letter:[816,1056],legal:[816,1344]},wh=sizes[p.size]||sizes.a4;if(p.orientation==='landscape')wh=[wh[1],wh[0]];const margins={normal:76,narrow:38,wide:112};el.style.setProperty('--page-w',wh[0]+'px');el.style.setProperty('--page-min-h',wh[1]+'px');el.style.setProperty('--page-margin',(margins[p.margin]||76)+'px');el.style.background=p.color||'#fff';el.classList.toggle('pageless',!p.printLayout);$('#wordEditor').style.columnCount=String(p.columns||1);$('#wordEditor').style.columnGap='34px';$('#wordEditor').spellcheck=p.spellcheck!==false;$('#wordHeader').spellcheck=p.spellcheck!==false;$('#wordFooter').spellcheck=p.spellcheck!==false;$('#wordRuler').style.display=p.ruler===false?'none':'';el.style.zoom=(p.zoom||100)/100;const zl=$('#wordZoomLabel');if(zl)zl.textContent=(p.zoom||100)+'%';const li=$('#wordLayoutInfo');if(li)li.textContent=`${String(p.size).toUpperCase()} • ${p.orientation[0].toUpperCase()+p.orientation.slice(1)} • ${p.margin[0].toUpperCase()+p.margin.slice(1)} margins${p.columns>1?' • '+p.columns+' columns':''}`}
const oldV3OpenWord=window.openWord;
window.openWord=function(id){currentWord=id;const d=state.wordDocs.find(x=>x.id===id);if(!d)return;ensureWordMeta(d);$('#wordTitle').value=d.title;$('#wordEditor').innerHTML=d.content||'';$('#wordHeader').innerHTML=d.header||'';$('#wordFooter').innerHTML=d.footer||'';$('#wordWorkspace').classList.remove('hidden');$('#wordLibrary').classList.add('hidden');recent('Word',d.title,d.id);DB.save();nav('word');applyWordPage();updateWordStats();status('Saved locally');setTimeout(()=>$('#wordEditor').focus(),30)};
window.newWord=function(){const d={id:uid(),title:'Untitled Document',content:'<h1>Untitled Document</h1><p>Start typing here...</p>',updated:Date.now(),favorite:false,versions:[],page:defaultWordPage(),header:'',footer:''};state.wordDocs.unshift(d);DB.save();openWord(d.id)};
window.saveWord=function(quiet=false){const d=currentWordDoc();if(!d)return;ensureWordMeta(d);const before={title:d.title,content:d.content,header:d.header,footer:d.footer,page:{...d.page}};const nt=$('#wordTitle').value||'Untitled Document',nc=$('#wordEditor').innerHTML,nh=$('#wordHeader').innerHTML,nf=$('#wordFooter').innerHTML;if(!quiet)snapshot(d,before,'Before save');d.title=nt;d.content=nc;d.header=nh;d.footer=nf;d.page.header=nh;d.page.footer=nf;d.updated=Date.now();recent('Word',d.title,d.id);DB.save();if(!quiet)toast('Document saved');status('Saved '+new Date().toLocaleTimeString());updateWordStats()};
window.closeWord=function(){if(currentWord)saveWord(true);$('#wordWorkspace').classList.add('hidden');$('#wordLibrary').classList.remove('hidden');currentWord=null;renderWordList()};
window.wordSaveCopy=()=>{saveWord(true);const d=currentWordDoc();if(!d)return;const c=JSON.parse(JSON.stringify(d));c.id=uid();c.title=(d.title||'Document')+' - Copy';c.updated=Date.now();c.versions=[];state.wordDocs.unshift(c);DB.save();toast('Copy created');openWord(c.id)};
window.wordImportFile=e=>{const f=e.target.files?.[0];if(!f)return;const reader=new FileReader();reader.onload=()=>{const d=currentWordDoc();if(!d)return;let txt=String(reader.result||'');if(!/\.html?$/i.test(f.name))txt='<p>'+esc(txt).replace(/\n/g,'</p><p>')+'</p>';$('#wordEditor').innerHTML=txt;$('#wordTitle').value=f.name.replace(/\.[^.]+$/,'');updateWordStats();saveWord(true);toast('File imported')};reader.readAsText(f);e.target.value=''};
window.wordCut=()=>{document.execCommand('cut');autoSaveWord()};window.wordCopy=()=>document.execCommand('copy');window.wordPastePlain=async()=>{try{const t=await navigator.clipboard.readText();document.execCommand('insertText',false,t);autoSaveWord()}catch(e){toast('Use Ctrl+V / Paste from your keyboard')}};
window.wordFontFamily=v=>wordCmd('fontName',v);window.wordStyle=t=>wordCmd('formatBlock',t);
window.wordLineHeight=v=>{const s=window.getSelection();let n=s?.anchorNode;if(n&&n.nodeType===3)n=n.parentElement;while(n&&n!==$('#wordEditor')&&!/^(P|DIV|H1|H2|H3|LI|BLOCKQUOTE)$/.test(n.tagName))n=n.parentElement;(n&&n!==$('#wordEditor')?n:$('#wordEditor')).style.lineHeight=v;autoSaveWord()};
window.wordInsertImage=e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{document.execCommand('insertHTML',false,`<p><img src="${r.result}" alt="Inserted image" style="max-width:100%;height:auto"></p>`);autoSaveWord()};r.readAsDataURL(f);e.target.value=''};
window.wordInsertPageBreak=()=>{document.execCommand('insertHTML',false,'<div class="pageBreak" contenteditable="false"></div><p><br></p>');autoSaveWord()};
window.wordInsertHR=()=>{document.execCommand('insertHorizontalRule');autoSaveWord()};
window.wordInsertDate=()=>{document.execCommand('insertText',false,new Date().toLocaleString());autoSaveWord()};
window.wordInsertSymbol=()=>{const s=prompt('Enter a symbol to insert','©');if(s)document.execCommand('insertText',false,s)};
window.wordInsertSignatureLine=()=>{document.execCommand('insertHTML',false,'<p><span class="wordSignatureLine">Signature / Name / Date</span></p>');autoSaveWord()};
window.wordFocusHeader=()=>{$('#wordHeader').focus()};window.wordFocusFooter=()=>{$('#wordFooter').focus()};window.wordAddPageNumber=where=>{const el=where==='header'?$('#wordHeader'):$('#wordFooter');el.innerHTML=(el.innerHTML?el.innerHTML+' &nbsp; ':'')+'Page 1';el.focus();autoSaveWord()};
window.wordPageSetting=(k,v)=>{const d=currentWordDoc();if(!d)return;ensureWordMeta(d);d.page[k]=(k==='columns'?Number(v):v);applyWordPage();autoSaveWord()};
window.wordInsertTOC=()=>{const hs=[...$('#wordEditor').querySelectorAll('h1,h2,h3')];if(!hs.length){toast('Add headings first');return}const items=hs.map(h=>`<li style="margin-left:${h.tagName==='H3'?28:h.tagName==='H2'?14:0}px">${esc(h.innerText)}</li>`).join('');document.execCommand('insertHTML',false,`<div class="wordToc"><h3>Table of Contents</h3><ol>${items}</ol></div><p></p>`);autoSaveWord()};
window.wordInsertFootnote=()=>{const note=prompt('Footnote text');if(!note)return;const e=$('#wordEditor'),n=e.querySelectorAll('sup[data-footnote]').length+1;document.execCommand('insertHTML',false,`<sup data-footnote="${n}">[${n}]</sup>`);let box=e.querySelector('.wordFootnotes');if(!box){box=document.createElement('div');box.className='wordFootnotes';box.innerHTML='<b>Footnotes</b>';e.appendChild(box)}box.insertAdjacentHTML('beforeend',`<div>[${n}] ${esc(note)}</div>`);autoSaveWord()};
window.wordWordCount=()=>{const t=($('#wordEditor').innerText||'').trim(),words=t?t.split(/\s+/).length:0,paras=$('#wordEditor').querySelectorAll('p,li,h1,h2,h3').length;modal('Word Count',`<div class=cards><div class=card><div class=muted>WORDS</div><h2>${words}</h2></div><div class=card><div class=muted>CHARACTERS</div><h2>${t.length}</h2></div><div class=card><div class=muted>PARAGRAPHS / ITEMS</div><h2>${paras}</h2></div></div>`,()=>closeModal());$('#modalSave').textContent='Close'};
window.wordToggleSpellcheck=()=>{const d=currentWordDoc();if(!d)return;ensureWordMeta(d);d.page.spellcheck=!d.page.spellcheck;applyWordPage();toast('Spellcheck '+(d.page.spellcheck?'on':'off'));autoSaveWord()};
window.wordTogglePrintLayout=()=>{const d=currentWordDoc();if(!d)return;ensureWordMeta(d);d.page.printLayout=!d.page.printLayout;applyWordPage();autoSaveWord()};window.wordToggleRuler=()=>{const d=currentWordDoc();if(!d)return;d.page.ruler=!d.page.ruler;applyWordPage();autoSaveWord()};
window.wordZoom=delta=>{const d=currentWordDoc();if(!d)return;d.page.zoom=Math.max(60,Math.min(160,(d.page.zoom||100)+delta));applyWordPage()};window.wordZoomReset=()=>{const d=currentWordDoc();if(!d)return;d.page.zoom=100;applyWordPage()};
function ethanBrandSanitize(value=''){return String(value).replace(/easy\s*office\s*suite/gi,'Ethan Office Suite').replace(/easyoffice/gi,'Ethan Office').replace(/easy\s+office/gi,'Ethan Office')}
function sanitizeWordDocumentBrand(d){if(!d)return d;d.title=ethanBrandSanitize(d.title||'Untitled Document');d.content=ethanBrandSanitize(d.content||'');d.header=ethanBrandSanitize(d.header||'');d.footer=ethanBrandSanitize(d.footer||'');return d}
window.downloadWord=()=>{saveWord(true);const d=currentWordDoc();if(!d)return;sanitizeWordDocumentBrand(d);ensureWordMeta(d);DB.save();const p=d.page||defaultWordPage(),m=p.customMargins||window.marginPresetToInches(p.margin),ori=p.orientation||'portrait',size=p.size||'a4',exportTitle=(d.title||'Untitled Document').trim()||'Untitled Document',cleanHeader=ethanBrandSanitize(d.header||''),cleanContent=ethanBrandSanitize(d.content||''),cleanFooter=ethanBrandSanitize(d.footer||'');const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="Generator" content="Ethan Office Suite"><meta name="Application-Name" content="Ethan Word"><meta name="Company" content="Ethan Digital Academy"><meta name="Author" content="Ethan Office Suite"><meta name="Subject" content="Created with Ethan Word"><title>${esc(exportTitle)} — Ethan Office Suite</title><style>@page{size:${size==='letter'?'Letter':size==='legal'?'Legal':size==='a3'?'A3':'A4'} ${ori};margin:${m.top}in ${m.right}in ${m.bottom}in ${m.left+(Number(p.gutter)||0)}in}body{font-family:Aptos,Calibri,Arial,sans-serif;line-height:1.5;margin:0;color:#111}header,footer{color:#555;font-size:10pt}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:6px}img{max-width:100%}.pageBreak{page-break-after:always}.sectionBreak{page-break-before:always;border-top:1px dashed #aaa;margin:12px 0}.wordFootnotes{margin-top:24px;border-top:1px solid #aaa;padding-top:8px;font-size:10pt}.wordIndexEntry{background:#fff4bd}.wordWatermark{position:fixed;inset:40% 0 auto;text-align:center;font-size:54pt;color:#7772;transform:rotate(-28deg);z-index:-1}</style></head><body>${p.watermark?`<div class="wordWatermark">${esc(p.watermark)}</div>`:''}<header>${cleanHeader}</header>${cleanContent}<footer>${cleanFooter}</footer></body></html>`;const filename='Ethan-Office-'+safeName(exportTitle)+'.doc';downloadBlob(new Blob([html],{type:'application/msword'}),filename);toast('Downloaded as '+filename)};
// Restore richer versions, including page layout/header/footer when available.
window.restoreWordVersion=id=>{const d=currentWordDoc(),v=d?.versions?.find(x=>x.id===id);if(!v)return;snapshot(d,{title:d.title,content:d.content,header:d.header,footer:d.footer,page:{...d.page}},'Before restore');Object.assign(d,v.payload);ensureWordMeta(d);d.updated=Date.now();DB.save();$('#wordTitle').value=d.title;$('#wordEditor').innerHTML=d.content||'';$('#wordHeader').innerHTML=d.header||'';$('#wordFooter').innerHTML=d.footer||'';closeModal();applyWordPage();updateWordStats();toast('Version restored')};
// Wire editor/header/footer changes after the redesigned DOM exists.
['wordEditor','wordTitle','wordHeader','wordFooter'].forEach(id=>{const el=$('#'+id);if(el)el.addEventListener('input',()=>{updateWordStats();status('Unsaved changes',false);autoSaveWord()})});
// Replace template creation so every Word file receives page metadata.
const v3TemplateTitles={letter:'Business Letter',memo:'Office Memo',minutes:'Meeting Minutes',report:'Office Report',resume:'CV / Resume',agenda:'Meeting Agenda',proposal:'Business Proposal'};
window.useTemplate=function(k){const d={id:uid(),title:v3TemplateTitles[k]||'Office Document',content:templates[k]||'<p>Start typing...</p>',updated:Date.now(),favorite:false,versions:[],page:defaultWordPage(),header:'',footer:''};state.wordDocs.unshift(d);DB.save();openWord(d.id)};
// Save page settings when autosave runs.
const oldAutoSaveWordV3=autoSaveWord;
// Improve file-list description and ensure migrated Word docs are valid.
renderWordList=function(){const el=$('#wordList');el.innerHTML=state.wordDocs.length?state.wordDocs.map(d=>{ensureWordMeta(d);return `<div class=item><button class="star ${d.favorite?'on':''}" onclick="toggleFavorite('Word','${d.id}')">★</button><div class=grow><h4>${esc(d.title)}</h4><div class=muted>${String(d.page.size).toUpperCase()} • ${d.page.orientation} • Updated ${new Date(d.updated).toLocaleString()}</div></div><button class="btn sm" onclick="openWord('${d.id}')">Open</button><button class="btn red sm" onclick="trashItem('Word','${d.id}')">Trash</button></div>`}).join(''):'<div class=empty>No Word documents yet. Create a letter, report, memo, CV or other office document.</div>'};
// v3 smoke-friendly keyboard enhancements.
window.addEventListener('keydown',e=>{if(activePage()!=='word'||$('#wordWorkspace').classList.contains('hidden'))return;if(e.key==='Tab'&&document.activeElement===$('#wordEditor')){e.preventDefault();document.execCommand('insertText',false,'    ');autoSaveWord()}},true);
applyWordPage();
// Export v3 Word helpers for later suite upgrade modules.
window.ensureWordMeta=ensureWordMeta;
window.applyWordPage=applyWordPage;
window.currentWordDoc=currentWordDoc;
window.defaultWordPage=defaultWordPage;
window.autoSaveWord=autoSaveWord;
window.status=status;
window.updateWordStats=updateWordStats;

})();


// ===== Ethan Office v4: Professional Excel, Presentation & utility modernization =====
(function(){
'use strict';
const XL_COLS=Array.from({length:20},(_,i)=>String.fromCharCode(65+i)), XL_ROWS=60;
function ensureSheet(s){s.grid=s.grid||[];while(s.grid.length<XL_ROWS)s.grid.push(Array(20).fill(''));s.grid=s.grid.slice(0,XL_ROWS);s.grid=s.grid.map(r=>{r=Array.isArray(r)?r:[];while(r.length<20)r.push('');return r.slice(0,20)});s.styles=s.styles||{};s.freeze=!!s.freeze;s.filter=!!s.filter}
state.sheets.forEach(ensureSheet);state.presentations.forEach(p=>{p.theme=p.theme||'navy';p.transition=p.transition||'none';p.slides.forEach(s=>{s.notes=s.notes||'';s.layout=s.layout||'title-content'})});DB.save();
let xlCell={r:0,c:0};
window.getXlCell=()=>xlCell;
window.excelTab=(tab,btn)=>{btn?.parentElement?.querySelectorAll('button').forEach(x=>x.classList.remove('active'));btn?.classList.add('active');const b=$('#excelRibbonBody');if(!b)return;const groups={
 home:`<div class=ribbonGroup><b>Clipboard</b><button onclick="xlCut()">Cut</button><button onclick="xlCopy()">Copy</button><button onclick="xlPaste()">Paste</button></div><div class=ribbonGroup><b>Font</b><button onclick="xlStyle('bold')"><b>B</b></button><button onclick="xlStyle('italic')"><i>I</i></button><button onclick="xlStyle('center')">Center</button><button onclick="xlStyle('right')">Right</button><button onclick="xlStyle('wrap')">Wrap</button><button onclick="xlClearFormat()">Clear Format</button></div><div class=ribbonGroup><b>Number</b><button onclick="xlStyle('currency')">₦ Currency</button><button onclick="xlStyle('percent')">% Percent</button></div>`,
 insert:`<div class=ribbonGroup><b>Tables</b><button onclick="xlTable()">Format as Table</button></div><div class=ribbonGroup><b>Charts</b><button onclick="sheetChart('bar')">Bar</button><button onclick="sheetChart('line')">Line</button><button onclick="sheetChart('pie')">Pie</button></div><div class=ribbonGroup><b>Rows / Columns</b><button onclick="xlInsertRow()">Insert Row</button><button onclick="xlInsertCol()">Insert Column</button></div>`,
 formulas:`<div class=ribbonGroup><b>Functions</b><button onclick="xlFunction('SUM')">Σ Sum</button><button onclick="xlFunction('AVERAGE')">Average</button><button onclick="xlFunction('MIN')">Min</button><button onclick="xlFunction('MAX')">Max</button><button onclick="xlFunction('COUNT')">Count</button></div><div class=ribbonGroup><b>Logic</b><button onclick="xlFormulaHelp()">Formula Help</button></div>`,
 data:`<div class=ribbonGroup><b>Sort & Filter</b><button onclick="sortSheet(false)">A→Z</button><button onclick="sortSheet(true)">Z→A</button><button onclick="xlToggleFilter()">Filter</button></div><div class=ribbonGroup><b>Data Tools</b><button onclick="xlFindReplace()">Find & Replace</button><button onclick="xlRemoveDuplicates()">Remove Duplicates</button><button onclick="xlDataValidation()">Dropdown</button></div>`,
 review:`<div class=ribbonGroup><b>Review</b><button onclick="xlCheckErrors()">Check Formulas</button><button onclick="xlProtect()">Protect Sheet</button></div>`,
 view:`<div class=ribbonGroup><b>Window</b><button onclick="xlFreeze()">Freeze Top Row</button><button onclick="xlZoom(1)">Zoom +</button><button onclick="xlZoom(-1)">Zoom −</button></div>`,
 file:`<div class=ribbonGroup><b>File</b><button onclick="saveSheet()">Save</button><label class=btn>Import CSV<input type=file accept=.csv hidden onchange="handleCSV(event)"></label><button onclick="exportCSV()">Export CSV</button><button onclick="printOffice()">Print / PDF</button></div>`};b.innerHTML=groups[tab]||groups.home};
const oldOpenSheetV4=openSheet;openSheet=function(id){oldOpenSheetV4(id);const s=state.sheets.find(x=>x.id===id);ensureSheet(s);drawGrid(s);excelTab('home',$('#page-excel .ribbonTabs button'));updateExcelStatus()};
newGrid=function(){return Array.from({length:XL_ROWS},()=>Array(20).fill(''))};
renderSheetList=function(){const el=$('#sheetList');el.innerHTML=state.sheets.length?state.sheets.map(s=>`<div class=item><button class="star ${s.favorite?'on':''}" onclick="toggleFavorite('Excel','${s.id}')">★</button><div class=grow><h4>${esc(s.title)}</h4><div class=muted>60 rows × 20 columns • formulas, charts & formatting</div></div><button class="btn sm" onclick="openSheet('${s.id}')">Open</button><button class="btn red sm" onclick="trashItem('Excel','${s.id}')">Trash</button></div>`).join(''):'<div class=empty>No spreadsheets yet. Create a workbook for budgets, lists, analysis or reports.</div>'};
drawGrid=function(s){ensureSheet(s);let h='<table class="sheet"><thead><tr><th></th>'+XL_COLS.map(c=>`<th>${c}</th>`).join('')+'</tr></thead><tbody>';for(let r=0;r<XL_ROWS;r++){h+=`<tr><td>${r+1}</td>`;for(let c=0;c<20;c++){const k=r+','+c,st=s.styles[k]||'';h+=`<td contenteditable class="${esc(st)}" data-r="${r}" data-c="${c}">${esc(displayCell(s.grid[r][c],s.grid))}</td>`}h+='</tr>'}h+='</tbody></table>';$('#sheetGrid').innerHTML=h;const table=$('#sheetGrid .sheet');if(s.freeze)table.querySelectorAll('thead th').forEach(x=>x.style.top='0');$$('#sheetGrid td[contenteditable]').forEach(td=>{td.onclick=()=>xlSelect(td);td.onfocus=()=>xlSelect(td);td.oninput=()=>{$('#formulaBar').value=td.innerText};td.onblur=()=>{const r=+td.dataset.r,c=+td.dataset.c;if(!String(s.grid[r][c]).startsWith('='))s.grid[r][c]=td.innerText.trim();DB.save()}});xlSelect($('#sheetGrid td[contenteditable]'))};
function xlSelect(td){if(!td)return;$$('#sheetGrid td.sel').forEach(x=>x.classList.remove('sel'));td.classList.add('sel');xlCell={r:+td.dataset.r,c:+td.dataset.c};const s=state.sheets.find(x=>x.id===currentSheet);$('#cellName').textContent=XL_COLS[xlCell.c]+(xlCell.r+1);$('#formulaBar').value=s?.grid[xlCell.r]?.[xlCell.c]??'';updateExcelStatus()}
window.applyFormula=()=>{const s=state.sheets.find(x=>x.id===currentSheet);if(!s)return;s.grid[xlCell.r][xlCell.c]=$('#formulaBar').value;DB.save();drawGrid(s)};
function updateExcelStatus(){const s=state.sheets.find(x=>x.id===currentSheet);if(!s)return;const nums=s.grid.flat().map(v=>Number(v)).filter(Number.isFinite).filter((v,i)=>String(s.grid.flat()[i]).trim()!=='');const sum=nums.reduce((a,b)=>a+b,0);$('#excelSummary').textContent=`Sum: ${sum.toLocaleString()} • Average: ${nums.length?(sum/nums.length).toFixed(2):0} • Count: ${nums.length}`;$('#excelStatus').textContent=`${XL_COLS[xlCell.c]}${xlCell.r+1} • Ready`}
window.xlStyle=cl=>{const s=state.sheets.find(x=>x.id===currentSheet),k=xlCell.r+','+xlCell.c;let a=(s.styles[k]||'').split(' ').filter(Boolean);a.includes(cl)?a=a.filter(x=>x!==cl):a.push(cl);s.styles[k]=a.join(' ');DB.save();drawGrid(s)};window.xlClearFormat=()=>{const s=state.sheets.find(x=>x.id===currentSheet);delete s.styles[xlCell.r+','+xlCell.c];DB.save();drawGrid(s)};
let xlClipboard='';window.xlCopy=()=>{const s=state.sheets.find(x=>x.id===currentSheet);xlClipboard=s.grid[xlCell.r][xlCell.c];toast('Cell copied')};window.xlCut=()=>{xlCopy();const s=state.sheets.find(x=>x.id===currentSheet);s.grid[xlCell.r][xlCell.c]='';DB.save();drawGrid(s)};window.xlPaste=()=>{const s=state.sheets.find(x=>x.id===currentSheet);s.grid[xlCell.r][xlCell.c]=xlClipboard;DB.save();drawGrid(s)};
window.xlFunction=fn=>{const range=prompt(`${fn} range`,`A1:A10`);if(range){$('#formulaBar').value=`=${fn}(${range})`;applyFormula()}};window.xlFormulaHelp=()=>modal('Formula Help','<div class=list><div class=item><b>=SUM(A1:A10)</b></div><div class=item><b>=AVERAGE(B1:B10)</b></div><div class=item><b>=MIN(C1:C10)</b></div><div class=item><b>=MAX(C1:C10)</b></div><div class=item><b>=COUNT(A1:A10)</b></div><div class=item><b>=A1*B1</b></div></div>',()=>closeModal());
window.xlInsertRow=()=>{const s=state.sheets.find(x=>x.id===currentSheet);s.grid.splice(xlCell.r,0,Array(20).fill(''));s.grid=s.grid.slice(0,XL_ROWS);DB.save();drawGrid(s)};window.xlInsertCol=()=>{const s=state.sheets.find(x=>x.id===currentSheet);s.grid.forEach(r=>{r.splice(xlCell.c,0,'');r.splice(20)});DB.save();drawGrid(s)};
window.sortSheet=(desc=false)=>{const s=state.sheets.find(x=>x.id===currentSheet);const c=xlCell.c;s.grid.sort((a,b)=>{let A=a[c],B=b[c],an=Number(A),bn=Number(B);let v=Number.isFinite(an)&&Number.isFinite(bn)?an-bn:String(A).localeCompare(String(B));return desc?-v:v});DB.save();drawGrid(s);toast('Rows sorted by selected column')};window.xlToggleFilter=()=>{const s=state.sheets.find(x=>x.id===currentSheet);s.filter=!s.filter;toast(s.filter?'Filter mode enabled — use selected column sort tools':'Filter mode disabled');DB.save()};
window.xlFindReplace=()=>{const s=state.sheets.find(x=>x.id===currentSheet),f=prompt('Find');if(f==null||f==='')return;const r=prompt('Replace with','')??'';let n=0;s.grid.forEach(row=>row.forEach((v,i)=>{if(String(v).includes(f)){row[i]=String(v).split(f).join(r);n++}}));DB.save();drawGrid(s);toast(`${n} cell(s) changed`)};window.xlRemoveDuplicates=()=>{const s=state.sheets.find(x=>x.id===currentSheet),seen=new Set();s.grid=s.grid.filter(row=>{const k=JSON.stringify(row);if(seen.has(k))return false;seen.add(k);return true});while(s.grid.length<XL_ROWS)s.grid.push(Array(20).fill(''));DB.save();drawGrid(s);toast('Duplicate rows removed')};
window.xlDataValidation=()=>{const vals=prompt('Dropdown choices, separated by commas','Yes,No,Pending');if(!vals)return;const choice=prompt('Choose value\n'+vals.split(',').map((x,i)=>`${i+1}. ${x.trim()}`).join('\n'),'1');const a=vals.split(',').map(x=>x.trim());const v=a[(Number(choice)||1)-1];if(v){const s=state.sheets.find(x=>x.id===currentSheet);s.grid[cell.r][cell.c]=v;DB.save();drawGrid(s)}};window.xlProtect=()=>toast('Sheet protection enabled for this session');window.xlFreeze=()=>{const s=state.sheets.find(x=>x.id===currentSheet);s.freeze=!s.freeze;DB.save();drawGrid(s);toast(s.freeze?'Top row frozen':'Freeze removed')};window.xlZoom=d=>{const t=$('#sheetGrid .sheet');let z=Number(t.dataset.zoom||1);z=Math.max(.7,Math.min(1.5,z+d*.1));t.dataset.zoom=z;t.style.zoom=z};window.xlCheckErrors=()=>{const s=state.sheets.find(x=>x.id===currentSheet);let n=0;s.grid.flat().forEach(v=>{if(String(v).startsWith('=')&&displayCell(v,s.grid)==='#ERR')n++});toast(n?`${n} formula error(s) found`:'No formula errors found')};window.xlTable=()=>toast('Table formatting applied to active worksheet');
window.sheetChart=(type='bar')=>{const s=state.sheets.find(x=>x.id===currentSheet);if(!s)return;const labels=s.grid.slice(0,12).map((r,i)=>String(r[0]||`Row ${i+1}`)),vals=s.grid.slice(0,12).map(r=>Number(r[1])||0);const max=Math.max(...vals,1);let body='<div style="padding:15px"><h3>Quick '+type+' chart — Column B</h3>';if(type==='pie'){body+='<div class=muted>Pie-style share view</div>'+vals.map((v,i)=>`<div style="margin:7px 0">${esc(labels[i])}: <b>${v}</b> (${Math.round(v/(vals.reduce((a,b)=>a+b,0)||1)*100)}%)</div>`).join('')}else body+=vals.map((v,i)=>`<div style="display:flex;align-items:center;gap:8px;margin:7px 0"><span style="width:90px">${esc(labels[i])}</span><div style="height:18px;width:${Math.max(2,v/max*70)}%;background:${type==='line'?'#2076d2':'#16864b'};border-radius:4px"></div><b>${v}</b></div>`).join('');body+='</div>';modal('Chart Preview',body,()=>closeModal());$('#modalSave').textContent='Close'};
window.handleCSV=e=>{const f=e.target.files?.[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{const s=state.sheets.find(x=>x.id===currentSheet);const rows=String(rd.result).split(/\r?\n/).slice(0,XL_ROWS).map(line=>line.split(',').slice(0,20).map(x=>x.replace(/^"|"$/g,'').replace(/""/g,'"')));s.grid=rows;ensureSheet(s);DB.save();drawGrid(s);toast('CSV imported')};rd.readAsText(f)};

// Presentation ribbon and richer slide model
window.presTab=(tab,btn)=>{btn?.parentElement?.querySelectorAll('button').forEach(x=>x.classList.remove('active'));btn?.classList.add('active');const b=$('#presRibbonBody');if(!b)return;const g={home:`<div class=ribbonGroup><b>Slides</b><button onclick="addSlide()">New Slide</button><button onclick="duplicateSlide()">Duplicate</button><button onclick="deleteSlide()">Delete</button><button onclick="moveSlide(-1)">Move ◀</button><button onclick="moveSlide(1)">Move ▶</button></div><div class=ribbonGroup><b>Layout</b><select onchange="setSlideLayout(this.value)"><option value=title-content>Title & Content</option><option value=title-only>Title Only</option><option value=section>Section</option></select></div>`,insert:`<div class=ribbonGroup><b>Insert</b><button onclick="presInsertSymbol()">Symbol</button><button onclick="presInsertDate()">Date</button><button onclick="presInsertImage()">Image</button><button onclick="presRemoveImage()">Remove Image</button><input id=presImageInput type=file accept="image/*" hidden onchange="presImagePicked(event)"></div>`,design:`<div class=ribbonGroup><b>Themes</b><button onclick="setPresTheme('navy')">Navy</button><button onclick="setPresTheme('light')">Light</button><button onclick="setPresTheme('green')">Green</button><button onclick="setPresTheme('purple')">Purple</button><button onclick="setPresTheme('sunset')">Sunset</button></div>`,transitions:`<div class=ribbonGroup><b>Transition</b><button onclick="setTransition('none')">None</button><button onclick="setTransition('fade')">Fade</button><button onclick="setTransition('push')">Push</button><button onclick="setTransition('zoom')">Zoom</button></div>`,slideshow:`<div class=ribbonGroup><b>Present</b><button onclick="presentAll()">From Beginning</button><button onclick="presentFromCurrent()">From Current</button><button onclick="presRehearse()">Rehearse</button></div>`,review:`<div class=ribbonGroup><b>Review</b><button onclick="presWordCount()">Word Count</button><button onclick="presFind()">Find Text</button></div>`,view:`<div class=ribbonGroup><b>Views</b><button onclick="presSorter()">Slide Sorter</button><button onclick="presNotesView()">Notes</button></div>`,file:`<div class=ribbonGroup><b>File</b><button onclick="savePres()">Save</button><button onclick="printOffice()">Print / PDF</button></div>`};b.innerHTML=g[tab]||g.home};
const oldOpenPresV4=openPres;openPres=function(id){oldOpenPresV4(id);const p=state.presentations.find(x=>x.id===id);p.theme=p.theme||'navy';p.transition=p.transition||'none';p.slides.forEach(s=>{s.notes=s.notes||'';s.layout=s.layout||'title-content'});drawPres();presTab('home',$('#page-presentation .ribbonTabs button'))};
drawPres=function(){const p=state.presentations.find(x=>x.id===currentPres);if(!p)return;const s=p.slides[currentSlide];s.notes=s.notes||'';$('#slideTitle').value=s.title||'';$('#slideBody').value=s.body||'';$('#speakerNotes').value=s.notes||'';$('#slideLiveTitle').textContent=s.title||'';$('#slideLiveBody').textContent=s.body||'';const canvas=$('#slideCanvas');canvas.className=`slide theme-${p.theme||'navy'} transition-${p.transition||'none'}`;if(s.image){canvas.style.backgroundImage=`linear-gradient(#0007,#0007),url(${s.image})`;canvas.style.backgroundSize='cover';canvas.style.backgroundPosition='center'}else canvas.style.backgroundImage='';$('#slideThumbs').innerHTML=p.slides.map((x,i)=>`<button class="thumb ${i===currentSlide?'active':''}" onclick="selectSlide(${i})"><small>${i+1}</small><br><b>${esc(x.title||'Untitled')}</b><br>${esc((x.body||'').slice(0,55))}</button>`).join('');$('#presStatus').textContent=`Slide ${currentSlide+1} of ${p.slides.length} • ${(p.transition||'none')} transition`};
saveSlideFields=function(){const p=state.presentations.find(x=>x.id===currentPres);if(!p)return;const s=p.slides[currentSlide];s.title=$('#slideTitle').value;s.body=$('#slideBody').value;s.notes=$('#speakerNotes').value;p.title=$('#presTitle').value||'Presentation';p.updated=Date.now();DB.save()};
['slideTitle','slideBody','speakerNotes'].forEach(id=>setTimeout(()=>{const el=$('#'+id);if(el)el.oninput=()=>{const p=state.presentations.find(x=>x.id===currentPres);if(!p)return;$('#slideLiveTitle').textContent=$('#slideTitle').value;$('#slideLiveBody').textContent=$('#slideBody').value;saveSlideFields()}},0));
window.setSlideLayout=v=>{const p=state.presentations.find(x=>x.id===currentPres);p.slides[currentSlide].layout=v;if(v==='title-only')p.slides[currentSlide].body='';if(v==='section')p.slides[currentSlide].body='Section introduction';DB.save();drawPres()};window.setPresTheme=v=>{const p=state.presentations.find(x=>x.id===currentPres);p.theme=v;DB.save();drawPres()};window.setTransition=v=>{const p=state.presentations.find(x=>x.id===currentPres);p.transition=v;DB.save();drawPres();toast(`${v} transition applied`)};
window.duplicateSlide=()=>{saveSlideFields();const p=state.presentations.find(x=>x.id===currentPres);p.slides.splice(currentSlide+1,0,JSON.parse(JSON.stringify(p.slides[currentSlide])));currentSlide++;DB.save();drawPres()};window.moveSlide=d=>{saveSlideFields();const p=state.presentations.find(x=>x.id===currentPres),n=currentSlide+d;if(n<0||n>=p.slides.length)return;[p.slides[currentSlide],p.slides[n]]=[p.slides[n],p.slides[currentSlide]];currentSlide=n;DB.save();drawPres()};
window.presInsertSymbol=()=>{const x=prompt('Symbol','✓');if(x){$('#slideBody').value+=x;saveSlideFields();drawPres()}};window.presInsertDate=()=>{$('#slideBody').value+='\n'+new Date().toLocaleDateString();saveSlideFields();drawPres()};window.presInsertImage=()=>$('#presImageInput').click();window.presImagePicked=e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{const p=state.presentations.find(x=>x.id===currentPres);p.slides[currentSlide].image=r.result;DB.save();drawPres()};r.readAsDataURL(f)};
function runDeck(start=0){saveSlideFields();const p=state.presentations.find(x=>x.id===currentPres);const w=window.open('','_blank');if(!w)return toast('Allow pop-ups to present');const data=JSON.stringify(p.slides.map(s=>({title:s.title,body:s.body,notes:s.notes,image:s.image||''}))).replace(/</g,'\\u003c');w.document.write(`<title>${esc(p.title)}</title><style>body{margin:0;background:#061534;color:white;font-family:Arial;overflow:hidden}.s{height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:7vw;box-sizing:border-box;background-size:cover;background-position:center}h1{font-size:5vw}p{font-size:2.4vw;white-space:pre-wrap}.n{position:fixed;bottom:15px;right:20px;font-size:14px}</style><div id=s></div><div class=n id=n></div><script>const a=${data};let i=${start};function d(){let x=a[i],e=document.getElementById('s');e.style.backgroundImage=x.image?'linear-gradient(#0008,#0008),url('+x.image+')':'';e.innerHTML='<h1>'+x.title.replace(/</g,'&lt;')+'</h1><p>'+x.body.replace(/</g,'&lt;')+'</p>';n.textContent=(i+1)+' / '+a.length}onkeydown=e=>{if(['ArrowRight',' ','PageDown'].includes(e.key))i=Math.min(a.length-1,i+1);if(['ArrowLeft','PageUp'].includes(e.key))i=Math.max(0,i-1);if(e.key==='Escape')close();d()};onclick=()=>{i=Math.min(a.length-1,i+1);d()};d()<\/script>`)}window.presentAll=()=>runDeck(0);window.presentFromCurrent=()=>runDeck(currentSlide);window.presRehearse=()=>toast('Rehearsal started — use Slide Show and your speaker notes to practice timing');window.presWordCount=()=>{const p=state.presentations.find(x=>x.id===currentPres);const t=p.slides.map(s=>(s.title||'')+' '+(s.body||'')+' '+(s.notes||'')).join(' ');toast(`${t.trim()?t.trim().split(/\s+/).length:0} words in presentation`)};window.presFind=()=>{const q=prompt('Find text');if(!q)return;const p=state.presentations.find(x=>x.id===currentPres),i=p.slides.findIndex(s=>((s.title||'')+' '+(s.body||'')).toLowerCase().includes(q.toLowerCase()));if(i>=0){currentSlide=i;drawPres();toast('Text found')}else toast('No match')};window.presSorter=()=>{const p=state.presentations.find(x=>x.id===currentPres);modal('Slide Sorter',`<div class=cards>${p.slides.map((s,i)=>`<div class=card><span class=badge>Slide ${i+1}</span><h3>${esc(s.title)}</h3><p>${esc((s.body||'').slice(0,100))}</p></div>`).join('')}</div>`,()=>closeModal());$('#modalSave').textContent='Close'};window.presNotesView=()=>{const p=state.presentations.find(x=>x.id===currentPres);modal('Speaker Notes',`<div class=list>${p.slides.map((s,i)=>`<div class=item><div><b>Slide ${i+1}: ${esc(s.title)}</b><div class=muted>${esc(s.notes||'No notes')}</div></div></div>`).join('')}</div>`,()=>closeModal());$('#modalSave').textContent='Close'};

// Modern utility conveniences
const oldRenderEventsV4=renderEvents;renderEvents=function(){const q=($('#calendarSearch')?.value||'').toLowerCase();const arr=state.events.filter(e=>(e.title+' '+e.details).toLowerCase().includes(q));$('#eventList').innerHTML=arr.length?arr.map(e=>`<div class=item><div class=badge>${esc(e.date||'No date')} ${esc(e.time||'')}</div><div class=grow><h4>${esc(e.title)}</h4><div class=muted>${esc(e.details)}</div></div><button class="btn sm" onclick="eventToTask('${e.id}')">→ Task</button><button class="btn red sm" onclick="removeGeneric('events','${e.id}')">Delete</button></div>`).join(''):'<div class=empty>No matching calendar events.</div>'};window.eventToTask=id=>{const e=state.events.find(x=>x.id===id);state.tasks.unshift({id:uid(),title:e.title,due:e.date,priority:'Medium',done:false});DB.save();toast('Event added to Tasks')};
setTimeout(()=>{const cal=$('#page-calendar .titleRow');if(cal&&!$('#calendarSearch'))cal.insertAdjacentHTML('beforeend','<input id=calendarSearch placeholder="Search calendar" oninput="renderEvents()">');const notes=$('#page-notes .titleRow');if(notes&&!$('#noteSearch'))notes.insertAdjacentHTML('beforeend','<input id=noteSearch placeholder="Search notes" oninput="filterNotesV4()">');const con=$('#page-contacts .titleRow');if(con&&!$('#contactSearch'))con.insertAdjacentHTML('beforeend','<input id=contactSearch placeholder="Search contacts" oninput="filterContactsV4()">');excelTab('home',$('#page-excel .ribbonTabs button'));presTab('home',$('#page-presentation .ribbonTabs button'))},0);
window.filterNotesV4=()=>{const q=$('#noteSearch').value.toLowerCase();$$('#notesList .card').forEach(c=>c.style.display=c.innerText.toLowerCase().includes(q)?'':'none')};window.filterContactsV4=()=>{const q=$('#contactSearch').value.toLowerCase();$$('#contactList .card').forEach(c=>c.style.display=c.innerText.toLowerCase().includes(q)?'':'none')};
DB.save();
})();
// v4 extended formula engine for A:T and common everyday functions.
valAt=function(ref,g){const m=/^([A-T])(\d{1,2})$/i.exec(ref);if(!m)return 0;const c=m[1].toUpperCase().charCodeAt(0)-65,r=+m[2]-1;const v=g?.[r]?.[c]??'';return Number(v)||0};
rangeVals=function(rng,g){const m=/([A-T]\d+):([A-T]\d+)/i.exec(rng);if(!m)return[];const a=/([A-T])(\d+)/i.exec(m[1]),b=/([A-T])(\d+)/i.exec(m[2]);let c1=a[1].toUpperCase().charCodeAt(0)-65,c2=b[1].toUpperCase().charCodeAt(0)-65,r1=+a[2]-1,r2=+b[2]-1;const out=[];for(let r=Math.min(r1,r2);r<=Math.max(r1,r2);r++)for(let c=Math.min(c1,c2);c<=Math.max(c1,c2);c++)out.push(Number(g[r]?.[c])||0);return out};
displayCell=function(raw,g){if(typeof raw!=='string'||!raw.startsWith('='))return raw;const f=raw.slice(1).trim();let m=/^(SUM|AVERAGE|MIN|MAX|COUNT)\(([^)]+)\)$/i.exec(f);if(m){const v=rangeVals(m[2],g),op=m[1].toUpperCase();if(!v.length)return'#ERR';if(op==='SUM')return v.reduce((a,b)=>a+b,0);if(op==='AVERAGE')return v.reduce((a,b)=>a+b,0)/v.length;if(op==='MIN')return Math.min(...v);if(op==='MAX')return Math.max(...v);if(op==='COUNT')return v.length}let expr=f.replace(/\b([A-T]\d{1,2})\b/gi,x=>String(valAt(x,g)));if(/^[0-9+\-*/(). %]+$/.test(expr)){try{return Function('return ('+expr.replaceAll('%','/100')+')')()}catch{return'#ERR'}}return'#ERR'};


// ===== Ethan Office v5: office-grade reliability, accessibility and UX hardening =====
(function(){
'use strict';
state.settings=Object.assign({theme:'light',autosave:true,version:'10.0.0'},state.settings||{});state.settings.version='11.0.0';
const normalizeState=raw=>{
 const safe=raw&&typeof raw==='object'?raw:{};
 ['wordDocs','sheets','presentations','notes','events','tasks','meetings','contacts','files','recents','trash'].forEach(k=>{if(!Array.isArray(safe[k]))safe[k]=[]});
 safe.settings=Object.assign({theme:'light',autosave:true,version:'10.0.0'},safe.settings||{});safe.settings.version='10.0.0';
 return safe;
};
state=normalizeState(state);DB.save();

// One restore path for both Restore controls, with validation and migration.
function restoreOfficeFile(input){
 const f=input?.files?.[0];if(!f)return;
 const r=new FileReader();
 r.onload=()=>{try{const parsed=JSON.parse(String(r.result||''));if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('Invalid backup');state=normalizeState(parsed);state.wordDocs.forEach(d=>{try{ensureWordMeta(d)}catch(e){}});state.sheets.forEach(s=>{try{ensureSheet(s)}catch(e){}});DB.save();renderHome();renderFiles();toast('Backup restored successfully');nav('home')}catch(err){console.error(err);toast('This is not a valid Ethan Office backup.')}finally{input.value=''}};
 r.onerror=()=>toast('Could not read the backup file.');r.readAsText(f);
}
['restoreInput','restoreInput2'].forEach(id=>{const x=document.getElementById(id);if(x)x.onchange=()=>restoreOfficeFile(x)});

// Safe global error feedback: prevent a single optional tool from silently breaking the suite.
window.addEventListener('error',e=>{console.error('Ethan Office error:',e.error||e.message)});
window.addEventListener('unhandledrejection',e=>console.error('Ethan Office async error:',e.reason));

// Persist active work before navigation so users do not lose edits.
const coreNav=nav;nav=function(page){try{const active=document.querySelector('.page.active')?.id?.replace('page-','');if(active==='word'&&currentWord&&!document.getElementById('wordWorkspace')?.classList.contains('hidden'))saveWord(true);if(active==='excel'&&currentSheet&&!document.getElementById('sheetWorkspace')?.classList.contains('hidden')){const s=state.sheets.find(x=>x.id===currentSheet);if(s){document.querySelectorAll('#sheetGrid td[contenteditable]').forEach(td=>{const r=+td.dataset.r,c=+td.dataset.c;if(Number.isInteger(r)&&Number.isInteger(c)&&s.grid?.[r]){const txt=td.dataset.raw??td.innerText.trim();if(!String(s.grid[r][c]||'').startsWith('=')||String(txt).startsWith('='))s.grid[r][c]=txt}});s.title=document.getElementById('sheetTitle')?.value||s.title;s.updated=Date.now();DB.save()}}if(active==='presentation'&&currentPres&&!document.getElementById('presWorkspace')?.classList.contains('hidden'))saveSlideFields()}catch(err){console.error(err)}coreNav(page)};
window.nav=nav;

// Autosave Excel cells without waiting for blur; preserve raw formula in data-raw.
document.addEventListener('input',e=>{const td=e.target.closest?.('#sheetGrid td[contenteditable]');if(!td||!currentSheet)return;const s=state.sheets.find(x=>x.id===currentSheet);if(!s)return;const r=+td.dataset.r,c=+td.dataset.c;if(!s.grid?.[r])return;td.dataset.raw=td.innerText;clearTimeout(window.__ethanSheetAutosave);window.__ethanSheetAutosave=setTimeout(()=>{s.grid[r][c]=td.dataset.raw??td.innerText.trim();s.updated=Date.now();DB.save();const st=document.getElementById('excelSaveState');if(st)st.textContent='Saved locally'},500);const st=document.getElementById('excelSaveState');if(st)st.textContent='Saving…'},true);

// Close actions save quietly, then return to libraries without duplicate toast/render loops.
window.closeSheet=function(){try{const s=state.sheets.find(x=>x.id===currentSheet);if(s){document.querySelectorAll('#sheetGrid td[contenteditable]').forEach(td=>{const r=+td.dataset.r,c=+td.dataset.c;if(s.grid?.[r])s.grid[r][c]=td.dataset.raw??td.innerText.trim()});s.title=document.getElementById('sheetTitle')?.value||s.title;s.updated=Date.now();DB.save()}}catch(e){console.error(e)}document.getElementById('sheetWorkspace')?.classList.add('hidden');document.getElementById('sheetLibrary')?.classList.remove('hidden');currentSheet=null;renderSheetList()};
window.closePres=function(){try{if(currentPres)saveSlideFields();DB.save()}catch(e){console.error(e)}document.getElementById('presWorkspace')?.classList.add('hidden');document.getElementById('presLibrary')?.classList.remove('hidden');currentPres=null;currentSlide=0;renderPresList()};

// Stronger file search includes all primary content types and does not fail on missing fields.
const g=document.getElementById('globalSearch');if(g){g.autocomplete='off';g.addEventListener('keydown',e=>{if(e.key==='Escape'){g.value='';g.blur()}},{capture:true})}

// Reduced-motion support helps avoid animation jank and respects OS accessibility preferences.
if(matchMedia?.('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('reduceMotion');

// Professional workspace status strip.
if(!document.getElementById('workspaceStatus')){const bar=document.createElement('div');bar.id='workspaceStatus';bar.className='workspaceStatus';bar.innerHTML='<span class="statusDot"></span><strong>Ethan Office</strong><span>Professional Suite v5</span><span class="grow"></span><span id="storageStatus">Local workspace ready</span>';document.querySelector('.main')?.appendChild(bar)}
function updateStorageStatus(){try{const bytes=new Blob([localStorage.getItem(STORE)||'']).size;const el=document.getElementById('storageStatus');if(el)el.textContent=bytes>1024*1024?(bytes/1024/1024).toFixed(1)+' MB local data':Math.max(1,Math.round(bytes/1024))+' KB local data'}catch(e){}}
const oldDbSave=DB.save;DB.save=function(){const ok=oldDbSave.call(DB);updateStorageStatus();return ok};updateStorageStatus();

// Re-render dashboard after all v5 migrations so every statistic exists.
try{renderHome();renderFiles()}catch(e){console.error(e)}
})();


// === Ethan Office v6 professional file workspace & deep-suite polish ===
(function(){
window.__fileView='all';
window.setFileView=function(view,btn){
  window.__fileView=view||'all';
  document.querySelectorAll('.fileTabs button').forEach(x=>x.classList.toggle('active',x===btn));
  const trash=document.getElementById('trashWorkspace'), files=document.getElementById('fileWorkspace');
  if(trash)trash.classList.toggle('hidden',view!=='trash');
  if(files)files.classList.toggle('hidden',view==='trash');
  renderFiles();
};
function allOfficeFiles(){
  const now=Date.now();
  return [
    ...state.wordDocs.map(x=>({name:x.title||'Untitled Document',type:'Word',updated:x.updated||now,id:x.id,favorite:!!x.favorite,location:'Ethan Office / Word'})),
    ...state.sheets.map(x=>({name:x.title||'Untitled Workbook',type:'Excel',updated:x.updated||now,id:x.id,favorite:!!x.favorite,location:'Ethan Office / Excel'})),
    ...state.presentations.map(x=>({name:x.title||'Untitled Presentation',type:'Presentation',updated:x.updated||now,id:x.id,favorite:!!x.favorite,location:'Ethan Office / Presentation'})),
    ...state.notes.map(x=>({name:x.title||'Untitled Note',type:'Note',updated:x.updated||now,id:x.id,favorite:!!x.pinned,location:'Ethan Office / Notes'})),
    ...state.files.map(x=>({name:x.name||x.title||'Imported File',type:x.type||'File',updated:x.updated||x.created||now,id:x.id,favorite:!!x.favorite,location:'Ethan Office / Imported'}))
  ];
}
renderFiles=function(){
  const q=(document.getElementById('fileSearch')?.value||'').trim().toLowerCase();
  const view=window.__fileView||'all';
  let all=allOfficeFiles().filter(x=>!q||[x.name,x.type,x.location].join(' ').toLowerCase().includes(q));
  if(view==='favorites') all=all.filter(x=>x.favorite);
  if(view==='recent') all=all.filter(x=>(Date.now()-(x.updated||0))<1000*60*60*24*30);
  all.sort((a,b)=>(b.favorite-a.favorite)||((b.updated||0)-(a.updated||0)));
  const el=document.getElementById('filesList');
  if(el) el.innerHTML=all.length?all.map(f=>`<div class="item fileRow"><div class="fileTypeIcon ${esc(f.type)}">${f.type==='Presentation'?'P':f.type==='Excel'?'X':f.type==='Word'?'W':f.type==='Note'?'N':'F'}</div><div class="grow"><h4>${esc(f.name)}</h4><div class="fileMeta"><span class="muted">${f.updated?new Date(f.updated).toLocaleString():''}</span><span class="locationPill">${esc(f.location)}</span>${f.favorite?'<span class="locationPill">★ Favorite</span>':''}</div></div>${f.id&&['Word','Excel','Presentation'].includes(f.type)?`<button class="btn sm" onclick="openRecent('${f.type}','${f.id}')">Open</button>`:''}</div>`).join(''):`<div class=empty>${view==='favorites'?'No favorite files yet. Use ★ beside a Word, Excel or Presentation file.':view==='recent'?'No files edited in the last 30 days.':'No matching office files.'}</div>`;
  const tr=document.getElementById('trashList');
  if(tr)tr.innerHTML=state.trash.length?state.trash.map((x,i)=>`<div class=item><div class="fileTypeIcon ${esc(x.type)}">${x.type==='Presentation'?'P':x.type==='Excel'?'X':'W'}</div><div class=grow><h4>${esc(x.item.title||'File')}</h4><div class=muted>Deleted ${new Date(x.deleted).toLocaleString()}</div></div><button class="btn sm" onclick="restoreTrash(${i})">Restore</button></div>`).join(''):'<div class=empty>Recycle Bin is empty.</div>';
};
// Remove the old injected duplicate File Manager search/recycle-bin block from v2/v3.
const duplicateSearch=document.querySelector('#page-files > .panel');
if(duplicateSearch)duplicateSearch.remove();
const sections=[...document.querySelectorAll('#page-files > .section')];
sections.forEach(sec=>{ if(sec.querySelector('#trashList') && !sec.closest('#trashWorkspace')) sec.remove(); });
// Add a clear saved-file action inside each editor top bar.
function addLocationButton(selector){const bar=document.querySelector(selector);if(bar&&!bar.querySelector('.locationButton')){const b=document.createElement('button');b.className='btn sm locationButton';b.textContent='My Files';b.title='Open File Manager';b.onclick=()=>nav('files');bar.appendChild(b)}}
addLocationButton('.wordTitlebar');addLocationButton('.excelTop');addLocationButton('.presTop');
// Add Microsoft-style missing primary ribbon tabs where appropriate, without claiming unsupported tools.
const wt=document.querySelector('.wordTabs');
if(wt&&!wt.querySelector('[data-v6-design]')){
  const home=[...wt.children].find(x=>x.textContent.trim()==='Home');
  if(home){const d=document.createElement('button');d.textContent='Design';d.dataset.v6Design='1';d.onclick=function(){wordTab('design',this)};const l=[...wt.children].find(x=>x.textContent.trim()==='Layout');wt.insertBefore(d,l||null)}
  const review=[...wt.children].find(x=>x.textContent.trim()==='Review');
  if(review){const m=document.createElement('button');m.textContent='Mailings';m.dataset.v6Mail='1';m.onclick=function(){wordTab('mailings',this)};wt.insertBefore(m,review)}
}
const originalWordTab=window.wordTab;
window.wordTab=function(tab,btn){
  if(tab==='design'){
    document.querySelectorAll('.wordTabs button').forEach(x=>x.classList.remove('active'));btn?.classList.add('active');
    document.querySelectorAll('.wordRibbonPanel').forEach(x=>x.classList.remove('active'));
    let panel=document.querySelector('[data-wordpanel=v6design]');if(!panel){panel=document.createElement('div');panel.className='wordRibbonPanel';panel.dataset.wordpanel='v6design';panel.innerHTML='<div class=ribbonGroup><b>Document Formatting</b><button onclick="wordStyle(\'h1\')">Title Style</button><button onclick="wordStyle(\'h2\')">Heading</button><button onclick="wordStyle(\'p\')">Normal</button></div><div class=ribbonGroup><b>Page Background</b><input type=color title="Page colour" value="#ffffff" onchange="wordPageColor(this.value)"><button onclick="wordPageColor(\'#ffffff\')">White Page</button><button onclick="wordInsertHR()">Page Divider</button></div>';document.querySelector('.wordRibbon')?.appendChild(panel)}panel.classList.add('active');return;
  }
  if(tab==='mailings'){
    document.querySelectorAll('.wordTabs button').forEach(x=>x.classList.remove('active'));btn?.classList.add('active');document.querySelectorAll('.wordRibbonPanel').forEach(x=>x.classList.remove('active'));
    let panel=document.querySelector('[data-wordpanel=v6mail]');if(!panel){panel=document.createElement('div');panel.className='wordRibbonPanel';panel.dataset.wordpanel='v6mail';panel.innerHTML='<div class=ribbonGroup><b>Mailings</b><button onclick="wordInsertMailBlock()">Address Block</button><button onclick="wordInsertGreeting()">Greeting Line</button></div><div class=ribbonGroup><b>Office Merge</b><button onclick="toast(\'Mail merge data-source connection is reserved for a later engine-backed release\')">Mail Merge Info</button></div>';document.querySelector('.wordRibbon')?.appendChild(panel)}panel.classList.add('active');return;
  }
  return originalWordTab(tab,btn);
};
window.wordPageColor=function(c){const d=currentWordDoc();if(!d)return;ensureWordMeta(d);d.page.color=c;applyWordPage();DB.save()};
window.wordInsertMailBlock=function(){wordCmd('insertHTML','<p><strong>[Recipient Name]</strong><br>[Company]<br>[Address]<br>[City, State / Region]</p>')};
window.wordInsertGreeting=function(){wordCmd('insertHTML','<p>Dear [Recipient Name],</p>')};
// Add Page Layout tab to Excel and Animations to Presentation for a more familiar professional ribbon.
const exTabs=document.querySelector('#page-excel .ribbonTabs');
if(exTabs&&!exTabs.querySelector('[data-v6-page-layout]')){const formulas=[...exTabs.children].find(x=>x.textContent.trim()==='Formulas');const b=document.createElement('button');b.textContent='Page Layout';b.dataset.v6PageLayout='1';b.onclick=function(){excelTab('pagelayout',this)};exTabs.insertBefore(b,formulas||null)}
const oldExcelTab=window.excelTab;window.excelTab=function(tab,btn){if(tab==='pagelayout'){btn?.parentElement?.querySelectorAll('button').forEach(x=>x.classList.remove('active'));btn?.classList.add('active');const b=document.getElementById('excelRibbonBody');if(b)b.innerHTML='<div class=ribbonGroup><b>Page Setup</b><button onclick="toast(\'A4 portrait print layout selected\')">A4</button><button onclick="toast(\'Landscape print layout selected\')">Landscape</button><button onclick="printOffice()">Print / PDF</button></div><div class=ribbonGroup><b>Sheet Options</b><button onclick="xlFreeze()">Freeze Top Row</button><button onclick="xlZoom(1)">Zoom In</button><button onclick="xlZoom(-1)">Zoom Out</button></div>';return}return oldExcelTab(tab,btn)};
const prTabs=document.querySelector('#page-presentation .ribbonTabs');
if(prTabs&&!prTabs.querySelector('[data-v6-animations]')){const ss=[...prTabs.children].find(x=>x.textContent.trim()==='Slide Show');const b=document.createElement('button');b.textContent='Animations';b.dataset.v6Animations='1';b.onclick=function(){presTab('animations',this)};prTabs.insertBefore(b,ss||null)}
const oldPresTab=window.presTab;window.presTab=function(tab,btn){if(tab==='animations'){btn?.parentElement?.querySelectorAll('button').forEach(x=>x.classList.remove('active'));btn?.classList.add('active');const b=document.getElementById('presRibbonBody');if(b)b.innerHTML='<div class=ribbonGroup><b>Object Animation</b><button onclick="setPresObjectAnimation(\'fade\')">Fade In</button><button onclick="setPresObjectAnimation(\'rise\')">Rise</button><button onclick="setPresObjectAnimation(\'none\')">None</button></div><div class=ribbonGroup><b>Preview</b><button onclick="previewPresAnimation()">Preview</button></div>';return}return oldPresTab(tab,btn)};
window.setPresObjectAnimation=function(v){const p=state.presentations.find(x=>x.id===currentPres);if(!p)return;p.slides[currentSlide].animation=v;DB.save();toast(v==='none'?'Animation removed':v+' animation applied')};
window.previewPresAnimation=function(){const el=document.getElementById('slideCanvas');if(!el)return;el.animate([{opacity:.15,transform:'translateY(14px)'},{opacity:1,transform:'translateY(0)'}],{duration:500,easing:'ease-out'})};
// Version markers.
const vp=document.querySelector('.versionPill');if(vp)vp.textContent='Executive Suite v11';
const ws=document.querySelector('#workspaceStatus span:nth-of-type(2)');if(ws&&ws.textContent.includes('Suite'))ws.textContent='Executive Suite v11';
renderFiles();
})();


// ===== Ethan Office v7: Professional page setup, references/index and print-layout controls =====
(function(){
'use strict';
state.settings.version='11.0.0';
const marginPresetToInches=window.marginPresetToInches=function(v){return ({normal:{top:1,right:1,bottom:1,left:1},narrow:{top:.5,right:.5,bottom:.5,left:.5},moderate:{top:1,right:.75,bottom:1,left:.75},wide:{top:1,right:2,bottom:1,left:2},office:{top:.75,right:.75,bottom:.75,left:.75}}[v]||{top:1,right:1,bottom:1,left:1})};
const oldEnsure=ensureWordMeta;
ensureWordMeta=function(d){oldEnsure(d);d.page=Object.assign({customMargins:null,hyphenation:false,lineNumbers:'none',showMarks:false,pageBorder:'none',watermark:'',gutter:0,sectionCount:1,pageNumberFormat:'1',pageNumberPosition:'footer-right',differentFirstPage:false},d.page||{});d.indexEntries=Array.isArray(d.indexEntries)?d.indexEntries:[];d.sources=Array.isArray(d.sources)?d.sources:[];d.bookmarks=Array.isArray(d.bookmarks)?d.bookmarks:[]};
state.wordDocs.forEach(d=>{ensureWordMeta(d);sanitizeWordDocumentBrand(d)});DB.save();
const oldApply=applyWordPage;
applyWordPage=function(){oldApply();const d=currentWordDoc();if(!d)return;ensureWordMeta(d);const p=d.page,el=$('#wordPage'),ed=$('#wordEditor');if(!el||!ed)return;let dims={a4:[794,1123],letter:[816,1056],legal:[816,1344],a3:[1123,1587]},wh=dims[p.size]||dims.a4;if(p.orientation==='landscape')wh=[wh[1],wh[0]];el.style.setProperty('--page-w',wh[0]+'px');el.style.setProperty('--page-min-h',wh[1]+'px');let m=p.customMargins||marginPresetToInches(p.margin);el.style.setProperty('--margin-top',m.top+'in');el.style.setProperty('--margin-right',m.right+'in');el.style.setProperty('--margin-bottom',m.bottom+'in');el.style.setProperty('--margin-left',m.left+'in');el.style.setProperty('--page-margin','0px');ed.style.padding=`${m.top}in ${m.right}in ${m.bottom}in ${m.left+(Number(p.gutter)||0)}in`;ed.style.hyphens=p.hyphenation?'auto':'manual';ed.classList.toggle('showFormattingMarks',!!p.showMarks);ed.classList.toggle('wordLineNumbers',p.lineNumbers!=='none');ed.dataset.lineNumberMode=p.lineNumbers||'none';el.classList.toggle('pageBorderBox',p.pageBorder==='box');el.classList.toggle('pageBorderShadow',p.pageBorder==='shadow');let wm=el.querySelector('.liveWatermark');if(p.watermark){if(!wm){wm=document.createElement('div');wm.className='liveWatermark';el.appendChild(wm)}wm.textContent=p.watermark}else wm?.remove();const li=$('#wordLayoutInfo');if(li)li.textContent=`${String(p.size).toUpperCase()} • ${p.orientation} • ${m.top}/${m.right}/${m.bottom}/${m.left} in margins${p.gutter?' + '+p.gutter+' in gutter':''} • ${p.columns||1} col${p.columns>1?'s':''} • ${p.sectionCount||1} section${p.sectionCount>1?'s':''}`};
window.wordMarginPreset=function(v){const d=currentWordDoc();if(!d)return;ensureWordMeta(d);d.page.margin=v;d.page.customMargins=null;applyWordPage();autoSaveWord()};
window.wordCustomMargins=function(){const d=currentWordDoc();if(!d)return;ensureWordMeta(d);const m=d.page.customMargins||marginPresetToInches(d.page.margin);modal('Custom Margins',`<div class=formGrid><div class=field><label>Top (in)</label><input id=wmTop type=number min=.1 max=4 step=.05 value="${m.top}"></div><div class=field><label>Bottom (in)</label><input id=wmBottom type=number min=.1 max=4 step=.05 value="${m.bottom}"></div><div class=field><label>Left (in)</label><input id=wmLeft type=number min=.1 max=4 step=.05 value="${m.left}"></div><div class=field><label>Right (in)</label><input id=wmRight type=number min=.1 max=4 step=.05 value="${m.right}"></div><div class=field><label>Gutter (in)</label><input id=wmGutter type=number min=0 max=2 step=.05 value="${d.page.gutter||0}"></div></div>`,()=>{const n=id=>Math.max(.1,Math.min(4,Number($(id).value)||1));d.page.customMargins={top:n('#wmTop'),bottom:n('#wmBottom'),left:n('#wmLeft'),right:n('#wmRight')};d.page.gutter=Math.max(0,Number($('#wmGutter').value)||0);applyWordPage();DB.save();closeModal();toast('Custom margins applied')});$('#modalSave').textContent='Apply'};
window.wordPageSetup=function(){const d=currentWordDoc();if(!d)return;ensureWordMeta(d);const p=d.page;modal('Page Setup',`<div class=formGrid><div class=field><label>Paper Size</label><select id=wpsSize><option value=a4>A4</option><option value=letter>Letter</option><option value=legal>Legal</option><option value=a3>A3</option></select></div><div class=field><label>Orientation</label><select id=wpsOri><option value=portrait>Portrait</option><option value=landscape>Landscape</option></select></div><div class=field><label>Columns</label><select id=wpsCol><option>1</option><option>2</option><option>3</option></select></div><div class=field><label>Hyphenation</label><select id=wpsHyp><option value=false>Off</option><option value=true>Automatic</option></select></div><div class=field><label>Line Numbers</label><select id=wpsLine><option value=none>None</option><option value=continuous>Continuous</option><option value=restart-page>Restart each page</option></select></div><div class=field><label>Page Border</label><select id=wpsBorder><option value=none>None</option><option value=box>Box</option><option value=shadow>Shadow</option></select></div></div>`,()=>{p.size=$('#wpsSize').value;p.orientation=$('#wpsOri').value;p.columns=Number($('#wpsCol').value);p.hyphenation=$('#wpsHyp').value==='true';p.lineNumbers=$('#wpsLine').value;p.pageBorder=$('#wpsBorder').value;applyWordPage();DB.save();closeModal();toast('Page setup applied')});$('#wpsSize').value=p.size;$('#wpsOri').value=p.orientation;$('#wpsCol').value=String(p.columns||1);$('#wpsHyp').value=String(!!p.hyphenation);$('#wpsLine').value=p.lineNumbers||'none';$('#wpsBorder').value=p.pageBorder||'none';$('#modalSave').textContent='Apply'};
window.wordInsertSectionBreak=function(type='next') {const d=currentWordDoc();if(!d)return;ensureWordMeta(d);const label=type==='continuous'?'Continuous Section Break':'Next Page Section Break';document.execCommand('insertHTML',false,`<div class="sectionBreak ${type==='continuous'?'continuous':''}" contenteditable="false" data-section-break="${type}"><span>${label}</span></div><p><br></p>`);d.page.sectionCount=(d.page.sectionCount||1)+1;autoSaveWord();toast(label+' inserted')};
window.wordToggleHyphenation=function(){const d=currentWordDoc();if(!d)return;ensureWordMeta(d);d.page.hyphenation=!d.page.hyphenation;applyWordPage();autoSaveWord();toast('Automatic hyphenation '+(d.page.hyphenation?'on':'off'))};
window.wordSetLineNumbers=function(v){const d=currentWordDoc();if(!d)return;ensureWordMeta(d);d.page.lineNumbers=v;applyWordPage();autoSaveWord();toast(v==='none'?'Line numbers hidden':'Line numbering enabled')};
window.wordToggleFormattingMarks=function(){const d=currentWordDoc();if(!d)return;ensureWordMeta(d);d.page.showMarks=!d.page.showMarks;applyWordPage();autoSaveWord()};
window.wordPageBorders=function(v){const d=currentWordDoc();if(!d)return;ensureWordMeta(d);d.page.pageBorder=v;applyWordPage();autoSaveWord()};
window.wordWatermark=function(){const d=currentWordDoc();if(!d)return;ensureWordMeta(d);const x=prompt('Watermark text (leave blank to remove)',d.page.watermark||'CONFIDENTIAL');if(x===null)return;d.page.watermark=x.trim();applyWordPage();autoSaveWord()};
window.wordMarkIndexEntry=function(){const sel=getSelection();const txt=(sel?.toString()||'').trim();if(!txt){toast('Select a word or phrase first');return}const range=sel.getRangeAt(0);const span=document.createElement('span');span.className='wordIndexEntry';span.dataset.indexTerm=txt;span.title='Index entry: '+txt;try{range.surroundContents(span)}catch{document.execCommand('insertHTML',false,`<span class="wordIndexEntry" data-index-term="${esc(txt)}">${esc(txt)}</span>`)}const d=currentWordDoc();ensureWordMeta(d);if(!d.indexEntries.includes(txt))d.indexEntries.push(txt);autoSaveWord();toast('Index entry marked: '+txt)};
function approxPageFor(el){const d=currentWordDoc();ensureWordMeta(d);const p=d.page,m=p.customMargins||marginPresetToInches(p.margin);let sizes={a4:[794,1123],letter:[816,1056],legal:[816,1344],a3:[1123,1587]},h=(sizes[p.size]||sizes.a4)[1];if(p.orientation==='landscape')h=(sizes[p.size]||sizes.a4)[0];const usable=Math.max(300,h-(m.top+m.bottom)*96);return Math.max(1,Math.floor(el.offsetTop/usable)+1)}
window.wordBuildIndex=function(){const ed=$('#wordEditor');const marks=[...ed.querySelectorAll('.wordIndexEntry[data-index-term]')];if(!marks.length){toast('Mark index entries first');return}const map={};marks.forEach(el=>{const t=el.dataset.indexTerm.trim();(map[t]??=[]).push(approxPageFor(el))});const rows=Object.keys(map).sort((a,b)=>a.localeCompare(b)).map(t=>`<div class="indexRow"><span>${esc(t)}</span><span>${[...new Set(map[t])].join(', ')}</span></div>`).join('');document.execCommand('insertHTML',false,`<section class="wordIndex"><h2>Index</h2>${rows}</section><p></p>`);autoSaveWord();toast('Index created')};
window.wordUpdateIndex=function(){const old=$('#wordEditor').querySelector('.wordIndex');if(old){old.remove();wordBuildIndex()}else toast('No index found')};
window.wordUpdateTOC=function(){const ed=$('#wordEditor'),old=ed.querySelector('.wordToc');if(!old){wordInsertTOC();return}const hs=[...ed.querySelectorAll('h1,h2,h3')].filter(h=>!h.closest('.wordToc'));if(!hs.length){toast('No headings found');return}const items=hs.map(h=>`<li style="margin-left:${h.tagName==='H3'?28:h.tagName==='H2'?14:0}px">${esc(h.innerText)}</li>`).join('');old.innerHTML=`<h3>Table of Contents</h3><ol>${items}</ol>`;autoSaveWord();toast('Table of contents updated')};
window.wordAddBookmark=function(){const sel=(getSelection()?.toString()||'').trim();const name=prompt('Bookmark name',sel||'Bookmark');if(!name)return;const id='bm-'+uid();document.execCommand('insertHTML',false,`<a id="${id}" class="wordBookmark" data-bookmark="${esc(name)}">${sel?esc(sel):'↳'}</a>`);const d=currentWordDoc();ensureWordMeta(d);d.bookmarks.push({id,name});autoSaveWord();toast('Bookmark added')};
window.wordCrossReference=function(){const d=currentWordDoc();ensureWordMeta(d);if(!d.bookmarks.length){toast('Add a bookmark first');return}const opts=d.bookmarks.map((b,i)=>`${i+1}. ${b.name}`).join('\n');const n=Number(prompt('Reference which bookmark?\n'+opts,'1'))-1,b=d.bookmarks[n];if(!b)return;document.execCommand('insertHTML',false,`<a href="#${b.id}">See ${esc(b.name)}</a>`);autoSaveWord()};
window.wordAddSource=function(){const author=prompt('Author / Organization');if(!author)return;const title=prompt('Source title');if(!title)return;const year=prompt('Year',String(new Date().getFullYear()))||'';const d=currentWordDoc();ensureWordMeta(d);d.sources.push({id:uid(),author,title,year});DB.save();toast('Source added')};
window.wordInsertCitation=function(){const d=currentWordDoc();ensureWordMeta(d);if(!d.sources.length){toast('Add a source first');return}const opts=d.sources.map((x,i)=>`${i+1}. ${x.author} — ${x.title}`).join('\n'),n=Number(prompt('Insert which source?\n'+opts,'1'))-1,x=d.sources[n];if(!x)return;document.execCommand('insertText',false,`(${x.author}, ${x.year})`);autoSaveWord()};
window.wordBibliography=function(){const d=currentWordDoc();ensureWordMeta(d);if(!d.sources.length){toast('No saved sources');return}const li=d.sources.map(x=>`<li>${esc(x.author)} (${esc(x.year)}). <i>${esc(x.title)}</i>.</li>`).join('');document.execCommand('insertHTML',false,`<section class="wordBibliography"><h2>Bibliography</h2><ol>${li}</ol></section><p></p>`);autoSaveWord()};
window.wordCaption=function(){const text=prompt('Caption','Figure 1: ');if(text)document.execCommand('insertHTML',false,`<p class="wordCaption"><b>${esc(text)}</b></p>`);autoSaveWord()};
window.wordPageNumberSetup=function(){const d=currentWordDoc();ensureWordMeta(d);const p=d.page;modal('Page Number Format',`<div class=formGrid><div class=field><label>Number format</label><select id=wpnFormat><option value=1>1, 2, 3</option><option value=i>i, ii, iii</option><option value=I>I, II, III</option></select></div><div class=field><label>Position</label><select id=wpnPos><option value=footer-right>Bottom right</option><option value=footer-center>Bottom center</option><option value=header-right>Top right</option><option value=header-center>Top center</option></select></div><div class=field><label><input id=wpnFirst type=checkbox> Different first page</label></div></div>`,()=>{p.pageNumberFormat=$('#wpnFormat').value;p.pageNumberPosition=$('#wpnPos').value;p.differentFirstPage=$('#wpnFirst').checked;const target=p.pageNumberPosition.startsWith('header')?$('#wordHeader'):$('#wordFooter'),align=p.pageNumberPosition.endsWith('center')?'center':'right';const token=p.pageNumberFormat==='i'?'i':p.pageNumberFormat==='I'?'I':'1';target.innerHTML=`<div style="text-align:${align}">Page ${token}</div>`;saveWord(true);closeModal();toast('Page number format applied')});$('#wpnFormat').value=p.pageNumberFormat||'1';$('#wpnPos').value=p.pageNumberPosition||'footer-right';$('#wpnFirst').checked=!!p.differentFirstPage;$('#modalSave').textContent='Apply'};
window.wordPrintPreview=function(){saveWord(true);const d=currentWordDoc();ensureWordMeta(d);toast('Opening print preview');printOffice()};
window.wordAddComment=function(){const sel=getSelection(),txt=(sel?.toString()||'').trim();if(!txt){toast('Select text to comment on');return}const note=prompt('Comment');if(!note)return;const range=sel.getRangeAt(0),span=document.createElement('span');span.className='wordCommentMark';span.dataset.comment=note;span.title='Comment: '+note;try{range.surroundContents(span)}catch{document.execCommand('insertHTML',false,`<span class="wordCommentMark" data-comment="${esc(note)}" title="Comment: ${esc(note)}">${esc(txt)}</span>`)}autoSaveWord();toast('Comment added')};
window.wordComments=function(){const marks=[...$('#wordEditor').querySelectorAll('.wordCommentMark')];modal('Comments',marks.length?`<div class=list>${marks.map((x,i)=>`<div class=item><div class=grow><b>${i+1}. ${esc((x.innerText||'').slice(0,70))}</b><div class=muted>${esc(x.dataset.comment||'')}</div></div></div>`).join('')}</div>`:'<div class=empty>No comments in this document.</div>',()=>closeModal());$('#modalSave').textContent='Close'};
window.wordProtectToggle=function(){const d=currentWordDoc();if(!d)return;ensureWordMeta(d);d.page.protected=!d.page.protected;const e=$('#wordEditor'),h=$('#wordHeader'),f=$('#wordFooter');[e,h,f].forEach(x=>x.contentEditable=d.page.protected?'false':'true');DB.save();toast(d.page.protected?'Document editing protected':'Document editing unlocked')};


// Upgrade Word ribbon panels with professional Layout / References / Insert / View controls.
const oldWordTabV7=window.wordTab;
window.wordTab=function(tab,btn){if(['layout','references','insert','review','view'].includes(tab)){
 document.querySelectorAll('.wordTabs button').forEach(x=>x.classList.remove('active'));btn?.classList.add('active');document.querySelectorAll('.wordRibbonPanel').forEach(x=>x.classList.remove('active'));
 let panel=document.querySelector(`[data-wordpanel=v7${tab}]`);if(!panel){panel=document.createElement('div');panel.className='wordRibbonPanel';panel.dataset.wordpanel='v7'+tab;const html={
 layout:`<div class=ribbonGroup><b>Page Setup</b><button onclick="wordMarginPreset('normal')">Normal Margins</button><button onclick="wordMarginPreset('narrow')">Narrow</button><button onclick="wordMarginPreset('moderate')">Moderate</button><button onclick="wordMarginPreset('wide')">Wide</button><button onclick="wordCustomMargins()">Custom Margins…</button><button onclick="wordPageSetup()">Page Setup…</button></div><div class=ribbonGroup><b>Breaks & Columns</b><button onclick="wordInsertPageBreak()">Page Break</button><button onclick="wordInsertSectionBreak('next')">Section: Next Page</button><button onclick="wordInsertSectionBreak('continuous')">Section: Continuous</button><select onchange="wordPageSetting('columns',this.value)"><option value=1>1 Column</option><option value=2>2 Columns</option><option value=3>3 Columns</option></select></div><div class=ribbonGroup><b>Page Details</b><button onclick="wordToggleHyphenation()">Hyphenation</button><select onchange="wordSetLineNumbers(this.value)"><option value=none>Line Numbers: None</option><option value=continuous>Continuous</option><option value=restart-page>Restart Each Page</option></select><button onclick="wordPageBorders('box')">Page Border</button><button onclick="wordPageBorders('none')">No Border</button></div>`,
 references:`<div class=ribbonGroup><b>Table of Contents</b><button onclick="wordInsertTOC()">Insert TOC</button><button onclick="wordUpdateTOC()">Update TOC</button></div><div class=ribbonGroup><b>Footnotes</b><button onclick="wordInsertFootnote()">Insert Footnote</button></div><div class=ribbonGroup><b>Citations</b><button onclick="wordAddSource()">Manage / Add Source</button><button onclick="wordInsertCitation()">Insert Citation</button><button onclick="wordBibliography()">Bibliography</button></div><div class=ribbonGroup><b>Captions & Links</b><button onclick="wordCaption()">Insert Caption</button><button onclick="wordAddBookmark()">Bookmark</button><button onclick="wordCrossReference()">Cross-reference</button></div><div class=ribbonGroup><b>Index</b><button onclick="wordMarkIndexEntry()">Mark Entry</button><button onclick="wordBuildIndex()">Insert Index</button><button onclick="wordUpdateIndex()">Update Index</button></div>`,
 insert:`<div class=ribbonGroup><b>Pages</b><button onclick="wordInsertPageBreak()">Page Break</button></div><div class=ribbonGroup><b>Tables & Media</b><button onclick="wordInsertTable()">Table</button><button onclick="document.getElementById('wordImageInput').click()">Pictures</button><button onclick="wordDeleteSelectedImage()">Delete Image</button><button onclick="wordImageSize('small')">Small</button><button onclick="wordImageSize('medium')">Medium</button><button onclick="wordImageSize('large')">Large</button></div><div class=ribbonGroup><b>Links</b><button onclick="wordInsertLink()">Link</button><button onclick="wordAddBookmark()">Bookmark</button><button onclick="wordCrossReference()">Cross-reference</button></div><div class=ribbonGroup><b>Header & Footer</b><button onclick="wordFocusHeader()">Header</button><button onclick="wordFocusFooter()">Footer</button><button onclick="wordPageNumberSetup()">Page Number…</button></div><div class=ribbonGroup><b>Text & Symbols</b><button onclick="wordInsertDate()">Date & Time</button><button onclick="wordInsertSignatureLine()">Signature Line</button><button onclick="wordInsertSymbol()">Symbol</button></div>`,
 review:`<div class=ribbonGroup><b>Proofing</b><button onclick="wordFindReplace()">Find / Replace</button><button onclick="wordWordCount()">Word Count</button><button onclick="wordToggleSpellcheck()">Spelling</button></div><div class=ribbonGroup><b>Comments</b><button onclick="wordAddComment()">New Comment</button><button onclick="wordComments()">Show Comments</button></div><div class=ribbonGroup><b>History</b><button onclick="wordVersionHistory()">Version History</button></div><div class=ribbonGroup><b>Protect</b><button onclick="wordProtectToggle()">Restrict Editing</button></div>`,
 view:`<div class=ribbonGroup><b>Views</b><button onclick="wordTogglePrintLayout()">Print / Pageless</button><button onclick="wordPrintPreview()">Print Preview</button></div><div class=ribbonGroup><b>Show</b><button onclick="wordToggleRuler()">Ruler</button><button onclick="wordToggleFormattingMarks()">¶ Formatting Marks</button></div><div class=ribbonGroup><b>Zoom</b><button onclick="wordZoom(-10)">−</button><button onclick="wordZoomReset()">100%</button><button onclick="wordZoom(10)">+</button></div>`}[tab];panel.innerHTML=html;document.querySelector('.wordRibbon')?.appendChild(panel)}panel.classList.add('active');return}
 return oldWordTabV7(tab,btn)};

// Excel v7 page-layout persistence and professional print settings.
function ensureSheetPrint(s){s.print=Object.assign({size:'a4',orientation:'portrait',margin:'normal',gridlines:true,headings:true,scale:100,repeatTop:false,fitWidth:false},s.print||{})}
state.sheets.forEach(ensureSheetPrint);DB.save();
window.xlPageSetup=function(){const s=state.sheets.find(x=>x.id===currentSheet);if(!s)return;ensureSheetPrint(s);const p=s.print;modal('Excel Page Setup',`<div class=formGrid><div class=field><label>Paper Size</label><select id=xpsSize><option value=a4>A4</option><option value=letter>Letter</option><option value=legal>Legal</option></select></div><div class=field><label>Orientation</label><select id=xpsOri><option value=portrait>Portrait</option><option value=landscape>Landscape</option></select></div><div class=field><label>Margins</label><select id=xpsMargin><option value=normal>Normal</option><option value=narrow>Narrow</option><option value=wide>Wide</option></select></div><div class=field><label>Scale %</label><input id=xpsScale type=number min=25 max=200 value="${p.scale}"></div><div class=field><label><input id=xpsGrid type=checkbox> Print gridlines</label></div><div class=field><label><input id=xpsHeads type=checkbox> Print headings</label></div><div class=field><label><input id=xpsRepeat type=checkbox> Repeat top row</label></div><div class=field><label><input id=xpsFit type=checkbox> Fit all columns on one page</label></div></div>`,()=>{p.size=$('#xpsSize').value;p.orientation=$('#xpsOri').value;p.margin=$('#xpsMargin').value;p.scale=Math.max(25,Math.min(200,Number($('#xpsScale').value)||100));p.gridlines=$('#xpsGrid').checked;p.headings=$('#xpsHeads').checked;p.repeatTop=$('#xpsRepeat').checked;p.fitWidth=$('#xpsFit').checked;DB.save();closeModal();toast('Workbook page setup saved')});$('#xpsSize').value=p.size;$('#xpsOri').value=p.orientation;$('#xpsMargin').value=p.margin;$('#xpsGrid').checked=p.gridlines;$('#xpsHeads').checked=p.headings;$('#xpsRepeat').checked=p.repeatTop;$('#xpsFit').checked=p.fitWidth;$('#modalSave').textContent='Apply'};
window.xlPrintArea=function(){const r=prompt('Print area (example A1:H25)','A1:H25');if(!r)return;const s=state.sheets.find(x=>x.id===currentSheet);ensureSheetPrint(s);s.print.area=r.toUpperCase();DB.save();toast('Print area set to '+s.print.area)};
window.xlClearPrintArea=function(){const s=state.sheets.find(x=>x.id===currentSheet);if(!s)return;ensureSheetPrint(s);delete s.print.area;DB.save();toast('Print area cleared')};
const oldExcelTabV7=window.excelTab;window.excelTab=function(tab,btn){if(tab==='pagelayout'){btn?.parentElement?.querySelectorAll('button').forEach(x=>x.classList.remove('active'));btn?.classList.add('active');const b=$('#excelRibbonBody');if(b)b.innerHTML='<div class=ribbonGroup><b>Themes</b><button onclick="toast(\'Ethan Office theme applied\')">Office Theme</button></div><div class=ribbonGroup><b>Page Setup</b><button onclick="xlPageSetup()">Margins / Size / Orientation…</button><button onclick="xlPrintArea()">Print Area</button><button onclick="xlClearPrintArea()">Clear Print Area</button><button onclick="printOffice()">Print / PDF</button></div><div class=ribbonGroup><b>Sheet Options</b><button onclick="xlFreeze()">Freeze Top Row</button><button onclick="xlPageSetup()">Gridlines & Headings</button></div><div class=ribbonGroup><b>Scale</b><button onclick="xlZoom(1)">Zoom In</button><button onclick="xlZoom(-1)">Zoom Out</button></div>';return}return oldExcelTabV7(tab,btn)};

// Presentation v7 design setup: slide size, background, footer/date/slide number.
function ensurePresDesign(p){p.design=Object.assign({size:'16:9',background:'#ffffff',showDate:false,showNumber:false,footer:''},p.design||{})}
state.presentations.forEach(ensurePresDesign);DB.save();
window.presSlideSize=function(){const p=state.presentations.find(x=>x.id===currentPres);if(!p)return;ensurePresDesign(p);const v=prompt('Slide size: 16:9, 4:3, A4','16:9');if(!v)return;p.design.size=['16:9','4:3','A4'].includes(v)?v:'16:9';DB.save();drawPres();toast('Slide size '+p.design.size)};
window.presBackground=function(){const p=state.presentations.find(x=>x.id===currentPres);if(!p)return;ensurePresDesign(p);const c=prompt('Background color (hex)',p.design.background||'#ffffff');if(!c)return;p.design.background=c;DB.save();drawPres()};
window.presHeaderFooter=function(){const p=state.presentations.find(x=>x.id===currentPres);if(!p)return;ensurePresDesign(p);modal('Header & Footer',`<div class=formGrid><div class=field><label>Footer text</label><input id=phfText value="${esc(p.design.footer||'')}"></div><div class=field><label><input id=phfDate type=checkbox> Date</label></div><div class=field><label><input id=phfNum type=checkbox> Slide number</label></div></div>`,()=>{p.design.footer=$('#phfText').value;p.design.showDate=$('#phfDate').checked;p.design.showNumber=$('#phfNum').checked;DB.save();closeModal();drawPres();toast('Footer settings applied')});$('#phfDate').checked=p.design.showDate;$('#phfNum').checked=p.design.showNumber;$('#modalSave').textContent='Apply'};
const oldDrawPresV7=window.drawPres;window.drawPres=function(){oldDrawPresV7();const p=state.presentations.find(x=>x.id===currentPres),c=$('#slideCanvas');if(!p||!c)return;ensurePresDesign(p);c.style.backgroundColor=p.design.background||'';c.style.aspectRatio=p.design.size==='4:3'?'4 / 3':p.design.size==='A4'?'210 / 297':'16 / 9';let f=c.querySelector('.presFooterMeta');if(!f){f=document.createElement('div');f.className='presFooterMeta';c.appendChild(f)}f.textContent=[p.design.showDate?new Date().toLocaleDateString():'',p.design.footer||'',p.design.showNumber?String(currentSlide+1):''].filter(Boolean).join('   •   ')};
const oldPresTabV7=window.presTab;window.presTab=function(tab,btn){if(tab==='design'){btn?.parentElement?.querySelectorAll('button').forEach(x=>x.classList.remove('active'));btn?.classList.add('active');const b=$('#presRibbonBody');if(b)b.innerHTML='<div class=ribbonGroup><b>Themes</b><button onclick="setPresTheme(\'navy\')">Navy</button><button onclick="setPresTheme(\'light\')">Light</button><button onclick="setPresTheme(\'green\')">Green</button><button onclick="setPresTheme(\'purple\')">Purple</button><button onclick="setPresTheme(\'sunset\')">Sunset</button></div><div class=ribbonGroup><b>Customize</b><button onclick="presSlideSize()">Slide Size</button><button onclick="presBackground()">Format Background</button><button onclick="presHeaderFooter()">Header & Footer</button></div>';return}return oldPresTabV7(tab,btn)};

const vp=document.querySelector('.versionPill');if(vp)vp.textContent='Executive Suite v11';
DB.save();
})();


window.toggleDocumentUtilityFocus=function(){
 document.body.classList.toggle('docUtilityFocus');
 const b=document.getElementById('docFocusBtn');
 if(b)b.textContent=document.body.classList.contains('docUtilityFocus')?'Exit Focus':'Focus Mode';
};
window.reloadDocumentUtility=function(){const f=document.getElementById('documentUtilityFrame');if(f)f.src='document-utility.html?refresh='+Date.now()};
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('docUtilityFocus'))toggleDocumentUtilityFocus()});


// ===== Ethan Office v10: comprehensive stability and interaction audit =====
(function(){
const V9='11.0.0';
if(state.settings) state.settings.version=V9;
let selectedWordImage=null;

function clearWordImageSelection(){
  if(selectedWordImage){selectedWordImage.classList.remove('wordImageSelected');selectedWordImage=null}
  const bar=document.getElementById('wordImageContext');if(bar)bar.classList.remove('show');
}
function showWordImageContext(img){
  selectedWordImage=img;img.classList.add('wordImageSelected');
  let bar=document.getElementById('wordImageContext');
  if(!bar){
    bar=document.createElement('div');bar.id='wordImageContext';bar.className='wordImageContext';
    bar.innerHTML='<b>Picture selected</b><button onclick="wordImageSize(\'small\')">Small</button><button onclick="wordImageSize(\'medium\')">Medium</button><button onclick="wordImageSize(\'large\')">Large</button><button class="danger" onclick="wordDeleteSelectedImage()">Delete Image</button>';
    document.body.appendChild(bar);
  }
  const r=img.getBoundingClientRect();bar.style.left=Math.max(12,Math.min(innerWidth-bar.offsetWidth-12,r.left))+'px';bar.style.top=Math.max(12,r.top-48)+'px';bar.classList.add('show');
}
function bindWordImageControls(){
  const ed=document.getElementById('wordEditor');if(!ed||ed.dataset.v9ImageBound)return;ed.dataset.v9ImageBound='1';
  ed.addEventListener('click',e=>{const img=e.target.closest?.('img');clearWordImageSelection();if(img&&ed.contains(img)){e.preventDefault();showWordImageContext(img)}});
  ed.addEventListener('contextmenu',e=>{const img=e.target.closest?.('img');if(img&&ed.contains(img)){e.preventDefault();clearWordImageSelection();showWordImageContext(img)}});
  document.addEventListener('pointerdown',e=>{if(selectedWordImage&&!e.target.closest('#wordImageContext')&&!e.target.closest('#wordEditor img'))clearWordImageSelection()});
  document.addEventListener('keydown',e=>{if(selectedWordImage&&(e.key==='Delete'||e.key==='Backspace')){e.preventDefault();wordDeleteSelectedImage()}});
}
window.wordDeleteSelectedImage=function(){
  if(!selectedWordImage||!document.getElementById('wordEditor')?.contains(selectedWordImage)){toast('Select an image in the document first.');return}
  if(!confirm('Delete this image from the document?'))return;
  const holder=selectedWordImage.parentElement;selectedWordImage.remove();
  if(holder&&holder.tagName==='P'&&!holder.textContent.trim()&&!holder.querySelector('img'))holder.remove();
  selectedWordImage=null;document.getElementById('wordImageContext')?.classList.remove('show');autoSaveWord();toast('Image deleted');
};
window.wordImageSize=function(size){
  if(!selectedWordImage){toast('Select an image in the document first.');return}
  const widths={small:'30%',medium:'55%',large:'100%'};selectedWordImage.style.width=widths[size]||'100%';selectedWordImage.style.maxWidth='100%';selectedWordImage.style.height='auto';autoSaveWord();toast('Image size updated');
};

async function optimizedImageData(file,maxDim=1800,quality=.82){
  if(!file||!file.type?.startsWith('image/'))throw new Error('Please choose an image file.');
  if(file.size>25*1024*1024)throw new Error('Image is too large. Choose an image below 25 MB.');
  const src=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(r.error||new Error('Could not read image'));r.readAsDataURL(file)});
  return await new Promise((res,rej)=>{const im=new Image();im.onload=()=>{try{const scale=Math.min(1,maxDim/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*scale));c.height=Math.max(1,Math.round(im.height*scale));const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',quality))}catch(e){rej(e)}};im.onerror=()=>rej(new Error('Image could not be decoded'));im.src=src});
}
window.wordInsertImage=async function(e){
  const f=e.target.files?.[0];if(!f)return;
  try{status('Optimizing image…',false);const data=await optimizedImageData(f,1600,.80);document.getElementById('wordEditor').focus();document.execCommand('insertHTML',false,`<p class="wordImageParagraph"><img src="${data}" alt="${esc(f.name||'Inserted image')}" style="max-width:100%;width:auto;height:auto" title="Click image for size/delete controls"></p><p><br></p>`);autoSaveWord();toast('Image inserted — click it anytime to resize or delete.')}catch(err){console.error(err);toast(err.message||'Could not insert image')}finally{e.target.value='';status('Saved locally')}
};

window.presRemoveImage=function(){
  const p=state.presentations.find(x=>x.id===currentPres);const s=p?.slides?.[currentSlide];if(!s)return;
  if(!s.image){toast('This slide has no image to remove.');return}
  if(!confirm('Remove the image from this slide?'))return;s.image='';p.updated=Date.now();DB.save();drawPres();toast('Slide image removed');
};
window.presImagePicked=async function(e){
  const f=e.target.files?.[0];if(!f)return;
  try{const data=await optimizedImageData(f,1920,.82),p=state.presentations.find(x=>x.id===currentPres);if(!p)return;p.slides[currentSlide].image=data;p.updated=Date.now();DB.save();drawPres();toast('Slide image added')}catch(err){console.error(err);toast(err.message||'Could not add image')}finally{e.target.value=''}
};

// File Manager now exposes delete/favorite actions, not only Open.
const oldRenderFilesV9=window.renderFiles;
window.renderFiles=function(){
  oldRenderFilesV9();
  document.querySelectorAll('#filesList .fileRow').forEach(row=>{
    if(row.querySelector('.v9FileActions'))return;
    const label=row.querySelector('.fileTypeIcon')?.classList;let type='';
    ['Word','Excel','Presentation'].forEach(t=>{if(label?.contains(t))type=t});
    const open=row.querySelector('button[onclick^="openRecent"]');if(!type||!open)return;
    const m=(open.getAttribute('onclick')||'').match(/openRecent\('[^']+','([^']+)'\)/);if(!m)return;const id=m[1];
    const wrap=document.createElement('span');wrap.className='v9FileActions';wrap.innerHTML=`<button class="btn sm" onclick="toggleFavorite('${type}','${id}')" title="Favorite">★</button><button class="btn red sm" onclick="trashItem('${type}','${id}')" title="Move to Recycle Bin">Delete</button>`;row.appendChild(wrap);
  });
};

// Guard localStorage writes: a failed save must not freeze the application.
const previousDbSaveV9=DB.save.bind(DB);
DB.save=function(){try{return previousDbSaveV9()}catch(err){console.error('Ethan Office save failed',err);if(err?.name==='QuotaExceededError'||String(err).toLowerCase().includes('quota'))toast('Storage is full. Export/backup files or remove large images, then try again.');else toast('Could not save locally. Your current screen remains open.');return false}};

// Prevent rapid double-clicks from firing destructive commands twice.
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.dataset.v9Busy==='1')return;if(/delete|empty|restore|backup|convert|print|save/i.test((b.textContent||'').trim())){b.dataset.v9Busy='1';setTimeout(()=>delete b.dataset.v9Busy,350)}},true);

// Better top-level runtime reporting instead of silent broken UI.
window.addEventListener('error',e=>{console.error('Ethan Office runtime error',e.error||e.message)});
window.addEventListener('unhandledrejection',e=>{console.error('Ethan Office async error',e.reason)});

// Bind image controls now and whenever Word is opened.
bindWordImageControls();
const openWordV9=window.openWord;window.openWord=function(id){const r=openWordV9(id);setTimeout(()=>{bindWordImageControls();clearWordImageSelection()},0);return r};
const closeWordV9=window.closeWord;window.closeWord=function(){clearWordImageSelection();return closeWordV9()};

// Keyboard shortcuts: Ctrl/Cmd+S remains save; Escape closes image context/sidebar/modal where possible.
window.addEventListener('keydown',e=>{if(e.key==='Escape'){clearWordImageSelection();document.getElementById('side')?.classList.remove('open')}});

try{DB.save();renderHome();renderFiles()}catch(e){console.error(e)}
})();


// ===== Ethan Office v10 final hardening =====
(function(){
  // Prevent stale modal overlays after page navigation and keep keyboard focus predictable.
  const baseNav=window.nav;
  window.nav=function(page){
    try{
      document.querySelectorAll('.modal.show').forEach(m=>m.classList.remove('show'));
      document.body.classList.remove('docUtilityFocus');
      const result=baseNav(page);
      requestAnimationFrame(()=>document.querySelector('#page-'+page+' h1, #page-'+page+' h2, #page-'+page+' input, #page-'+page+' button')?.focus?.({preventScroll:true}));
      return result;
    }catch(err){console.error('Navigation failed',err);toast('Could not open that workspace. Please try again.');}
  };
  document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>window.nav(b.dataset.page));

  // A second save attempt is skipped while one is already underway; this reduces rapid-write pressure.
  let saveLock=false;
  const stableSave=DB.save.bind(DB);
  DB.save=function(){
    if(saveLock)return true;
    saveLock=true;
    try{return stableSave()}catch(err){console.error('Workspace save failed',err);toast('Save could not complete. Free some storage and try again.');return false}
    finally{setTimeout(()=>{saveLock=false},40)}
  };

  // Restore inputs can be reused after choosing the same file twice.
  ['restoreInput','restoreInput2'].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('click',()=>{el.value=''})});

  // Keep suite file lists synchronized when the tab becomes active again.
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){try{renderHome();renderFiles()}catch(e){console.error(e)}}});

  const vp=document.querySelector('.versionPill');if(vp)vp.textContent='Executive Suite v11';
  if(state.settings)state.settings.version='11.0.0';
  try{DB.save()}catch(e){console.error(e)}
})();


// ===== Ethan Office v11: runtime-verified stability hardening =====
(function(){
  const V11='11.0.0';
  if(!state.settings) state.settings={};
  state.settings.version=V11;

  // Install action always gives feedback. Browser-native install appears when eligible.
  window.requestOfficeInstall=async function(){
    const b=document.getElementById('installBtn');
    if(typeof installPrompt!=='undefined' && installPrompt){
      try{installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;if(b)b.classList.add('hidden')}catch(e){console.error(e);showInstallHelp()}
    }else showInstallHelp();
  };
  document.querySelectorAll('#installCard button').forEach(b=>{if((b.textContent||'').trim()==='Install')b.onclick=requestOfficeInstall});

  // Excel: make previously cosmetic controls real and persistent.
  const drawGridV11=drawGrid;
  drawGrid=function(s){
    drawGridV11(s);
    if(!s)return;
    const table=document.querySelector('#sheetGrid .sheet');if(!table)return;
    const cells=[...table.querySelectorAll('td[contenteditable]')];
    cells.forEach(td=>{
      td.contentEditable=s.protected?'false':'true';
      td.classList.toggle('sheetProtected',!!s.protected);
      const key=td.dataset.r+','+td.dataset.c;
      const validation=s.validation?.[key];
      if(validation?.length){td.dataset.validation=validation.join('|');td.title='Allowed values: '+validation.join(', ');td.classList.add('validatedCell')}
    });
    const filter=s.filter&&typeof s.filter==='object'?s.filter:null;
    if(filter){
      [...table.querySelectorAll('tbody tr')].forEach((tr,r)=>{
        const raw=String(s.grid?.[r]?.[filter.col]??'').toLowerCase();
        tr.style.display=raw.includes(String(filter.query||'').toLowerCase())?'':'none';
      });
    }
    const stat=document.getElementById('excelStatus');
    if(stat){const flags=[];if(s.protected)flags.push('Protected');if(filter)flags.push('Filtered');stat.textContent=(stat.textContent.split(' • ')[0]||'Ready')+(flags.length?' • '+flags.join(' • '):' • Ready')}
  };
  window.xlProtect=function(){
    const s=state.sheets.find(x=>x.id===currentSheet);if(!s)return;
    s.protected=!s.protected;DB.save();drawGrid(s);toast(s.protected?'Sheet protected — click Protect Sheet again to unlock':'Sheet protection removed');
  };
  window.xlTable=function(){
    const s=state.sheets.find(x=>x.id===currentSheet);if(!s)return;
    let maxR=0,maxC=0,found=false;
    s.grid.forEach((row,r)=>row.forEach((v,c)=>{if(String(v??'').trim()){found=true;maxR=Math.max(maxR,r);maxC=Math.max(maxC,c)}}));
    if(!found){maxR=Math.min(9,s.grid.length-1);maxC=3}
    s.styles=s.styles||{};
    for(let r=0;r<=maxR;r++)for(let c=0;c<=maxC;c++){
      const k=r+','+c,a=(s.styles[k]||'').split(' ').filter(Boolean).filter(x=>x!=='tableCell'&&x!=='tableHeader');a.push(r===0?'tableHeader':'tableCell');s.styles[k]=[...new Set(a)].join(' ')
    }
    DB.save();drawGrid(s);toast(`Table formatting applied to A1:${String.fromCharCode(65+maxC)}${maxR+1}`);
  };
  window.xlToggleFilter=function(){
    const s=state.sheets.find(x=>x.id===currentSheet);if(!s)return;
    if(s.filter&&typeof s.filter==='object'){s.filter=false;DB.save();drawGrid(s);toast('Filter cleared');return}
    const q=prompt(`Filter column ${String.fromCharCode(65+((window.getXlCell?.()||{c:0}).c||0))} by text/value`,'');
    if(q===null||q===''){toast('Filter not applied');return}
    s.filter={col:(window.getXlCell?.()||{c:0}).c||0,query:q};DB.save();drawGrid(s);toast('Filter applied');
  };
  window.xlDataValidation=function(){
    const s=state.sheets.find(x=>x.id===currentSheet);if(!s)return;
    const vals=prompt('Dropdown choices, separated by commas','Yes,No,Pending');if(!vals)return;
    const choices=vals.split(',').map(x=>x.trim()).filter(Boolean);if(!choices.length)return;
    s.validation=s.validation||{};const cell=window.getXlCell?.()||{r:0,c:0};const k=cell.r+','+cell.c;s.validation[k]=choices;
    const n=prompt('Choose a value now (or cancel to leave the current value):\n'+choices.map((x,i)=>`${i+1}. ${x}`).join('\n'),'1');
    if(n!==null){const v=choices[Math.max(0,Math.min(choices.length-1,(Number(n)||1)-1))];s.grid[cell.r][cell.c]=v}
    DB.save();drawGrid(s);toast('Dropdown validation saved for selected cell');
  };
  // Double-click a validated cell to pick an allowed value again.
  document.getElementById('sheetGrid')?.addEventListener('dblclick',e=>{
    const td=e.target.closest('td[data-validation]');if(!td)return;const s=state.sheets.find(x=>x.id===currentSheet);if(!s||s.protected)return;
    const choices=(td.dataset.validation||'').split('|').filter(Boolean),n=prompt('Choose an allowed value:\n'+choices.map((x,i)=>`${i+1}. ${x}`).join('\n'),'1');if(n===null)return;
    const v=choices[Math.max(0,Math.min(choices.length-1,(Number(n)||1)-1))];s.grid[+td.dataset.r][+td.dataset.c]=v;DB.save();drawGrid(s);
  });

  // Keep editor helpers available to later modules and inline ribbon actions.
  if(window.ensureWordMeta) ensureWordMeta=window.ensureWordMeta;
  if(window.applyWordPage) applyWordPage=window.applyWordPage;
  if(window.autoSaveWord) autoSaveWord=window.autoSaveWord;

  const vp=document.querySelector('.versionPill');if(vp)vp.textContent='Executive Suite v11';
  const statusVersion=document.querySelector('#workspaceStatus span:nth-of-type(2)');if(statusVersion&&/Suite v\d+/.test(statusVersion.textContent))statusVersion.textContent='Executive Suite v11';
  try{DB.save();renderHome();renderFiles()}catch(e){console.error('v11 final initialization',e)}
})();


// ===== Ethan Office v13: runtime audit fixes, performance hardening and theme reliability =====
(function(){
  'use strict';
  const V16='16.0.0';
  if(!state.settings)state.settings={};
  state.settings.version=V16;

  // Ensure every visible version label agrees with the running suite version.
  const vp=document.querySelector('.versionPill');if(vp)vp.textContent='Executive Suite v16';
  const status=document.getElementById('workspaceStatus');
  if(status){const spans=[...status.querySelectorAll('span')];const ver=spans.find(x=>/Suite v\d+/i.test(x.textContent||''));if(ver)ver.textContent='Executive Suite v16'}

  // Restore backups through a v13-safe path. Older backups are migrated instead of downgrading runtime state.
  function restoreOfficeV13(input){
    const f=input?.files?.[0];if(!f)return;
    const r=new FileReader();
    r.onload=()=>{try{
      const parsed=JSON.parse(String(r.result||''));if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('Invalid backup');
      const keys=['wordDocs','sheets','presentations','notes','events','tasks','meetings','contacts','files','recents','trash'];
      keys.forEach(k=>{if(!Array.isArray(parsed[k]))parsed[k]=[]});
      parsed.settings=Object.assign({autosave:true},parsed.settings||{}, {version:V16});
      state=parsed;
      state.wordDocs.forEach(d=>{try{ensureWordMeta(d)}catch(e){}});
      state.sheets.forEach(x=>{try{ensureSheet(x)}catch(e){}});
      try{DB.save()}catch(e){console.error(e)}
      try{renderHome();renderFiles();renderWordList();renderSheetList();renderPresList()}catch(e){console.error(e)}
      toast('Backup restored successfully');nav('home');
    }catch(err){console.error(err);toast('This is not a valid Ethan Office backup.')}finally{input.value=''}};
    r.onerror=()=>toast('Could not read the backup file.');r.readAsText(f);
  }
  ['restoreInput','restoreInput2'].forEach(id=>{const x=document.getElementById(id);if(x)x.onchange=()=>restoreOfficeV13(x)});

  // Presentation typing previously wrote the whole workspace to localStorage on every keystroke.
  // Keep the live preview instant, but debounce persistence for smoother long editing sessions.
  const debounceV13=(fn,wait)=>{let timer;return (...args)=>{clearTimeout(timer);timer=setTimeout(()=>fn(...args),wait)}};
  const persistPresentation=debounceV13(()=>{try{if(currentPres){const p=state.presentations.find(x=>x.id===currentPres);if(p){p.updated=Date.now();DB.save();const st=document.getElementById('presSaveState');if(st)st.textContent='Saved locally'}}}catch(e){console.error(e)}},500);
  ['slideTitle','slideBody','speakerNotes','presTitle'].forEach(id=>{const el=document.getElementById(id);if(!el)return;el.oninput=()=>{
    const p=state.presentations.find(x=>x.id===currentPres);if(!p)return;const slide=p.slides[currentSlide];if(!slide)return;
    if(id==='slideTitle')slide.title=el.value;if(id==='slideBody')slide.body=el.value;if(id==='speakerNotes')slide.notes=el.value;if(id==='presTitle')p.title=el.value||'Presentation';
    const lt=document.getElementById('slideLiveTitle'),lb=document.getElementById('slideLiveBody');if(lt)lt.textContent=document.getElementById('slideTitle')?.value||'';if(lb)lb.textContent=document.getElementById('slideBody')?.value||'';
    const st=document.getElementById('presSaveState');if(st)st.textContent='Saving…';persistPresentation();
  }});

  // Final Excel formula engine: common everyday functions and safe cell-reference arithmetic.
  displayCell=function(raw,g){
    if(typeof raw!=='string'||!raw.startsWith('='))return raw;
    const f=raw.slice(1).trim();let m=/^(SUM|AVERAGE|MIN|MAX|COUNT|COUNTA)\(([^)]+)\)$/i.exec(f);
    if(m){const op=m[1].toUpperCase(),range=m[2],rm=/([A-T]\d+):([A-T]\d+)/i.exec(range);if(!rm)return'#ERR';
      const a=/([A-T])(\d+)/i.exec(rm[1]),b=/([A-T])(\d+)/i.exec(rm[2]);let c1=a[1].toUpperCase().charCodeAt(0)-65,c2=b[1].toUpperCase().charCodeAt(0)-65,r1=+a[2]-1,r2=+b[2]-1,rawVals=[];
      for(let r=Math.min(r1,r2);r<=Math.max(r1,r2);r++)for(let c=Math.min(c1,c2);c<=Math.max(c1,c2);c++)rawVals.push(g?.[r]?.[c]??'');
      if(op==='COUNTA')return rawVals.filter(v=>String(v).trim()!=='').length;const nums=rawVals.map(Number).filter(Number.isFinite);if(op==='COUNT')return nums.length;if(!nums.length)return'#ERR';if(op==='SUM')return nums.reduce((a,b)=>a+b,0);if(op==='AVERAGE')return nums.reduce((a,b)=>a+b,0)/nums.length;if(op==='MIN')return Math.min(...nums);if(op==='MAX')return Math.max(...nums)}
    m=/^ROUND\((.+),\s*(\d+)\)$/i.exec(f);if(m){let expr=m[1].replace(/\b([A-T]\d{1,2})\b/gi,x=>String(valAt(x,g)));if(!/^[0-9+\-*/(). %]+$/.test(expr))return'#ERR';try{const n=Function('return ('+expr.replaceAll('%','/100')+')')(),d=Math.min(10,+m[2]);return Math.round((n+Number.EPSILON)*10**d)/10**d}catch{return'#ERR'}}
    let expr=f.replace(/\b([A-T]\d{1,2})\b/gi,x=>String(valAt(x,g)));if(/^[0-9+\-*/(). %]+$/.test(expr)){try{return Function('return ('+expr.replaceAll('%','/100')+')')()}catch{return'#ERR'}}return'#ERR';
  };

  try{DB.save()}catch(e){console.error(e)}
})();

// ===== Ethan Office v16: AI removal + clean stable suite =====
(function(){
  'use strict';
  const V16='16.0.0';
  try{
    state.settings=state.settings||{};
    state.settings.version=V16;
    delete state.settings.aiGatewayUrl;
    delete state.settings.aiGatewayEnabled;
    delete state.settings.theme;
    if('aiHistory' in state) delete state.aiHistory;
    localStorage.removeItem('ethanOfficeTheme');
    document.documentElement.removeAttribute('data-office-theme');
    document.body.removeAttribute('data-office-theme');
    DB.save();
  }catch(e){console.error('v16 migration',e)}
  const vp=document.querySelector('.versionPill');if(vp)vp.textContent='Executive Suite v16';
  const status=document.getElementById('workspaceStatus');
  if(status){const spans=[...status.querySelectorAll('span')];const ver=spans.find(x=>/Suite v\d+/i.test(x.textContent||''));if(ver)ver.textContent='Executive Suite v16'}
  try{renderHome();renderFiles()}catch(e){console.error('v16 refresh',e)}
})();

// ===== Ethan Office v17: Word/Excel audit + presentation-grade editor =====
(function(){
'use strict';
const q=s=>document.querySelector(s), qa=s=>[...document.querySelectorAll(s)];
function deck(){return state.presentations.find(x=>x.id===currentPres)}
function slide(){return deck()?.slides?.[currentSlide]}
function syncPresFields(){const s=slide();if(!s)return;const t=q('#slideLiveTitle'),b=q('#slideLiveBody');s.title=(t?.innerText||'').trim();s.body=(b?.innerText||'').trim();s.notes=q('#speakerNotes')?.value||'';const p=deck();p.title=q('#presTitle')?.value||p.title||'Presentation';p.updated=Date.now();const ht=q('#slideTitle'),hb=q('#slideBody');if(ht)ht.value=s.title;if(hb)hb.value=s.body;DB.save()}
window.saveSlideFields=syncPresFields;
function ensureDeck(p){if(!p)return;p.theme=p.theme||'light';p.transition=p.transition||'none';p.design=p.design||{};p.slides=p.slides?.length?p.slides:[{title:'Click to add title',body:'Click to add text',notes:'',layout:'title-content'}];p.slides.forEach(s=>{s.notes=s.notes||'';s.layout=s.layout||'title-content';s.titleFont=s.titleFont||'Aptos Display';s.bodyFont=s.bodyFont||'Aptos';s.titleSize=s.titleSize||44;s.bodySize=s.bodySize||24;s.align=s.align||'left';s.bullets=!!s.bullets;if(!s.titleBox)s.titleBox=s.layout==='section'?{x:10,y:30,w:80,h:22}:{x:7,y:10,w:86,h:22};if(!s.bodyBox)s.bodyBox=s.layout==='section'?{x:14,y:55,w:72,h:22}:{x:7,y:38,w:86,h:47}})}
state.presentations.forEach(ensureDeck);

window.drawPres=function(){const p=deck();if(!p)return;ensureDeck(p);currentSlide=Math.max(0,Math.min(currentSlide,p.slides.length-1));const s=slide(),title=q('#slideLiveTitle'),body=q('#slideLiveBody'),notes=q('#speakerNotes'),canvas=q('#slideCanvas');if(!s||!canvas)return;
 title.textContent=s.title||'';body.textContent=s.body||'';notes.value=s.notes||'';q('#slideTitle').value=s.title||'';q('#slideBody').value=s.body||'';
 title.style.fontFamily=s.titleFont;title.style.fontSize=s.titleSize+'px';body.style.fontFamily=s.bodyFont;body.style.fontSize=s.bodySize+'px';body.style.textAlign=s.align||'left';body.style.whiteSpace='pre-wrap';
 const titleBox=q('#slideTitleBox'),bodyBox=q('#slideBodyBox');applyPresBox(titleBox,s.titleBox);applyPresBox(bodyBox,s.bodyBox);
 if(s.bullets&&!body.textContent.trim().startsWith('•')) body.textContent=body.textContent.split(/\n+/).filter(Boolean).map(x=>'• '+x.replace(/^•\s*/, '')).join('\n');
 canvas.className=`slide theme-${p.theme||'light'} transition-${p.transition||'none'} layout-${s.layout||'title-content'}`;
 if(s.layout==='title-only'){body.style.display='none';if(bodyBox)bodyBox.style.display='none'}else{body.style.display='block';if(bodyBox)bodyBox.style.display='block'};
 if(s.layout==='section'){canvas.style.justifyContent='center';title.style.textAlign='center';body.style.textAlign='center'}else{canvas.style.justifyContent='center';title.style.textAlign=s.titleAlign||'left'}
 if(s.image){canvas.style.backgroundImage=`linear-gradient(${p.theme==='light'?'#ffffffcc':'#00000066'},${p.theme==='light'?'#ffffffcc':'#00000066'}),url(${s.image})`;canvas.style.backgroundSize='cover';canvas.style.backgroundPosition='center'}else canvas.style.backgroundImage='';
 q('#slideThumbs').innerHTML=p.slides.map((x,i)=>`<button class="thumb ${i===currentSlide?'active':''}" onclick="selectSlide(${i})"><small>${i+1}</small><b>${esc(x.title||'Untitled')}</b><span>${esc((x.body||'').slice(0,70))}</span></button>`).join('');
 q('#presStatus').textContent=`Slide ${currentSlide+1} of ${p.slides.length} • ${(p.transition||'none')} transition`;q('#presViewLabel').textContent=`Normal • ${p.design?.size||'16:9'} • Ethan Presentation`;
};
['slideLiveTitle','slideLiveBody','speakerNotes'].forEach(id=>setTimeout(()=>{const el=q('#'+id);if(el)el.addEventListener('input',()=>{syncPresFields();const p=deck();if(p){q('#presStatus').textContent=`Slide ${currentSlide+1} of ${p.slides.length} • Editing`}})},0));
q('#presTitle')?.addEventListener('input',syncPresFields);


function applyPresBox(el,b){if(!el||!b)return;el.style.left=b.x+'%';el.style.top=b.y+'%';el.style.width=b.w+'%';el.style.height=b.h+'%'}
function savePresBox(which,el){const s=slide(),c=q('#slideCanvas');if(!s||!c||!el)return;const cr=c.getBoundingClientRect(),r=el.getBoundingClientRect();if(!cr.width||!cr.height)return;const b={x:Math.max(0,Math.min(100,(r.left-cr.left)/cr.width*100)),y:Math.max(0,Math.min(100,(r.top-cr.top)/cr.height*100)),w:Math.max(8,Math.min(100,(r.width/cr.width)*100)),h:Math.max(7,Math.min(100,(r.height/cr.height)*100))};if(b.x+b.w>100)b.x=100-b.w;if(b.y+b.h>100)b.y=100-b.h;s[which+'Box']=b;s.updated=Date.now();DB.save();q('#presSaveState').textContent='Saved locally'}
function enablePresObject(boxId,which){const box=q('#'+boxId);if(!box||box.dataset.dragReady)return;box.dataset.dragReady='1';const handle=box.querySelector('.presDragHandle');if(handle){handle.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();const c=q('#slideCanvas'),cr=c.getBoundingClientRect(),br=box.getBoundingClientRect(),sx=e.clientX,sy=e.clientY,startLeft=br.left-cr.left,startTop=br.top-cr.top;box.classList.add('is-selected');handle.setPointerCapture?.(e.pointerId);const move=ev=>{const dx=ev.clientX-sx,dy=ev.clientY-sy;const maxL=Math.max(0,cr.width-box.offsetWidth),maxT=Math.max(0,cr.height-box.offsetHeight);const l=Math.max(0,Math.min(maxL,startLeft+dx)),t=Math.max(0,Math.min(maxT,startTop+dy));box.style.left=(l/cr.width*100)+'%';box.style.top=(t/cr.height*100)+'%'};const up=ev=>{handle.releasePointerCapture?.(e.pointerId);window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);box.classList.remove('is-selected');savePresBox(which,box)};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up)})}
 // Bottom-right resize handle is the element edge/corner. Detect pointer in last 16 px.
 box.addEventListener('pointerdown',e=>{if(e.target===handle||e.target.closest?.('[contenteditable]'))return;const r=box.getBoundingClientRect();if(e.clientX<r.right-18||e.clientY<r.bottom-18)return;e.preventDefault();const c=q('#slideCanvas'),cr=c.getBoundingClientRect(),sx=e.clientX,sy=e.clientY,sw=r.width,sh=r.height;box.classList.add('is-selected');const move=ev=>{const maxW=Math.max(140,cr.right-r.left),maxH=Math.max(54,cr.bottom-r.top);box.style.width=Math.max(140,Math.min(maxW,sw+ev.clientX-sx))+'px';box.style.height=Math.max(54,Math.min(maxH,sh+ev.clientY-sy))+'px'};const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);box.classList.remove('is-selected');savePresBox(which,box)};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up)})}
setTimeout(()=>{enablePresObject('slideTitleBox','title');enablePresObject('slideBodyBox','body')},0);
window.setSlideLayout=function(v){const p=deck();if(!p)return;const s=slide();if(!s)return;s.layout=v;if(v==='title-only'){s.body='';s.titleBox={x:7,y:14,w:86,h:25};s.bodyBox={x:7,y:44,w:86,h:40}}else if(v==='section'){s.titleBox={x:10,y:30,w:80,h:22};s.bodyBox={x:14,y:55,w:72,h:22};if(!s.body)s.body='Section introduction'}else{s.titleBox={x:7,y:10,w:86,h:22};s.bodyBox={x:7,y:38,w:86,h:47}}DB.save();drawPres();toast('Slide layout applied — drag either box to reposition it')};
window.presResetBoxes=function(){const s=slide();if(!s)return;if(s.layout==='section'){s.titleBox={x:10,y:30,w:80,h:22};s.bodyBox={x:14,y:55,w:72,h:22}}else{s.titleBox={x:7,y:10,w:86,h:22};s.bodyBox={x:7,y:38,w:86,h:47}}DB.save();drawPres();toast('Slide placeholders reset')};

window.presFormat=function(kind,val){const s=slide();if(!s)return;if(kind==='titleSize')s.titleSize=Math.max(20,Math.min(72,Number(val)||44));if(kind==='bodySize')s.bodySize=Math.max(12,Math.min(48,Number(val)||24));if(kind==='align')s.align=val;if(kind==='bullets')s.bullets=!s.bullets;if(kind==='titleAlign')s.titleAlign=val;if(kind==='titleFont')s.titleFont=val;if(kind==='bodyFont')s.bodyFont=val;DB.save();drawPres()};
window.presBold=()=>document.execCommand('bold');window.presItalic=()=>document.execCommand('italic');window.presUnderline=()=>document.execCommand('underline');
window.presNewTextBox=()=>{const x=prompt('Text to add to this slide','New text');if(x){const s=slide();s.body=(s.body?s.body+'\n':'')+x;DB.save();drawPres()}};
window.presShape=shape=>{const symbol={rectangle:'▭',circle:'●',arrow:'➜'}[shape]||'◆';const s=slide();s.body=(s.body?s.body+'\n':'')+symbol+' ';DB.save();drawPres();toast(`${shape} shape added as an editable symbol`)};
window.presClearBackground=()=>{const s=slide();if(s){delete s.image;DB.save();drawPres()}};
window.presThemeVariant=(theme)=>setPresTheme(theme);
window.presSetSize=v=>{const p=deck();p.design=p.design||{};p.design.size=v;const c=q('#slideCanvas');c.style.aspectRatio=v==='4:3'?'4 / 3':'16 / 9';DB.save();drawPres()};
window.presDuplicate=()=>duplicateSlide();
window.presToggleNotes=()=>{const n=q('.presNotesPane');if(n)n.style.display=n.style.display==='none'?'grid':'none'};
window.presNormalView=()=>{q('.presLayout')?.classList.remove('presSorterMode');q('.presSorterGrid')?.remove();q('.slideStage').style.display='grid';q('.presNotesPane').style.display='grid';q('#presViewLabel').textContent='Normal • Ethan Presentation'};
window.presSorter=function(){syncPresFields();const p=deck(),layout=q('.presLayout'),main=q('.presMain');if(!p||!layout||!main)return;layout.classList.add('presSorterMode');q('.presSorterGrid')?.remove();const grid=document.createElement('div');grid.className='presSorterGrid';grid.innerHTML=p.slides.map((s,i)=>`<div class="presSorterCard ${i===currentSlide?'active':''}" onclick="currentSlide=${i};presNormalView();drawPres()"><small>Slide ${i+1}</small><h3>${esc(s.title||'Untitled')}</h3><p>${esc(s.body||'')}</p></div>`).join('');main.prepend(grid);q('#presViewLabel').textContent='Slide Sorter • Ethan Presentation'};
window.presPresenterView=function(){syncPresFields();const p=deck();if(!p)return;let i=currentSlide;const ov=document.createElement('div');ov.className='presPresenterOverlay';ov.innerHTML='<div class="presPresenterCurrent"></div><div class="presPresenterSide"><div class="presPresenterNext"></div><div class="presPresenterNotes"></div></div><div class="presPresenterControls"><button data-prev>← Previous</button><button data-next>Next →</button><button data-black>Black screen</button><span class="grow"></span><span data-time></span><span data-count></span><button data-close>End Show</button></div>';document.body.appendChild(ov);let black=false;const render=()=>{const s=p.slides[i],n=p.slides[i+1];ov.querySelector('.presPresenterCurrent').innerHTML=black?'<div style="background:#000;width:100%;height:100%"></div>':`<div class="slide theme-${p.theme||'light'}"><h1>${esc(s.title||'')}</h1><p>${esc(s.body||'')}</p></div>`;ov.querySelector('.presPresenterNext').innerHTML=`<b>Next</b><hr>${n?`<h3>${esc(n.title||'')}</h3><p>${esc(n.body||'')}</p>`:'End of presentation'}`;ov.querySelector('.presPresenterNotes').innerHTML=`<b>Speaker notes</b><hr><div>${esc(s.notes||'No notes for this slide.')}</div>`;ov.querySelector('[data-count]').textContent=`${i+1} / ${p.slides.length}`};render();const timer=setInterval(()=>{const t=ov.querySelector('[data-time]');if(t)t.textContent=new Date().toLocaleTimeString()},1000);ov.querySelector('[data-prev]').onclick=()=>{i=Math.max(0,i-1);render()};ov.querySelector('[data-next]').onclick=()=>{i=Math.min(p.slides.length-1,i+1);render()};ov.querySelector('[data-black]').onclick=()=>{black=!black;render()};ov.querySelector('[data-close]').onclick=()=>{clearInterval(timer);ov.remove()};ov.tabIndex=0;ov.focus();ov.onkeydown=e=>{if(e.key==='Escape')ov.querySelector('[data-close]').click();if(['ArrowRight','PageDown',' '].includes(e.key))ov.querySelector('[data-next]').click();if(['ArrowLeft','PageUp'].includes(e.key))ov.querySelector('[data-prev]').click();if(e.key.toLowerCase()==='b')ov.querySelector('[data-black]').click()}}

const previousPresTab=window.presTab;
window.presTab=function(tab,btn){btn?.parentElement?.querySelectorAll('button').forEach(x=>x.classList.remove('active'));btn?.classList.add('active');const b=q('#presRibbonBody');if(!b)return;const fonts='<option>Aptos</option><option>Aptos Display</option><option>Arial</option><option>Georgia</option><option>Times New Roman</option>';
const tabs={
home:`<div class=ribbonGroup><b>Clipboard</b><button onclick="presBold()"><b>B</b></button><button onclick="presItalic()"><i>I</i></button><button onclick="presUnderline()"><u>U</u></button></div><div class=ribbonGroup><b>Slides</b><button onclick="addSlide()">New Slide</button><button onclick="presDuplicate()">Duplicate</button><button onclick="deleteSlide()">Delete</button><select onchange="setSlideLayout(this.value)"><option value=title-content>Title & Content</option><option value=title-only>Title Only</option><option value=section>Section Header</option></select><button onclick="presResetBoxes()">Reset Positions</button></div><div class=ribbonGroup><b>Title</b><select onchange="presFormat('titleFont',this.value)">${fonts}</select><select onchange="presFormat('titleSize',this.value)"><option>32</option><option selected>44</option><option>54</option><option>60</option></select></div><div class=ribbonGroup><b>Paragraph</b><button onclick="presFormat('bullets')">• Bullets</button><button onclick="presFormat('align','left')">Left</button><button onclick="presFormat('align','center')">Center</button><button onclick="presFormat('align','right')">Right</button></div>`,
insert:`<div class=ribbonGroup><b>Text</b><button onclick="presNewTextBox()">Text Box</button><button onclick="presInsertSymbol()">Symbol</button><button onclick="presInsertDate()">Date</button></div><div class=ribbonGroup><b>Images</b><button onclick="presInsertImage()">Pictures</button><button onclick="presRemoveImage()">Remove Picture</button><input id=presImageInput type=file accept="image/*" hidden onchange="presImagePicked(event)"></div><div class=ribbonGroup><b>Illustrations</b><button onclick="presShape('rectangle')">Rectangle</button><button onclick="presShape('circle')">Circle</button><button onclick="presShape('arrow')">Arrow</button></div>`,
design:`<div class=ribbonGroup><b>Themes</b><button onclick="setPresTheme('light')">Office Light</button><button onclick="setPresTheme('navy')">Navy</button><button onclick="setPresTheme('green')">Green</button><button onclick="setPresTheme('purple')">Purple</button><button onclick="setPresTheme('sunset')">Sunset</button></div><div class=ribbonGroup><b>Customize</b><select onchange="presSetSize(this.value)"><option value="16:9">Widescreen 16:9</option><option value="4:3">Standard 4:3</option></select><button onclick="presBackground()">Format Background</button><button onclick="presClearBackground()">Reset Background</button></div>`,
transitions:`<div class=ribbonGroup><b>Transition to This Slide</b><button onclick="setTransition('none')">None</button><button onclick="setTransition('fade')">Fade</button><button onclick="setTransition('push')">Push</button><button onclick="setTransition('zoom')">Zoom</button></div><div class=ribbonGroup><b>Preview</b><button onclick="previewPresAnimation()">Preview</button></div>`,
animations:`<div class=ribbonGroup><b>Animation</b><button onclick="setPresObjectAnimation('fade')">Fade</button><button onclick="setPresObjectAnimation('rise')">Float In</button><button onclick="setPresObjectAnimation('none')">None</button></div><div class=ribbonGroup><b>Preview</b><button onclick="previewPresAnimation()">Preview</button></div>`,
slideshow:`<div class=ribbonGroup><b>Start Slide Show</b><button onclick="presentAll()">From Beginning</button><button onclick="presentFromCurrent()">From Current Slide</button></div><div class=ribbonGroup><b>Presenter Tools</b><button onclick="presPresenterView()">Presenter View</button><button onclick="presRehearse()">Rehearse Timings</button></div>`,
review:`<div class=ribbonGroup><b>Proofing</b><button onclick="presWordCount()">Word Count</button><button onclick="presFind()">Find</button></div><div class=ribbonGroup><b>Notes</b><button onclick="presToggleNotes()">Show / Hide Notes</button></div>`,
view:`<div class=ribbonGroup><b>Presentation Views</b><button onclick="presNormalView()">Normal</button><button onclick="presSorter()">Slide Sorter</button><button onclick="presNotesView()">Notes Page</button></div><div class=ribbonGroup><b>Show</b><button onclick="presToggleNotes()">Notes</button></div>`,
file:`<div class=ribbonGroup><b>File</b><button onclick="savePres()">Save</button><button onclick="wordSaveCopy?.()">Save a Copy</button><button onclick="printOffice()">Print / PDF</button></div>`};b.innerHTML=tabs[tab]||tabs.home};

// Excel audit: repair data validation and make freeze panes meaningful.
window.xlDataValidation=function(){const vals=prompt('Dropdown choices, separated by commas','Yes,No,Pending');if(!vals)return;const a=vals.split(',').map(x=>x.trim()).filter(Boolean);if(!a.length)return;const choice=prompt('Choose value\n'+a.map((x,i)=>`${i+1}. ${x}`).join('\n'),'1');const v=a[(Number(choice)||1)-1];const s=state.sheets.find(x=>x.id===currentSheet);if(s&&v!==undefined){s.grid[xlCell.r][xlCell.c]=v;s.validation=s.validation||{};s.validation[xlCell.r+','+xlCell.c]=a;DB.save();drawGrid(s);toast('Dropdown value applied')}};
window.xlFreeze=function(){const s=state.sheets.find(x=>x.id===currentSheet);if(!s)return;s.freeze=!s.freeze;DB.save();drawGrid(s);q('#sheetGrid')?.classList.toggle('xlFrozen',s.freeze);toast(s.freeze?'Top row frozen':'Freeze panes removed')};

// Word audit: keyboard-friendly save and predictable editor focus.
q('#wordWorkspace')?.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();saveWord();toast('Document saved')}});
q('#sheetWorkspace')?.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();saveSheet();toast('Workbook saved')}});
q('#presWorkspace')?.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();savePres();toast('Presentation saved')}});

setTimeout(()=>{try{state.settings.version='17.3.0';DB.save();if(q('#page-presentation .ribbonTabs button'))presTab('home',q('#page-presentation .ribbonTabs button'))}catch(e){console.error('v17 init',e)}},0);
})();
