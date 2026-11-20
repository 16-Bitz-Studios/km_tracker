/* TruckLedger finances: owner-only opening balances and purchase recovery.
   Existing trip/expense/receipt data never needs migration. */
'use strict';
const FINANCES=(()=>{
 let selectedYear=new Date().getFullYear();
 const idFor=year=>'opening_ytd_'+year;
 const records=()=>state.settings.filter(s=>/^opening_ytd_\d{4}$/.test(s.id)&&s.through_date&&Number.isInteger(Number(s.year))).sort((a,b)=>a.year-b.year);
 const getYear=year=>records().find(r=>Number(r.year)===Number(year));
 const purchasePrice=()=>Math.max(0,number(state.settings.find(s=>s.id==='vehicle_purchase_price')?.value));
 const ownerParts=r=>{
   if(!r)return {km:0,hours:0,fuel:0,total:0};
   const a=[number(r.km_amount),number(r.hours_amount),number(r.fuel_amount)];
   // Opening YTD amounts are already the owner's earnings (after the employer split).
   // Apply no further percentage, including for entries saved under older versions.
   const result=a.map(round);
   return {km:result[0],hours:result[1],fuel:result[2],total:round(result.reduce((x,y)=>x+y,0))};
 };
 const covered=t=>{
   if(t.kind!=='work'||!t.date)return false;
   const record=getYear(Number(t.date.slice(0,4)));
   return !!record&&t.date<=record.through_date;
 };
 const periodRecords=period=>{
   if(period==='week'||period==='month')return [];
   if(period==='year')return records().filter(r=>Number(r.year)===Number(today().slice(0,4)));
   return records();
 };
 const periodTotal=period=>round(periodRecords(period).reduce((sum,r)=>sum+ownerParts(r).total,0));
 const lifetime=()=>{
   const tracked=round(state.trips.filter(t=>t.kind==='work'&&!covered(t)).reduce((sum,t)=>sum+calculate(t).truckRevenue,0));
   const opening=periodTotal('all');
   const revenue=round(tracked+opening);
   const costs=round(state.expenses.reduce((sum,e)=>sum+number(e.amount),0));
   const purchase=purchasePrice(),operating=round(revenue-costs),afterPurchase=round(operating-purchase);
   return {tracked,opening,revenue,costs,purchase,operating,afterPurchase,margin:revenue?100*operating/revenue:null,
     roi:purchase?100*afterPurchase/purchase:null,recovered:purchase?100*Math.max(0,operating)/purchase:null};
 };
 const money=n=>fmtMoney(n);
 function dashboard(s){
   const life=lifetime();
   let out='';
   if(s.openingRevenue>0||s.openingCount>0){
     out+='<div class="card"><div class="split-line"><strong>YTD opening earnings</strong><button class="inline-link" type="button" data-finance-open>View / edit</button></div>'+
       '<div class="datum"><span>Previously earned</span><strong>'+money(s.openingRevenue)+'</strong></div>'+
       '<div class="datum"><span>Tracked after opening</span><strong>'+money(s.trackedRevenue)+'</strong></div>'+
       '<div class="datum"><strong>Combined earnings</strong><strong>'+money(s.vehicleRevenue)+'</strong></div>'+
       '<p class="hint">Previous earnings are already your share; no second 85% deduction. Opening balances do not create kilometres or trips.</p></div>';
   }
   out+='<div class="card"><div class="split-line"><strong>Lifetime truck investment</strong><button class="inline-link" type="button" data-finance-purchase>Vehicle details</button></div>'+
     '<div class="datum"><span>All-time earned, including opening YTD</span><strong>'+money(life.revenue)+'</strong></div>'+
     '<div class="datum"><span>All recorded operating costs</span><span>'+money(life.costs)+'</span></div>'+
     '<div class="datum"><span>Lifetime operating profit</span><strong>'+money(life.operating)+'</strong></div>'+
     '<div class="datum"><span>Truck purchase price</span><span>'+(life.purchase?money(life.purchase):'Not entered')+'</span></div>'+
     '<div class="datum"><strong>After purchase cost</strong><strong>'+(life.purchase?money(life.afterPurchase):'Set purchase price')+'</strong></div>';
   if(life.purchase){
     out+='<div class="datum"><span>Purchase cost recovered</span><strong>'+fmtNum(life.recovered)+'%</strong></div>'+
       '<div class="datum"><span>Return on purchase cost</span><strong>'+fmtNum(life.roi)+'%</strong></div>';
   }else out+='<p class="hint">Enter your truck purchase price under Data to track whether the truck has earned back its purchase cost.</p>';
   if(life.margin!==null)out+='<div class="datum"><span>Lifetime operating profit margin</span><strong>'+fmtNum(life.margin)+'%</strong></div>';
   out+='<p class="hint">Purchase cost is subtracted once from lifetime return, not from each month. Do not also record purchase-loan principal repayments as operating expenses. Resale value, taxes, and unrecorded costs are excluded.</p></div>';
   return out;
 }
 function panel(){
   const y=selectedYear,old=getYear(y),d=new Date();d.setDate(d.getDate()-1);
   const yesterday=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
   const suggested=y===Number(today().slice(0,4))&&yesterday.slice(0,4)===String(y)?yesterday:y+'-12-31';
   const date=old?.through_date||suggested,parts=ownerParts(old);
   const years=records().map(r=>'<button class="inline-link" type="button" data-finance-year="'+r.year+'">'+r.year+'</button>').join(' · ');
   return '<div class="card" id="opening-ytd-card"><div class="split-line"><strong>Opening YTD earnings</strong><span class="tag work">HISTORY</span></div>'+
     '<p class="hint">Enter what you already earned from your truck before tracking began, after Ace\'s share. Do NOT enter the full client charge-out. No past trips or mileage required.</p>'+
     (years?'<p class="hint">Saved years: '+years+'</p>':'')+
     '<form id="opening-form"><div class="form-grid">'+
     field('Calendar year','year',y,{type:'number',step:'1',min:2000,max:2100,required:true})+
     field('Included through date','through_date',date,{type:'date',required:true})+
     '<div class="notice">These amounts are already yours. TruckLedger will not deduct 15% again. Normal new trips still use your saved earnings percentage.</div>'+
     field('Truck km earned (CAD)','km_amount',old?.km_amount??0,{type:'number',step:'0.01',min:0})+
     field('Truck hours earned (CAD)','hours_amount',old?.hours_amount??0,{type:'number',step:'0.01',min:0})+
     field('Fuel surcharge earned (CAD)','fuel_amount',old?.fuel_amount??0,{type:'number',step:'0.01',min:0})+
     '</div><div class="datum"><span>Your opening earnings</span><strong id="opening-preview">'+money(parts.total)+'</strong></div>'+
     '<p class="hint">Your opening balance is the sum of these three amounts, with no additional percentage deducted. Trip earnings on or before the cutoff are not counted again, but their mileage remains. Historical expenses must be added separately if you want them deducted.</p>'+
     '<div class="foot-actions"><button type="submit" class="btn">Save opening YTD</button>'+
     (old?'<button type="button" class="btn warn" data-finance-delete="'+y+'">Delete opening</button>':'')+
     '</div></form></div>';
 }
 async function save(form){
   const el=form.elements,year=Number(el.year.value),through=el.through_date.value;
   if(!Number.isInteger(year)||year<2000||year>2100)throw Error('Enter a calendar year between 2000 and 2100');
   if(!/^\d{4}-\d{2}-\d{2}$/.test(through)||through.slice(0,4)!==String(year)||through>today())throw Error('The cutoff must be in that year and not in the future');
   const km=parsePositive(el.km_amount.value,'Truck kilometre earnings');
   const hours=parsePositive(el.hours_amount.value,'Truck-hour earnings');
   const fuel=parsePositive(el.fuel_amount.value,'Fuel-surcharge earnings');
   const old=getYear(year);
   const record={id:idFor(year),year,through_date:through,amount_mode:'owner',km_amount:km,hours_amount:hours,fuel_amount:fuel,
      created_at:old?.created_at||new Date().toISOString(),updated_at:new Date().toISOString()};
   if(!confirm('Save YTD opening through '+through+'?\n\nTrips on or before this date will not add separate earnings to totals. They will not be deleted.'))return;
   await writeWithAudit('settings',record,old);selectedYear=year;await refresh();toast('Opening YTD earnings saved');
 }
 async function erase(year){
   const old=getYear(year);if(!old)return;
   if(!confirm('Delete the '+year+' opening balance? Individual trip earnings for this period will count again.'))return;
   await new Promise((resolve,reject)=>{
     const tx=state.db.transaction(['settings','audit'],'readwrite');
     tx.objectStore('settings').delete(old.id);
     tx.objectStore('audit').put(auditEvent('settings','delete',old,null));
     tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Delete failed'));
   });await refresh();toast('Opening balance removed');
 }
 document.addEventListener('submit',async event=>{
   if(event.target?.id!=='opening-form')return;
   event.preventDefault();
   const btn=event.target.querySelector('[type="submit"]');if(btn)btn.disabled=true;
   try{await save(event.target);}catch(e){alert('Opening YTD: '+e.message);}
   finally{if(btn?.isConnected)btn.disabled=false;}
 });
 document.addEventListener('click',async event=>{
   const b=event.target.closest('button');if(!b)return;
   if(b.hasAttribute('data-finance-open')){event.preventDefault();state.tab='data';render();document.getElementById('opening-ytd-card')?.scrollIntoView({behavior:'smooth'});}
   if(b.hasAttribute('data-finance-purchase')){event.preventDefault();state.tab='data';render();document.getElementById('purchase-price')?.scrollIntoView({behavior:'smooth'});}
   if(b.dataset.financeYear){event.preventDefault();selectedYear=Number(b.dataset.financeYear);render();}
   if(b.dataset.financeDelete){event.preventDefault();try{await erase(Number(b.dataset.financeDelete));}catch(e){alert(e.message);}}
 });
 document.addEventListener('input',event=>{
   if(!event.target.closest('#opening-form'))return;
   const form=document.getElementById('opening-form'),el=form.elements;
   const values=['km_amount','hours_amount','fuel_amount'].map(n=>Math.max(0,number(el[n].value)));
   const earned=round(values.reduce((x,y)=>x+y,0));
   document.getElementById('opening-preview').textContent=money(earned);
 });
 return {records,getYear,ownerParts,covered,periodRecords,periodTotal,purchasePrice,lifetime,dashboard,panel};
})();