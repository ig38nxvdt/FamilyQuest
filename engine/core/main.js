import {SaveManager} from '../modules/SaveManager.js';
import {AudioManager} from '../modules/AudioManager.js';
import {RecognitionEngine} from '../modules/RecognitionEngine.js';
import {levelForXP, levelName, achievements as getAchievements} from '../modules/GameLogic.js';

const app=document.querySelector('#app');
const cameraInput=document.querySelector('#cameraInput');
const save=new SaveManager('familyquest-engine-2-0-3');
const audio=new AudioManager();
const recognition=new RecognitionEngine();

let adventure=null;
let state=save.load();
let view='intro';
let pendingMission=null;
let pendingEventPhoto=null;

function persist(){ save.save(state); }
function completed(m){ return state.completed.includes(m.id); }
function currentMission(){ return adventure.missions.find(m=>m.id===state.current) || adventure.missions[adventure.missions.length-1]; }
function levelText(){ return levelName(state.level); }
function face(exp='happy'){ return adventure.mascot?.expressions?.[exp] || adventure.mascot?.emoji || '🦊'; }
function mascot(text, exp='happy'){
  return `<div class="mascot mood-${exp}"><div class="mascot-face">${face(exp)}</div><p><b>${adventure.mascot.name}:</b><br>${text}</p></div>`;
}
function topbar(){
  return `<div class="topbar">
    <div class="brand"><div class="logo">🦊</div><div><div class="kicker">FamilyQuest 2.0.3</div><b>${adventure.title}</b></div></div>
    <div class="top-actions">
      <button class="btn secondary mini" data-go="mission">⬅ Avventura</button>
      <button class="btn secondary mini" data-go="settings">⚙️</button>
    </div>
  </div>`;
}
function nav(){
  if(!state.started) return '';
  const items=[['mission','Missione'],['inventory','Zaino'],['achievements','Trofei'],['diary','Diario'],['events','Eventi']];
  return `<div class="nav">${items.map(([v,t])=>`<button class="${view===v?'active':''}" data-go="${v}">${t}</button>`).join('')}</div>`;
}
function shell(content){ return `${topbar()}${content}${nav()}`; }

function render(){
  if(!adventure) return;
  if(state.audioOn){
    audio.setEnabled(true);
    if(view==='mission') audio.play('exploration');
    else if(view==='diary' && state.completed.length>=adventure.missions.length) audio.play('finale');
    else audio.play('main');
  }
  const views={intro,home,mission,inventory,achievements,diary,events,settings};
  app.innerHTML = (view==='intro' || view==='home') ? views[view]() : shell((views[view]||mission)());
}

