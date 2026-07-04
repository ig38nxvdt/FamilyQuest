
const $ = s => document.querySelector(s);
const app = $('#app');
const cameraInput = $('#cameraInput');
const saveKey = 'familyquest-retrone-v7';

let adventure = null;
let view = 'home';
let pendingMissionId = null;
let audioCtx = null;
let musicTimer = null;
let currentMusic = null;
let musicName = null;
let sfxSuccess = null;

const defaultState = {
  started:false,
  current:1,
  completed:[],
  xp:0,
  level:1,
  photos:{},
  secretsUnlocked:[],
  bonusRewards:[],
  audioOn:false,
  recognitionMode:'auto', assists:0, missionStart:{}, randomEventsSeen:[], createdAdventure:null
};
let state = loadState();

function loadState(){ try { return {...defaultState, ...(JSON.parse(localStorage.getItem(saveKey))||{})}; } catch { return {...defaultState}; } }
function save(){ localStorage.setItem(saveKey, JSON.stringify(state)); }
function reset(){ if(confirm('Vuoi davvero azzerare la missione?')){ state={...defaultState}; stopMusic(); save(); render(); } }
function levelForXP(xp){ if(xp>=1200) return 5; if(xp>=750) return 4; if(xp>=420) return 3; if(xp>=160) return 2; return 1; }
function levelName(l){ return ['','Esploratrici','Viaggiatrici','Custodi','Archiviste','Maestre dei Ricordi'][l]; }
function completed(m){ return state.completed.includes(m.id); }
function currentMission(){ return adventure.missions.find(m=>m.id===state.current) || adventure.missions.at(-1); }

const imgExt = {1:{detail:'png',wide:'png'},2:{detail:'png',wide:'jpg'},3:{detail:'png',wide:'png'},4:{detail:'png',wide:'png'},5:{detail:'png',wide:'png'},6:{detail:'png',wide:'png'},7:{detail:'png',wide:'png'},8:{detail:'png',wide:'png'},9:{detail:'png',wide:'png'}};

function missionImg(m,type='detail'){
  return `assets/missions/m${m.id}-${type}.${imgExt[m.id][type]}?v=7`;
}
function vibrate(ms=60){ try{ navigator.vibrate && navigator.vibrate(ms); }catch{} }

async function init(){
  adventure = await fetch('adventure.json?v=7').then(r=>r.json());
  if('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js?v=7').catch(()=>{});
  createParticles();
  render();
}

function createParticles(){
  if(document.querySelector('.particles')) return;
  const wrap=document.createElement('div');
  wrap.className='particles';
  for(let i=0;i<34;i++){
    const p=document.createElement('i');
    p.className='particle';
    p.style.left=Math.random()*100+'%';
    p.style.animationDuration=(7+Math.random()*14)+'s';
    p.style.animationDelay=(-Math.random()*18)+'s';
    p.style.opacity=.25+Math.random()*.55;
    wrap.appendChild(p);
  }
  document.body.appendChild(wrap);
}


function makeAudio(src, loop=false, volume=0.45){
  const a = new Audio(src);
  a.loop = loop;
  a.volume = volume;
  a.preload = 'auto';
  return a;
}
function initAudioFiles(){
  if(!adventure.audio || currentMusic) return;
  sfxSuccess = makeAudio(adventure.audio.success, false, 0.85);
}
function playMusic(name){
  if(!state.audioOn || !adventure.audio) return;
  initAudioFiles();
  const src = adventure.audio[name];
  if(!src) return;
  if(musicName === name && currentMusic && !currentMusic.paused) return;
  if(currentMusic){
    currentMusic.pause();
    currentMusic.currentTime = 0;
  }
  currentMusic = makeAudio(src, true, name === 'exploration' ? 0.38 : 0.42);
  musicName = name;
  currentMusic.play().catch(()=>{});
}
function stopRealMusic(){
  if(currentMusic){
    currentMusic.pause();
    currentMusic.currentTime = 0;
  }
  currentMusic = null;
  musicName = null;
}
function playSuccessReal(){
  if(!state.audioOn || !adventure.audio) return;
  initAudioFiles();
  try{
    sfxSuccess.currentTime = 0;
    sfxSuccess.play().catch(()=>successSound());
  }catch{ successSound(); }
}

