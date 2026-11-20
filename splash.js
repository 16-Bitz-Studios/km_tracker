/* TruckLedger brand launch: immediate first paint and a deliberate, smooth exit.
   Visual-only overlay; no data access or user input interception. */
'use strict';
const SPLASH=(()=>{
 const MIN_VISIBLE_MS=1450;
 const MAX_VISIBLE_MS=3100;
 const FADE_MS=430;
 const node=()=>document.getElementById('launch-splash');
 const now=()=>typeof performance!=='undefined'&&performance.now?performance.now():Date.now();
 const reduced=()=>Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
 const started=now();
 let leaving=false,readyTimer=0;
 function exit(){
  if(leaving)return;
  leaving=true;
  const screen=node();if(!screen)return;
  screen.classList.add('is-exiting');
  window.setTimeout(()=>{
   screen.hidden=true;
   screen.remove();
  },reduced()?0:FADE_MS);
 }
 function ready(){
  if(leaving||readyTimer)return;
  const remaining=reduced()?0:Math.max(0,MIN_VISIBLE_MS-(now()-started));
  readyTimer=window.setTimeout(exit,remaining);
 }
 // Fallback if IndexedDB, other scripts, or the service worker take too long.
 // CSS also has its own no-JS safety fade.
 window.setTimeout(exit,MAX_VISIBLE_MS);
 return {ready,visibleDuration:MIN_VISIBLE_MS};
})();