export class AudioManager{
  constructor(){this.current=null;this.name=null;this.status='Audio non avviato';this.map=null;this.enabled=false}
  setMap(map){this.map=map}
  setEnabled(v){this.enabled=v;if(!v)this.stop()}
  url(name){return this.map?.[name] ? `${this.map[name]}?v=1.0.0` : null}
  play(name,loop=true){if(!this.enabled)return;const src=this.url(name);if(!src){this.status='Traccia non trovata';return}if(this.name===name&&this.current&&!this.current.paused)return;this.stop();this.current=new Audio(src);this.current.loop=loop;this.current.volume=name==='exploration'?.38:.42;this.name=name;this.current.play().then(()=>this.status='Audio attivo: '+name).catch(()=>this.status='Audio bloccato: serve tap')}
  stop(){if(this.current){this.current.pause();this.current.currentTime=0}this.current=null;this.name=null}
  success(){if(!this.enabled)return;const src=this.url('success');if(!src)return;const s=new Audio(src);s.volume=.9;s.play().catch(()=>{})}
}