function ensureAudio(){
  audioCtx = audioCtx || new (window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state === 'suspended') audioCtx.resume();
}
function beep(freq=520,dur=.09,type='sine',gain=.045){
  if(!state.audioOn) return;
  ensureAudio();
  const osc=audioCtx.createOscillator(), g=audioCtx.createGain();
  osc.type=type; osc.frequency.value=freq; g.gain.value=gain;
  osc.connect(g); g.connect(audioCtx.destination);
  osc.start(); osc.stop(audioCtx.currentTime+dur);
}
function startMusicLoop(){
  stopMusic();
  if(!state.audioOn) return;
  initAudioFiles();
  const track = view === 'mission' ? 'exploration' : (view === 'diary' ? 'main' : 'main');
  playMusic(track);
}
function stopMusic(){
  if(musicTimer){ clearInterval(musicTimer); musicTimer=null; }
  stopRealMusic();
}
function successSound(){ [523,659,784,1046].forEach((n,i)=>setTimeout(()=>beep(n,.11,'triangle',.05),i*95)); }
function failSound(){ [220,180].forEach((n,i)=>setTimeout(()=>beep(n,.13,'sawtooth',.035),i*110)); }
function testSound(){ ensureAudio(); state.audioOn=true; save(); startMusicLoop(); setTimeout(()=>playSuccessReal(),350); render(); }

function shell(content){
  return `<div class="topbar">
    <div class="brand"><div class="logo">🗝️</div><div><div class="kicker">FamilyQuest v7</div><b>${adventure.adventureTitle}</b></div></div>
    <button class="btn ghost" onclick="reset()">Reset</button>
  </div>${content}${nav()}`;
}
function nav(){
  if(!state.started) return '';
  return `<div class="nav">
    <button class="${view==='mission'?'active':''}" onclick="view='mission';render()">Missione</button>
    <button class="${view==='inventory'?'active':''}" onclick="view='inventory';render()">Zaino</button>
    <button class="${view==='achievements'?'active':''}" onclick="view='achievements';render()">Trofei</button>
    <button class="${view==='diary'?'active':''}" onclick="view='diary';render()">Diario</button>
    <button class="${view==='editor'?'active':''}" onclick="view='editor';render()">Editor</button>
  </div>`;
}
function mascot(text){
  return `<div class="mascot"><div class="mascot-face">${adventure.mascot?.emoji || '🦊'}</div><p><b>${adventure.mascot?.name || 'Lumi'}:</b><br>${text}</p></div>`;
}
function home(){
  const done=state.completed.length, pct=Math.round(done/adventure.missions.length*100);
  return `<section class="hero"><div class="card">
    <div class="hero-icon">🚲✨</div>
    <div class="kicker">Prima avventura</div>
    <h1 class="title">${adventure.adventureTitle}</h1>
    <p class="subtitle">9 missioni, immagini dettaglio come obiettivo, aiutino grandangolare, scanner più severo, musica e codici segreti.</p>
    ${mascot(adventure.mascot?.intro || 'Pronte per partire?')}
    <div class="progress"><div class="bar" style="width:${pct}%"></div></div>
    <p class="small">${done}/9 missioni completate · ${state.xp} XP · Livello ${state.level}</p>
    <button class="btn" onclick="startGame()">${state.started?'CONTINUA':'START'}</button>
    <button class="btn secondary" onclick="state.started=true;view='settings';save();render()">Opzioni audio</button>
  </div></section>`;
}
function startGame(){ state.started=true; save(); view='mission'; playMusic('exploration'); playSuccessReal(); render(); }