function intro(){
  return `<section class="hero"><div class="card">
    <div class="hero-icon">😴</div>
    <div class="kicker">Lumi si sveglia...</div>
    <h1 class="title">Oh!</h1>
    ${mascot('Finalmente siete arrivate... avevo proprio bisogno del vostro aiuto.', 'sleepy')}
    <button class="btn" id="startIntro">✨ Iniziamo!</button>
  </div></section>`;
}
function home(){
  return `<section class="hero"><div class="card">
    <div class="hero-icon">🚲✨</div>
    <div class="kicker">${adventure.subtitle}</div>
    <h1 class="title">${adventure.title}</h1>
    <p class="subtitle">Una caccia ai ricordi tra bici, indizi, foto e piccole magie nascoste nel quartiere.</p>
    ${mascot(adventure.mascot.intro, 'happy')}
    <button class="btn" id="startGame">START</button>
    <button class="btn secondary" data-go-start="settings">Opzioni audio</button>
  </div></section>`;
}
function startGame(){
  state.started=true;
  view='mission';
  persist();
  render();
}
function mission(){
  if(state.completed.length>=adventure.missions.length) return finale();
  const m=currentMission();
  if(!state.missionStart[m.id]){ state.missionStart[m.id]=Date.now(); persist(); }
  const pct=Math.round(state.completed.length/adventure.missions.length*100);
  return `<section class="grid">
    <div class="card">
      <div class="mission-head"><div class="mission-icon">${m.icon}</div><div><div class="kicker">Capitolo ${m.id}/${adventure.missions.length}</div><h2>${m.title}</h2></div></div>
      <img class="mission-img" src="${m.targetImage}?v=2.0.3">
      <p class="small">🎯 Dettaglio da trovare e fotografare.</p>
      <div class="story-card">📖 ${m.story}</div>
      ${mascot(m.lumiLine || 'Guardate con attenzione. Il ricordo è vicino.', m.lumiExpression || 'curious')}
      <p class="clue">${m.clue}</p>
      <div class="actions"><button class="btn" data-photo="${m.id}">📷 Scatta foto</button><button class="btn secondary" data-hint="${m.id}">Aiutino</button></div>
    </div>
    <div class="card">
      <div class="kicker">Avanzamento</div>
      <h3>${pct}% completato</h3>
      <div class="progress"><div class="bar" style="width:${pct}%"></div></div>
      <div class="grid stats" style="margin-top:14px">
        <div class="stat"><b>${state.completed.length}</b><span>Missioni</span></div>
        <div class="stat"><b>${state.xp}</b><span>XP</span></div>
        <div class="stat"><b>${state.level}</b><span>${levelText()}</span></div>
        <div class="stat"><b>${Object.keys(state.photos).length}</b><span>Foto</span></div>
      </div>
    </div>
  </section>`;
}
function showHint(id){
  const m=adventure.missions.find(x=>x.id===id);
  state.assists++; persist();
  document.body.insertAdjacentHTML('beforeend',`<div class="modal" data-close-modal="1"><div class="card modal-card">
    <div class="kicker">Aiutino</div><h2>${m.title}</h2><p>${m.target}</p>
    <img src="${m.hintImage}?v=2.0.3">
    <button class="btn" data-close="1">Ho capito</button>
  </div></div>`);
}
async function scan(id,file){
  const m=adventure.missions.find(x=>x.id===id);
  if(state.audioOn) audio.play('mystery');
  document.body.insertAdjacentHTML('beforeend',`<div class="scan"><div class="scanbox card">
    <div class="hero-icon">🔍</div><h2>Scanner ricordi...</h2>
    <p id="scanText" class="small">Lumi osserva il dettaglio...</p><div class="scanline"><i></i></div>
  </div></div>`);
  let result;
  try{ result=await recognition.recognize(file,m.targetImage); }
  catch(e){ result={score:0,ok:false}; }
  setTimeout(()=>{
    const box=document.querySelector('#scanText');
    if(result.ok || state.recognitionMode==='assisted'){
      box.innerHTML=`<span class="result-badge">${result.ok?'Obiettivo riconosciuto':'Lumi non è sicurissimo'} ${(result.score*100|0)}%</span>
      <div class="actions"><button class="btn" data-complete="${id}" data-score="${result.score}">Conferma</button><button class="btn secondary" data-retry="${id}">Riprova</button></div>`;
    }else{
      box.innerHTML=`<span class="result-badge fail-badge">Non riconosciuta ${(result.score*100|0)}%</span><p class="small">Avvicinati al dettaglio e riprova.</p><button class="btn" data-retry="${id}">Riprova</button>`;
    }
  },2200);
}
function complete(id,score=0){
  document.querySelector('.scan')?.remove();
  const m=adventure.missions.find(x=>x.id===id);
  if(!state.completed.includes(id)){
    state.completed.push(id);
    state.xp+=m.xp;
    state.level=levelForXP(state.xp);
    state.items.push(m.item);
    state.rewards.push(m.badge);
    state.photos[id]=`Foto missione ${id}`;
    state.current=Math.min(id+1,adventure.missions.length+1);
    persist();
    audio.success();
    maybeEvent();
  }
  document.body.insertAdjacentHTML('beforeend',`<div class="reward"><div class="reward-card card">
    <div class="hero-icon">🗝️</div><div class="kicker">Missione completata</div><h2>${m.key}</h2>
    ${mascot('Fantastico! Un altro ricordo è tornato al suo posto. Il Diario brilla un po’ di più.', 'party')}
    <p>✨ ${m.fragment}<br>🎒 ${m.item}<br>🏅 ${m.badge}<br>🔐 ${m.secret}<br>+${m.xp} XP</p>
    <p class="small">Scanner: ${(score*100|0)}%</p>
    <button class="btn" data-close-render="1">Continua</button>
  </div></div>`);
}
function maybeEvent(){
  if(Math.random()>.25) return;
  const ev=adventure.randomEvents.find(e=>!state.eventsSeen.includes(e.id));
  if(!ev) return;
  state.eventsSeen.push(ev.id); state.xp+=ev.xp; state.rewards.push(ev.reward); state.pendingEvent=ev; persist();
  setTimeout(()=>document.body.insertAdjacentHTML('beforeend',`<div class="random-event"><div class="card">
    <div class="hero-icon">🎲</div><div class="kicker">Evento casuale</div><h2>${ev.title}</h2>
    <p class="subtitle">${ev.text}</p><p>🎁 ${ev.reward}<br>+${ev.xp} XP</p>
    <div class="actions"><button class="btn" id="eventPhotoBtn">📷 Scatta foto</button><button class="btn secondary" data-close="1">Fatto!</button></div>
  </div></div>`),600);
}
function eventPhoto(){ pendingEventPhoto=state.pendingEvent||{id:'evento',title:'Evento casuale'}; cameraInput.value=''; cameraInput.click(); }
function saveEventPhoto(file){
  const ev=pendingEventPhoto;
  const reader=new FileReader();
  reader.onload=()=>{
    const img=new Image();
    img.onload=()=>{
      const c=document.createElement('canvas'), max=520, ratio=Math.min(max/img.width,max/img.height,1);
      c.width=Math.round(img.width*ratio); c.height=Math.round(img.height*ratio);
      c.getContext('2d').drawImage(img,0,0,c.width,c.height);
      state.eventPhotos.push({id:ev.id,title:ev.title,text:ev.text,reward:ev.reward,date:new Date().toLocaleString('it-IT'),photo:c.toDataURL('image/jpeg',.72)});
      pendingEventPhoto=null; state.pendingEvent=null; persist();
      document.querySelector('.random-event')?.remove();
      document.body.insertAdjacentHTML('beforeend',`<div class="reward"><div class="reward-card card"><div class="hero-icon">📸</div><h2>Foto evento salvata</h2><p>La mini quest ora ha il suo ricordo.</p><button class="btn" data-go-close="events">Vedi Eventi</button></div></div>`);
    };
    img.src=reader.result;
  };
  reader.readAsDataURL(file);
}
function inventory(){
  const letters=adventure.missions.filter(completed).map(m=>m.secret).join(' ');
  return `<section class="grid"><div class="card"><div class="kicker">Zaino</div><h2>Inventario</h2>${mascot('Gli oggetti raccolti restano qui. Alcuni sembrano piccoli... ma i ricordi fanno magie strane.', 'curious')}<p class="small">Lettere trovate: <b>${letters||'nessuna'}</b></p><div class="actions"><input id="code" style="padding:12px;border-radius:14px;border:0" placeholder="Codice segreto"><button class="btn secondary" id="codeBtn">Sblocca</button></div></div><div class="inventory">${adventure.missions.map(m=>`<div class="item ${completed(m)?'':'locked'}"><h3>${m.icon} ${m.title}</h3><p>🎒 ${m.item}</p><p>🏅 ${m.badge}</p><p>🔐 ${completed(m)?m.secret:'?'}</p></div>`).join('')}</div></section>`;
}
function unlockCode(){
  const input=document.querySelector('#code'); if(!input) return;
  const c=input.value.trim().toUpperCase();
  const found=adventure.secretCodes.find(x=>x.code===c);
  if(!found){ alert('Codice non riconosciuto'); return; }
  if(state.secretsUnlocked.includes(c)){ alert('Già sbloccato'); return; }
  state.secretsUnlocked.push(c); state.xp+=found.xp; state.rewards.push(found.reward); state.level=levelForXP(state.xp); persist(); alert(`Sbloccato: ${found.reward}`); render();
}
function achievements(){
  const list=getAchievements(state,adventure);
  return `<section class="grid"><div class="card"><div class="kicker">Trofei</div><h2>Achievement</h2>${mascot('Le medaglie non fanno rumore, ma brillano un sacco.', 'proud')}</div><div class="grid">${list.map(a=>`<div class="achievement ${a.ok?'':'locked'}"><h3>${a.icon} ${a.name}</h3><p class="small">${a.desc}</p></div>`).join('')}</div></section>`;
}
function diary(){
  return `<section class="grid"><div class="card"><div class="kicker">Diario</div><h2>Album dei Ricordi</h2>${mascot('Ogni avventura lascia una traccia. Qui custodiremo tutti i ricordi che creerete insieme.', 'tender')}</div>${adventure.missions.map(m=>`<div class="diary-page"><h3>${m.id}. ${m.title}</h3><p>${m.story}</p><p><b>Stato:</b> ${completed(m)?'Completata':'Da trovare'}</p></div>`).join('')}</section>`;
}
function events(){
  const photos=state.eventPhotos||[];
  return `<section class="grid"><div class="card"><div class="kicker">Quest secondarie</div><h2>Foto Eventi</h2>${mascot('Queste sono le foto buffe delle mini quest casuali. Roba seria, ma con il naso sporco di magia.', 'happy')}<p class="small">${photos.length} foto evento salvate.</p></div>${photos.length?`<div class="album">${photos.map(e=>`<div><img src="${e.photo}"><p class="small"><b>${e.title}</b><br>${e.date}<br>🎁 ${e.reward||''}</p></div>`).join('')}</div>`:`<div class="card"><p>Nessuna foto evento ancora.</p></div>`}</section>`;
}
function settings(){
  return `<section class="grid"><div class="card"><div class="kicker">Opzioni</div><h2>Audio e scanner</h2>${mascot('La magia funziona meglio quando partite con calma e un bel sorriso.', 'happy')}<div class="setting-row"><div><b>Audio</b><p class="small">${audio.status}</p></div><div class="switch ${state.audioOn?'on':''}" id="audioToggle"><i></i></div></div><button class="btn secondary" id="testAudio">Prova audio</button><div class="setting-row"><div><b>Scanner assistito</b><p class="small">Se acceso, potete confermare anche quando Lumi non è sicurissimo.</p></div><div class="switch ${state.recognitionMode==='assisted'?'on':''}" id="scanToggle"><i></i></div></div><div class="card"><h3>Zona reset</h3><p class="small">Usala solo se vuoi ricominciare da zero.</p><button class="btn danger" id="resetBtn">Resetta avventura</button></div></div></section>`;
}
function finale(){
  if(state.audioOn) audio.play('finale');
  return `<section class="hero"><div class="card"><div class="hero-icon">🎉</div><div class="kicker">Missione completata</div><h1 class="title">Tesoro sbloccato</h1>${mascot('Avete riunito tutti i ricordi. Ora il tesoro può uscire dal digitale e diventare vero.', 'party')}<p class="subtitle">Cercate la busta reale nel posto dove arrivano i messaggi.</p><button class="btn" data-go="diary">Apri diario</button></div></section>`;
}
function go(v){ if(!state.started && v!=='settings') state.started=true; view=v; persist(); render(); }
function resetAll(){
  if(confirm('Vuoi davvero ricominciare da zero?')){
    if(confirm('Ultima conferma: perderai missioni, XP e foto eventi.')){
      state=save.reset(); audio.stop(); view='intro'; render();
    }
  }
}
function toggleAudio(){ state.audioOn=!state.audioOn; audio.setEnabled(state.audioOn); persist(); if(state.audioOn) audio.play(view==='mission'?'exploration':'main'); render(); }
function testAudio(){ state.audioOn=true; audio.setEnabled(true); persist(); audio.play('main'); setTimeout(()=>audio.success(),400); render(); }
function toggleScan(){ state.recognitionMode=state.recognitionMode==='assisted'?'strict':'assisted'; persist(); render(); }

