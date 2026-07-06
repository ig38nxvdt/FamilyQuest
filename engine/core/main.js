import {SaveManager} from '../modules/SaveManager.js';
import {AudioManager} from '../modules/AudioManager.js';
import {RecognitionEngine} from '../modules/RecognitionEngine.js';
import {levelForXP, levelName, achievements as getAchievements} from '../modules/GameLogic.js';

const $=s=>document.querySelector(s);
const app=$('#app'), cameraInput=$('#cameraInput');
const save=new SaveManager('familyquest-engine-2-0-1');
const audio=new AudioManager();
const recognition=new RecognitionEngine();
let adventure=null,state=save.load(),view='home',pendingMission=null,pendingEventPhoto=null;

function completed(m){return state.completed.includes(m.id)}
function currentMission(){return adventure.missions.find(m=>m.id===state.current)||adventure.missions.at(-1)}
function persist(){save.save(state)}
function mascot(text){return `<div class="mascot"><div class="mascot-face">${adventure.mascot.emoji}</div><p><b>${adventure.mascot.name}:</b><br>${text}</p></div>`}
function nav(){if(!state.started)return'';return `<div class="nav"><button class="${view==='mission'?'active':''}" onclick="FQ.go('mission')">Missione</button><button class="${view==='inventory'?'active':''}" onclick="FQ.go('inventory')">Zaino</button><button class="${view==='achievements'?'active':''}" onclick="FQ.go('achievements')">Trofei</button><button class="${view==='diary'?'active':''}" onclick="FQ.go('diary')">Diario</button><button class="${view==='events'?'active':''}" onclick="FQ.go('events')">Eventi</button><button class="${view==='settings'?'active':''}" onclick="FQ.go('settings')">Opzioni</button></div>`}
function shell(content){return `<div class="topbar">
 <div class="brand"><div class="logo">🦊</div><div><div class="kicker">FamilyQuest Engine 2.0.1</div><b>${adventure.title}</b></div></div>
 <div class="top-actions"><button class="btn secondary mini" onclick="FQ.go('mission')">⬅ Avventura</button><button class="btn secondary mini" onclick="FQ.go('settings')">⚙️</button></div>
</div>${content}${nav()}`}
function render(){if(!adventure)return;if(state.audioOn){audio.setEnabled(true); if(view==='mission')audio.play('exploration'); else if(view==='settings'){} else if(view==='diary'&&state.completed.length>=adventure.missions.length)audio.play('finale'); else audio.play('main')} if(!state.introSeen){app.innerHTML=intro();return}if(!state.started){app.innerHTML=home();return} const views={mission,inventory,achievements,diary,events,settings,editor};app.innerHTML=shell((views[view]||mission)())}
function intro(){return `<section class="hero"><div class="card"><div class="hero-icon">😴</div><div class="kicker">Lumi si sveglia...</div><h1 class="title">Oh!</h1>${mascot('Finalmente siete arrivate... avevo proprio bisogno del vostro aiuto.', 'sleepy')}<button class="btn" onclick="FQ.start()">✨ Iniziamo!</button></div></section>`}
function home(){const pct=Math.round(state.completed.length/adventure.missions.length*100);return `<section class="hero"><div class="card"><div class="hero-icon">🚲✨</div><div class="kicker">${adventure.subtitle}</div><h1 class="title">${adventure.title}</h1><p class="subtitle">Una caccia ai ricordi tra bici, indizi, foto e piccole magie nascoste nel quartiere.</p>${mascot(adventure.mascot.intro)}<div class="progress"><div class="bar" style="width:${pct}%"></div></div><p class="small">${state.completed.length}/${adventure.missions.length} missioni · ${state.xp} XP · Livello ${state.level}</p><button class="btn" onclick="FQ.start()">START</button><button class="btn secondary" onclick="FQ.goStart('settings')">Opzioni audio</button></div></section>`}
function mission(){const m=currentMission(); if(state.completed.length>=adventure.missions.length)return finale(); if(!state.missionStart[m.id]){state.missionStart[m.id]=Date.now();persist()} const pct=Math.round(state.completed.length/adventure.missions.length*100);return `<section class="grid"><div class="card"><div class="mission-head"><div class="mission-icon">${m.icon}</div><div><div class="kicker">Missione ${m.id}/${adventure.missions.length}</div><h2>${m.title}</h2></div></div><img class="mission-img" src="${m.targetImage}?v=2.0.1"><p class="small">🎯 Dettaglio da trovare e fotografare.</p><div class="story-card">📖 ${m.story}</div>${mascot('Osservate bene il dettaglio. Lo scanner ora lavora leggero, senza appesantire l’iPhone.')}<p class="clue">${m.clue}</p><div class="actions"><button class="btn" onclick="FQ.photo(${m.id})">📷 Scatta foto</button><button class="btn secondary" onclick="FQ.hint(${m.id})">Aiutino</button></div></div><div class="card"><div class="kicker">Avanzamento</div><h3>${pct}% completato</h3><div class="progress"><div class="bar" style="width:${pct}%"></div></div><div class="grid stats" style="margin-top:14px"><div class="stat"><b>${state.completed.length}</b><span>Missioni</span></div><div class="stat"><b>${state.xp}</b><span>XP</span></div><div class="stat"><b>${state.level}</b><span>${levelName(state.level)}</span></div><div class="stat"><b>${Object.keys(state.photos).length}</b><span>Foto salvate leggere</span></div></div></div></section>`}
function showHint(id){const m=adventure.missions.find(x=>x.id===id);state.assists++;persist();document.body.insertAdjacentHTML('beforeend',`<div class="modal" onclick="if(event.target.className==='modal')this.remove()"><div class="card modal-card"><div class="kicker">Aiutino</div><h2>${m.title}</h2><p>${m.target}</p><img src="${m.hintImage}?v=2.0.1"><button class="btn" onclick="document.querySelector('.modal').remove()">Ho capito</button></div></div>`)}
cameraInput.addEventListener('change',async e=>{
 const file=e.target.files[0];
 if(!file)return;
 if(pendingEventPhoto){saveEventPhoto(file);return}
 if(!pendingMission)return;
 scan(pendingMission,file)
})
async function scan(id,file){const m=adventure.missions.find(x=>x.id===id); if(state.audioOn)audio.play('mystery'); app.insertAdjacentHTML('beforeend',`<div class="scan"><div class="scanbox card"><div class="hero-icon">🔍</div><h2>Scanner ricordi...</h2><p id="scanText" class="small">Riduzione immagine per iPhone...</p><div class="scanline"><i></i></div></div></div>`);let result;try{result=await recognition.recognize(file,m.targetImage)}catch(e){result={score:0,ok:false,error:e.message}}setTimeout(()=>{const box=$('#scanText');if(result.ok||state.recognitionMode==='assisted'){box.innerHTML=`<span class="result-badge">${result.ok?'Obiettivo riconosciuto':'Somiglianza bassa'} ${(result.score*100|0)}%</span><div class="actions"><button class="btn" onclick="FQ.complete(${id},${result.score})">Conferma</button><button class="btn secondary" onclick="document.querySelector('.scan').remove();FQ.photo(${id})">Riprova</button></div>`}else{box.innerHTML=`<span class="result-badge fail-badge">Non riconosciuta ${(result.score*100|0)}%</span><p class="small">Avvicinati al dettaglio e riprova.</p><button class="btn" onclick="document.querySelector('.scan').remove();FQ.photo(${id})">Riprova</button>`}},2200)}
function complete(id,score){document.querySelector('.scan')?.remove();const m=adventure.missions.find(x=>x.id===id);if(!state.completed.includes(id)){state.completed.push(id);state.xp+=m.xp;state.level=levelForXP(state.xp);state.items.push(m.item);state.rewards.push(m.badge);state.photos[id]=`Foto missione ${id} salvata`;state.current=Math.min(id+1,adventure.missions.length+1);persist();audio.success();maybeEvent()}document.body.insertAdjacentHTML('beforeend',`<div class="reward"><div class="reward-card card"><div class="hero-icon">🗝️</div><div class="kicker">Missione completata</div><h2>${m.key}</h2><p>✨ ${m.fragment}<br>🎒 ${m.item}<br>🏅 ${m.badge}<br>🔐 ${m.secret}<br>+${m.xp} XP</p><p class="small">Scanner: ${(score*100|0)}%</p><button class="btn" onclick="document.querySelector('.reward').remove();FQ.render()">Continua</button></div></div>`)}
function maybeEvent(){
 if(Math.random()>.25)return;
 const ev=adventure.randomEvents.find(e=>!state.eventsSeen.includes(e.id));
 if(!ev)return;
 state.pendingEvent=ev;
 state.eventsSeen.push(ev.id);
 state.xp+=ev.xp;
 state.rewards.push(ev.reward);
 persist();
 setTimeout(()=>document.body.insertAdjacentHTML('beforeend',`<div class="random-event"><div class="card">
   <div class="hero-icon">🎲</div>
   <div class="kicker">Evento casuale</div>
   <h2>${ev.title}</h2>
   <p class="subtitle">${ev.text}</p>
   <p>🎁 ${ev.reward}<br>+${ev.xp} XP</p>
   <div class="actions">
    <button class="btn" onclick="FQ.eventPhoto()">📷 Scatta foto</button>
    <button class="btn secondary" onclick="document.querySelector('.random-event').remove()">Fatto!</button>
   </div>
   <p class="small">La foto finirà nella sezione Foto Eventi.</p>
 </div></div>`),600)
}
function eventPhoto(){
 pendingEventPhoto=state.pendingEvent||{id:'evento',title:'Evento casuale',text:'Mini quest'};
 cameraInput.value='';
 cameraInput.click();
}
function saveEventPhoto(file){
 const ev=pendingEventPhoto;
 const reader=new FileReader();
 reader.onload=()=>{
   const img=new Image();
   img.onload=()=>{
     const c=document.createElement('canvas');
     const max=520;
     const ratio=Math.min(max/img.width,max/img.height,1);
     c.width=Math.round(img.width*ratio);
     c.height=Math.round(img.height*ratio);
     const ctx=c.getContext('2d');
     ctx.drawImage(img,0,0,c.width,c.height);
     const data=c.toDataURL('image/jpeg',0.72);
     state.eventPhotos=state.eventPhotos||[];
     state.eventPhotos.push({id:ev.id||'evento',title:ev.title||'Evento casuale',text:ev.text||'',reward:ev.reward||'',date:new Date().toLocaleString('it-IT'),photo:data});
     state.pendingEvent=null;
     pendingEventPhoto=null;
     persist();
     document.querySelector('.random-event')?.remove();
     document.body.insertAdjacentHTML('beforeend',`<div class="reward"><div class="reward-card card">
       <div class="hero-icon">📸</div>
       <div class="kicker">Foto evento salvata</div>
       <h2>${ev.title||'Evento casuale'}</h2>
       <p>La foto simpatica è finita in Foto Eventi.</p>
       <button class="btn" onclick="document.querySelector('.reward').remove();FQ.go('events')">Vedi Foto Eventi</button>
       <button class="btn secondary" onclick="document.querySelector('.reward').remove();FQ.render()">Continua</button>
     </div></div>`);
   };
   img.src=reader.result;
 };
 reader.readAsDataURL(file);
}
function inventory(){const letters=adventure.missions.filter(completed).map(m=>m.secret).join(' ');return `<section class="grid"><div class="card"><div class="kicker">Zaino</div><h2>Inventario</h2>${mascot('Gli oggetti raccolti restano qui. La Chiave d’Argento apre il finale segreto.') }<p class="small">Lettere trovate: <b>${letters||'nessuna'}</b></p><div class="actions"><input id="code" style="padding:12px;border-radius:14px;border:0" placeholder="Codice segreto"><button class="btn secondary" onclick="FQ.code()">Sblocca</button></div></div><div class="inventory">${adventure.missions.map(m=>`<div class="item ${completed(m)?'':'locked'}"><h3>${m.icon} ${m.title}</h3><p>🎒 ${m.item}</p><p>🏅 ${m.badge}</p><p>🔐 ${completed(m)?m.secret:'?'}</p></div>`).join('')}</div></section>`}
function code(){const c=$('#code').value.trim().toUpperCase();const found=adventure.secretCodes.find(x=>x.code===c);if(!found){alert('Codice non riconosciuto');return}if(state.secretsUnlocked.includes(c)){alert('Già sbloccato');return}state.secretsUnlocked.push(c);state.xp+=found.xp;state.rewards.push(found.reward);state.level=levelForXP(state.xp);persist();alert(`Sbloccato: ${found.reward}`);render()}
function achievements(){const list=getAchievements(state,adventure);return `<section class="grid"><div class="card"><div class="kicker">Trofei</div><h2>Achievement</h2>${mascot('Le medaglie non fanno rumore, ma brillano un sacco.')}</div><div class="grid">${list.map(a=>`<div class="achievement ${a.ok?'':'locked'}"><h3>${a.icon} ${a.name}</h3><p class="small">${a.desc}</p></div>`).join('')}</div></section>`}
function diary(){return `<section class="grid"><div class="card"><div class="kicker">Diario</div><h2>Album dei Ricordi</h2>${mascot('Qui resta la storia della giornata, leggera e senza bloccare l’iPhone.')}</div>${adventure.missions.map(m=>`<div class="diary-page"><h3>${m.id}. ${m.title}</h3><p>${m.story}</p><p><b>Stato:</b> ${completed(m)?'Completata':'Da trovare'}</p></div>`).join('')}</section>`}
function events(){
 const photos=state.eventPhotos||[];
 return `<section class="grid">
  <div class="card">
   <div class="kicker">Quest secondarie</div>
   <h2>Foto Eventi</h2>
   ${mascot('Queste sono le foto buffe delle mini quest casuali. Roba seria, ma con il naso sporco di magia.')}
   <p class="small">${photos.length} foto evento salvate.</p>
  </div>
  ${photos.length?`<div class="album">${photos.map(e=>`<div><img src="${e.photo}"><p class="small"><b>${e.title}</b><br>${e.date}<br>🎁 ${e.reward||''}</p></div>`).join('')}</div>`:`<div class="card"><p>Nessuna foto evento ancora. Quando appare un evento casuale, premi “Scatta foto”.</p></div>`}
 </section>`
}
function settings(){return `<section class="grid"><div class="card"><div class="kicker">Opzioni</div><h2>Audio e scanner</h2>${mascot('Su iPhone l’audio parte solo dopo un tap. Lo scanner ora non salva foto pesanti: molto più leggero.') }<div class="setting-row"><div><b>Audio</b><p class="small">${audio.status}</p></div><div class="switch ${state.audioOn?'on':''}" onclick="FQ.audio()"><i></i></div></div><button class="btn secondary" onclick="FQ.testAudio()">Prova audio</button><div class="setting-row"><div><b>Scanner assistito</b><p class="small">Se acceso, puoi confermare anche con somiglianza bassa. Per gioco reale tienilo spento.</p></div><div class="switch ${state.recognitionMode==='assisted'?'on':''}" onclick="FQ.scanMode()"><i></i></div></div></div></section>`}
function editor(){return `<section class="grid editor-area"><div class="card"><div class="kicker">Editor</div><h2>Crea nuova avventura</h2>${mascot('Base pronta: prossima fase sarà drag & drop completo.') }<label>Titolo</label><input id="edTitle" value="Nuova Avventura"><label>Indizio</label><textarea id="edClue">Cercate il dettaglio nascosto.</textarea><button class="btn" onclick="FQ.export()">Genera JSON</button><div id="exportOut" class="export-box" style="display:none"></div></div></section>`}
function finale(){if(state.audioOn)audio.play('finale');return `<section class="hero"><div class="card"><div class="hero-icon">🎉</div><div class="kicker">Missione completata</div><h1 class="title">Tesoro sbloccato</h1>${mascot('Avete riunito tutti i ricordi. Ora il tesoro può uscire dal digitale e diventare vero.') }<p class="subtitle">Cercate la busta reale nel posto dove arrivano i messaggi.</p><button class="btn" onclick="FQ.go('diary')">Apri diario</button></div></section>`}

