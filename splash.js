/* TruckLedger fast first-paint splash. Pure visual: no database, forms or navigation. */
'use strict';
const SPLASH=(()=>{
 const node=()=>document.getElementById('launch-splash');
 let leaving=false;
 const started=typeof performance!=='undefined'&&performance.now?performance.now():Date.now();
 const reduced=()=>Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
 const now=()=>typeof performance!=='undefined'&&performance.now?performance.now():Date.now();
 function ready(){
  if(leaving)return;
  leaving=true;
  const screen=node();if(!screen)return;
  // A quick branded welcome, not a blocking launch delay. Reduce Motion skips it.
  const remaining=reduced()?0:Math.max(0,330-(now()-started));
  window.setTimeout(()=>{
   screen.classList.add('is-exiting');
   window.setTimeout(()=>{screen.hidden=true;screen.remove();},reduced()?0:280);
  },remaining);
 }
 // Even a failed app script must not leave a permanent overlay.
 window.setTimeout(ready,2800);
 return {ready};
})();