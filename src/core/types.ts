export type Team = 0 | 1;
export type Role = 'rifle' | 'assault' | 'mg' | 'at' | 'vehicle';
export type Order = 'hold' | 'move' | 'capture' | 'attack' | 'retreat';
export type State = 'idle' | 'move' | 'capture' | 'attack' | 'defend' | 'retreat' | 'regroup';
export interface Vec { x: number; z: number }
export interface Soldier extends Vec { id:number; squad:number; team:Team; slot:number; hp:number; maxHp:number; angle:number; speed:number; phase:number; cooldown:number; firing:number; hit:number; deadTime:number; suppression:number; ammo:number; reload:number }
export interface Squad extends Vec { id:number; team:Team; role:Role; name:string; members:number[]; order:Order; state:State; goal:Vec; path:Vec[]; waypoint:number; angle:number; turret:number; speed:number; target:number; captureTarget:number; suppression:number; ability:number; dead:boolean; respawn:number; healTime:number; routeTime:number }
export interface Objective extends Vec { id:number; name:string; label:string; owner:Team | -1; progress:number; capturing:Team | -1; contested:boolean }
export interface BattleEvent { type:'shot'|'impact'|'death'|'capture'|'reinforce'|'order'|'end'; x:number; z:number; team:Team; tx?:number; tz?:number; role?:Role; damage?:number; value?:number }
export interface Stats { lost:number; kills:number; captured:number; reinforced:number }
export const ROLE:Record<Role,{name:string;short:string;range:number;damage:number;interval:number;speed:number;hp:number;icon:string;description:string}> = {
 rifle:{name:'فرقة بنادق',short:'بنادق',range:20,damage:13,interval:1.35,speed:3.6,hp:100,icon:'rifle',description:'متوازنة • سيطرة ومناورة'},
 assault:{name:'فرقة اقتحام',short:'اقتحام',range:14,damage:16,interval:0.88,speed:4.5,hp:105,icon:'assault',description:'سريعة • قوية من مسافة قريبة'},
 mg:{name:'فرقة إسناد',short:'رشاش',range:27,damage:9,interval:0.62,speed:2.9,hp:100,icon:'mg',description:'مدى بعيد • تثبيت العدو'},
 at:{name:'فرقة مضاد دروع',short:'مضاد دروع',range:24,damage:12,interval:1.5,speed:3.2,hp:100,icon:'at',description:'صواريخ • مواجهة المركبات'},
 vehicle:{name:'مدرعة رِمال',short:'مدرعة',range:29,damage:33,interval:1.25,speed:5.7,hp:620,icon:'vehicle',description:'إسناد متحرك • لا تحتل المواقع'}
};
export const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export const distance=(a:Vec,b:Vec)=>Math.hypot(a.x-b.x,a.z-b.z);
export const angleDelta=(a:number,b:number)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export function randomGenerator(seed:number){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
