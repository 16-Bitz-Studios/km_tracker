/* TruckLedger trend chart. Local-only, no charting libraries, no fabricated dates. */
'use strict';
const TREND=(()=>{
 function buckets(){
  const now=new Date(),period=state.period,year=now.getFullYear(),rows=[];
  const add=(label,description,start,end)=>rows.push({label,description,start,end,earned:0,spent:0});
  if(period==='day'||period==='week'){
   const first=period==='week'?weekStart():new Date(year,now.getMonth(),now.getDate()-6,12);
   for(let i=0;i<7;i++){
    const day=new Date(first);day.setDate(first.getDate()+i);
    const key=localDateKey(day);
    add(day.toLocaleDateString('en-CA',{weekday:'short'}),day.toLocaleDateString('en-CA',{weekday:'long',month:'short',day:'numeric'}),key,key);
   }
  }else if(period==='month'){
   const endOfMonth=new Date(year,now.getMonth()+1,0,12).getDate();
   for(let start=1;start<=endOfMonth;start+=7){
    const end=Math.min(start+6,endOfMonth);
    add(start===end?String(start):start+'–'+end,now.toLocaleDateString('en-CA',{month:'long'})+' '+start+' to '+end,
     localDateKey(new Date(year,now.getMonth(),start,12)),localDateKey(new Date(year,now.getMonth(),end,12)));
   }
  }else if(period==='year'){
   for(let month=0;month<12;month++){
    const date=new Date(year,month,1,12);
    add(date.toLocaleDateString('en-CA',{month:'short'}),date.toLocaleDateString('en-CA',{month:'long',year:'numeric'}),
     localDateKey(date),localDateKey(new Date(year,month+1,0,12)));
   }
  }else{
   const dates=state.trips.filter(t=>t.kind==='work'&&!FINANCES.covered(t)&&tripDistance(t)!==null&&/^\d{4}-\d\d-\d\d$/.test(t.date||''));
   const years=dates.map(t=>Number(t.date.slice(0,4))).filter(Number.isFinite);
   const earliest=Math.min(year,...years),start=Math.max(year-7,earliest);
   if(earliest<start)add('Older','Prior to '+start,'0000-01-01',(start-1)+'-12-31');
   for(let y=start;y<=year;y++)add(String(y).slice(-2),String(y),y+'-01-01',y+'-12-31');
  }
  for(const t of state.trips){
   if(t.kind!=='work'||FINANCES.covered(t)||tripDistance(t)===null)continue;
   const row=rows.find(b=>t.date>=b.start&&t.date<=b.end);
   if(row)row.earned+=calculate(t).truckRevenue;
  }
  for(const e of state.expenses){
   const row=rows.find(b=>e.date>=b.start&&e.date<=b.end);
   if(row)row.spent+=number(e.amount);
  }
  for(const row of rows){row.earned=round(row.earned);row.spent=round(row.spent);}
  return rows;
 }
 function chart(){
  const rows=buckets(),kind=state.trendMetric==='costs'?'spent':'earned',showCosts=kind==='spent';
  const title=showCosts?'Spent':'Earned',total=round(rows.reduce((sum,row)=>sum+row[kind],0));
  const max=Math.max(1,...rows.map(row=>row[kind]));
  const focus=Number.isInteger(state.trendFocus)&&state.trendFocus>=0&&state.trendFocus<rows.length?state.trendFocus:rows.length-1;
  const selected=rows[focus];
  const range=state.period==='day'?'Last 7 days':state.period==='week'?'This week':state.period==='month'?'This month':state.period==='year'?'This year':'Recorded years';
  const bars=rows.map((row,i)=>{
    const value=row[kind],height=value?Math.max(8,Math.round(value/max*100)):3;
    const pressed=i===focus;
    return '<button type="button" class="trend-point'+(pressed?' selected':'')+'" data-trend-point="'+i+'" aria-pressed="'+pressed+'" aria-label="'+esc(row.description)+': '+esc(fmtMoney(value))+' '+title.toLowerCase()+'" title="'+esc(row.description)+': '+esc(fmtMoney(value))+'" style="--index:'+Math.min(i,8)+'">'+
     '<span class="trend-point-track"><span class="trend-point-fill'+(value?'':' empty')+'" style="--height:'+height+'%"></span></span>'+
     '<span class="trend-point-label">'+esc(row.label)+'</span></button>';
  }).join('');
  const intro=FINANCES.periodRecords(state.period).length&&!showCosts?
   '<p class="hint trend-caveat">Opening YTD is included in your earnings total, but not placed on this dated chart.</p>':'';
  const dayNote=state.period==='day'?'<p class="hint trend-caveat">Today’s total is above; the chart shows the past seven days.</p>':'';
  return '<div class="card trend-card '+(showCosts?'show-costs':'show-earnings')+'">'+
   '<div class="trend-head"><div><div class="eyebrow">CASH FLOW</div><strong>Activity trend</strong></div>'+
   '<div class="trend-toggle" role="group" aria-label="Chart metric">'+
   '<button type="button" data-trend-metric="earned" aria-pressed="'+(!showCosts)+'" class="'+(!showCosts?'active':'')+'">Earned</button>'+
   '<button type="button" data-trend-metric="costs" aria-pressed="'+showCosts+'" class="'+(showCosts?'active':'')+'">Costs</button></div></div>'+
   '<div class="trend-subtitle"><span>'+range+'</span><strong>'+fmtMoney(total)+'</strong></div>'+
   '<div class="trend-bars" role="group" aria-label="'+title+' by period" style="--count:'+rows.length+'">'+bars+'</div>'+
   '<div class="trend-selection" id="trend-selection" aria-live="polite"><span>'+esc(selected?.description||'No dates')+'</span>'+
   '<strong>'+fmtMoney(selected?.[kind]||0)+' '+title.toLowerCase()+'</strong></div>'+intro+dayNote+'</div>';
 }
 function select(index){
  const rows=buckets(),row=rows[index],el=document.querySelector('#trend-selection');
  if(!row||!el)return;
  state.trendFocus=index;
  const kind=state.trendMetric==='costs'?'spent':'earned';
  for(const b of document.querySelectorAll('button[data-trend-point]')){
   const on=Number(b.dataset.trendPoint)===index;
   b.classList.toggle('selected',on);
   b.setAttribute('aria-pressed',String(on));
  }
  el.innerHTML='<span>'+esc(row.description)+'</span><strong>'+fmtMoney(row[kind])+(kind==='spent'?' spent':' earned')+'</strong>';
 }
 document.addEventListener('click',event=>{
  const btn=event.target.closest('button');if(!btn)return;
  if(btn.hasAttribute('data-trend-metric')){
   event.preventDefault();
   if(state.trendMetric!==btn.dataset.trendMetric){
    state.trendMetric=btn.dataset.trendMetric;
    state.trendFocus=-1;
    render();
   }
  }else if(btn.hasAttribute('data-trend-point')){
   event.preventDefault();select(Number(btn.dataset.trendPoint));
  }
 });
 return {chart,buckets,select};
})();