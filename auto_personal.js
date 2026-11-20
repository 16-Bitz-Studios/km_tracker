/* TruckLedger auto-personal odometer gaps.
   Virtual, clearly labelled entries; no new editable or invented trip records.
   Recomputed from actual work and manual personal odometers on each render. */
'use strict';
const AUTO_PERSONAL=(()=>{
 const KEY='auto_personal_config';
 const validDate=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\d$/.test(s);
 const km=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null;
 const clean=v=>Math.round((v+Number.EPSILON)*10)/10;
 const config=()=>state.settings.find(s=>s.id===KEY);
 async function ensure(){
  if(await get('settings',KEY))return;
  const now=new Date().toISOString();
  await writeWithAudit('settings',{id:KEY,enabled:true,from_date:today(),created_at:now,updated_at:now},null);
 }
 const daysBetween=(a,b)=>Math.round((Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/86400000);
 function derive(trips=state.trips){
  const cfg=config();
  if(!cfg?.enabled)return [];
  const from=validDate(cfg.from_date)?cfg.from_date:today();
  const workDays=new Map();
  for(const t of trips){
   const start=km(t.start_km);
   if(t.kind!=='work'||!validDate(t.date)||start===null)continue;
   if(!workDays.has(t.date))workDays.set(t.date,{date:t.date,items:[],first:null,last:null,unfinished:false});
   const day=workDays.get(t.date);
   day.items.push(t);
   if(!day.first||start<day.first.start||(start===day.first.start&&String(t.id)<String(day.first.trip.id))){
    day.first={trip:t,start};
   }
  }
  const days=[...workDays.values()].sort((a,b)=>a.date.localeCompare(b.date));
  for(const day of days){
   for(const t of day.items){
    const end=km(t.end_km),start=km(t.start_km);
    if(end===null||start===null||end<start)continue;
    if(!day.last||end>day.last.end)day.last={trip:t,end};
   }
   day.unfinished=day.items.some(t=>{
    const start=km(t.start_km),end=km(t.end_km);
    return start!==null&&(end===null||end<start)&&(!day.last||start>=day.last.end);
   });
  }
  const inferred=[];
  for(let i=1;i<days.length;i++){
   const previous=days[i-1],next=days[i];
   if(next.date<from||!previous.last||previous.unfinished||!next.first)continue;
   const gapDays=daysBetween(previous.date,next.date);
   if(!Number.isFinite(gapDays)||gapDays<1||gapDays>14)continue;
   const low=previous.last.end,high=next.first.start;
   if(!Number.isFinite(high)||high<=low)continue;
   const manual=trips.filter(t=>t.kind==='personal'&&!t.auto_personal&&
    validDate(t.date)&&t.date>=previous.date&&t.date<=next.date);
   const covered=[];
   let uncertain=false;
   for(const t of manual){
    const a=km(t.start_km),b=km(t.end_km);
    if(a===null){uncertain=true;break;}
    if(b===null||b<a){
     if(a>=low&&a<=high){uncertain=true;break;}
     continue;
    }
    if(b>low&&a<high)covered.push([Math.max(a,low),Math.min(b,high)]);
   }
   if(uncertain)continue; // unfinished manual personal trip: cannot know residual yet
   covered.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
   const add=(a,b)=>{
    if(b-a<0.05)return;
    const start=clean(a),end=clean(b);
    if(end<=start)return;
    inferred.push({
     id:'auto-personal:'+previous.last.trip.id+':'+next.first.trip.id+':'+start+':'+end,
     kind:'personal',date:next.date,from_date:previous.date,to_date:next.date,
     start_km:start,end_km:end,auto_personal:true,
     from_work_id:previous.last.trip.id,to_work_id:next.first.trip.id,
     destination:'Between workdays',purpose:'Unlogged odometer gap (assumed personal)',
     notes:'Auto-detected from work end on '+previous.date+' to work start on '+next.date+'. This distance is presumed personal, not GPS-verified. Check for unlogged work use.',
     created_at:next.date+'T00:00:00',updated_at:next.date+'T00:00:00'
    });
   };
   let cursor=low;
   for(const [start,end] of covered){
    if(start>cursor)add(cursor,start);
    cursor=Math.max(cursor,end);
    if(cursor>=high)break;
   }
   if(cursor<high)add(cursor,high);
  }
  return inferred;
 }
 function all(){return derive();}
 function preview(work){
  if(work?.kind!=='work'||!validDate(work.date)||km(work.start_km)===null)return [];
  const revised=state.trips.filter(t=>t.id!==work.id);
  revised.push(work);
  return derive(revised).filter(t=>t.to_work_id===work.id&&t.date===work.date);
 }
 function panel(){
  const setting=config()||{enabled:true,from_date:today()};
  const entries=all(),distance=round(entries.reduce((n,t)=>n+(tripDistance(t)||0),0));
  return '<div class="card" id="auto-personal-settings"><div class="split-line"><strong>Automatic personal kilometres</strong><span class="tag work">ODOMETER</span></div>'+
   '<p class="hint">TruckLedger compares your last completed workday end odometer with the next workday’s start, then counts any unlogged distance as estimated personal driving.</p>'+
   '<form id="auto-personal-form">'+
   '<div class="checkrow"><input type="checkbox" name="enabled" id="auto-personal-enabled" '+(setting.enabled?'checked':'')+'><label for="auto-personal-enabled">Automatically detect personal kilometres</label></div>'+
   '<div class="form-field"><label for="auto-personal-from">Start detecting for workdays on or after</label><input type="date" name="from_date" id="auto-personal-from" value="'+esc(setting.from_date||today())+'" required></div>'+
   '<div class="split-line"><span class="muted small">'+entries.length+' inferred entries · '+fmtNum(distance)+' km</span><button type="submit" class="btn smallbtn">Save</button></div></form>'+
   '<p class="hint">On by default starting with this update. Gaps up to 14 days are inferred and dated to the next workday. Manually entered personal trips are deducted from matching gaps. Inferred entries update automatically when you correct an odometer reading and are clearly marked in the log and PDF. No GPS or destination data is collected.</p></div>';
 }
 document.addEventListener('submit',async event=>{
  if(event.target?.id!=='auto-personal-form')return;
  event.preventDefault();
  const f=event.target,from=f.elements.from_date.value,btn=f.querySelector('[type="submit"]');
  if(!validDate(from)){alert('Enter a valid starting date.');return;}
  if(btn)btn.disabled=true;
  try{
   const prev=config(),now=new Date().toISOString();
   await writeWithAudit('settings',{id:KEY,enabled:f.elements.enabled.checked,from_date:from,
     created_at:prev?.created_at||now,updated_at:now},prev);
   await refresh();toast('Personal kilometre detection settings saved');
  }catch(e){alert('Could not save settings: '+e.message);}
  finally{if(btn?.isConnected)btn.disabled=false;}
 });
 return {ensure,derive,all,preview,config,panel};
})();