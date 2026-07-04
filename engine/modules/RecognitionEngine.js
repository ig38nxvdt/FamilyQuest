export class RecognitionEngine{
  constructor(){this.size=96;this.threshold=.56}
  async recognize(file, referenceUrl){
    const captured = await this.featuresFromFile(file);
    const reference = await this.featuresFromUrl(referenceUrl);
    const score = this.compare(captured, reference);
    return {score, ok: score >= this.threshold};
  }
  async imageBitmapFromFile(file){
    const img = await createImageBitmap(file, {resizeWidth:512, resizeHeight:512, resizeQuality:'high'}).catch(async()=>{
      const url=URL.createObjectURL(file);
      const image=await this.loadImage(url);
      URL.revokeObjectURL(url);
      return image;
    });
    return img;
  }
  async loadImage(src){return new Promise((res,rej)=>{const img=new Image();img.onload=()=>res(img);img.onerror=rej;img.src=src})}
  async featuresFromFile(file){
    const bitmap = await this.imageBitmapFromFile(file);
    return this.extract(bitmap);
  }
  async featuresFromUrl(url){
    const img = await this.loadImage(url + '?v=1.0.0');
    return this.extract(img);
  }
  extract(source){
    const c=document.createElement('canvas');
    c.width=this.size;c.height=this.size;
    const ctx=c.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(source,0,0,this.size,this.size);
    const d=ctx.getImageData(0,0,this.size,this.size).data;
    const hist=new Array(24).fill(0), center=new Array(24).fill(0), edges=[];
    let cc=0,lastLum=null;
    for(let y=0;y<this.size;y++){
      for(let x=0;x<this.size;x++){
        const i=(y*this.size+x)*4,r=d[i],g=d[i+1],b=d[i+2],lum=(r+g+b)/3;
        hist[Math.min(7,r>>5)]++;hist[8+Math.min(7,g>>5)]++;hist[16+Math.min(7,b>>5)]++;
        if(x>this.size*.25&&x<this.size*.75&&y>this.size*.25&&y<this.size*.75){center[Math.min(7,r>>5)]++;center[8+Math.min(7,g>>5)]++;center[16+Math.min(7,b>>5)]++;cc++}
        if(lastLum!==null) edges.push(Math.abs(lum-lastLum)>35?1:0);
        lastLum=lum;
      }
    }
    const total=this.size*this.size;
    for(let i=0;i<hist.length;i++)hist[i]/=total*3;
    for(let i=0;i<center.length;i++)center[i]/=Math.max(1,cc*3);
    const edgeDensity=edges.reduce((a,b)=>a+b,0)/Math.max(1,edges.length);
    return {hist,center,edgeDensity};
  }
  compare(a,b){
    const sim=(x,y,scale)=>Math.max(0,1-x.reduce((s,v,i)=>s+Math.abs(v-y[i]),0)/scale);
    const hist=sim(a.hist,b.hist,1.15);
    const center=sim(a.center,b.center,1.05);
    const edge=1-Math.min(1,Math.abs(a.edgeDensity-b.edgeDensity)*3.5);
    return Math.max(0,Math.min(1,hist*.38+center*.42+edge*.20));
  }
}