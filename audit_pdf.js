/* TruckLedger audit PDF generator: offline, searchable, readable by auditors.
   Displays only the vehicle owner's share of earnings. ZIP keeps original receipts. */
'use strict';
class TruckLedgerPDF {
 constructor(){this.pages=[];this.beginPage();}
 static plain(v){return String(v??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[\u2013\u2014]/g,'-').replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/[\r\n\t]+/g,' ').replace(/[^\x20-\x7E]/g,'?');}
 static literal(v){return TruckLedgerPDF.plain(v).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');}
 static join(parts){let size=0;for(const p of parts)size+=p.length;const b=new Uint8Array(size);let off=0;for(const p of parts){b.set(p,off);off+=p.length;}return b;}
 put(v,x,y,size=9,bold=false){this.page.push('q '+(bold?'0.08 0.28 0.32':'0.15 0.20 0.25')+' rg BT /'+(bold?'F2':'F1')+' '+size+' Tf 1 0 0 1 '+x+' '+y+' Tm ('+TruckLedgerPDF.literal(v)+') Tj ET Q');}
 line(y){this.page.push('0.80 G 0.5 w 43 '+y+' m 569 '+y+' l S');}
 beginPage(){this.page=[];this.pages.push(this.page);this.put('TRUCKLEDGER',43,753,13,true);this.put('PRIVATE VEHICLE MILEAGE & EARNINGS AUDIT',43,735,8);this.line(723);this.y=706;}
 ensure(need=16){if(this.y-need<65)this.beginPage();}
 words(v,max=100){
   const text=TruckLedgerPDF.plain(v).trim();if(!text)return ['-'];
   const out=[];let line='';
   for(let word of text.split(/\s+/)){while(word.length>max){if(line){out.push(line);line='';}out.push(word.slice(0,max));word=word.slice(max);}
     if(!word)continue;
     if(line.length+word.length+(line?1:0)>max){out.push(line);line=word;}else line+=(line?' ':'')+word;}
   if(line)out.push(line);return out;
 }
 text(v,opts={}){const size=opts.size||9,leading=opts.leading||13;const max=Math.max(35,Math.floor(515/(size*.56)));
   for(const l of this.words(v,max)){this.ensure(leading);this.put(l,43+(opts.indent||0),this.y,size,!!opts.bold);this.y-=leading;}}
 section(title){this.ensure(52);this.y-=8;this.put(String(title).toUpperCase(),43,this.y,12,true);this.y-=12;this.line(this.y);this.y-=19;}
 entry(heading,fields){this.ensure(78);this.text(heading,{size:10.3,leading:16,bold:true});for(const [label,value] of fields)this.text(label+': '+(value===undefined||value===null||value===''?'-':value),{size:8.6,leading:12,indent:7});this.y-=10;this.ensure(10);this.line(this.y+5);this.y-=5;}
 build(){
   const encoder=new TextEncoder(),enc=s=>encoder.encode(s);
   const o=[null],add=v=>{o.push(typeof v==='string'?enc(v):v);return o.length-1;};
   const catalog=add(''),pages=add('');
   const fr=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
   const fb=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
   const ids=[];
   for(let n=0;n<this.pages.length;n++){
     const commands=this.pages[n].slice();commands.push('0.42 g BT /F1 8 Tf 1 0 0 1 43 37 Tm (TruckLedger - Page '+(n+1)+' of '+this.pages.length+') Tj ET');
     const stream=enc(commands.join('\n')+'\n');
     const streamId=add(TruckLedgerPDF.join([enc('<< /Length '+stream.length+' >>\nstream\n'),stream,enc('endstream')]));
     ids.push(add('<< /Type /Page /Parent '+pages+' 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 '+fr+' 0 R /F2 '+fb+' 0 R >> >> /Contents '+streamId+' 0 R >>'));
   }
   o[catalog]=enc('<< /Type /Catalog /Pages '+pages+' 0 R >>');
   o[pages]=enc('<< /Type /Pages /Kids ['+ids.map(n=>n+' 0 R').join(' ')+'] /Count '+ids.length+' >>');
   const info=add('<< /Title (TruckLedger Mileage and Earnings Audit) /Creator (TruckLedger) >>');
   const blocks=[enc('%PDF-1.4\n%TruckLedger\n')],offset=[0];let length=blocks[0].length;
   for(let n=1;n<o.length;n++){offset[n]=length;const b=TruckLedgerPDF.join([enc(n+' 0 obj\n'),o[n],enc('\nendobj\n')]);blocks.push(b);length+=b.length;}
   const xref=length;let tail='xref\n0 '+o.length+'\n0000000000 65535 f \n';
   for(let n=1;n<o.length;n++)tail+=String(offset[n]).padStart(10,'0')+' 00000 n \n';
   tail+='trailer\n<< /Size '+o.length+' /Root '+catalog+' 0 R /Info '+info+' 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';
   blocks.push(enc(tail));return new Blob(blocks,{type:'application/pdf'});
 }
}
async function makeAuditPDF(){
 const p=new TruckLedgerPDF();
 const money=n=>new Intl.NumberFormat('en-CA',{currency:'CAD',style:'currency'}).format(Number(n)||0);
 const dist=n=>n===undefined||n===null||n===''?'Open':new Intl.NumberFormat('en-CA',{maximumFractionDigits:1}).format(Number(n))+' km';
 const sortDate=arr=>arr.slice().sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.created_at||'').localeCompare(b.created_at||''));
 const work=sortDate(state.trips.filter(t=>t.kind==='work'));
 const personal=sortDate(state.trips.filter(t=>t.kind==='personal'));
 const expenses=sortDate(state.expenses);
 const changes=state.audit.slice().sort((a,b)=>(a.at||'').localeCompare(b.at||''));
 const trackedEarn=round(work.filter(t=>!FINANCES.covered(t)).reduce((n,t)=>n+calculate(t).truckRevenue,0));const opening=FINANCES.periodTotal('all');const earn=round(trackedEarn+opening);const investment=FINANCES.lifetime();
 const costs=round(expenses.reduce((n,e)=>n+number(e.amount),0));
 const fuel=round(expenses.filter(e=>e.category==='Fuel').reduce((n,e)=>n+number(e.amount),0));
 const vehicle=state.settings.find(s=>s.id==='vehicle_name')?.value||'Not specified';
 const workKm=work.reduce((n,t)=>n+(tripDistance(t)||0),0),personalKm=personal.reduce((n,t)=>n+(tripDistance(t)||0),0);const billedKm=work.reduce((n,t)=>n+(billedDistance(t)||0),0),actualKmForBilled=work.reduce((n,t)=>n+(t.bill_km?(tripDistance(t)||0):0),0);
 p.text('COMPLETE MILEAGE AND VEHICLE COST REPORT',{bold:true,size:14,leading:21});
 p.text('Generated: '+new Date().toLocaleString('en-CA'));
 p.text('Vehicle: '+vehicle+'  |  All recorded dates  |  CAD / km');
 p.section('Summary - your earnings only');
 p.entry('Vehicle earnings and expenses',[
   ['Completed work distance (actual)',dist(workKm)],['Completed personal distance',dist(personalKm)],['Kilometres billed to clients',dist(billedKm)],['Actual km on billed trips',dist(actualKmForBilled)],['Extra billed kilometres',(billedKm-actualKmForBilled>=0?'+':'')+dist(round(billedKm-actualKmForBilled))],
   ['Historical opening earnings',money(opening)],['Earnings tracked after opening',money(trackedEarn)],['Your combined truck earnings',money(earn)],['Fuel costs',money(fuel)],
   ['Other vehicle costs',money(round(costs-fuel))],['Total vehicle costs',money(costs)],
   ['OPERATING PROFIT (before purchase)',money(round(earn-costs))],['Original truck purchase price',investment.purchase?money(investment.purchase):'Not entered'],['NET AFTER PURCHASE COST',investment.purchase?money(investment.afterPurchase):'Purchase price not entered'],['Operating profit margin',investment.margin===null?'No earnings':investment.margin.toFixed(1)+'%'],['Return on purchase cost',investment.roi===null?'Purchase price not entered':investment.roi.toFixed(1)+'%']
 ]);
 p.text('Earnings are the vehicle owner share of kilometre charges, truck-hour charges and fuel surcharges. The default share is 85%; each trip retains its own recorded percentage. The employer share is excluded.',{size:8.5});
 p.text('Opening YTD amounts are earnings totals only and do not add historical mileage. To prevent double counting, trip revenue dated within an opening balance is excluded from combined earnings; those trips remain in the work log below.',{size:8.5});p.text('Billed kilometres may differ from odometer kilometres. If billed distance was left blank, actual distance is used. Fuel surcharges configured per actual kilometre continue using actual distance.',{size:8.5});p.text('Operating profit = your combined earnings minus logged vehicle costs, including personal-use costs. The purchase price is then deducted once for lifetime investment return. Loan principal, remaining vehicle value, taxes, and missing historical expenses are not accounted for.',{size:8.5});
 p.text('Included: '+work.length+' work trips, '+personal.length+' personal trips, '+expenses.length+' expenses, '+state.receipts.length+' receipt references and '+changes.length+' change-history events.',{size:8.5});

 p.section('Opening YTD earnings - summarized prior months');
 const openingRecords=FINANCES.records();
 if(!openingRecords.length)p.text('No opening balances recorded.');
 openingRecords.forEach(r=>{
   const earned=FINANCES.ownerParts(r);
   p.entry('Calendar year '+r.year+' | through '+r.through_date,[
     ['Source of amounts',r.amount_mode==='owner'?'Owner earnings already received':'Client charge-out amounts; owner percentage applied'],
     ['Owner earnings percentage',r.amount_mode==='owner'?'Not applied again':r.share_percent+'%'],
     ['Truck kilometre earnings',money(earned.km)],
     ['Truck-hour earnings',money(earned.hours)],
     ['Fuel surcharge earnings',money(earned.fuel)],
     ['OPENING TOTAL EARNED',money(earned.total)],
     ['Supporting note','Summary amounts are not individual trip or mileage records']
   ]);
 });
 p.section('Work trips - complete odometer and earnings log');
 if(!work.length)p.text('No work trips recorded.');
 work.forEach((t,i)=>{const c=calculate(t);p.entry((i+1)+'. '+(t.date||'Undated')+' | '+companyName(t),[
   ['Location',t.destination||'-'],['Work performed',t.purpose||'-'],
   ['Starting odometer',dist(t.start_km)],['Ending odometer',dist(t.end_km)],['Actual distance',dist(c.km)],['Billed kilometres',t.bill_km?(c.billedKm===null?'Pending end odometer':dist(c.billedKm)):'Not billed'],['Difference (billed - actual)',t.bill_km&&c.km!==null?(c.billedKm-c.km>=0?'+':'')+dist(round(c.billedKm-c.km)):'Not applicable'],
   ['Truck hours recorded',t.bill_truck_hours||(t.bill_surcharge&&t.rate?.surcharge_type==='per_hour')?String(t.truck_hours||t.hours||0)+' hr':'Not used for hourly charges'],
   ['Counting toward total',FINANCES.covered(t)?'Included in opening YTD; not added a second time':'Counted as an individual trip'],['Your earnings percentage',tripSharePercent(t)+'%'],['Your kilometre earnings',money(c.kmCharge)],
   ['Your truck-hour earnings',money(c.truckCharge)],['Your fuel-surcharge earnings',money(c.surcharge)],
   ['YOUR TOTAL EARNINGS',money(c.truckRevenue)],['Notes',t.notes||'-'],['Record ID',t.id]
 ]);});
 p.section('Personal trips - complete odometer log');
 if(!personal.length)p.text('No personal trips recorded.');
 personal.forEach((t,i)=>p.entry((i+1)+'. '+(t.date||'Undated')+' | '+(t.destination||'Personal drive'),[
   ['Reason',t.purpose||'-'],['Starting odometer',dist(t.start_km)],['Ending odometer',dist(t.end_km)],
   ['Distance',dist(tripDistance(t))],['Notes',t.notes||'-'],['Record ID',t.id]
 ]));
 p.section('Vehicle costs and receipts');
 if(!expenses.length)p.text('No expenses recorded.');
 expenses.forEach((e,i)=>{const receipt=state.receipts.find(r=>r.id===e.receipt_id);
   p.entry((i+1)+'. '+(e.date||'Undated')+' | '+(e.category||'Expense')+' | '+money(e.amount),[
     ['Merchant',e.vendor||'-'],['Odometer',e.odometer===''||e.odometer==null?'-':dist(e.odometer)],
     ['Fuel purchased',e.litres===''||e.litres==null?'-':e.litres+' L'],['Receipt',receipt?.name||'None attached'],
     ['Notes',e.notes||'-'],['Record ID',e.id]
   ]);});
 p.section('Companies - current owner-effective rate reference');
 p.text('The current rates below show only your earnings portion (currently '+sharePercent()+'%). Previous trips use the rate and percentage captured on each trip.',{size:8.5});
 if(!state.companies.length)p.text('No companies recorded.');
 state.companies.slice().sort((a,b)=>(a.name||'').localeCompare(b.name||'')).forEach(c=>{
   const pct=sharePercent()/100;
   let surcharge='None';
   if(c.surcharge_type==='percent')surcharge=c.surcharge_rate+'% of vehicle charges, shared at '+sharePercent()+'%';
   if(c.surcharge_type==='per_km')surcharge=money(round(number(c.surcharge_rate)*pct))+' earned per actual km';if(c.surcharge_type==='per_hour')surcharge=money(round(number(c.surcharge_rate)*pct))+' earned per truck hour';
   if(c.surcharge_type==='flat')surcharge=money(round(number(c.surcharge_rate)*pct))+' earned per trip';
   p.entry(c.name,[
     ['Billing basis',c.mode||'-'],['Your equivalent kilometre rate',money(round(number(c.km_rate)*pct))],
     ['Your equivalent truck-hour rate',money(round(number(c.truck_hour_rate)*pct))],
     ['Fuel surcharge',surcharge],['Notes',c.notes||'-']
   ]);
 });
 p.section('Receipt file index');
 p.text('Receipt originals are included in the separate restorable Full Backup ZIP, not embedded in this PDF.',{size:8.5});
 if(!state.receipts.length)p.text('No receipt files recorded.');
 state.receipts.forEach((r,i)=>p.entry((i+1)+'. '+(r.name||'Receipt'),[
   ['Type',r.mime||'Unknown'],['Size',Math.round(number(r.size)/1024)+' KB'],['Receipt ID',r.id]
 ]));
 p.section('Local edit history');
 p.text('This is an application-maintained log, not a tamper-proof audit. Field names changed are shown; full historical record values remain in the separate backup.',{size:8.5});
 if(!changes.length)p.text('No changes recorded.');
 changes.forEach((h,i)=>{
   const before=h.before||{},after=h.after||{};
   const fields=[...new Set([...Object.keys(before),...Object.keys(after)])].filter(k=>JSON.stringify(before[k])!==JSON.stringify(after[k]));
   p.entry((i+1)+'. '+(h.at||'Undated')+' | '+(h.action||'Change')+' '+(h.entity||'record'),[
     ['Record ID',h.record_id||'-'],['Changed fields',fields.filter(k=>!['updated_at','created_at'].includes(k)).join(', ')||'Metadata only']
   ]);
 });
 p.section('End of report');
 p.text('This PDF lists the available work trips, personal trips, expenses, YTD opening earnings, investment price, client rates, receipts and recorded edits. Historical YTD values are summaries, not itemized trips. Use the Full Backup ZIP for exact records and original receipts.',{size:9});
 return p.build();
}
