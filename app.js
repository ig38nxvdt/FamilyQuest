
const $ = s => document.querySelector(s);
const app = $('#app');
const cameraInput = $('#cameraInput');
const saveKey = 'familyquest-retrone-v3';

let adventure = null;
let view = 'home';
let pendingMissionId = null;
let audioCtx = null;
let musicTimer = null;

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
  recognitionMode:'assisted'
};
let state = loadState();

function loadState(){ try { return {...defaultState, ...(JSON.parse(localStorage.getItem(saveKey))||{})}; } catch { return {...defaultState}; } }
function save(){ localStorage.setItem(saveKey, JSON.stringify(state)); }
function reset(){ if(confirm('Vuoi davvero azzerare la missione?')){ state={...defaultState}; stopMusic(); save(); render(); } }
function levelForXP(xp){ if(xp>=1200) return 5; if(xp>=750) return 4; if(xp>=420) return 3; if(xp>=160) return 2; return 1; }
function levelName(l){ return ['','Esploratrici','Viaggiatrici','Custodi','Archiviste','Maestre dei Ricordi'][l]; }
function completed(m){ return state.completed.includes(m.id); }
function currentMission(){ return adventure.missions.find(m=>m.id===state.current) || adventure.missions.at(-1); }
function missionImg(m,type='detail'){
  const ext={1:['png','png'],2:['png','jpg'],3:['png','png'],4:['png','png'],5:['png','png'],6:['png','png'],7:['png','png'],8:['png','png'],9:['png','png']};
  return `assets/missions/m${m.id}-${type}.${type==='detail'?ext[m.id][0]:ext[m.id][1]}`;
}
function vibrate(ms=60){ try{ navigator.vibrate && navigator.vibrate(ms); }catch{} }

