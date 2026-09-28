/** Lightweight shell: available before the Babylon bundle is imported. */
class LoadingScreen {
 private root=document.getElementById('loading-screen');
 private timer:number|undefined;
 private value=0;
 constructor(){
  const quotes=['في قلب العاصفة… يبدأ الحسم.','ثبّت صفوفك. اقتنص اللحظة.','كل موقع تستعيده… يغيّر المعركة.','اقرأ الأرض. التفّ على خصمك.'];let index=0;
  if(this.root)this.timer=window.setInterval(()=>{const el=document.getElementById('loading-quote');if(el)el.textContent=quotes[++index%quotes.length];},4800);
 }
 progress(value:number,label:string){
  this.value=Math.max(this.value,value);
  const bar=document.getElementById('loading-progress');bar?.setAttribute('aria-valuenow',String(this.value));
  this.root?.style.setProperty('--load',`${this.value}%`);
  const pct=document.getElementById('loading-percent'),stage=document.getElementById('loading-stage');
  if(pct)pct.textContent=String(this.value).padStart(2,'0')+'%';if(stage)stage.textContent=label;
 }
 ready(start:()=>void){
  this.progress(100,'الميدان جاهز · بانتظار أمرك');this.root?.classList.add('is-ready');
  const button=document.getElementById('deploy-button') as HTMLButtonElement|null;
  if(button){button.disabled=false;button.textContent='ابدأ المعركة';button.onclick=start;}
 }
 dismiss(){
  clearInterval(this.timer);document.getElementById('ui')?.removeAttribute('hidden');
  this.root?.classList.add('is-leaving');const root=this.root;this.root=null;window.setTimeout(()=>root?.remove(),360);
 }
 fail(){clearInterval(this.timer);this.root?.remove();this.root=null;document.getElementById('ui')?.removeAttribute('hidden');}
 paint(){return new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));}
}
export const loading=new LoadingScreen();
