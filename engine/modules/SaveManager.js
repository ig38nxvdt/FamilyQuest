export class SaveManager{
  constructor(key){this.key=key;this.defaultState={started:false,current:1,completed:[],xp:0,level:1,photos:{},audioOn:false,recognitionMode:'strict',assists:0,items:[],rewards:[],secretsUnlocked:[],eventsSeen:[],missionStart:{}}}
  load(){try{return {...this.defaultState,...(JSON.parse(localStorage.getItem(this.key))||{})}}catch{return {...this.defaultState}}}
  save(state){localStorage.setItem(this.key,JSON.stringify(state))}
  reset(){localStorage.removeItem(this.key);return this.load()}
}