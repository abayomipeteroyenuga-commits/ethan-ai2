(() => {
  'use strict';

  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const storageArray = key => { try { const x=JSON.parse(localStorage.getItem(key)||'[]'); return Array.isArray(x)?x:[]; } catch { return []; } };
  const saveArray = (key, arr) => { try { localStorage.setItem(key, JSON.stringify(arr)); } catch {} };
  const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./,''); } catch { return 'source'; } };

  const hero=$('#hero'), results=$('#results'), status=$('#status'), answer=$('#answer'), sourceList=$('#sourceList');
  const sourceCount=$('#sourceCount'), citationChips=$('#citationChips'), modeLabel=$('#modeLabel'), topSources=$('#topSources'), topSourceGrid=$('#topSourceGrid');
  const query=$('#query'), queryTop=$('#queryTop'), followup=$('#followup'), thread=$('#conversationThread');
  const recency=$('#recency'), region=$('#region'), deepSearch=$('#deepSearch'), premiumSearch=$('#premiumSearch');

  let currentQuery='';
  let currentType='all';
  let currentMode='search';
  let lastData=null;
  let searchController=null;
  let searchSeq=0;
  let deferredInstallPrompt=null;
  let supabaseClient=null;
  let currentUser=null;

  const suggestions=[
    'What is artificial intelligence?','Latest technology trends','Explain photosynthesis simply',
    'How to write a professional business plan','What is cloud computing?','Teach me Excel formulas',
    'Latest science discoveries','How does the internet work?'
  ];

  function setWhite(){
    document.documentElement.style.background='#fff';
    document.body.style.background='#fff';
    document.body.classList.remove('dark');
    document.body.removeAttribute('data-theme');
  }
  setWhite();

  function toast(msg){
    let box=$('#appToast');
    if(!box){
      box=document.createElement('div'); box.id='appToast'; box.className='app-toast'; box.setAttribute('role','status'); box.setAttribute('aria-live','polite'); document.body.appendChild(box);
    }
    box.textContent=msg; box.classList.add('show');
    clearTimeout(toast._t); toast._t=setTimeout(()=>box.classList.remove('show'),2200);
  }

  function closePanels(){ $$('.panel').forEach(p=>{p.classList.remove('open');p.setAttribute('aria-hidden','true')}); }
  function openPanel(id){ closePanels(); const p=$(id); if(p){p.classList.add('open');p.setAttribute('aria-hidden','false');} }
  function activateNav(id){ $$('.main-menu .nav-btn').forEach(b=>b.classList.remove('active-menu')); $(id)?.classList.add('active-menu'); }

  function showHome(clear=false){
    closePanels();
    if(clear){
      if(thread) thread.innerHTML='';
      try{sessionStorage.removeItem('ethan-current-thread');}catch{}
      lastData=null; currentQuery='';
      if(query) query.value=''; if(queryTop) queryTop.value='';
    }
    results?.classList.add('hidden'); hero?.classList.remove('hidden');
    window.scrollTo({top:0,behavior:'smooth'}); setTimeout(()=>query?.focus(),40); activateNav('#discoverBtn');
  }

  function addTurn(role, text, loading=false){
    if(!thread) return null;
    const row=document.createElement('article');
    row.className=`chat-turn ${role}${loading?' chat-loading':''}`;
    row.innerHTML=`<div class="chat-avatar">${role==='user'?'Y':'E'}</div><div class="chat-bubble">${esc(text)}</div>`;
    thread.appendChild(row); row.scrollIntoView({behavior:'smooth',block:'end'}); return row;
  }
  function saveThread(){ try{if(thread)sessionStorage.setItem('ethan-current-thread',thread.innerHTML);}catch{} }
  function restoreThread(){ try{const html=sessionStorage.getItem('ethan-current-thread'); if(html&&thread)thread.innerHTML=html;}catch{} }

  function remember(q){
    const arr=storageArray('ethan-search-history');
    saveArray('ethan-search-history',[q,...arr.filter(x=>x!==q)].slice(0,30)); renderHistory();
  }
  function renderHistory(){
    const box=$('#historyList'); if(!box)return; const arr=storageArray('ethan-search-history');
    box.innerHTML=arr.length?arr.map(q=>`<button class="history-item" data-history="${esc(q)}">${esc(q)}</button>`).join(''):'<p>No searches yet.</p>';
    $$('[data-history]',box).forEach(b=>b.onclick=()=>{closePanels(); runConversation(b.dataset.history);});
  }
  function renderSaved(){
    const box=$('#savedList'); if(!box)return; const arr=storageArray('ethan-saved-searches');
    box.innerHTML=arr.length?arr.map(q=>`<button class="saved-item" data-saved="${esc(q)}">★ ${esc(q)}</button>`).join(''):'<p>No saved searches yet.</p>';
    $$('[data-saved]',box).forEach(b=>b.onclick=()=>{closePanels(); runConversation(b.dataset.saved);});
  }
  function renderProjects(){
    const box=$('#projectsList'); if(!box)return; const arr=storageArray('ethan-projects');
    box.innerHTML=arr.length?arr.map((x,i)=>`<div class="workspace-item"><button data-project="${i}">▦ ${esc(x)}</button><button class="workspace-delete" data-project-delete="${i}" aria-label="Delete project">×</button></div>`).join(''):'<div class="workspace-empty">No projects yet.</div>';
    $$('[data-project]',box).forEach(b=>b.onclick=()=>{const a=storageArray('ethan-projects');const name=a[Number(b.dataset.project)]||'';try{localStorage.setItem('ethan-active-project',name);}catch{}closePanels();toast(name?`Project selected: ${name}`:'Project selected.');});
    $$('[data-project-delete]',box).forEach(b=>b.onclick=()=>{const a=storageArray('ethan-projects');a.splice(Number(b.dataset.projectDelete),1);saveArray('ethan-projects',a);renderProjects();});
  }
  function renderLibrary(){
    const box=$('#libraryList'); if(!box)return; const arr=storageArray('ethan-saved-searches');
    box.innerHTML=arr.length?arr.map(q=>`<div class="workspace-item"><button data-lib="${esc(q)}">▤ ${esc(q)}</button></div>`).join(''):'<div class="workspace-empty">Your saved research will appear here.</div>';
    $$('[data-lib]',box).forEach(b=>b.onclick=()=>{closePanels();runConversation(b.dataset.lib);});
  }
  function renderSchedule(){
    const box=$('#scheduleList'); if(!box)return; const arr=storageArray('ethan-scheduled');
    box.innerHTML=arr.length?arr.map((x,i)=>`<div class="workspace-item"><button data-schedule="${esc(x)}">◷ ${esc(x)}</button><button class="workspace-delete" data-schedule-delete="${i}" aria-label="Delete scheduled item">×</button></div>`).join(''):'<div class="workspace-empty">Nothing scheduled yet.</div>';
    $$('[data-schedule]',box).forEach(b=>b.onclick=()=>{closePanels();runConversation(b.dataset.schedule);});
    $$('[data-schedule-delete]',box).forEach(b=>b.onclick=()=>{const a=storageArray('ethan-scheduled');a.splice(Number(b.dataset.scheduleDelete),1);saveArray('ethan-scheduled',a);renderSchedule();});
  }
  function renderPinned(){
    const box=$('#pinnedList'); if(!box)return; const arr=storageArray('ethan-pinned');
    box.innerHTML=arr.length?arr.map((q,i)=>`<div class="workspace-item"><button data-pin="${esc(q)}">★ ${esc(q)}</button><button class="workspace-delete" data-pin-delete="${i}" aria-label="Delete pinned item">×</button></div>`).join(''):'<div class="workspace-empty">No pinned conversations yet.</div>';
    $$('[data-pin]',box).forEach(b=>b.onclick=()=>{closePanels();runConversation(b.dataset.pin);});
    $$('[data-pin-delete]',box).forEach(b=>b.onclick=()=>{const a=storageArray('ethan-pinned');a.splice(Number(b.dataset.pinDelete),1);saveArray('ethan-pinned',a);renderPinned();});
  }

  function showSuggestions(value){
    const box=$('#suggestions'); if(!box)return; const v=(value||'').trim().toLowerCase();
    if(!v){box.classList.add('hidden');box.innerHTML='';return;}
    const hits=suggestions.filter(x=>x.toLowerCase().includes(v)).slice(0,5);
    box.innerHTML=hits.map(x=>`<button type="button" data-suggest="${esc(x)}">⌕ ${esc(x)}</button>`).join('');
    box.classList.toggle('hidden',!hits.length); $$('[data-suggest]',box).forEach(b=>b.onclick=()=>runConversation(b.dataset.suggest));
  }

  function renderSources(sources=[]){
    if(sourceCount) sourceCount.textContent=`${sources.length} result${sources.length===1?'':'s'}`;
    if(citationChips) citationChips.innerHTML=sources.slice(0,8).map((s,i)=>`<a class="citation-chip" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">[${i+1}] ${esc(hostOf(s.url))}</a>`).join('');
    if(sourceList) sourceList.innerHTML=sources.length?sources.map((s,i)=>`<a class="source" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer"><div><div class="domain">🌐 ${esc(hostOf(s.url))}</div><b>${esc(s.title||hostOf(s.url))}</b>${s.snippet?`<p>${esc(s.snippet)}</p>`:''}</div><span class="rank">${i+1}</span></a>`).join(''):'<p>No source links were returned.</p>';
    if(topSourceGrid) topSourceGrid.innerHTML=sources.slice(0,4).map((s,i)=>`<a class="top-source" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer"><small>${i+1} · ${esc(hostOf(s.url))}</small><b>${esc(s.title||hostOf(s.url))}</b></a>`).join('');
    topSources?.classList.toggle('hidden',!sources.length);
  }

  function appendRichSources(row,sources=[]){
    const bubble=$('.chat-bubble',row); if(!bubble||!sources.length)return;
    const wrap=document.createElement('div'); wrap.className='rich-result-wrap';
    wrap.innerHTML=`<div class="rich-result-summary"><strong>${esc(modeLabel?.textContent||'ETHAN Search')}</strong><span>${sources.length} result${sources.length===1?'':'s'}</span></div><div class="rich-source-grid">${sources.slice(0,6).map(s=>`<a class="rich-source" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer"><div class="rich-source-domain">🌐 ${esc(hostOf(s.url))}</div><div class="rich-source-title">${esc(s.title||hostOf(s.url))}</div>${s.snippet?`<div class="rich-source-snippet">${esc(s.snippet)}</div>`:''}</a>`).join('')}</div>`;
    bubble.appendChild(wrap);
  }

  function relatedQueries(q){ const b=q.replace(/\n.*/s,'').slice(0,90); return [`Explain ${b} simply`,`Compare viewpoints on ${b}`,`Key facts and latest developments about ${b}`]; }
  function renderRelated(q){ const box=$('#related'); if(!box)return; box.innerHTML=relatedQueries(q).map(x=>`<button type="button" data-related="${esc(x)}">${esc(x)}</button>`).join(''); $$('[data-related]',box).forEach(b=>b.onclick=()=>runConversation(b.dataset.related,{followup:true})); }

  async function requestSearch(q,{followup=false}={}){
    const seq=++searchSeq;
    if(searchController) searchController.abort();
    const controller=new AbortController(); searchController=controller;
    const timer=setTimeout(()=>controller.abort(),30000);
    const payload={query:q,type:currentType,recency:recency?.value||'any',region:region?.value||'global',mode:currentMode,deepSearch:Boolean(deepSearch?.checked),premium:Boolean(premiumSearch?.checked)};
    if(followup&&lastData) payload.context={previousQuery:lastData.query||'',previousAnswer:lastData.answer||''};
    const headers={'Content-Type':'application/json'};
    if(payload.premium&&window.ETHAN_AUTH?.getAccessToken){const token=await window.ETHAN_AUTH.getAccessToken(); if(token)headers.Authorization=`Bearer ${token}`;}
    try{
      const r=await fetch('/api/search',{method:'POST',headers,body:JSON.stringify(payload),signal:controller.signal});
      const text=await r.text(); let data={};
      try{data=JSON.parse(text);}catch{throw new Error('Search service returned an invalid response.');}
      if(!r.ok) throw new Error(data.error||`Search failed (${r.status}).`);
      if(seq!==searchSeq) throw new DOMException('Superseded','AbortError');
      return data;
    } finally {clearTimeout(timer); if(searchController===controller)searchController=null;}
  }

  async function runConversation(q,opts={}){
    q=(q||'').trim(); if(q.length<2){toast('Enter at least 2 characters.');return;}
    currentQuery=q; remember(q); showSuggestions('');
    hero?.classList.add('hidden'); results?.classList.remove('hidden'); if(queryTop)queryTop.value=q;
    const userRow=addTurn('user',q); const assistantRow=addTurn('assistant','Working on your request…',true); saveThread();
    if(status)status.textContent=deepSearch?.checked?'Deep Search is gathering and comparing sources…':'Searching and preparing your answer…';
    document.body.classList.add('loading');
    try{
      const data=await requestSearch(q,opts); lastData={...data,query:q};
      const text=(data.answer||'No answer returned.').trim();
      if(answer)answer.textContent=text;
      if(modeLabel)modeLabel.textContent=data.mode==='premium-ai'?'✦ Premium AI Search':data.mode==='free-news'?'News':data.mode==='free-academic'?'Academic':data.mode==='free-images'?'Images':data.mode==='free-videos'?'Videos':data.mode==='free-discussions'?'Discussions':data.mode==='safe-search'?'Safe Search':'ETHAN Search';
      if(status)status.textContent=data.notice||'';
      renderSources(data.sources||[]); renderRelated(q);
      if(assistantRow){
        const bubble=$('.chat-bubble',assistantRow); if(bubble){bubble.textContent=text; appendRichSources(assistantRow,data.sources||[]);} assistantRow.classList.remove('chat-loading'); assistantRow.insertAdjacentHTML('beforeend','<div class="chat-meta">ETHAN AI</div>');
      }
      recordUsage(); saveThread();
    } catch(e){
      const msg=e?.name==='AbortError'?'That search was replaced or took too long. Please try again.':(e?.message||'Search could not be completed right now.');
      if(answer)answer.textContent=msg; if(status)status.textContent=msg;
      if(assistantRow){const bubble=$('.chat-bubble',assistantRow);if(bubble)bubble.textContent=msg;assistantRow.classList.remove('chat-loading');}
      saveThread();
    } finally {document.body.classList.remove('loading');}
  }
  window.runSearch=runConversation;

  function recordUsage(){
    try{const day=new Date().toISOString().slice(0,10),dayKey='ethan_ai_usage_day';let used=Number(localStorage.getItem('ethan_ai_daily_usage')||0);if(localStorage.getItem(dayKey)!==day){used=0;localStorage.setItem(dayKey,day)}used++;localStorage.setItem('ethan_ai_daily_usage',String(used));const label=$('#usageLabel'),bar=$('#usageBar');if(label)label.textContent=`${Math.min(used,20)} / 20 today`;if(bar)bar.style.width=`${Math.min(100,used/20*100)}%`;}catch{}
  }

  function startVoice(target){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){toast('Voice search is not supported by this browser.');return;}
    try{const r=new SR();r.lang=navigator.language||'en-US';r.interimResults=false;r.maxAlternatives=1;r.onresult=e=>{const spoken=e.results?.[0]?.[0]?.transcript||'';if(spoken){target.value=spoken;runConversation(spoken);}};r.onerror=()=>toast('Voice input could not start. Check microphone permission.');r.start();}catch{toast('Voice input is unavailable right now.');}
  }

  function openCommercial(title,text){const modal=$('#commercialModal');if(!modal)return;$('#modalTitle').textContent=title;$('#modalText').textContent=text;modal.hidden=false;}
  function closeCommercial(){const m=$('#commercialModal');if(m)m.hidden=true;}

  async function initAuth(){
    const cfg=window.ETHAN_CONFIG||{};
    const configured=Boolean(cfg.supabaseUrl&&cfg.supabaseAnonKey&&window.supabase?.createClient);
    if(configured){
      try{supabaseClient=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});}catch{}
    }
    window.ETHAN_AUTH={configured:Boolean(supabaseClient),async getAccessToken(){try{const {data}=await supabaseClient?.auth.getSession();return data?.session?.access_token||'';}catch{return '';}}};
    if(!supabaseClient)return;
    try{const {data}=await supabaseClient.auth.getSession();currentUser=data?.session?.user||null;updateAccountButton();}catch{}
    supabaseClient.auth.onAuthStateChange((event,session)=>{currentUser=session?.user||null;updateAccountButton();if(event==='PASSWORD_RECOVERY'){openCommercial('Reset your ETHAN AI password','Enter a new password of at least 8 characters.');$('.auth-tabs')?.setAttribute('hidden','');$('#authName').hidden=true;$('#authEmail').hidden=true;$('#authPassword').hidden=false;$('#authPassword').value='';$('#authPassword').placeholder='New password (minimum 8 characters)';$('#forgotPasswordBtn').hidden=true;$('#authSubmit').textContent='Update password';$('#authForm').dataset.action='recovery';}});
  }
  function updateAccountButton(){const b=$('#accountBtn');if(!b)return;const label=$('.account-label',b);if(label)label.textContent=currentUser?(currentUser.user_metadata?.display_name||currentUser.email||'Account').split('@')[0]:'Account / Sign in';}
  function setAuthMode(mode){
    const signup=mode==='signup'; $('#authForm').dataset.action=mode; $$('.auth-tab').forEach(x=>x.classList.toggle('active',x.dataset.auth===mode));
    const n=$('#authName'); if(n)n.hidden=!signup; const p=$('#authPassword');if(p)p.autocomplete=signup?'new-password':'current-password';
    $('#authSubmit').textContent=signup?'Create account':'Sign in'; $('#modalTitle').textContent=signup?'Create your ETHAN AI account':'Sign in to ETHAN AI'; $('#modalText').textContent=signup?'Create an account with your email and password.':'Welcome back. Enter your email and password.'; $('#authStatus').textContent='';
  }

  async function submitAuth(e){
    e.preventDefault(); const st=$('#authStatus'),btn=$('#authSubmit');
    if(!supabaseClient){st.textContent='Account service is not available right now.';return;}
    if(currentUser&&$('#authForm').dataset.action==='signout'){btn.disabled=true;try{await supabaseClient.auth.signOut();closeCommercial();toast('Signed out.');}catch(err){st.textContent=err.message||'Sign out failed.';}finally{btn.disabled=false;}return;}
    const mode=$('#authForm').dataset.action||'signin',email=$('#authEmail').value.trim(),password=$('#authPassword').value,name=$('#authName').value.trim();
    if(mode==='recovery'){
      if(password.length<8){st.textContent='Enter a new password of at least 8 characters.';return;}
      btn.disabled=true;st.textContent='Updating password…';
      try{const {error}=await supabaseClient.auth.updateUser({password});if(error)throw error;st.textContent='Password updated.';$('#authForm').dataset.action='signin';setTimeout(closeCommercial,650);}catch(err){st.textContent=err.message||'Password update failed.';}finally{btn.disabled=false;}return;
    }
    if(!email||password.length<8){st.textContent='Enter a valid email and a password of at least 8 characters.';return;}
    btn.disabled=true;st.textContent='Please wait…';
    try{
      if(mode==='signup'){
        const {error}=await supabaseClient.auth.signUp({email,password,options:{data:{display_name:name},emailRedirectTo:location.origin}}); if(error)throw error;
        st.textContent='Account created. Check your email if confirmation is required.';
      }else{
        const {error}=await supabaseClient.auth.signInWithPassword({email,password}); if(error)throw error; st.textContent='Signed in.'; setTimeout(closeCommercial,500);
      }
    }catch(err){st.textContent=err.message||'Authentication failed.';}finally{btn.disabled=false;}
  }

  function openAccount(){
    if(currentUser){openCommercial('Your ETHAN AI account',currentUser.email||'Signed in');$('.auth-tabs')?.setAttribute('hidden','');$('#authName').hidden=true;$('#authEmail').hidden=true;$('#authPassword').hidden=true;$('#forgotPasswordBtn').hidden=true;$('#authSubmit').textContent='Sign out';$('#authForm').dataset.action='signout';}
    else{$('.auth-tabs')?.removeAttribute('hidden');$('#authEmail').hidden=false;$('#authPassword').hidden=false;$('#forgotPasswordBtn').hidden=false;setAuthMode('signin');openCommercial('Sign in to ETHAN AI','Welcome back. Enter your email and password.');}
  }

  async function forgotPassword(){
    const email=$('#authEmail').value.trim(),st=$('#authStatus'); if(!supabaseClient){st.textContent='Account service is unavailable.';return;} if(!email){st.textContent='Enter your email address first.';return;}
    try{const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:location.origin});if(error)throw error;st.textContent='Password reset email sent.';}catch(err){st.textContent=err.message||'Could not send reset email.';}
  }

  // Forms/search interactions
  $('#searchForm')?.addEventListener('submit',e=>{e.preventDefault();runConversation(query?.value||'');});
  $('#searchFormTop')?.addEventListener('submit',e=>{e.preventDefault();runConversation(queryTop?.value||'');});
  $('#followupForm')?.addEventListener('submit',e=>{e.preventDefault();const q=followup?.value.trim();if(q){followup.value='';runConversation(q,{followup:true});}});
  query?.addEventListener('input',()=>showSuggestions(query.value));
  $('#voiceBtn')?.addEventListener('click',()=>startVoice(query)); $('#voiceBtnTop')?.addEventListener('click',()=>startVoice(queryTop));
  $('#modeSwitch')?.addEventListener('click',e=>{const b=e.target.closest('[data-mode]');if(!b)return;$$('#modeSwitch button').forEach(x=>x.classList.remove('active'));b.classList.add('active');currentMode=b.dataset.mode;query.placeholder=currentMode==='chat'?'Chat with ETHAN AI…':'Ask ETHAN AI anything…';});
  $$('#tabs [data-type]').forEach(b=>b.addEventListener('click',()=>{$$('#tabs button').forEach(x=>x.classList.remove('active'));b.classList.add('active');currentType=b.dataset.type;if(currentQuery)runConversation(currentQuery);}));
  recency?.addEventListener('change',()=>currentQuery&&runConversation(currentQuery)); region?.addEventListener('change',()=>currentQuery&&runConversation(currentQuery)); deepSearch?.addEventListener('change',()=>currentQuery&&runConversation(currentQuery));
  premiumSearch?.addEventListener('change',async()=>{if(!premiumSearch.checked)return;const token=await window.ETHAN_AUTH?.getAccessToken?.();if(!token){premiumSearch.checked=false;openAccount();toast('Sign in to use Premium AI.');}else if(currentQuery)runConversation(currentQuery);});

  // Main navigation
  $('#homeBtn')?.addEventListener('click',()=>showHome(false)); $('#discoverBtn')?.addEventListener('click',()=>showHome(true));
  $('#projectsBtn')?.addEventListener('click',()=>{activateNav('#projectsBtn');renderProjects();openPanel('#projectsPanel');});
  $('#libraryBtn')?.addEventListener('click',()=>{activateNav('#libraryBtn');renderLibrary();openPanel('#libraryPanel');});
  $('#scheduleBtn')?.addEventListener('click',()=>{activateNav('#scheduleBtn');renderSchedule();openPanel('#schedulePanel');});
  $('#pinnedBtn')?.addEventListener('click',()=>{activateNav('#pinnedBtn');renderPinned();openPanel('#pinnedPanel');});
  $('#historyBtn')?.addEventListener('click',()=>{activateNav('#historyBtn');renderHistory();openPanel('#historyPanel');});
  $('#savedBtn')?.addEventListener('click',()=>{activateNav('#savedBtn');renderSaved();openPanel('#savedPanel');});
  $('#pricingBtn')?.addEventListener('click',()=>{activateNav('#pricingBtn');openPanel('#upgradePanel');});
  $('#accountBtn')?.addEventListener('click',()=>{activateNav('#accountBtn');openAccount();});
  $('#themeBtn')?.addEventListener('click',()=>{activateNav('#themeBtn');openPanel('#appearancePanel');});
  $$('.panel [data-close]').forEach(b=>b.addEventListener('click',()=>{closePanels();activateNav('#discoverBtn');}));
  $('#modalClose')?.addEventListener('click',closeCommercial); $('#commercialModal')?.addEventListener('click',e=>{if(e.target===$('#commercialModal'))closeCommercial();});

  $('#addProject')?.addEventListener('click',()=>{const name=prompt('Project name');if(!name?.trim())return;const a=storageArray('ethan-projects');a.unshift(name.trim());saveArray('ethan-projects',a.slice(0,30));renderProjects();});
  $('#addSchedule')?.addEventListener('click',()=>{const name=prompt('What do you want to schedule?');if(!name?.trim())return;const a=storageArray('ethan-scheduled');a.unshift(name.trim());saveArray('ethan-scheduled',a.slice(0,30));renderSchedule();});
  $('#pinCurrent')?.addEventListener('click',()=>{if(!currentQuery){toast('Search or chat first, then pin it.');return;}const a=storageArray('ethan-pinned').filter(x=>x!==currentQuery);a.unshift(currentQuery);saveArray('ethan-pinned',a.slice(0,30));renderPinned();toast('Pinned.');});
  $('#clearHistory')?.addEventListener('click',()=>{localStorage.removeItem('ethan-search-history');renderHistory();}); $('#clearSaved')?.addEventListener('click',()=>{localStorage.removeItem('ethan-saved-searches');renderSaved();renderLibrary();});
  $('#saveSearch')?.addEventListener('click',()=>{if(!currentQuery)return;const a=storageArray('ethan-saved-searches').filter(x=>x!==currentQuery);a.unshift(currentQuery);saveArray('ethan-saved-searches',a.slice(0,30));renderSaved();renderLibrary();$('#saveSearch').textContent='★ Saved';toast('Saved to Library.');});
  $('#copyAnswer')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(answer?.textContent||'');toast('Answer copied.');}catch{toast('Copy is unavailable in this browser.');}});
  $('#copyConversation')?.addEventListener('click',async()=>{const text=$$('.chat-turn',thread).map(x=>x.innerText.trim()).join('\n\n');if(!text)return;try{await navigator.clipboard.writeText(text);toast('Conversation copied.');}catch{toast('Copy is unavailable in this browser.');}});
  $('#clearConversationBtn')?.addEventListener('click',()=>showHome(true));
  $$('[data-focus]').forEach(b=>b.addEventListener('click',()=>currentQuery&&runConversation(`${currentQuery}. ${b.dataset.focus}`,{followup:true})));
  $$('[data-vote]').forEach(b=>b.addEventListener('click',()=>{b.textContent=b.dataset.vote==='up'?'✅':'✓';try{localStorage.setItem('ethan-last-feedback',b.dataset.vote);}catch{}}));
  $$('.upgrade-choice').forEach(b=>b.addEventListener('click',()=>{const p=b.dataset.upgradePlan==='education'?'Education / Business':(b.dataset.upgradePlan||'').replace(/^./,x=>x.toUpperCase());closePanels();openCommercial(`ETHAN AI ${p}`,'Plan selected. Checkout will become available when the payment provider is connected.');}));
  $$('.plan-btn').forEach(b=>b.addEventListener('click',()=>{const p=b.dataset.plan==='education-business'?'Education / Business':(b.dataset.plan||'').replace(/^./,x=>x.toUpperCase());openCommercial(`ETHAN AI ${p}`,p==='Free'?'Create an account or sign in to continue.':'Plan selected. Checkout will become available when the payment provider is connected.');}));

  // Auth interactions
  $('#signInTab')?.addEventListener('click',()=>setAuthMode('signin')); $('#createAccountTab')?.addEventListener('click',()=>setAuthMode('signup')); $('#authForm')?.addEventListener('submit',submitAuth); $('#forgotPasswordBtn')?.addEventListener('click',forgotPassword);

  // Pricing display
  const base={USD:1,NGN:1600,GBP:.75,EUR:.86}, symbols={USD:'$',NGN:'₦',GBP:'£',EUR:'€'}; let billing='monthly'; try{billing=localStorage.getItem('ethan_ai_billing')||'monthly';}catch{}
  function renderPricing(){const sel=$('#currencySelect');let cur=sel?.value||'USD';try{cur=sel?.value||localStorage.getItem('ethan_ai_currency')||'USD';}catch{}const factor=base[cur]||1;$$('.price[data-usd]').forEach(el=>{let val=Number(el.dataset.usd||0);if(billing==='annual')val*=12*.8;const digits=cur==='NGN'?0:2;el.innerHTML=`${symbols[cur]}${(val*factor).toLocaleString(undefined,{minimumFractionDigits:digits,maximumFractionDigits:digits})} <small>/ ${billing==='annual'?'year':'month'}</small>`;});try{localStorage.setItem('ethan_ai_currency',cur);localStorage.setItem('ethan_ai_billing',billing);}catch{}}
  const currency=$('#currencySelect'); if(currency){try{currency.value=localStorage.getItem('ethan_ai_currency')||'USD';}catch{currency.value='USD';}currency.addEventListener('change',renderPricing);} $$('.billing-btn').forEach(b=>b.addEventListener('click',()=>{billing=b.dataset.billing;$$('.billing-btn').forEach(x=>x.classList.toggle('active',x===b));renderPricing();})); $$('.billing-btn').forEach(x=>x.classList.toggle('active',x.dataset.billing===billing)); renderPricing();

  // PWA install flow
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;$('#installBtn')?.classList.add('install-ready');});
  window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;$('#installBtn')?.classList.remove('install-ready');toast('ETHAN AI installed.');});
  $('#installBtn')?.addEventListener('click',async()=>{
    activateNav('#installBtn');
    if(window.matchMedia('(display-mode: standalone)').matches||navigator.standalone){toast('ETHAN AI is already installed.');return;}
    if(deferredInstallPrompt){const prompt=deferredInstallPrompt;deferredInstallPrompt=null;await prompt.prompt();const choice=await prompt.userChoice;toast(choice.outcome==='accepted'?'Installing ETHAN AI…':'Installation cancelled.');return;}
    openCommercial('Install ETHAN AI','On Chrome or Edge, open the browser menu and choose “Install ETHAN AI” or “Install app”. On iPhone/iPad Safari, use Share → Add to Home Screen.');
  });

  if('serviceWorker' in navigator && location.protocol!=='file:'){
    navigator.serviceWorker.register('/sw.js',{scope:'/'}).then(reg=>reg.update().catch(()=>{})).catch(()=>toast('Offline install support could not start.'));
  }

  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closePanels();closeCommercial();activateNav('#discoverBtn');}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setWhite();});

  restoreThread(); renderHistory(); renderSaved(); renderProjects(); renderLibrary(); renderSchedule(); renderPinned(); activateNav('#discoverBtn'); initAuth();
})();
