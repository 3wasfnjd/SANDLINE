import {OBSTACLES,POINTS} from '../core/map';
/** Authored night palette: preserve material value differences and faction accents. */
export function nightColor(r:number,g:number,b:number):[number,number,number]{
 const value=r*.3+g*.5+b*.2;
 return [value*.48+r*.08,value*.61+g*.07,value*.79+b*.06];
}
export const NIGHT_LAMPS=[
 ...OBSTACLES.filter(o=>o.kind==='building').slice(0,7).map(o=>({x:o.x+o.w/2+.35,z:o.z-1,radius:4.2})),
 ...POINTS.map(p=>({x:p.x+3,z:p.z+3,radius:3.6})),
 {x:-5,z:-32,radius:5},{x:5,z:32,radius:5}
];