window.FQ={
 render,
 introDone(){
   state.introSeen=true;
   state.started=true;
   view='mission';
   persist();
   render();
 },
 start(){
   state.introSeen=true;
   state.started=true;
   view='mission';
   persist();
   render();
 },
 go(v){
   if(!state.started && v!=='settings'){state.started=true}
   view=v;
   persist();
   render();
 },
 goStart(v){
   state.introSeen=true;
   state.started=true;
   view=v;
   persist();
   render();
 },
 reset(){
   if(confirm('Vuoi davvero ricominciare da zero?')){
     if(confirm('Ultima conferma: perderai missioni, XP e foto eventi.')){
       state=save.reset();
       audio.stop();
       view='home';
       render();
     }
   }
 },
 photo(id){pendingMission=id;cameraInput.value='';cameraInput.click()},
 hint:showHint,
 complete,
 eventPhoto,
 code,
 audio(){
   state.audioOn=!state.audioOn;
   audio.setEnabled(state.audioOn);
   persist();
   if(state.audioOn)audio.play(view==='mission'?'exploration':'main');
   render();
 },
 testAudio(){
   state.audioOn=true;
   audio.setEnabled(true);
   persist();
   audio.play('main');
   setTimeout(()=>audio.success(),400);
   render();
 },
 scanMode(){
   state.recognitionMode=state.recognitionMode==='assisted'?'strict':'assisted';
   persist();
   render();
 },
 generate,
 export:editorExport
};

async function init(){adventure=await fetch('adventures/retrone/adventure.json?v=2.0.1').then(r=>r.json());audio.setMap(adventure.audio);if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js?v=2.0.1').catch(()=>{});for(let i=0;i<32;i++){const p=document.createElement('i');p.className='particle';p.style.left=Math.random()*100+'%';p.style.animationDuration=(7+Math.random()*14)+'s';p.style.animationDelay=(-Math.random()*18)+'s';(document.querySelector('.particles')||(()=>{const w=document.createElement('div');w.className='particles';document.body.appendChild(w);return w})()).appendChild(p)}render()}
init();
