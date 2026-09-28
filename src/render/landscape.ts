// Layered terrain, inspired by Motri's soil / vegetation / water data masks.
// The tactical height field and route layout remain authoritative in core/map.
import {clamp} from '../core/types';

const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
function hash(x:number,z:number){const n=Math.sin(x*127.1+z*311.7)*43758.5453123;return n-Math.floor(n);}
export function noise(x:number,z:number){const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz,u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz);return mix(mix(hash(ix,iz),hash(ix+1,iz),u),mix(hash(ix,iz+1),hash(ix+1,iz+1),u),v);}
export function vegetationAt(x:number,z:number){
 const oasis=Math.exp(-((x+42)**2/120+(z+14)**2/100));
 const eastBank=Math.exp(-((x-40)**2/40+(z-4)**2/210));
 const terraces=Math.exp(-((x+38)**2/65+(z-16)**2/70));
 return clamp(Math.max(oasis,eastBank*.8,terraces*.75)*( .72+noise(x*.36,z*.36)*.38),0,1);
}
export function surfaceColor(x:number,z:number):[number,number,number]{
 const broad=noise(x*.075,z*.075),detail=noise(x*.52,z*.52),waves=Math.sin(x*1.8+z*.63+noise(x*.15,z*.15)*7);
 const rock=Math.pow(noise(x*.13+19,z*.13-4),3)*.62;
 const vegetation=clamp((vegetationAt(x,z)-.16)*1.25,0,.8);
 const wadi=Math.exp(-((x-24-3*Math.sin(z*.1))**2)/25)*.26;
 const sandy:[number,number,number]=[mix(.19,.29,broad),mix(.25,.35,broad),mix(.34,.45,broad)];
 const stony=[.15,.21,.28],green=[.16,.25,.24];
 const shade=.97+(detail-.5)*.065+waves*.012;
 return sandy.map((v,i)=>mix(mix(v,stony[i],rock+wadi),green[i],vegetation)*shade) as [number,number,number];
}

export interface WeatherState{cloud:number;rain:number;wind:number;wetness:number}
export function weatherAt(time:number):WeatherState{
 // A continuous light rain with slow gusts; no gameplay visibility changes.
 const gust=.5+.5*Math.sin(time*Math.PI/120);
 return {cloud:.64+gust*.2,rain:.38+gust*.25,wind:.3+noise(time*.012,3)*.4,wetness:.68+gust*.12};
}
