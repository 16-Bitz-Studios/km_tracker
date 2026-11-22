/* TruckLedger automated Google Drive backup & guarded device sync.
 * Uses the existing CLOUD OAuth session and existing restorable ZIP archive.
 * Cloud snapshots are append-only in Drive appDataFolder; never last-writer-wins.
 * No private tokens, mileage, receipts or secrets are committed to GitHub.
 */
'use strict';
const TRUCK_SYNC=(()=>{
 const PREFIX='TruckLedger_AutoSync_v1_',SAFETY='TruckLedger_AutoSafety_v1_',KEY='truckledger-auto-sync-link-v1',DEVICE='truckledger-auto-sync-device-v1',API='https://www.googleapis.com/drive/v3/files';
 const MAX_BACKUP=250*1024*1024,STORES=['companies','trips','expenses','settings','audit','receipts'];
 let email='',device='',head='',baseHash='',status='Connect Google Drive to enable automatic backups.',conflict=null,initialized=false,polling=false,uploading=false,suspend=false,scheduled=null,cycle=0,authReady=false,revisions=[],interval=null,dirty=false;
 const escSync=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','&quot;':'&quot;'}[c]));
 function readLink(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}}
 function persist(){try{localStorage.setItem(KEY,JSON.stringify({email,head,baseHash,device}))}catch{}}
 const isReady=()=>CLOUD.ready()&&authReady;
 const now=()=>new Date().toLocaleTimeString('en-CA',{hour:'numeric',minute:'2-digit'});
 function mark(text){status=text;if(state.tab==='data'){const e=document.getElementById('truck-sync-card');if(e)e.outerHTML=panel();}}
 function panel(){return '<div class="card" id="truck-sync-card"><div class="split-line"><strong>Automatic backup & device sync</strong><span class="tag '+(isReady()&&!conflict?'work':'')+'">'+(conflict?'REVIEW NEEDED':isReady()?'CONNECTED':'LOCAL FIRST')+'</span></div>'+
  '<p class="hint">'+escSync(status)+'</p><p class="hint">Automatically backs up trips, clients, costs, original receipts, truck settings and audit history when saved while the app is open and Google is connected. Another device checks for updates on return and about once a minute. Reconnect Google after authorization expires.</p>'+
  '<div class="data-buttons"><button class="btn secondary block" data-auto-sync="check" '+(!isReady()||polling?'disabled':'')+'>↻ Sync now</button><button class="btn secondary block" data-auto-sync="backup" '+(!isReady()||polling?'disabled':'')+'>☁ Save additional safety backup</button></div>'+
  (conflict?'<div class="notice warning"><strong>Two versions need your decision.</strong><p class="hint">'+escSync(conflict.reason)+'</p><p class="hint">The app has stopped syncing rather than overwriting your records. Download your full local backup before choosing which device should become authoritative.</p><div class="data-buttons"><button class="btn secondary block" data-auto-sync="export">⇩ Download local ZIP backup</button><button class="btn secondary block" data-auto-sync="cloud">Use cloud version</button><button class="btn warn block" data-auto-sync="local">Keep this device version</button></div></div>':'')+
  '<p class="hint">Cloud copies are private to your Google account and separate from the existing manual TruckLedger backups. Conflicts require a choice; this is whole-backup synchronization, not per-trip merging. Keep periodic downloaded ZIPs for independent recovery.</p></div>';}
 function activeDialog(){return document.getElementById('editor')?.open||!document.getElementById('editor-page')?.hidden||!document.getElementById('guide-overlay')?.hidden;}
 async function digest(value){const raw=new TextEncoder().encode(value);const result=await crypto.subtle.digest('SHA-256',raw);return [...new Uint8Array(result)].map(x=>x.toString(16).padStart(2,'0')).join('');}
 async function local(){
  if(!state.db)throw Error('Local database is unavailable. No cloud backup was attempted.');
  const all=await Promise.all(STORES.map(store=>getAll(store)));
  const rows={};for(let i=0;i<STORES.length;i++){
   const store=STORES[i];rows[store]=[];
   for(const record of all[i].sort((a,b)=>String(a.id).localeCompare(String(b.id)))){
    if(store==='receipts'){
      const bytes=record.blob instanceof Blob?await record.blob.arrayBuffer():new Blob([record.blob||'']).arrayBuffer();
      const blobHash=await digestBytes(bytes);
      const {blob,...rest}=record;rows[store].push({...rest,blobHash});
    }else rows[store].push(record);
   }
  }
  return digest(JSON.stringify(rows));
 }
 async function digestBytes(bytes){const result=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(result)].map(x=>x.toString(16).padStart(2,'0')).join('');}
 async function drive(url,options={}){if(!isReady())throw Error('Reconnect Google Drive before syncing.');return CLOUD.request(url,options);}
 async function list(){
  const out=[];let cursor='',guard=0;do{
    const p=new URLSearchParams({spaces:'appDataFolder',q:"name contains '"+PREFIX+"' and trashed = false",fields:'nextPageToken,files(id,name,size,createdTime,modifiedTime,appProperties)',pageSize:'1000'});
    if(cursor)p.set('pageToken',cursor);
    const response=await drive(API+'?'+p),json=await response.json();
    out.push(...(json.files||[]).filter(f=>f.name?.startsWith(PREFIX)&&f.name.endsWith('.zip')&&f.appProperties?.project==='truckledger'));
    cursor=json.nextPageToken||'';if(++guard>10)throw Error('Too many Drive revisions to inspect safely.');
  }while(cursor);
  revisions=out.sort((a,b)=>Date.parse(a.createdTime)-Date.parse(b.createdTime));return revisions;
 }
 const parents=f=>String(f.appProperties?.parents||'').split(',').filter(Boolean);
 function tips(files){const prev=new Set(files.flatMap(parents));return files.filter(f=>!prev.has(f.id));}
 function ancestor(files,earlier,later){if(!earlier)return false;if(earlier===later)return true;const lookup=new Map(files.map(f=>[f.id,f])),visited=new Set(),q=[later];while(q.length){const id=q.shift();if(visited.has(id))continue;visited.add(id);const f=lookup.get(id);if(!f)continue;for(const p of parents(f)){if(p===earlier)return true;q.push(p)}}return false;}
 async function upload(fileHash,parentIds=[],safety=false){
   const blob=await makeExport('backup');if(blob.size>MAX_BACKUP)throw Error('Backup exceeds the 250 MB Drive sync limit. Export it locally before continuing.');
   const name=(safety?SAFETY:PREFIX)+new Date().toISOString().replace(/[:.]/g,'-')+'_'+device+'.zip';
   const meta={name,mimeType:'application/zip',parents:['appDataFolder'],appProperties:{project:'truckledger',hash:fileHash,device,kind:safety?'safety':'sync',...(parentIds.length?{parents:parentIds.join(',')}:{})}};
   const boundary='tl_'+crypto.randomUUID().replaceAll('-','');
   const body=new Blob(['--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(meta)+'\r\n--'+boundary+'\r\nContent-Type: application/zip\r\n\r\n',blob,'\r\n--'+boundary+'--'],{type:'multipart/related; boundary='+boundary});
   const response=await drive('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,createdTime,appProperties',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body});
   const file=await response.json();if(!file.id)throw Error('Drive did not confirm the backup upload.');return file;
 }
 async function download(file){
   if(!file||!revisions.some(r=>r.id===file.id))throw Error('Selected cloud revision is no longer available.');
   if(Number(file.size)>MAX_BACKUP)throw Error('Cloud ZIP exceeds the sync size limit.');
   const r=await drive(API+'/'+encodeURIComponent(file.id)+'?alt=media');const blob=await r.blob();if(blob.size>MAX_BACKUP)throw Error('Cloud ZIP exceeds the sync size limit.');return new File([blob],file.name,{type:'application/zip'});
 }
 function block(reason,remote){conflict={reason,remote};mark('Cloud and local history differ. Automatic syncing paused until you choose a version.');}
 async function push(hash,parentsList,guard){
   const before=tips(await list());
   if(guard!==cycle)return;
   if(parentsList.length){if(before.length!==1||before[0].id!==parentsList[0]){block('Cloud changed while preparing the backup. Both versions remain available.',before.at(-1)||null);return;}}
   else if(before.length){block('Existing cloud records appeared before the initial backup.',before.at(-1));return;}
   const file=await upload(hash,parentsList);
   if(guard!==cycle)return;
   const updated=await list();const current=tips(updated);
   if(!updated.some(f=>f.id===file.id))throw Error('Cloud upload could not be verified.');
   if(current.length!==1||current[0].id!==file.id){block('Another device uploaded simultaneously. Both revisions have been preserved.',current.at(-1));return;}
   head=file.id;baseHash=hash;persist();dirty=false;mark('Automatic backup saved to Google Drive · '+now());
   // If edits happened during upload, do not mark newer local records as synced.
   if(await local()!==hash)changed();
 }
 async function restoreCloud(remote,guard,automatic=false){
   if(activeDialog())throw Error('Close open editors before applying cloud updates.');
   const zip=await download(remote);if(guard!==cycle)return;
   // Guard every actual database replacement; retain a separate recovery ZIP.
   const before=await local();if(head&&before!==baseHash)throw Error('Local records changed while syncing. Review the conflict.');
   await upload(before,[],true);
   if(guard!==cycle)return;
   suspend=true;try{const restored=await restoreBackup(zip,{cloudApproved:true,notify:false});if(!restored)throw Error('Cloud restore was cancelled.');head=remote.id;baseHash=await local();persist();conflict=null;dirty=false;mark((automatic?'Updated from another device':'Cloud copy restored')+' · '+now());}finally{suspend=false;}
 }
 async function syncNow(manual=false,safety=false){
  if(!isReady()||polling||suspend||document.hidden&&!manual||!navigator.onLine)return;
  const guard=++cycle;polling=true;mark('Checking Google Drive for changes…');
  try{
   const hash=await local();const files=await list();if(guard!==cycle)return;
   const heads=tips(files);
   if(heads.length>1){block('Different devices saved diverging copies. Choose which version to activate; there is no automatic record merge.',heads.at(-1));return;}
   const remote=heads[0]||null;
   if(!remote){
    if(head){block('Your previous cloud history is missing; no local records will be overwritten.',null);return;}
    await push(hash,[],guard);return;
   }
   if(!head){
    if(hash===remote.appProperties?.hash){head=remote.id;baseHash=hash;persist();conflict=null;mark('Cloud and device data already match. Sync enabled.');return;}
    block('This device has not joined the existing cloud history yet. Choose which full backup to use.',remote);return;
   }
   if(remote.id===head){
    if(hash!==baseHash){await push(hash,[head],guard);return;}
    if(safety){const saved=await upload(hash,[],true);mark('Additional safety backup saved · '+now());return;}
    conflict=null;mark('Everything is up to date · '+now());return;
   }
   if(ancestor(files,head,remote.id)&&hash===baseHash){
    if(activeDialog()){mark('New cloud records are ready. Close the current editor to apply them.');return;}
    await restoreCloud(remote,guard,true);return;
   }
   block(hash!==baseHash?'Both devices have made changes since the last common backup.':'Cloud history diverged or a prior revision is missing.',remote);
  }catch(e){mark('Sync paused: '+(e.message||e));}finally{polling=false;}
 }
 function changed(){if(suspend||!isReady()||conflict)return;dirty=true;if(scheduled)clearTimeout(scheduled);scheduled=setTimeout(()=>{scheduled=null;syncNow(false).catch(()=>{})},18000);}
 function connected(){authReady=true;const identity=CLOUD.email();if(email&&email!==identity){authReady=false;mark('This device was synced to another Google account. Unlink first to protect existing records.');return;}email=identity;persist();mark('Google Drive connected. Checking backups…');syncNow(true).catch(()=>{});}
 function disconnected(){authReady=false;cycle++;if(scheduled)clearTimeout(scheduled);scheduled=null;mark('Google disconnected. Local records are still available.');}
 function unlink(){disconnected();email='';head='';baseHash='';conflict=null;try{localStorage.removeItem(KEY)}catch{}mark('Cloud link removed. Existing records and cloud backup files remain.');}
 async function useCloud(){if(!conflict||!isReady()||polling)return;const remote=conflict.remote;if(!remote){mark('The cloud copy is unavailable. Keep this device and export a local ZIP.');return;}
  if(!confirm('Replace THIS DEVICE with the selected cloud backup? A safety copy of your local data will be uploaded to Google Drive first. Previous cloud copies remain available.'))return;
  polling=true;const guard=++cycle;try{
   const files=await list(),top=tips(files);if(!top.some(f=>f.id===remote.id))throw Error('The active cloud history changed. Sync again first.');
   if(top.length>1){
     const zip=await download(remote),hash=await local();await upload(hash,[],true);
     const joined=await uploadCloudCopy(zip,remote.appProperties?.hash,top.map(f=>f.id));
     const updated=tips(await list());if(updated.length!==1||updated[0].id!==joined.id)throw Error('Another device changed the cloud during conflict resolution.');
     suspend=true;try{await restoreBackup(zip,{cloudApproved:true,notify:false});head=joined.id;baseHash=await local();persist();conflict=null;mark('Cloud version restored; previous copies retained.');}finally{suspend=false;}
   }else await restoreCloud(remote,guard,false);
  }catch(e){mark('Restore stopped: '+e.message)}finally{polling=false;}
 }
 async function uploadCloudCopy(zip,hash,parentsList){
   if(!hash)throw Error('Remote revision lacks its integrity fingerprint.');
   const name=PREFIX+new Date().toISOString().replace(/[:.]/g,'-')+'_'+device+'.zip';
   const boundary='tl_'+crypto.randomUUID().replaceAll('-','');
   const meta={name,parents:['appDataFolder'],mimeType:'application/zip',appProperties:{project:'truckledger',hash,device,parents:parentsList.join(',')}};
   const body=new Blob(['--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(meta)+'\r\n--'+boundary+'\r\nContent-Type: application/zip\r\n\r\n',zip,'\r\n--'+boundary+'--'],{type:'multipart/related; boundary='+boundary});
   const r=await drive('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,appProperties',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body});return r.json();
 }
 async function useLocal(){if(!conflict||!isReady()||polling)return;if(!confirm('Use THIS DEVICE as the active cloud version? Other cloud versions remain in the backup history. Download a local ZIP first if you have not already done so.'))return;
  polling=true;const guard=++cycle;try{const hash=await local(),top=tips(await list()),file=await upload(hash,top.map(f=>f.id));const after=tips(await list());if(after.length!==1||after[0].id!==file.id)throw Error('Another device uploaded during conflict resolution.');head=file.id;baseHash=hash;persist();conflict=null;dirty=false;mark('Local records are now active in Google Drive. Previous versions retained.');}catch(e){mark('Sync resolution failed: '+e.message)}finally{polling=false;}
 }
 async function init(){if(initialized)return;initialized=true;const prior=readLink();email=prior.email||'';head=prior.head||'';baseHash=prior.baseHash||'';device=prior.device||localStorage.getItem(DEVICE)||crypto.randomUUID();try{localStorage.setItem(DEVICE,device)}catch{}
  document.addEventListener('click',e=>{const b=e.target.closest('button[data-auto-sync]');if(!b)return;e.preventDefault();const action=b.dataset.autoSync;if(action==='check')syncNow(true);if(action==='backup')syncNow(true,true);if(action==='cloud')useCloud();if(action==='local')useLocal();if(action==='export')exportData('backup');});
  window.addEventListener('online',()=>{if(isReady())syncNow(false)});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&isReady())syncNow(false)});
  interval=setInterval(()=>{if(isReady()&&!document.hidden)syncNow(false)},60000);
 }
 return {init,panel,connected,disconnected,unlink,changed,syncNow,_test:{tips,ancestor}};
})();