async function init(){
  adventure = await fetch('adventure.json').then(r=>r.json());
  if('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
  createParticles();
  render();
}

function createParticles(){
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
  ensureAudio();
  const notes=[392,493.88,587.33,739.99,659.25,523.25];
  let i=0;
  musicTimer=setInterval(()=>{ beep(notes[i++%notes.length],.12,'triangle',.025); },850);
}
function stopMusic(){ if(musicTimer){ clearInterval(musicTimer); musicTimer=null; } }
function toggleAudio(){
  state.audioOn = !state.audioOn;
  save();
  if(state.audioOn){ ensureAudio(); startMusicLoop(); successSound(); }
  else stopMusic();
  render();
}
function successSound(){ [523,659,784,1046].forEach((n,i)=>setTimeout(()=>beep(n,.11,'triangle',.05),i*95)); }
function failSound(){ [220,180].forEach((n,i)=>setTimeout(()=>beep(n,.13,'sawtooth',.035),i*110)); }
function testSound(){ ensureAudio(); state.audioOn=true; save(); startMusicLoop(); successSound(); render(); }

function shell(content){
  return `<div class="topbar">
    <div class="brand"><div class="logo">🗝️</div><div><div class="kicker">FamilyQuest</div><b>${adventure.adventureTitle}</b></div></div>
    <button class="btn ghost" onclick="reset()">Reset</button>
  </div>${content}${nav()}`;
}
function nav(){
  if(!state.started) return '';
  return `<div class="nav">
    <button class="${view==='mission'?'active':''}" onclick="view='mission';render()">Missione</button>
    <button class="${view==='inventory'?'active':''}" onclick="view='inventory';render()">Inventario</button>
    <button class="${view==='album'?'active':''}" onclick="view='album';render()">Album</button>
    <button class="${view==='settings'?'active':''}" onclick="view='settings';render()">Opzioni</button>
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
    <p class="subtitle">9 missioni, scanner fotografico assistito, codici segreti, musica, chiavi, frammenti e un tesoro finale nel mondo vero.</p>
    ${mascot(adventure.mascot?.intro || 'Pronte per partire?')}
    <div class="progress"><div class="bar" style="width:${pct}%"></div></div>
    <p class="small">${done}/9 missioni completate · ${state.xp} XP · Livello ${state.level}</p>
    <button class="btn" onclick="startGame()">${state.started?'CONTINUA':'START'}</button>
    <button class="btn secondary" onclick="state.started=true;view='settings';save();render()">Opzioni audio</button>
  </div></section>`;
}
function startGame(){ state.started=true; save(); view='mission'; successSound(); render(); }

function render(){
  if(!adventure) return;
  if(!state.started){ app.innerHTML=home(); return; }
  if(view==='inventory') app.innerHTML=shell(inventory());
  else if(view==='album') app.innerHTML=shell(album());
  else if(view==='settings') app.innerHTML=shell(settings());
  else app.innerHTML=shell(mission());
}
function mission(){
  const m=currentMission(), done=state.completed.length, pct=Math.round(done/adventure.missions.length*100);
  if(done===adventure.missions.length) return finale();
  return `<section class="grid">
    <div class="card">
      <div class="mission-head"><div class="mission-icon">${m.icon}</div><div><div class="kicker">Missione ${m.id}/9</div><h2>${m.title}</h2></div></div>
      <img class="mission-img" src="${missionImg(m,'detail')}" onerror="this.style.display='none'">
      <div class="story-card">📖 ${m.story || m.intro}</div>
      ${mascot((m.guide && m.guide[1]) || 'Osservate bene e cercate il segnale giusto.')}
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
function showHelp(id){
  const m=adventure.missions.find(x=>x.id===id);
  document.body.insertAdjacentHTML('beforeend', `<div class="help-modal" onclick="if(event.target.className==='help-modal')this.remove()">
    <div class="card help-card">
      <div class="kicker">Aiutino missione ${m.id}</div>
      <h2>${m.title}</h2>
      <p>${m.target}</p>
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

async function scanPhoto(id, dataUrl){
  app.insertAdjacentHTML('beforeend', `<div class="scan"><div class="scanbox card">
    <div class="hero-icon">🔍</div><h2>Scanner ricordi...</h2>
    <p class="small" id="scanText">Controllo foto in corso...</p>
    <div class="scanline"><i></i></div>
  </div></div>`);
  let score = 0.75;
  try {
    const m = adventure.missions.find(x=>x.id===id);
    score = await compareImages(dataUrl, missionImg(m,'detail'));
  } catch(e){ score = 0.65; }
  setTimeout(()=>{
    const scan = $('.scan');
    if(state.recognitionMode === 'auto' && score < 0.45){
      failSound(); vibrate([80,60,80]);
      scan.querySelector('.scanbox').classList.add('shake');
      scan.querySelector('#scanText').innerHTML = `<span class="result-badge fail-badge">Somiglianza bassa: ${(score*100|0)}%</span>
      <div class="scan-choice"><button class="btn" onclick="document.querySelector('.scan').remove(); takePhoto(${id})">Riprova</button><button class="btn secondary" onclick="completeMission(${id}, ${score})">Sblocca comunque</button></div>`;
    } else {
      scan.querySelector('#scanText').innerHTML = `<span class="result-badge">Foto acquisita ${(score*100|0)}%</span>
      <p class="small">Lumi chiede conferma: l'obiettivo è quello giusto?</p>
      <div class="scan-choice"><button class="btn" onclick="completeMission(${id}, ${score})">Sì, conferma</button><button class="btn secondary" onclick="document.querySelector('.scan').remove(); takePhoto(${id})">Riprova</button></div>`;
    }
  },2200);
}

// lightweight local similarity. It helps, but assisted confirmation avoids ruining the game outdoors.
async function compareImages(dataUrl, refUrl){
  const [a,b] = await Promise.all([imageFeatures(dataUrl), imageFeatures(refUrl)]);
  let diff = 0;
  for(let i=0;i<a.hist.length;i++) diff += Math.abs(a.hist[i]-b.hist[i]);
  const histScore = Math.max(0, 1 - diff/2);
  let same=0;
  for(let i=0;i<a.hash.length;i++) if(a.hash[i]===b.hash[i]) same++;
  const hashScore=same/a.hash.length;
  return histScore*.55 + hashScore*.45;
}
function loadImg(src){ return new Promise((res,rej)=>{ const img=new Image(); img.onload=()=>res(img); img.onerror=rej; img.src=src; });}
async function imageFeatures(src){
  const img=await loadImg(src);
  const c=document.createElement('canvas'), ctx=c.getContext('2d',{willReadFrequently:true});
  c.width=32; c.height=32; ctx.drawImage(img,0,0,32,32);
  const d=ctx.getImageData(0,0,32,32).data;
  const hist=new Array(12).fill(0), lum=[];
  for(let i=0;i<d.length;i+=4){
    const r=d[i],g=d[i+1],b=d[i+2],l=(r+g+b)/3;
    hist[Math.min(3, r>>6)]++; hist[4+Math.min(3, g>>6)]++; hist[8+Math.min(3, b>>6)]++;
    lum.push(l);
  }
  const total=lum.length;
  for(let i=0;i<hist.length;i++) hist[i]/=total*3;
  const avg=lum.reduce((a,b)=>a+b,0)/lum.length;
  const hash=lum.map(x=>x>avg?1:0);
  return {hist,hash};
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
    save(); vibrate(120); successSound();
  }
  app.insertAdjacentHTML('beforeend', `<div class="reward"><div class="reward-card">
    <div class="reward-icon">🗝️</div>
    <div class="kicker">Missione completata</div>
    <h2>${m.success}</h2>
    <p><b>${m.key}</b><br>✨ ${m.fragment}<br>🏅 ${m.badge}<br>🎁 Premio casuale: ${bonus}<br>🔐 Lettera segreta: ${m.secretLetter || '★'}<br>+${m.xp} XP</p>
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
      <div class="kicker">Opzioni</div><h2>Audio e gioco</h2>
      ${mascot('Su iPhone l’audio parte solo se lo attivate voi con un tap. È una regola del telefono, non un mio capriccio da volpe.')}
      <div class="setting-row"><div><b>Musica ed effetti</b><p class="small">Attiva musica di sottofondo e suoni premio.</p></div><div class="switch ${state.audioOn?'on':''}" onclick="toggleAudio()"><i></i></div></div>
      <button class="btn secondary" onclick="testSound()">Prova audio</button>
      <div class="setting-row"><div><b>Scanner foto assistito</b><p class="small">Consigliato: analizza la foto, poi chiede conferma. Così il gioco non si blocca mai.</p></div><div class="switch ${state.recognitionMode==='assisted'?'on':''}" onclick="state.recognitionMode=state.recognitionMode==='assisted'?'auto':'assisted';save();render()"><i></i></div></div>
      <p class="small">Modalità attuale: <b>${state.recognitionMode==='assisted'?'Assistita':'Automatica severa'}</b></p>
    </div>
  </section>`;
}
function finale(){
  return `<section class="hero"><div class="card">
    <div class="hero-icon">🎉</div><div class="kicker">Missione completata</div>
    <h1 class="title">Tesoro sbloccato</h1>
    ${mascot('Avete riunito tutti i ricordi. Io quasi mi commuovo, ma sono una volpe digitale e faccio finta di niente.')}
    <p class="subtitle">Avete recuperato 9 chiavi, 9 frammenti e 9 ricordi. Ora cercate la busta reale nel posto dove arrivano i messaggi.</p>
    <div class="grid stats"><div class="stat"><b>9</b><span>Chiavi</span></div><div class="stat"><b>${state.xp}</b><span>XP</span></div><div class="stat"><b>${state.level}</b><span>Livello</span></div><div class="stat"><b>🏡</b><span>Famiglia</span></div></div>
    <div class="actions"><button class="btn" onclick="view='album';render()">Apri album</button><button class="btn secondary" onclick="view='inventory';render()">Vedi inventario</button></div>
  </div></section>`;
}
init();
