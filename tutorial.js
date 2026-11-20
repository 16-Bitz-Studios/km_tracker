/* TruckLedger first-run guide. Offline, native HTML/CSS, no external dependencies.
   This guide never opens input dialogs or alters trip, rate, receipt or cloud data. */
'use strict';
const GUIDE=(()=>{
 const MARKER='tutorial_first_open_seen';
 let current=0,visible=false,returnScroll=0,origin=null;
 const steps=[
  {icon:'↗',category:'WELCOME ABOARD',title:'Make every kilometre count.',
   summary:'TruckLedger keeps your truck mileage, earnings, expenses and client pricing together — even when you are offline.',
   points:[
    ['Work','Record a start and end odometer, client, site and the truck charges.'],
    ['Personal','Keep personal mileage separate, including automatic gaps between workdays.'],
    ['Profit','See your earnings, operating costs and long-term truck investment.']
   ],tip:'Your records are saved on this device. Backing up to Google Drive or ZIP is something you choose to do.'},
  {icon:'⚙',category:'STEP 1 · SET UP YOUR TRUCK',title:'Start with Vehicle Details.',
   summary:'Open Data → Vehicle details and enter the basics once.',
   points:[
    ['Truck name','Give your truck a name, if you want one.'],
    ['Earnings share','Set the portion of client charges you earn. The default is 85%.'],
    ['Purchase price','Optional: enter what the truck cost to track purchase recovery under Invest.']
   ],tip:'The earnings share applies to new work trips; existing trips retain their saved percentage.'},
  {icon:'▦',category:'STEP 2 · ADD CLIENTS',title:'Set up your client rates.',
   summary:'Open Clients → Add. Enter each company’s rates so work trips can pick them up automatically.',
   points:[
    ['Vehicle billing','Choose kilometres, truck hours, both, or neither.'],
    ['Fuel surcharges','Enable all methods that client permits — per km, per truck hour, flat, or percentage — and set each rate.'],
    ['Site selection','When entering a trip, choose whichever surcharge applies at that location.']
   ],tip:'Enter full client charge-out rates in the client card. TruckLedger shows only your earnings share in results.'},
  {icon:'◫',category:'STEP 3 · MORNING ROUTINE',title:'Start your work trip.',
   summary:'Open Trips → Work Trip before leaving in the morning.',
   points:[
    ['Odometer','Enter the current starting kilometres.'],
    ['Job details','Choose the client, location and what you were doing.'],
    ['Save an open trip','You can save immediately without the ending reading, then finish it later.']
   ],tip:'Kilometre fields use the iPhone number keypad. An unfinished trip does not count as completed distance or earnings.'},
  {icon:'✓',category:'STEP 4 · END OF WORK',title:'Finish the trip and check billing.',
   summary:'After work, edit that trip and enter the ending odometer.',
   points:[
    ['Actual kilometres','Calculated from the start and end readings.'],
    ['Billed kilometres','Optional: enter a different distance charged to the client, or leave blank to use actual km.'],
    ['Truck hours + fuel','Enter any truck hours, select the site’s fuel surcharge method and check what is billable.']
   ],tip:'TruckLedger saves the chosen rates with the trip. Changing the client’s rates later will not rewrite past earnings.'},
  {icon:'↝',category:'STEP 5 · PERSONAL KILOMETRES',title:'Let odometer gaps do the work.',
   summary:'TruckLedger can infer personal driving between completed workdays.',
   example:'Friday ends at 125,000 km → Monday starts at 125,050 km = 50 km inferred personal.',
   points:[
    ['Automatic','It checks for unlogged distance between workdays (up to 14 days apart).'],
    ['Manual trips','Log shopping or weekend trips yourself if you want locations and reasons. They are deducted from the automatic gap.'],
    ['Control it','Turn the feature on or off under Data → Automatic personal kilometres.']
   ],tip:'Inferred driving is an estimate, not GPS tracking. It is shown as Auto Personal, not billed to a client.'},
  {icon:'▤',category:'STEP 6 · TRACK COSTS',title:'Keep your receipts and expenses.',
   summary:'Go to Costs to add fuel, maintenance, repairs and other truck expenses.',
   points:[
    ['Fuel','Enter the purchase amount and optional fuel details.'],
    ['Maintenance','Record repairs, service and other vehicle costs.'],
    ['Receipts','Attach a photo or receipt file for your own records and auditing.']
   ],tip:'Costs reduce operating profit. Don’t also count loan principal as a vehicle expense if you are including the truck purchase price in Invest.'},
  {icon:'◈',category:'STEP 7 · SEE THE WHOLE PICTURE',title:'Understand your numbers.',
   summary:'Overview is for day-to-day performance. Invest is for the truck’s lifetime return.',
   points:[
    ['Overview','Switch between Today, Week, Month, Year and All. Explore the animated earnings and cost graphs.'],
    ['Invest','See all-time owner earnings, recorded expenses, purchase price and purchase recovery.'],
    ['Opening YTD','Already earning money before TruckLedger? Add your previous net earnings under Data → Opening YTD.']
   ],tip:'Opening YTD is already your earnings. Do not deduct the 15% again; it counts toward Year and All, not the current day/week/month.'},
  {icon:'⇩',category:'STEP 8 · KEEP IT SAFE',title:'Back up and export your records.',
   summary:'Open Data & backup regularly. The app works offline, but your records need backups.',
   points:[
    ['Google Drive','Link your own Google account, then choose Back up to Google Drive. Uploading is manual, not automatic syncing.'],
    ['Full backup ZIP','Export a restorable copy with your clients, trips, receipts and settings to Files or another safe place.'],
    ['Audit PDF','Export an easy-to-read mileage and earnings report; receipt originals remain in the ZIP.']
   ],tip:'Restore replaces the current local records. Always keep a safe copy first, and test restoration without risking important data.'},
  {icon:'✦',category:'YOU’RE READY',title:'Start tracking with confidence.',
   summary:'That’s the complete TruckLedger workflow. You can take it one trip at a time — the app handles the totals.',
   points:[
    ['First','Set your earnings share and add a client.'],
    ['Every workday','Record the start km, then finish with the end km and billable details.'],
    ['Regularly','Log costs and make a Google Drive or ZIP backup.']
   ],tip:'Need a refresher? Data & backup → View Tutorial is always available.'}
 ];
 function container(){return document.getElementById('guide-overlay');}
 function render(){
  const root=container();if(!root)return;
  const step=steps[current],last=current===steps.length-1;
  const progress=Math.round((current+1)/steps.length*100);
  const cards=step.points.map(([name,body],i)=>
   '<div class="guide-item"><span class="guide-item-number">'+String(i+1).padStart(2,'0')+'</span><div><strong>'+name+'</strong><p>'+body+'</p></div></div>').join('');
  root.innerHTML='<div class="guide-shell" role="dialog" aria-modal="true" aria-labelledby="guide-title">'+
   '<header class="guide-header"><div class="guide-brand"><span class="guide-brand-icon">↗</span><span>TRUCKLEDGER <span class="guide-brand-light">/ GUIDE</span></span></div>'+
   '<button type="button" class="guide-close" data-guide-action="skip" aria-label="Close tutorial">✕</button></header>'+
   '<div class="guide-progress-label"><span>'+step.category+'</span><span>'+String(current+1).padStart(2,'0')+' / '+String(steps.length).padStart(2,'0')+'</span></div>'+
   '<div class="guide-progress-track" role="progressbar" aria-label="Tutorial progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+progress+'"><div style="width:'+progress+'%"></div></div>'+
   '<div class="guide-scroll"><div class="guide-visual" aria-hidden="true"><span class="guide-visual-ring"></span><span class="guide-visual-icon">'+step.icon+'</span></div>'+
   '<div class="guide-copy"><h2 id="guide-title" tabindex="-1">'+step.title+'</h2><p class="guide-intro">'+step.summary+'</p>'+
   (step.example?'<div class="guide-example">'+step.example+'</div>':'')+
   '<div class="guide-steps">'+cards+'</div>'+
   '<div class="guide-tip"><span class="guide-tip-icon">i</span><p>'+step.tip+'</p></div></div></div>'+
   '<footer class="guide-footer"><div class="guide-dots" aria-hidden="true">'+steps.map((_,i)=>
     '<span class="'+(i===current?'selected':'')+'"></span>').join('')+'</div>'+
   '<div class="guide-footer-buttons"><button type="button" class="guide-back" data-guide-action="back"'+(current===0?' disabled':'')+'>Back</button>'+
   '<button type="button" class="guide-next" data-guide-action="'+(last?'done':'next')+'">'+(last?'Start using TruckLedger':'Next')+' <span aria-hidden="true">'+(last?'✓':'→')+'</span></button></div>'+
   (!last?'<button type="button" class="guide-skip" data-guide-action="skip">Skip tutorial</button>':'')+
   '</footer></div>';
  const scroll=root.querySelector('.guide-scroll');if(scroll)scroll.scrollTop=0;
 }
 function show(){
  const root=container();if(!root)return false;
  origin=document.activeElement;
  returnScroll=window.scrollY||0;
  current=0;visible=true;
  root.hidden=false;
  document.body.classList.add('guide-open');
  render();
  // Heading focus is for screen readers; no native text inputs are focused.
  try{root.querySelector('#guide-title')?.focus({preventScroll:true});}catch{}
  return true;
 }
 function close(){
  const root=container();if(!root||!visible)return;
  visible=false;root.hidden=true;root.replaceChildren();
  document.body.classList.remove('guide-open');
  try{origin?.focus?.({preventScroll:true});}catch{}
  origin=null;
 }
 function handle(event){
  const button=event.target.closest('button[data-guide-action]');if(!button||!visible)return;
  event.preventDefault();event.stopPropagation();
  switch(button.dataset.guideAction){
   case 'back':if(current>0){current--;render();}break;
   case 'next':if(current<steps.length-1){current++;render();}break;
   case 'skip':case 'done':close();break;
  }
 }
 async function markFirstOpen(){
  // Run BEFORE default app settings are created. Existing users should not
  // see the tutorial forced on them after upgrading.
  if(await get('settings',MARKER))return false;
  const groups=await Promise.all(['companies','trips','expenses','receipts','settings','audit'].map(getAll));
  const pristine=groups.every(items=>items.length===0);
  const now=new Date().toISOString();
  await put('settings',{id:MARKER,value:true,first_open_at:now,created_at:now,updated_at:now});
  // Mark on first display, not completion: a Skip/close won't repeat on reload.
  return pristine;
 }
 function init(){
  container()?.addEventListener('click',handle);
  document.addEventListener('keydown',event=>{
   if(visible&&event.key==='Escape'){event.preventDefault();close();}
  });
 }
 return {init,show,close,markFirstOpen,steps};
})();
GUIDE.init();
