import {Simulation} from '../src/core/simulation';
const results=[];
for(const count of [30,60,100,200,300,500]){
 const sim=new Simulation(813,count);sim.aiPlayer=true;sim.start();sim.duration=600;const times:number[]=[];let events=0;
 for(let frame=0;frame<2700;frame++){const start=performance.now();sim.update(1/30);times.push(performance.now()-start);events+=sim.events.length;sim.events=[];}
 times.sort((a,b)=>a-b);results.push({combatants:sim.soldiers.length,simulatedSeconds:90,shots:sim.totalShots,combatEvents:events,stepMs:{median:+times[Math.floor(times.length*.5)].toFixed(3),p95:+times[Math.floor(times.length*.95)].toFixed(3),max:+times.at(-1)!.toFixed(3)},note:'CPU simulation only; not a mobile GPU FPS measurement'});
}
console.log(JSON.stringify({environment:'Node.js on the execution host',results},null,2));
