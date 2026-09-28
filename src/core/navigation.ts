import { MAP,blocked } from './map';
import { Vec } from './types';
export class Navigation {
 readonly cols=54; readonly rows=44;
 readonly cells:Uint8Array;
 constructor(readonly vehicle=false){this.cells=new Uint8Array(this.cols*this.rows);for(let i=0;i<this.cells.length;i++){const p=this.position(i);this.cells[i]=blocked(p.x,p.z,vehicle)?1:0;}}
 position(i:number):Vec{return{x:MAP.minX+(i%this.cols)*2,z:MAP.minZ+Math.floor(i/this.cols)*2};}
 index(p:Vec){const x=Math.round((p.x-MAP.minX)/2),z=Math.round((p.z-MAP.minZ)/2);return Math.max(0,Math.min(this.rows-1,z))*this.cols+Math.max(0,Math.min(this.cols-1,x));}
 nearest(p:Vec){let i=this.index(p);if(!this.cells[i])return i;let best=i,bd=1e9;for(let j=0;j<this.cells.length;j++){if(this.cells[j])continue;const a=this.position(j),d=(a.x-p.x)**2+(a.z-p.z)**2;if(d<bd){bd=d;best=j;}}return best;}
 path(from:Vec,to:Vec):Vec[]{
  const start=this.nearest(from),end=this.nearest(to);if(start===end)return[this.position(end)];
  const n=this.cells.length,g=new Float32Array(n).fill(Infinity),f=new Float32Array(n).fill(Infinity),parent=new Int32Array(n).fill(-1),closed=new Uint8Array(n),open=[start];g[start]=0;
  const heuristic=(i:number)=>Math.hypot(i%this.cols-end%this.cols,Math.floor(i/this.cols)-Math.floor(end/this.cols));f[start]=heuristic(start);
  while(open.length){let bi=0;for(let k=1;k<open.length;k++)if(f[open[k]]<f[open[bi]])bi=k;const cur=open.splice(bi,1)[0];if(cur===end){const raw:Vec[]=[];let p=end;while(p!==start&&p!==-1){raw.push(this.position(p));p=parent[p];}raw.reverse();return this.smooth(from,raw);}
   closed[cur]=1;const cx=cur%this.cols,cz=Math.floor(cur/this.cols);
   for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dz)continue;const x=cx+dx,z=cz+dz;if(x<0||x>=this.cols||z<0||z>=this.rows)continue;const next=z*this.cols+x;if(this.cells[next]||closed[next])continue;if(dx&&dz&&(this.cells[cz*this.cols+x]||this.cells[z*this.cols+cx]))continue;const cost=g[cur]+(dx&&dz?1.414:1);if(cost<g[next]){if(!Number.isFinite(g[next]))open.push(next);g[next]=cost;parent[next]=cur;f[next]=cost+heuristic(next);}}
  }return [this.position(start)];
 }
 clear(a:Vec,b:Vec){const steps=Math.ceil(Math.hypot(a.x-b.x,a.z-b.z));for(let i=0;i<=steps;i++){const t=i/Math.max(1,steps);if(blocked(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,this.vehicle))return false;}return true;}
 smooth(start:Vec,p:Vec[]){const out:Vec[]=[];let a=start,i=0;while(i<p.length){let j=i;while(j+1<p.length&&this.clear(a,p[j+1]))j++;out.push(p[j]);a=p[j];i=j+1;}return out;}
}
export class SpatialGrid<T extends Vec>{
 private cells=new Map<number,T[]>(); constructor(readonly size=5){}
 key(x:number,z:number){return (Math.floor(x/this.size)+256)*1024+Math.floor(z/this.size)+256;}
 rebuild(items:T[]){this.cells.clear();for(const item of items){const k=this.key(item.x,item.z);const list=this.cells.get(k);if(list)list.push(item);else this.cells.set(k,[item]);}}
 query(p:Vec,r:number):T[]{const result:T[]=[];for(let x=Math.floor((p.x-r)/this.size);x<=Math.floor((p.x+r)/this.size);x++)for(let z=Math.floor((p.z-r)/this.size);z<=Math.floor((p.z+r)/this.size);z++){const list=this.cells.get((x+256)*1024+z+256);if(list)for(const item of list)if((item.x-p.x)**2+(item.z-p.z)**2<r*r)result.push(item);}return result;}
}
