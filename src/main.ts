import './style.css';
import {Engine,WebGPUEngine,Scene,ArcRotateCamera,Camera,Vector3,ImageProcessingConfiguration,AbstractEngine,Mesh} from './render/babylon';
import {Simulation} from './core/simulation';
import {Order,Vec} from './core/types';
import {World} from './render/world';
import {UnitRenderer} from './render/units';
import {Effects} from './render/effects';
import {AudioSystem} from './render/audio';
import {HUD} from './ui/hud';
import {BattlefieldInput} from './input';
import {CompatibilityEngine,SoftwareRenderer} from './render/software';
import {Vegetation} from './render/vegetation';
import {Weather} from './render/weather';

let startupBackend='initializing';
let startupStage='engine';
async function boot(){
 let canvas=document.querySelector('#battlefield') as HTMLCanvasElement;canvas.setAttribute('aria-label','ساحة معركة خط الرمل');
 canvas.addEventListener('webglcontextcreationerror',event=>console.warn('Graphics context unavailable:',(event as WebGLContextEvent).statusMessage));
 let engine:AbstractEngine;let backend='WebGL2';let software:SoftwareRenderer|undefined;
 const fallbackEngine=()=>{try{return new Engine(canvas,true,{stencil:true,preserveDrawingBuffer:false,powerPreference:'default',failIfMajorPerformanceCaveat:false},false);}catch{backend='Canvas compatibility';return new CompatibilityEngine();}};
 // WebGL2 remains the mobile baseline. Desktop WebGPU is feature detected and
 // an initialization failure immediately falls back to the mature WebGL renderer.
 if(new URLSearchParams(location.search).get('renderer')!=='webgl'&&!matchMedia('(pointer:coarse)').matches&&await WebGPUEngine.IsSupportedAsync.catch(()=>false)){try{const gpu=new WebGPUEngine(canvas,{antialias:true,adaptToDeviceRatio:false});await gpu.initAsync();engine=gpu;backend='WebGPU';}catch(error){console.warn('WebGPU initialization unavailable; using WebGL2',error);const fallback=canvas.cloneNode(false) as HTMLCanvasElement;canvas.replaceWith(fallback);canvas=fallback;engine=fallbackEngine();}}
 else engine=fallbackEngine();
 startupBackend=backend;startupStage='environment';
 let qualityLevel=2;engine.setHardwareScalingLevel(1/Math.min(devicePixelRatio,1.5));
 const scene=new Scene(engine);scene.skipPointerMovePicking=true;scene.autoClear=true;scene.imageProcessingConfiguration.toneMappingEnabled=true;scene.imageProcessingConfiguration.toneMappingType=ImageProcessingConfiguration.TONEMAPPING_ACES;scene.imageProcessingConfiguration.exposure=1.15;scene.imageProcessingConfiguration.contrast=1.15;
 const camera=new ArcRotateCamera('command camera',-Math.PI/2-.16,.79,120,new Vector3(-11,1,-4),scene);camera.mode=Camera.ORTHOGRAPHIC_CAMERA;camera.minZ=.1;camera.maxZ=400;camera.inputs.clear();camera.inertia=0;
 const world=new World(scene);await world.loadScenery();const vegetation=new Vegetation(scene);
 if(engine instanceof CompatibilityEngine)software=new SoftwareRenderer(scene,canvas,scene.meshes.filter(m=>m instanceof Mesh) as Mesh[]);
 const weather=new Weather(scene,world,Boolean(software));
 const units=new UnitRenderer(scene),effects=new Effects(scene),audio=new AudioSystem();let sim=new Simulation(),paused=false,ready=false,elapsed=0,environmentTime=0,accumulator=0,last=performance.now(),qualityTimer=0,frameSamples:number[]=[],renderSamples:number[]=[],lastUI=0;
 let hud:HUD,input:BattlefieldInput;
 function select(id:number,multi=false){const q=sim.squads[id];if(!q||q.team!==0||q.dead||sim.phase!=='playing')return;if(multi){sim.selected=sim.selected.includes(id)?sim.selected.filter(i=>i!==id):[...sim.selected,id];}else sim.selected=[id];audio.radio();}
 function ordered(p:Vec,kind:string){effects.order(p.x,p.z);audio.radio();if(kind==='retreat')hud.notice('انسحاب إلى القاعدة · التعافي ثم العودة إلى الجبهة');else if(kind==='move')hud.notice('تحرّك إلى الموضع المحدد');else if(kind==='attack')hud.notice('أمر اشتباك مباشر');}
 function start(){if(!ready)return;sim=new Simulation(Math.floor(Math.random()*100000));sim.start();paused=false;accumulator=0;effects.particles=[];effects.tracers=[];input.center={x:0,z:window.innerHeight<500&&window.innerWidth>window.innerHeight?-19:-11};input.desiredSpan=116;hud.reset();hud.setPhase(sim);void audio.start();}
 function restart(){start();}
 function pause(value:boolean){paused=value;audio.pause(value);accumulator=0;}
 hud=new HUD({start,restart,pause,mute:()=>audio.toggle(),select,order:(order)=>{sim.issue(sim.selected,order);ordered({x:0,z:order==='retreat'?-35:0},order);},ability:()=>{sim.ability(sim.selected);hud.notice('تماسك · استعادة المعنويات وإسناد ناري مكثف');audio.radio();},selectAll:()=>{sim.selected=sim.squads.filter(q=>q.team===0&&!q.dead).map(q=>q.id);},focus:p=>input.focus(p),zoom:d=>input.zoom(d)});
 input=new BattlefieldInput(canvas,scene,camera,()=>sim,select,ordered,()=>hud.multi,()=>hud.togglePause(),()=>paused||!ready);input.center={x:-12,z:-3};input.span=input.desiredSpan=103;
 // The opening shot uses the actual battlefield and the same unit renderer.
 for(const q of sim.squads){const positions=[[-26,0],[-10,-10],[-2,-10],[6,-9],[-17,-16],[0,-17]],p=q.team===0?positions[q.id]:[q.x,q.z-7];q.x=p[0];q.z=p[1];for(const id of q.members){const s=sim.soldiers[id];s.x=q.x+(s.slot%3-1)*1.3;s.z=q.z-Math.floor(s.slot/3)*1.4;}}
 startupStage='units';await units.load();startupStage='shaders';if(!software)await scene.whenReadyAsync();
 startupStage='first-frame';ready=true;hud.ready();hud.setPhase(sim);input.update(1);if(!software)units.update(sim,0);scene.render();world.freezeShadows();
 const requestedStress=import.meta.env.DEV?Number(new URLSearchParams(location.search).get('stress')):0;
 const stress=import.meta.env.DEV&&[30,60,100,200,300,500].includes(requestedStress)?requestedStress:0;
 let stressOutput:HTMLElement|undefined,lastStressBurst=0;
 if(import.meta.env.DEV&&stress){sim=new Simulation(813,stress);sim.aiPlayer=true;sim.start();sim.duration=120;input.center={x:0,z:0};input.span=input.desiredSpan=122;hud.root.style.display='none';stressOutput=document.createElement('output');stressOutput.setAttribute('aria-label','Stress scene results');stressOutput.style.cssText='position:fixed;bottom:12px;left:12px;background:#142c2eea;color:#e8e5cb;padding:14px;font:12px monospace;white-space:pre;direction:ltr;z-index:100;pointer-events:none';document.body.append(stressOutput);}
 function applyQuality(){const scale=[.75,1,Math.min(devicePixelRatio,1.5)][qualityLevel];engine.setHardwareScalingLevel(1/scale);effects.quality=[.5,.75,1][qualityLevel];weather.setQuality([.4,.7,1][qualityLevel]);if(qualityLevel===0){world.shadows.getShadowMap()!.resize(512);world.freezeShadows();}engine.resize();}
 const finishFrame=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
 registerTools(()=>sim,{start,restart,pause,ready:()=>ready,after:finishFrame,orders:(ids,order,p,target)=>{sim.selected=ids;sim.issue(ids,order,p,target);if(p)ordered(p,order);},performance:()=>({backend,quality:['low','medium','high'][qualityLevel],fps:Math.round(1000/(renderSamples.reduce((n,a)=>n+a,0)/Math.max(1,renderSamples.length))),visibleIndividuals:sim.soldiers.filter(s=>s.hp>0&&sim.visible(sim.squads[s.squad])).length})});
 engine.runRenderLoop(()=>{
  const now=performance.now(),raw=(now-last)/1000;last=now;const dt=Math.min(raw,.075);elapsed+=dt;
  if(document.hidden)return;
  if(!paused&&sim.phase==='playing'){accumulator+=dt;let steps=0;while(accumulator>=1/30&&steps<4){sim.update(1/30);accumulator-=1/30;steps++;}for(const event of sim.events){effects.event(event);audio.event(event,input.center);if(event.type==='capture')hud.notice(event.team===0?`سيطرنا على ${sim.points[event.value!].name}`:`الفيلق النحاسي يسيطر على ${sim.points[event.value!].name}`);if(event.type==='reinforce'&&event.team===0)hud.notice('وصلت فرقة بديلة إلى القاعدة');}sim.events=[];}
  if(sim.phase==='intro'){input.center.x=-12+(software?0:Math.sin(elapsed*.07)*4);input.center.z=-3+(software?0:Math.cos(elapsed*.06)*2);const q=sim.squads[5];q.x=-3+Math.sin(elapsed*.18)*9;q.z=-17;q.angle=Math.cos(elapsed*.18)>0?Math.PI/2:-Math.PI/2;q.turret=q.angle;q.speed=1.6;const s=sim.soldiers[q.members[0]];s.x=q.x;s.z=q.z;s.hp=s.maxHp;}
  if(sim.phase==='ended')input.desiredSpan=137;
  input.update(software?1:dt);if(!paused)environmentTime+=dt;weather.update(environmentTime,paused?0:dt,input.center,input.span);if(!software)vegetation.update(environmentTime,weather.state.wind);world.update(environmentTime);audio.weather(weather.state.rain,weather.state.wind);for(const p of sim.points)world.setPoint(p.id,p.owner,p.progress,p.contested);
  if(!software)units.update(sim,paused?sim.time:elapsed,input.span>128?2:input.span>100?1:0);if(!paused)effects.update(dt,elapsed,camera,sim);audio.update(sim,input.center);
  scene.render();software?.draw(sim,effects,elapsed,weather,environmentTime);if(now-lastUI>50){if(!stress)hud.update(sim,scene,now);lastUI=now;}
  if(import.meta.env.DEV&&stressOutput){if(sim.time-lastStressBurst>7){lastStressBurst=sim.time;effects.event({type:'death',x:20,z:0,team:0,role:'vehicle'});}stressOutput.textContent=JSON.stringify({mode:'internal stress scene',renderer:backend,combatants:stress,seconds:Math.floor(sim.time),shots:sim.totalShots,particles:effects.particles.length,fps:Math.round(1000/(renderSamples.reduce((n,x)=>n+x,0)/Math.max(1,renderSamples.length)))},null,2);}
  if(raw<.5&&raw>.002){renderSamples.push(raw*1000);if(renderSamples.length>180)renderSamples.shift();}
  if(sim.phase==='playing'&&sim.time>6&&!paused&&raw<.3){frameSamples.push(raw);qualityTimer+=dt;if(qualityTimer>5){const avg=frameSamples.reduce((n,x)=>n+x,0)/frameSamples.length;frameSamples=[];qualityTimer=0;if(avg>.037&&qualityLevel>0){qualityLevel--;applyQuality();}}}
 });
 window.addEventListener('resize',()=>{engine.resize();input.update(1);});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&sim.phase==='playing'){hud.setPause(true);}last=performance.now();accumulator=0;});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();hud.setPause(true);hud.notice('استعادة الاتصال بالرسوم…');});
 canvas.addEventListener('webglcontextrestored',()=>{world.freezeShadows();hud.notice('عادت ساحة المعركة · تابع عندما تكون مستعدًا');});
}

