import {BattleEvent,Vec} from '../core/types';
import {Simulation} from '../core/simulation';
export class AudioSystem{
 private context:AudioContext|null=null;private master:GainNode|null=null;private noise:AudioBuffer|null=null;private voices=0;private last=new Map<string,number>();private engines:{osc:OscillatorNode;gain:GainNode;pan:StereoPannerNode}[]=[];private musicTime=0;
 private windGain:GainNode|null=null;private rainGain:GainNode|null=null;private windFilter:BiquadFilterNode|null=null;
 muted=localStorage.getItem('sandline-muted')==='1';
 async start(){
  if(this.context){await this.context.resume();return;}
  const ctx=this.context=new AudioContext();this.master=ctx.createGain();this.master.gain.value=this.muted?0:.65;this.master.connect(ctx.destination);
  this.noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  const wind=ctx.createBufferSource();wind.buffer=this.noise;wind.loop=true;const f=this.windFilter=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=650;const g=this.windGain=ctx.createGain();g.gain.value=.026;wind.connect(f).connect(g).connect(this.master);wind.start();
  const rain=ctx.createBufferSource();rain.buffer=this.noise;rain.loop=true;rain.playbackRate.value=1.17;const rainFilter=ctx.createBiquadFilter();rainFilter.type='highpass';rainFilter.frequency.value=1350;this.rainGain=ctx.createGain();this.rainGain.gain.value=0;rain.connect(rainFilter).connect(this.rainGain).connect(this.master);rain.start(0,.7);
  for(let i=0;i<2;i++){const osc=ctx.createOscillator();osc.type='sawtooth';osc.frequency.value=42;const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=170;const gain=ctx.createGain();gain.gain.value=.005;const pan=ctx.createStereoPanner();osc.connect(filter).connect(gain).connect(pan).connect(this.master);osc.start();this.engines.push({osc,gain,pan});}
  await ctx.resume();this.radio();
 }
 toggle(){this.muted=!this.muted;localStorage.setItem('sandline-muted',this.muted?'1':'0');if(this.master&&this.context)this.master.gain.setTargetAtTime(this.muted?0:.65,this.context.currentTime,.08);return this.muted;}
 pause(paused:boolean){if(!this.context)return;if(paused)void this.context.suspend();else void this.context.resume();}
 weather(rain:number,wind:number){if(!this.context||this.context.state!=='running')return;const t=this.context.currentTime;this.windGain?.gain.setTargetAtTime(.018+wind*.035,t,.8);this.windFilter?.frequency.setTargetAtTime(400+wind*700,t,1);this.rainGain?.gain.setTargetAtTime(rain*.075,t,.7);}
 private tone(frequency:number,time:number,length:number,volume:number){if(!this.context||!this.master)return;const c=this.context,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=frequency;g.gain.setValueAtTime(.001,time);g.gain.exponentialRampToValueAtTime(volume,time+.02);g.gain.exponentialRampToValueAtTime(.0001,time+length);o.connect(g).connect(this.master);o.start(time);o.stop(time+length+.02);o.onended=()=>{o.disconnect();g.disconnect();};}
 radio(){if(!this.context)return;const t=this.context.currentTime;this.tone(950,t,.08,.042);this.tone(1200,t+.12,.11,.036);}
 event(e:BattleEvent,listener:Vec){
  const ctx=this.context;if(!ctx||!this.master||!this.noise||ctx.state!=='running')return;
  if(e.type==='capture'||e.type==='reinforce'||e.type==='end'){this.radio();if(e.type==='end'){const t=ctx.currentTime;[220,277.18,329.63,440].forEach((f,i)=>this.tone(e.team===0?f:f*.75,t+i*.27,2,.045));}return;}
  if(e.type!=='shot'&&!(e.type==='death'&&e.role==='vehicle'))return;
  const key=e.type+e.role,now=ctx.currentTime;if(this.voices>=14||now-(this.last.get(key)||-9)<.048)return;this.last.set(key,now);this.voices++;
  const heavy=e.role==='at'||e.role==='vehicle',explosion=e.type==='death',duration=explosion?1.5:heavy?.5:.2;
  const dist=Math.hypot(e.x-listener.x,e.z-listener.z),gain=ctx.createGain();gain.gain.setValueAtTime((explosion?.45:heavy?.25:.11)/(1+dist/25),now);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
  const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=Math.max(450,(heavy?1800:4700)-dist*70);
  const source=ctx.createBufferSource();source.buffer=this.noise;source.playbackRate.value=.85+Math.random()*.3;
  const pan=ctx.createPanner();pan.panningModel='equalpower';pan.distanceModel='inverse';pan.refDistance=18;pan.maxDistance=130;pan.rolloffFactor=.8;pan.positionX.value=e.x;pan.positionY.value=0;pan.positionZ.value=e.z;
  source.connect(filter).connect(gain).connect(pan).connect(this.master);source.start(now,Math.random()*.5);source.stop(now+duration);
  if(heavy){const low=ctx.createOscillator();low.frequency.setValueAtTime(explosion?85:130,now);low.frequency.exponentialRampToValueAtTime(35,now+duration);low.connect(gain);low.start();low.stop(now+duration);low.onended=()=>low.disconnect();}
  source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();pan.disconnect();this.voices--;};
 }
 update(sim:Simulation,listener:Vec){
  if(!this.context)return;const ctx=this.context,t=ctx.currentTime;ctx.listener.positionX.value=listener.x;ctx.listener.positionY.value=14;ctx.listener.positionZ.value=listener.z-12;
  const vehicles=sim.squads.filter(q=>q.role==='vehicle');for(let i=0;i<this.engines.length;i++){const q=vehicles[i],e=this.engines[i];if(!q)continue;const d=Math.hypot(q.x-listener.x,q.z-listener.z);e.gain.gain.setTargetAtTime(q.dead?0:.024/(1+d/18),t,.2);e.osc.frequency.setTargetAtTime(38+q.speed*9,t,.12);e.pan.pan.setTargetAtTime(Math.max(-.8,Math.min(.8,(q.x-listener.x)/40)),t,.15);}
  if(t>this.musicTime&&sim.phase!=='ended'){this.musicTime=t+5.5;const notes=[110,146.83,164.81,220],note=notes[Math.floor(sim.time/10)%4];this.tone(note,t,3.8,.011);this.tone(note*1.5,t+.15,3.4,.006);}
 }
}
