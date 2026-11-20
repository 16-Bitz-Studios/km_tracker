/* TruckLedger: optional progressive-web-app polish.
   Does not touch database records or interfere with native iPhone inputs. */
'use strict';
const POLISH=(()=>{
 let hadController=false;
 let ready=false;
 const reduced=()=>Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
 const banner=()=>document.getElementById('app-update-banner');
 const feedback=()=>{
  // Navigator.vibrate is unavailable on iOS; silently use normal touch feedback there.
  if(reduced()||typeof navigator.vibrate!=='function')return;
  try{navigator.vibrate(8);}catch{}
 };
 const busyEditing=()=>{
  if(document.body.classList.contains('standalone-editing'))return true;
  if(document.querySelector('#editor')?.open)return true;
  const guide=document.getElementById('guide-overlay');
  return Boolean(guide&&!guide.hidden);
 };
 const show=()=>{
  if(!hadController)return;
  ready=true;
  const bar=banner();if(!bar)return;
  bar.hidden=false;
  const msg=bar.querySelector('[data-update-message]');
  if(msg)msg.textContent='A refreshed version of TruckLedger is ready.';
 };
 const dismiss=()=>{const bar=banner();if(bar)bar.hidden=true;};
 const refresh=()=>{
  if(!ready)return;
  if(busyEditing()){
   const msg=banner()?.querySelector('[data-update-message]');
   if(msg)msg.textContent='Save or close your current screen before refreshing. Your entries are safe.';
   return;
  }
  window.location.reload();
 };
 const onClick=event=>{
  const b=event.target.closest('button');
  if(!b)return;
  if(b.hasAttribute('data-app-update-dismiss')){dismiss();return;}
  if(b.hasAttribute('data-app-reload')){refresh();return;}
  if(b.matches('[data-nav],[data-period],[data-trip-filter],[data-new-trip],[data-new-expense],[data-new-company],[data-edit-trip],[data-edit-expense],[data-edit-company],[data-guide-action]'))feedback();
 };
 const onController=()=>{if(hadController)show();hadController=true;};
 function init(){
  document.addEventListener('click',onClick);
  if(!('serviceWorker' in navigator))return;
  hadController=Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange',onController);
 }
 function acknowledge(){
  if(reduced()||typeof navigator.vibrate!=='function')return;
  try{navigator.vibrate(12);}catch{}
 }
 init();
 return {acknowledge,show,dismiss,refresh,hasPending:()=>ready};
})();