function render(){
  if(!adventure) return;
  if(state.audioOn){ setTimeout(()=>{ if(view==='mission') playMusic('exploration'); else if(view==='settings') playMusic('main'); else if(view==='diary') playMusic('main'); else playMusic('main'); },50); }
  if(!state.started){ app.innerHTML=home(); return; }
  if(view==='inventory') app.innerHTML=shell(inventory());
  else if(view==='album') app.innerHTML=shell(album());
  else if(view==='settings') app.innerHTML=shell(settings());
  else if(view==='achievements') app.innerHTML=shell(achievements());
  else if(view==='diary') app.innerHTML=shell(diary());
  else if(view==='editor') app.innerHTML=shell(editor());
  else app.innerHTML=shell(mission());
}
function mission(){
  const m=currentMission(), done=state.completed.length, pct=Math.round(done/adventure.missions.length*100);
  if(done===adventure.missions.length) return finale();
  if(!state.missionStart[m.id]){state.missionStart[m.id]=Date.now();save();}
  return `<section class="grid">
    <div class="card">
      <div class="mission-head"><div class="mission-icon">${m.icon}</div><div><div class="kicker">Missione ${m.id}/9</div><h2>${m.title}</h2></div></div>
      <img class="mission-img" src="${missionImg(m,'detail')}" alt="Dettaglio da fotografare" onerror="this.style.display='none'">
      <p class="small">🎯 Questa è la foto dettaglio: è l'obiettivo da trovare e fotografare.</p>
      <div class="story-card">📖 ${m.story || m.intro}</div>
      ${mascot((m.dialogues?.start?.[1]) || (m.guide && m.guide[1]) || 'Osservate bene e cercate il segnale giusto.')}
      <p class="clue">${m.clue}</p>
      ${m.bonus?`<p class="small">✨ ${m.bonus}</p>`:''}
      <div class="actions">
        <button class="btn" onclick="takePhoto(${m.id})">📷 Scatta foto</button>
        <button class="btn secondary" onclick="showHelp(${m.id})">Aiutino</button>
      </div>
      <p class="small">🔐 Dopo la foto si sblocca una lettera segreta.</p>
    </div>
    <div class="card">
      <div class="kicker">Avanzamento</div>
      <h3>${pct}% completato</h3>
      <div class="progress"><div class="bar" style="width:${pct}%"></div></div>
      <div class="grid stats" style="margin-top:14px">
        <div class="stat"><b>${state.completed.length}</b><span>Missioni</span></div>
        <div class="stat"><b>${state.xp}</b><span>XP</span></div>
        <div class="stat"><b>${state.level}</b><span>${levelName(state.level)}</span></div>
        <div class="stat"><b>${Object.keys(state.photos).length}</b><span>Foto</span></div>
      </div>
      <div class="code-help">
        <b>🔐 Codici segreti</b>
        <p class="small">Le prime 7 missioni formano un codice. Puoi inserirlo nell'Inventario.</p>
      </div>
    </div>
  </section>`;
}
function showHelp(id){ state.assists=(state.assists||0)+1; save();
  const m=adventure.missions.find(x=>x.id===id);
  document.body.insertAdjacentHTML('beforeend', `<div class="help-modal" onclick="if(event.target.className==='help-modal')this.remove()">
    <div class="card help-card">
      <div class="kicker">Aiutino missione ${m.id}</div>
      <h2>${m.title}</h2>
      <p>${m.target}</p>
      <p class="small">Questa è la foto grandangolare: serve solo per capire dove si trova il dettaglio.</p>
      <img src="${missionImg(m,'wide')}" alt="Foto grandangolare">
      <button class="btn" onclick="document.querySelector('.help-modal').remove()">Ho capito</button>
    </div>
  </div>`);
}
function takePhoto(id){ pendingMissionId=id; cameraInput.value=''; cameraInput.click(); }

cameraInput.addEventListener('change', e=>{
  const file=e.target.files[0];
  if(!file||!pendingMissionId) return;
  const reader=new FileReader();
  reader.onload=async ()=>{
    state.photos[pendingMissionId]=reader.result; save();
    await scanPhoto(pendingMissionId, reader.result);
  };
  reader.readAsDataURL(file);
});

