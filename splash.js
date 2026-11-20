/* TruckLedger animated launch using the supplied route-arrow video.
   Playback is silent and optional: a crisp still remains visible without autoplay.
   This overlay never intercepts touches or modifies stored user records. */
'use strict';
const SPLASH=(()=>{
 const MIN_VISIBLE_MS=3800;
 const MAX_VISIBLE_MS=5700;
 const FADE_MS=540;
 const node=()=>document.getElementById('launch-splash');
 const now=()=>typeof performance!=='undefined'&&performance.now?performance.now():Date.now();
 const reduced=()=>Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
 const started=now();
 let leaving=false,readyTimer=0;
 const video=()=>node()?.querySelector('.launch-video');
 function exit(){
  if(leaving)return;
  leaving=true;
  const screen=node();if(!screen)return;
  screen.classList.add('is-exiting');
  window.setTimeout(()=>{
   try{video()?.pause();}catch{}
   screen.hidden=true;
   screen.remove();
  },reduced()?0:FADE_MS);
 }
 function ready(){
  if(leaving||readyTimer)return;
  readyTimer=window.setTimeout(exit,reduced()?0:Math.max(0,MIN_VISIBLE_MS-(now()-started)));
 }
 function startVideo(){
  const screen=node(),player=video();
  if(!screen||!player)return;
  if(reduced()){player.pause();return;}
  player.muted=true;
  player.addEventListener('playing',()=>screen.classList.add('is-video-playing'),{once:true});
  player.addEventListener('error',()=>screen.classList.remove('is-video-playing'),{once:true});
  try{
   const result=player.play();
   if(result&&typeof result.catch==='function'){
    result.catch(()=>screen.classList.remove('is-video-playing'));
   }
  }catch{}
 }
 // If autoplay is denied on iOS (e.g. Low Power Mode), the still poster stays.
 try{startVideo();}catch(e){console.warn('Optional splash video unavailable',e);}
 // Failed app startup must never trap the user under a loading screen.
 window.setTimeout(exit,MAX_VISIBLE_MS);
 return {ready,visibleDuration:MIN_VISIBLE_MS};
})();