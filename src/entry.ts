import './briefing.css';
import {loading} from './ui/loading';
// Let the poster paint before downloading and evaluating the 3D engine.
loading.paint().then(()=>import('./main')).catch(error=>{
 console.error('Application bundle could not load',error);
 loading.progress(0,'تعذّر تحميل اللعبة · تحقق من الاتصال وأعد المحاولة');
 const button=document.getElementById('deploy-button') as HTMLButtonElement|null;
 if(button){button.disabled=false;button.textContent='إعادة المحاولة';button.onclick=()=>location.reload();}
});