async function scanPhoto(id, dataUrl){ if(state.audioOn) playMusic('mystery');
  app.insertAdjacentHTML('beforeend', `<div class="scan"><div class="scanbox card">
    <div class="hero-icon">🔍</div><h2>Scanner ricordi...</h2>
    <p class="small" id="scanText">Controllo foto in corso...</p>
    <div class="scanline"><i></i></div>
  </div></div>`);
  let score = 0;
  try {
    const m = adventure.missions.find(x=>x.id===id);
    score = await compareImages(dataUrl, missionImg(m,'detail'));
  } catch(e){ score = 0; }
  setTimeout(()=>{
    const scan = $('.scan');
    const threshold = state.recognitionMode === 'auto' ? 0.58 : 0.48;
    if(score >= threshold){
      scan.querySelector('#scanText').innerHTML = `<span class="result-badge">Obiettivo riconosciuto ${(score*100|0)}%</span>`;
      setTimeout(()=>completeMission(id, score),900);
    } else {
      failSound(); vibrate([80,60,80]);
      scan.querySelector('.scanbox').classList.add('shake');
      scan.querySelector('#scanText').innerHTML = `<span class="result-badge fail-badge">Foto non riconosciuta: ${(score*100|0)}%</span>
      <p class="small">Prova a inquadrare meglio il dettaglio mostrato nella missione.</p>
      <div class="scan-choice"><button class="btn" onclick="document.querySelector('.scan').remove(); takePhoto(${id})">Riprova</button>${state.recognitionMode==='assisted'?`<button class="btn secondary" onclick="completeMission(${id}, ${score})">Sblocca comunque</button>`:''}</div>`;
    }
  },2200);
}

