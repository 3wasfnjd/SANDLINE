import assert from 'node:assert/strict';
import { Simulation } from '../src/core/simulation';
import { Navigation } from '../src/core/navigation';
import { blocked,BASES,POINTS,coverAt } from '../src/core/map';
import { distance } from '../src/core/types';

const nav=new Navigation();
for(const base of BASES)for(const point of POINTS){const path=nav.path(base,point);assert(path.length>0);assert(distance(path.at(-1)!,point)<3);for(const p of path)assert(!blocked(p.x,p.z));}
assert(coverAt({x:-26,z:-6},{x:-26,z:4})>coverAt({x:-26,z:-6},{x:-26,z:-14}),'Cover must be directional');
const capture=new Simulation(1);capture.start();capture.commanderTime=10000;
capture.issue([0,1],'capture',POINTS[0]);
for(let i=0;i<1800;i++){capture.update(1/30);capture.events=[];}
assert.equal(capture.points[0].owner,0,'Player must be able to reach and capture the village');
assert(capture.squads[0].x<-20,'Movement order must reach the flank');
capture.soldiers[0].hp=20;capture.issue([0],'retreat');
for(let i=0;i<1800;i++){capture.update(1/30);capture.events=[];}
assert(capture.strength(capture.squads[0])>.95,'Retreat must restore health');
assert.equal(capture.squads[0].order,'hold','Recovery must end retreat');

const results=[];
for(const seed of [31,57,99]){
 const sim=new Simulation(seed);sim.aiPlayer=true;sim.start();const started=performance.now();let maxEventCount=0;
 while(sim.phase==='playing'){
  sim.update(1/30);maxEventCount=Math.max(maxEventCount,sim.events.length);sim.events=[];
  assert(sim.soldiers.every(s=>Number.isFinite(s.x)&&Number.isFinite(s.z)&&s.hp<=s.maxHp));
  assert(sim.time<422,'Match must terminate');
 }
 assert(sim.totalShots>300,'Both armies must actually engage');
 assert(sim.stats[0].lost+sim.stats[1].lost>8,'Damage and death must occur');
 assert(sim.stats[0].captured+sim.stats[1].captured>=2,'Commander must contest the objectives');
 assert(sim.stats[0].reinforced+sim.stats[1].reinforced>0,'Eliminated squads must be reinforced');
 results.push({seed,duration:Math.round(sim.time),winner:sim.winner,tickets:sim.tickets.map(Math.ceil),shots:sim.totalShots,losses:sim.stats.map(s=>s.lost),captures:sim.stats.map(s=>s.captured),wallMs:Math.round(performance.now()-started),maxEventCount});
}
// Deliberately abandoning the field must produce a loss through territorial bleed.
const idle=new Simulation(888);idle.start();while(idle.phase==='playing'){idle.update(1/30);idle.events=[];}
assert.equal(idle.winner,1,'An inactive player should lose to the commander');
const reset=new Simulation(5);assert.equal(reset.phase,'intro');assert.deepEqual(reset.tickets,[500,500]);assert.equal(reset.soldiers.filter(s=>s.hp>0).length,62);
const tactical=[];
for(const plan of [[0,0,2,2,0,2],[0,0,0,2,0,0]]){
 const sim=new Simulation(427);sim.start();let ticks=0;
 while(sim.phase==='playing'){
  if(ticks%90===0)for(const q of sim.squads.filter(q=>q.team===0&&!q.dead)){
   if(q.order==='hold')sim.issue([q.id],'capture',sim.points[plan[q.id]]);
   if(sim.strength(q)<.3&&q.order!=='retreat')sim.issue([q.id],'retreat');
  }
  sim.update(1/30);sim.events=[];ticks++;
 }
 tactical.push({plan,winner:sim.winner,duration:Math.round(sim.time),tickets:sim.tickets.map(Math.ceil),stats:sim.stats});
}
assert.equal(tactical[0].winner,0,'A distributed two-flank strategy must be able to win');
assert.equal(tactical[1].winner,1,'Overconcentration must not replace territory control');
const timeout=new Simulation(1);timeout.duration=1;timeout.start();for(let i=0;i<31;i++)timeout.update(1/30);assert.equal(timeout.phase,'ended');assert.equal(timeout.winner,-1,'Tied time limit has a defined draw');
console.log(JSON.stringify({passed:true,fullMatches:results,tactical,idleLoss:{time:Math.round(idle.time),winner:idle.winner},timeLimitDraw:true,reset:true},null,2));
