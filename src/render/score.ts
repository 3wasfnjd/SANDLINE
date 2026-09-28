/** Original, seamless 8-bar tactical score. Synthesized once, never in the render loop. */
export function createBattleScore(sampleRate=22050):Float32Array{
 const beat=60/96,length=32*beat,out=new Float32Array(Math.round(length*sampleRate));
 const add=(start:number,duration:number,voice:(t:number)=>number)=>{
  const first=Math.round(start*sampleRate),count=Math.round(duration*sampleRate);
  for(let i=0;i<count;i++)out[(first+i)%out.length]+=voice(i/sampleRate);
 };
 let seed=1729;const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/2147483648-1;};
 // D minor / Bb / C / A: low sustained brass with an understated string pulse.
 const roots=[73.416,58.27,65.406,55],fifths=1.4983;
 for(let bar=0;bar<8;bar++){
  const root=roots[Math.floor(bar/2)],start=bar*4*beat;
  add(start,4*beat,t=>{const e=Math.min(1,t/.28)*Math.min(1,(4*beat-t)/.4);return e*(Math.sin(2*Math.PI*root*t)*.12+Math.sin(2*Math.PI*root*2*t)*.045+Math.sin(2*Math.PI*root*fifths*t)*.045);});
  for(let step=0;step<8;step++){
   const f=root*[4,4*fifths,8,4*fifths][step%4];
   add(start+step*beat/2,.32,t=>Math.min(1,t/.025)*Math.exp(-t*12)*(Math.sin(2*Math.PI*f*t)+.22*Math.sin(2*Math.PI*f*2*t))*.045);
  }
 }
 for(let b=0;b<32;b++){
  if(b%4===0||b%4===2||b%8===7)add(b*beat,.55,t=>{const phase=2*Math.PI*(46*t+42*.045*(1-Math.exp(-t/.045)));return Math.min(1,t/.003)*(Math.sin(phase)*Math.exp(-t*8)*.48+noise()*Math.exp(-t*65)*.06);});
  if(b%4===1||b%4===3)add(b*beat,.2,t=>(noise()*.11+Math.sin(2*Math.PI*175*t)*.06)*Math.exp(-t*24));
 }
 // Bound peaks to preserve mixer headroom without distorting the score.
 let peak=0;for(const v of out)peak=Math.max(peak,Math.abs(v));
 const scale=.7/Math.max(.7,peak);for(let i=0;i<out.length;i++)out[i]*=scale;
 return out;
}