// Improved local similarity: color histogram + luminance hash + central crop check
async function compareImages(dataUrl, refUrl){
  const [a,b] = await Promise.all([imageFeatures(dataUrl), imageFeatures(refUrl)]);
  let diff = 0;
  for(let i=0;i<a.hist.length;i++) diff += Math.abs(a.hist[i]-b.hist[i]);
  const histScore = Math.max(0, 1 - diff/1.35);
  let same=0;
  for(let i=0;i<a.hash.length;i++) if(a.hash[i]===b.hash[i]) same++;
  const hashScore=same/a.hash.length;
  let cdiff=0;
  for(let i=0;i<a.center.length;i++) cdiff += Math.abs(a.center[i]-b.center[i]);
  const centerScore = Math.max(0, 1 - cdiff/1.20);
  return Math.max(0, Math.min(1, histScore*.35 + hashScore*.30 + centerScore*.35));
}
function loadImg(src){ return new Promise((res,rej)=>{ const img=new Image(); img.onload=()=>res(img); img.onerror=rej; img.src=src; });}
async function imageFeatures(src){
  const img=await loadImg(src);
  const c=document.createElement('canvas'), ctx=c.getContext('2d',{willReadFrequently:true});
  c.width=48; c.height=48; ctx.drawImage(img,0,0,48,48);
  const d=ctx.getImageData(0,0,48,48).data;
  const hist=new Array(18).fill(0), lum=[], center=new Array(18).fill(0);
  let ccount=0;
  for(let y=0;y<48;y++){
    for(let x=0;x<48;x++){
      const i=(y*48+x)*4, r=d[i],g=d[i+1],b=d[i+2],l=(r+g+b)/3;
      hist[Math.min(5, r>>5)]++; hist[6+Math.min(5, g>>5)]++; hist[12+Math.min(5, b>>5)]++;
      lum.push(l);
      if(x>=12&&x<36&&y>=12&&y<36){
        center[Math.min(5, r>>5)]++; center[6+Math.min(5, g>>5)]++; center[12+Math.min(5, b>>5)]++;
        ccount++;
      }
    }
  }
  const total=lum.length;
  for(let i=0;i<hist.length;i++) hist[i]/=total*3;
  for(let i=0;i<center.length;i++) center[i]/=ccount*3;
  const avg=lum.reduce((a,b)=>a+b,0)/lum.length;
  const hash=lum.map(x=>x>avg?1:0);
  return {hist,hash,center};
}
function randomReward(){
  const pool=adventure.randomRewards||['Stella Bonus'];
  return pool[Math.floor(Math.random()*pool.length)];
}
function completeMission(id, score=0.75){
  $('.scan')?.remove();
  const m=adventure.missions.find(x=>x.id===id);
  let oldLevel=state.level;
  let bonus=randomReward();
  if(!state.completed.includes(id)){
    state.completed.push(id);
    state.bonusRewards.push({mission:id,reward:bonus});
    state.xp += m.xp;
    state.level = levelForXP(state.xp);
    state.current = Math.min(id+1, adventure.missions.length+1);
    save(); vibrate(120); playSuccessReal(); maybeRandomEvent();
  }
  app.insertAdjacentHTML('beforeend', `<div class="reward"><div class="reward-card">
    <div class="reward-icon">🗝️</div>
    <div class="kicker">Missione completata</div>
    <h2>${m.success}</h2>
    <p><b>${m.key}</b><br>✨ ${m.fragment}<br>🏅 ${m.badge}<br>🎒 Oggetto: ${m.item?.name || 'Oggetto misterioso'}<br>🎁 Premio casuale: ${bonus}<br>🔐 Lettera segreta: ${m.secretLetter || '★'}<br>+${m.xp} XP</p>
    ${state.level>oldLevel?`<p class="levelup">LEVEL UP! Livello ${state.level}: ${levelName(state.level)}</p>`:''}
    <p class="small">Scanner locale: ${(score*100|0)}%</p>
    <button class="btn" onclick="document.querySelector('.reward').remove(); render()">Continua</button>
  </div></div>`);
}
function unlockSecret(){
  const input=$('#secretInput'); if(!input) return;
  const code=input.value.trim().toUpperCase();
  const item=(adventure.secretCodes||[]).find(x=>x.code===code);
  if(!item){ failSound(); alert('Codice non riconosciuto.'); return; }
  if(state.secretsUnlocked.includes(code)){ alert('Codice già sbloccato.'); return; }
  state.secretsUnlocked.push(code); state.bonusRewards.push({mission:'secret',reward:item.reward}); state.xp+=item.xp; state.level=levelForXP(state.xp); save(); successSound(); render();
  setTimeout(()=>alert(`Codice sbloccato!\n🎁 ${item.reward}\n+${item.xp} XP`),100);
}
function inventory(){
  const letters = adventure.missions.filter(m=>completed(m)).map(m=>m.secretLetter).join(' ');
  return `<section class="grid">
    <div class="card"><div class="kicker">Archivio</div><h2>Inventario</h2><p class="small">Livello ${state.level}: ${levelName(state.level)} · ${state.xp} XP</p>
      ${mascot('Qui tengo chiavi, frammenti, badge, premi e codici. Le lettere segrete sono indizi: unitele e provate a inserirle qui sotto.')}
      <div class="code-help"><b>Lettere trovate:</b><br><span class="levelup">${letters || 'Nessuna ancora'}</span></div>
      <div class="secretBox"><input id="secretInput" placeholder="Inserisci codice"><button class="btn secondary" onclick="unlockSecret()">Sblocca</button></div>
      <p class="small">Suggerimento: completando le prime 7 missioni si forma RETRONE. Altri codici: LUMI, CASA.</p>
    </div>
    <div class="inventory">${adventure.missions.map(m=>`<div class="item ${completed(m)?'':'locked'}"><h3>${m.icon} ${m.title}</h3><p>🗝️ ${m.key}</p><p>✨ ${m.fragment}</p><p>🏅 ${m.badge}</p>${completed(m)?`<p>🔐 ${m.secretLetter}</p>`:''}</div>`).join('')}</div>
    <div class="card"><h3>🎁 Premi extra</h3>${state.bonusRewards.length?state.bonusRewards.map(r=>`<div class="reward-mini">🎁 ${r.reward}</div>`).join(''):'<p class="small">Nessun premio extra ancora.</p>'}</div>
    <div class="card"><h3>🔐 Codici sbloccati</h3>${state.secretsUnlocked.length?state.secretsUnlocked.map(c=>`<div class="result-badge">${c}</div>`).join(''):'<p class="small">Nessun codice sbloccato.</p>'}</div>
  </section>`;
}
function album(){
  const imgs=adventure.missions.map(m=>state.photos[m.id]?`<div><img src="${state.photos[m.id]}"><p class="small">${m.id}. ${m.title}</p></div>`:`<div class="item locked"><h3>${m.icon}</h3><p>${m.title}</p><p class="small">Foto non ancora scattata</p></div>`).join('');
  return `<section class="grid"><div class="card"><div class="kicker">Album</div><h2>Le foto della missione</h2><p class="small">Qui restano i ricordi scattati durante l'avventura.</p>${mascot('Ogni foto è una prova, ma anche un ricordo. La parte tecnica la faccio io, la magia la fate voi.')}</div><div class="album">${imgs}</div></section>`;
}
function settings(){
  return `<section class="grid">
    <div class="card">
      <div class="kicker">Opzioni</div><h2>Audio e scanner</h2>
      ${mascot('Su iPhone l’audio parte solo se lo attivate voi con un tap. È una regola del telefono, non un mio capriccio da volpe.')}
      <div class="setting-row"><div><b>Musica ed effetti</b><p class="small">Attiva le tracce audio caricate: tema, esplorazione, mistero, successo e finale.</p></div><div class="switch ${state.audioOn?'on':''}" onclick="toggleAudio()"><i></i></div></div>
      <button class="btn secondary" onclick="testSound()">Prova audio</button>
      <div class="setting-row"><div><b>Scanner automatico severo</b><p class="small">Se acceso, una foto casuale NON dovrebbe passare. Se spento, compare anche “sblocca comunque”.</p></div><div class="switch ${state.recognitionMode==='auto'?'on':''}" onclick="state.recognitionMode=state.recognitionMode==='auto'?'assisted':'auto';save();render()"><i></i></div></div>
      <p class="small">Modalità attuale: <b>${state.recognitionMode==='auto'?'Automatica severa':'Assistita'}</b></p>
    </div>
  </section>`;
}
function finale(){ if(state.audioOn) setTimeout(()=>playMusic('finale'),80);
  return `<section class="hero"><div class="card">
    <div class="hero-icon">🎉</div><div class="kicker">Missione completata</div>
    <h1 class="title">Tesoro sbloccato</h1>
    ${mascot('Avete riunito tutti i ricordi. Io quasi mi commuovo, ma sono una volpe digitale e faccio finta di niente.')}
    <p class="subtitle">Avete recuperato 9 chiavi, 9 frammenti e 9 ricordi. Ora cercate la busta reale nel posto dove arrivano i messaggi.</p>
    <div class="grid stats"><div class="stat"><b>9</b><span>Chiavi</span></div><div class="stat"><b>${state.xp}</b><span>XP</span></div><div class="stat"><b>${state.level}</b><span>Livello</span></div><div class="stat"><b>🏡</b><span>Famiglia</span></div></div>
    <div class="actions"><button class="btn" onclick="view='album';render()">Apri album</button><button class="btn secondary" onclick="view='inventory';render()">Vedi inventario</button></div>
  </div></section>`;
}

