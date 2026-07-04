export function levelForXP(xp){if(xp>=1200)return 5;if(xp>=750)return 4;if(xp>=420)return 3;if(xp>=160)return 2;return 1}
export function levelName(l){return['','Esploratrici','Viaggiatrici','Custodi','Archiviste','Maestre dei Ricordi'][l]}
export function achievements(state, adventure){
 const done=state.completed.length, photos=Object.keys(state.photos||{}).length;
 return [
  {icon:'🌟',name:'Prima Scintilla',desc:'Completa la prima missione.',ok:done>=1},
  {icon:'🏆',name:'Retrone Master',desc:'Completa tutte le missioni.',ok:done>=adventure.missions.length},
  {icon:'📸',name:'Fotografe Ufficiali',desc:'Scatta tutte le foto.',ok:photos>=adventure.missions.length},
  {icon:'🦅',name:'Occhio di Falco',desc:'Completa senza aiutini.',ok:(state.assists||0)===0 && done>=adventure.missions.length},
  {icon:'🔐',name:'Decifratrici',desc:'Sblocca un codice segreto.',ok:(state.secretsUnlocked||[]).length>=1},
  {icon:'👑',name:'Maestre dei Ricordi',desc:'Raggiungi livello 5.',ok:state.level>=5}
 ]
}