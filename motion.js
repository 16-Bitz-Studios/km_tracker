/* TruckLedger micro-interactions: tiny native animations, no dependencies.
   All animations stop immediately with Reduced Motion enabled. */
'use strict';
const MOTION=(()=>{
 let previousTab=null,frame=0;
 const currency=new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'});
 const reduce=()=>Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
 function render(container,markup,tab){
  const prior=new Map();
  if(previousTab===tab){
   for(const node of container.querySelectorAll('[data-counter]')){
    prior.set(node.dataset.counter,Number(node.dataset.counterValue));
   }
  }
  if(frame&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(frame);
  frame=0;
  const tabs=['dashboard','trips','expenses','companies','investment','data'];
  const from=tabs.indexOf(previousTab),to=tabs.indexOf(tab);
  const direction=from<0||to<0||from===to?'settle':to>from?'forward':'backward';
  container.innerHTML='<div class="screen-stage" data-enter="'+direction+'" data-view="'+(tabs.includes(tab)?tab:'dashboard')+'">'+markup+'</div>';
  previousTab=tab;
  if(reduce()||document.hidden||!window.requestAnimationFrame)return;
  const animations=[];
  for(const node of container.querySelectorAll('[data-counter]')){
   const start=prior.get(node.dataset.counter),end=Number(node.dataset.counterValue);
   if(!Number.isFinite(start)||!Number.isFinite(end)||Math.abs(start-end)<0.005)continue;
   animations.push({node,start,end});
   node.textContent=currency.format(start);
  }
  if(!animations.length)return;
  let first=null;
  const step=time=>{
   if(first===null)first=time;
   const progress=Math.min(1,(time-first)/780);
   const eased=1-Math.pow(1-progress,3);
   for(const item of animations){
    if(item.node.isConnected)item.node.textContent=currency.format(item.start+(item.end-item.start)*eased);
   }
   if(progress<1)frame=requestAnimationFrame(step);
   else{for(const item of animations){if(item.node.isConnected)item.node.textContent=currency.format(item.end);}frame=0;}
  };
  frame=requestAnimationFrame(step);
 }
 return {render,reduce};
})();