document.addEventListener('click',e=>{
  const t=e.target.closest('button,.switch');
  if(!t) return;
  if(t.id==='startIntro' || t.id==='startGame'){ startGame(); return; }
  if(t.dataset.go){ go(t.dataset.go); return; }
  if(t.dataset.goStart){ state.started=true; go(t.dataset.goStart); return; }
  if(t.dataset.photo){ pendingMission=Number(t.dataset.photo); cameraInput.value=''; cameraInput.click(); return; }
  if(t.dataset.hint){ showHint(Number(t.dataset.hint)); return; }
  if(t.dataset.complete){ complete(Number(t.dataset.complete), Number(t.dataset.score||0)); return; }
  if(t.dataset.retry){ document.querySelector('.scan')?.remove(); pendingMission=Number(t.dataset.retry); cameraInput.value=''; cameraInput.click(); return; }
  if(t.dataset.close || t.dataset.closeModal){ t.closest('.modal,.random-event,.reward')?.remove(); return; }
  if(t.dataset.closeRender){ t.closest('.reward')?.remove(); render(); return; }
  if(t.dataset.goClose){ t.closest('.reward')?.remove(); go(t.dataset.goClose); return; }
  if(t.id==='eventPhotoBtn'){ eventPhoto(); return; }
  if(t.id==='codeBtn'){ unlockCode(); return; }
  if(t.id==='audioToggle'){ toggleAudio(); return; }
  if(t.id==='testAudio'){ testAudio(); return; }
  if(t.id==='scanToggle'){ toggleScan(); return; }
  if(t.id==='resetBtn'){ resetAll(); return; }
  });
document.addEventListener('click',e=>{ if(e.target.className==='modal') e.target.remove(); });
cameraInput.addEventListener('change',async e=>{
  const file=e.target.files[0]; if(!file) return;
  if(pendingEventPhoto){ saveEventPhoto(file); return; }
  if(!pendingMission) return;
  scan(pendingMission,file);
});

async function init(){
  adventure=await fetch('adventures/retrone/adventure.json?v=2.0.3').then(r=>r.json());
  audio.setMap(adventure.audio);
  if('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js?v=2.0.3').catch(()=>{});
  const wrap=document.createElement('div'); wrap.className='particles';
  for(let i=0;i<32;i++){const p=document.createElement('i');p.className='particle';p.style.left=Math.random()*100+'%';p.style.animationDuration=(7+Math.random()*14)+'s';p.style.animationDelay=(-Math.random()*18)+'s';wrap.appendChild(p)}
  document.body.appendChild(wrap);
  view = state.started ? 'mission' : 'intro';
  render();
}
init();