type ToolsActions={start:()=>void;restart:()=>void;pause:(b:boolean)=>void;ready:()=>boolean;after:()=>Promise<void>;orders:(ids:number[],order:Order,p?:Vec,target?:number)=>void;performance:()=>object};
function registerTools(getSim:()=>Simulation,a:ToolsActions){
 const context=(document as Document&{modelContext?:{registerTool:(tool:object,options:object)=>void|Promise<void>}}).modelContext;if(!context?.registerTool)return;const lifecycle=new AbortController();window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
 const empty={type:'object',properties:{},additionalProperties:false};
 const validateObject=(input:unknown)=>{if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Expected an object');return input as Record<string,unknown>;};
 const definitions=[
  {name:'read_match',title:'Read the battlefield',description:'Read the current visible battlefield, squad IDs, control points, tickets and match state. Enemy squads outside reconnaissance range are omitted.',inputSchema:empty,annotations:{readOnlyHint:true},execute:async(input:unknown)=>{if(Object.keys(validateObject(input)).length)throw new Error('No parameters accepted');return{...getSim().snapshot(),performance:a.performance()};}},
  {name:'start_match',title:'Start the battle',description:'Start the seven-minute player-versus-AI match from the opening scene, as the Play button does.',inputSchema:empty,execute:async(input:unknown)=>{if(Object.keys(validateObject(input)).length)throw new Error('No parameters accepted');if(!a.ready()||getSim().phase!=='intro')throw new Error('Match can only start from the ready opening scene');a.start();await a.after();return getSim().snapshot();}},
  {name:'issue_orders',title:'Command player squads',description:'Select friendly squads and order movement, capture, attack, hold, or retreat. Coordinates use the battlefield map; capture points and visible enemies can be read with read_match.',inputSchema:{type:'object',properties:{squadIds:{type:'array',items:{type:'integer',minimum:0,maximum:5},minItems:1,maxItems:6},order:{type:'string',enum:['move','capture','attack','hold','retreat']},x:{type:'number',minimum:-52,maximum:52},z:{type:'number',minimum:-42,maximum:42},targetId:{type:'integer',minimum:6,maximum:11}},required:['squadIds','order'],additionalProperties:false},execute:async(input:unknown)=>{const v=validateObject(input),sim=getSim();if(sim.phase!=='playing')throw new Error('Battle is not active');if(Object.keys(v).some(k=>!['squadIds','order','x','z','targetId'].includes(k)))throw new Error('Unknown field');if(!Array.isArray(v.squadIds)||!v.squadIds.length||v.squadIds.length>6||v.squadIds.some(id=>!Number.isInteger(id)||id<0||id>5||sim.squads[id].dead))throw new Error('Select living friendly squads');if(!['move','capture','attack','hold','retreat'].includes(String(v.order)))throw new Error('Invalid order');let p:Vec|undefined;let target=-1;if(v.order==='move'||v.order==='capture'){if(typeof v.x!=='number'||typeof v.z!=='number'||!Number.isFinite(v.x)||!Number.isFinite(v.z)||Math.abs(v.x)>52||Math.abs(v.z)>42)throw new Error('Valid map coordinates required');p={x:v.x,z:v.z};}if(v.order==='attack'){if(typeof v.targetId!=='number'||!Number.isInteger(v.targetId))throw new Error('Enemy target required');const q=sim.squads[v.targetId];if(!q||q.team!==1||q.dead||!sim.visible(q))throw new Error('Target must be a visible living enemy');p=q;target=q.id;}a.orders([...new Set(v.squadIds)] as number[],v.order as Order,p,target);await a.after();return sim.snapshot();}},
  {name:'pause_match',title:'Pause or resume battle',description:'Pause or resume the active match, matching the pause button.',inputSchema:{type:'object',properties:{paused:{type:'boolean'}},required:['paused'],additionalProperties:false},execute:async(input:unknown)=>{const v=validateObject(input);if(typeof v.paused!=='boolean'||Object.keys(v).length!==1||getSim().phase!=='playing')throw new Error('An active match and a boolean paused are required');a.pause(v.paused);await a.after();return{paused:v.paused};}},
  {name:'restart_match',title:'Start a new battle',description:'Discard the current or completed match and start a new seven-minute battle, matching New Battle.',inputSchema:empty,execute:async(input:unknown)=>{if(Object.keys(validateObject(input)).length)throw new Error('No parameters accepted');if(!a.ready())throw new Error('Not loaded');a.restart();await a.after();return getSim().snapshot();}}
 ];
 for(const tool of definitions)try{void Promise.resolve(context.registerTool({...tool,annotations:{readOnlyHint:false,untrustedContentHint:false,...tool.annotations}},{signal:lifecycle.signal})).catch(e=>console.warn('Optional tool registration unavailable',e));}catch(e){console.warn('Optional tool registration unavailable',e);}
}
boot().catch(error=>{
 console.error('Game initialization failed',startupBackend,startupStage,error);
 // Retry the complete startup in a fresh document: no stale GPU context, scene,
 // input listeners or UI from the failed attempt can survive into WebGL.
 if(startupBackend==='WebGPU'){
  const retry=new URL(location.href);retry.searchParams.set('renderer','webgl');
  location.replace(retry.href);return;
 }
 const box=document.createElement('div');box.className='error-screen';
 const title=document.createElement('h1');title.textContent='خط الرمل';
 const message=document.createElement('p');message.textContent='تعذّر إكمال تحميل ساحة المعركة. أعد المحاولة، وإذا استمرت المشكلة أرسل لنا تفاصيل الخطأ أدناه.';
 const details=document.createElement('details'),label=document.createElement('summary'),detail=document.createElement('pre');
 label.textContent='تفاصيل الخطأ';detail.style.cssText='direction:ltr;white-space:pre-wrap;font-size:12px;max-width:85vw;overflow-wrap:anywhere';
 detail.textContent=`${startupBackend} / ${startupStage}\n${error instanceof Error?error.message:String(error)}`;
 details.append(label,detail);
 const retry=document.createElement('button');retry.className='primary-button';retry.textContent='إعادة المحاولة';retry.onclick=()=>location.reload();
 box.append(title,message,details,retry);document.querySelector('#ui')!.replaceChildren(box);
});