function maybeRandomEvent(){
  if(Math.random() > 0.28) return;
  const events=[
    {id:'pose', title:'Sfida di Lumi', text:'Fate una posa da esploratrici per 5 secondi.', reward:'Scintilla Buffa', xp:25},
    {id:'count', title:'Occhi Aperti', text:'Contate tre cose blu vicino a voi.', reward:'Occhio di Falco', xp:25},
    {id:'team', title:'Modalità Squadra', text:'Inventate un nome per la vostra squadra di oggi.', reward:'Sigillo Squadra', xp:30},
    {id:'silence', title:'Ascolto Segreto', text:'Restate in silenzio 10 secondi e ascoltate il parco.', reward:'Eco Gentile', xp:30}
  ];
  const ev=events[Math.floor(Math.random()*events.length)];
  if(state.randomEventsSeen.includes(ev.id)) return;
  state.randomEventsSeen.push(ev.id); state.xp+=ev.xp; state.bonusRewards.push({mission:'event', reward:ev.reward}); state.level=levelForXP(state.xp); save();
  setTimeout(()=>document.body.insertAdjacentHTML('beforeend',`<div class="random-event"><div class="card">
    <div class="hero-icon">🎲</div><div class="kicker">Evento casuale</div><h2>${ev.title}</h2><p class="subtitle">${ev.text}</p>
    <p>🎁 ${ev.reward}<br>+${ev.xp} XP</p>
    <button class="btn" onclick="document.querySelector('.random-event').remove()">Fatto!</button>
  </div></div>`),800);
}
function getAchievements(){
  const done=state.completed.length;
  const photos=Object.keys(state.photos||{}).length;
  const noHelp=(state.assists||0)===0 && done>=9;
  const allDone=done>=9;
  const secrets=(state.secretsUnlocked||[]).length;
  return [
    {id:'first', icon:'🌟', name:'Prima Scintilla', desc:'Completa la prima missione.', ok:done>=1},
    {id:'all', icon:'🏆', name:'Retrone Master', desc:'Completa tutte le 9 missioni.', ok:allDone},
    {id:'photos', icon:'📸', name:'Fotografe Ufficiali', desc:'Scatta 9 foto nell’album.', ok:photos>=9},
    {id:'nohelp', icon:'🦅', name:'Occhio di Falco', desc:'Completa tutto senza aiutini.', ok:noHelp},
    {id:'codes', icon:'🔐', name:'Decifratrici', desc:'Sblocca almeno un codice segreto.', ok:secrets>=1},
    {id:'events', icon:'🎲', name:'Imprevisti? Presi!', desc:'Completa un evento casuale.', ok:(state.randomEventsSeen||[]).length>=1},
    {id:'level5', icon:'👑', name:'Maestre dei Ricordi', desc:'Raggiungi il livello 5.', ok:state.level>=5}
  ];
}
function achievements(){
  const list=getAchievements();
  return `<section class="grid"><div class="card"><div class="kicker">Achievement</div><h2>Trofei</h2>${mascot('I trofei sono ricordi con una medaglia addosso. Molto eleganti, modestamente.')}</div>
  <div class="card">${list.map(a=>`<div class="achievement ${a.ok?'':'locked'}"><div class="medal">${a.icon}</div><div><b>${a.name}</b><p class="small">${a.desc}</p></div></div>`).join('')}</div></section>`;
}
function diary(){
  const pages=adventure.missions.map(m=>{
    const photo=state.photos[m.id] ? `<img src="${state.photos[m.id]}">` : '';
    const done=completed(m);
    return `<div class="diary-page"><h3>${m.id}. ${m.title}</h3>${photo}<p>${m.story||m.intro}</p><p><b>Ricompensa:</b> ${done ? (m.item?.name || m.key) : 'Non ancora trovata'}</p></div>`;
  }).join('');
  const html=`<section class="grid"><div class="card"><div class="kicker">Album dei Ricordi</div><h2>Diario finale</h2>${mascot('Quando la missione finisce, il diario resta. È il tesoro che non si perde sotto il divano.')}</div>${pages}</section>`;
  return html;
}
function downloadDiary(){
  const html='<!doctype html><html><head><meta charset="utf-8"><title>Diario FamilyQuest</title></head><body>'+diary()+'</body></html>';
  const blob=new Blob([html],{type:'text/html'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='diario-familyquest.html'; a.click();
}
function editor(){
  const current=JSON.stringify(adventure,null,2);
  return `<section class="grid editor-area">
    <div class="card"><div class="kicker">Editor visuale</div><h2>Crea nuova avventura</h2>
    ${mascot('Qui puoi preparare una nuova avventura senza toccare il codice. Per ora esporta un JSON: nella prossima versione lo renderemo ancora più comodo.')}
    <label>Titolo avventura</label><input id="edTitle" value="Nuova Avventura">
    <label>Nome missione</label><input id="edMissionTitle" value="Missione Segreta">
    <label>Indizio</label><textarea id="edClue">Cercate un luogo speciale e fotografate il dettaglio nascosto.</textarea>
    <label>Dialogo Lumi</label><textarea id="edDialogue">Ho trovato una nuova traccia. Questa profuma di mistero!</textarea>
    <div class="file-drop">📷 In futuro qui trascinerai foto dettaglio e foto aiutino.<br><span class="small">Versione attuale: editor JSON base.</span></div>
    <button class="btn" onclick="exportAdventure()">Genera JSON</button>
    <button class="btn secondary" onclick="downloadDiary()">Scarica diario HTML</button>
    <div id="exportOut" class="export-box" style="display:none"></div>
    </div>
    <div class="card"><h3>Motore attuale</h3><div class="export-box">${current.replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</div></div>
  </section>`;
}
function exportAdventure(){
  const obj={
    appName:'FamilyQuest',
    adventureTitle:$('#edTitle').value,
    missions:[{
      id:1,
      title:$('#edMissionTitle').value,
      icon:'✨',
      clue:$('#edClue').value,
      dialogues:{start:[$('#edDialogue').value]},
      key:'Chiave Nuova',
      fragment:'Frammento Nuovo',
      badge:'Nuova Impresa',
      xp:100
    }]
  };
  const out=$('#exportOut'); out.style.display='block'; out.textContent=JSON.stringify(obj,null,2);
}

init();
