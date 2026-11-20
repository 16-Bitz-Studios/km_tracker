/* TruckLedger Google Drive integration — optional, per-user cloud backups.
   No client secret or access token is stored in the repository or localStorage.
   Set GOOGLE_CLIENT_ID to the OAuth "Web application" client ID after setup. */
'use strict';
const CLOUD=(()=>{
  const GOOGLE_CLIENT_ID=''; // Public OAuth web client ID, configured by the app maintainer.
  const SCOPE='https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.email';
  const KEY='truckledger-google-linked-email-v1';
  const PREFIX='TruckLedger_Backup_';
  let token='',expires=0,busy=false,backups=[],email=localStorage.getItem(KEY)||'';
  const configured=()=>/^[0-9]+-[a-z0-9-]+\.apps\.googleusercontent\.com$/i.test(GOOGLE_CLIENT_ID);
  const authorized=()=>!!token&&Date.now()<expires;
  const ready=()=>configured()&&authorized();
  const html=s=>esc(s);
  const time=s=>s?new Date(s).toLocaleString('en-CA',{dateStyle:'medium',timeStyle:'short'}):'Unknown date';
  const apiError=async r=>{let message;try{const d=await r.json();message=d.error?.message||d.error_description;}catch{}return new Error(message||'Google Drive request failed ('+r.status+')');};
  function panel(){
    const notice=!configured()?'Google connection requires a one-time Google Cloud OAuth setup by the app developer. Until then, local backups continue working.':
      ready()?'Connected for this session — you can back up or restore.':
      email?'Previously linked. Tap Reconnect to authorize this session.':'Link your own Google account; only your own private backups will be accessible.';
    return '<div class="card" id="cloud-card"><div class="split-line"><strong>Google Drive cloud backup</strong><span class="tag '+(ready()?'work':'')+'">'+(ready()?'CONNECTED':configured()?'OPTIONAL':'SETUP NEEDED')+'</span></div>'+
      '<p class="hint">'+html(notice)+'</p>'+
      (email?'<p class="small muted">Account: <strong>'+html(email)+'</strong></p>':'')+
      '<div class="data-buttons">'+
      '<button class="btn block" data-cloud="link" '+(!configured()||busy?'disabled':'')+'>'+(email?'↻ Reconnect Google account':'Link Google Account')+'</button>'+
      (email?'<button class="btn secondary block" data-cloud="unlink" '+(busy?'disabled':'')+'>Unlink this account</button>':'')+
      '<button class="btn secondary block" data-cloud="backup" '+(!ready()||busy?'disabled':'')+'>☁ Back up to Google Drive</button>'+
      '<button class="btn secondary block" data-cloud="list" '+(!ready()||busy?'disabled':'')+'>↻ Find my cloud backups</button>'+
      '</div>'+
      (backups.length&&ready()?'<div class="form-field"><label for="cloud-file">Select backup to restore</label><select id="cloud-file">'+backups.map(x=>'<option value="'+html(x.id)+'">'+html(time(x.createdTime||x.modifiedTime)+' · '+(Number(x.size||0)/1024/1024).toFixed(1)+' MB')+'</option>').join('')+'</select></div><button class="btn warn block" data-cloud="restore" '+(busy?'disabled':'')+'>Restore selected cloud backup</button>':'')+
      '<p class="hint">Backups include your mileage, clients, prices, costs and receipts. They are stored in your Google account’s hidden app-data folder. This is manual backup, not live syncing. Keep a separate downloaded ZIP too.</p></div>';
  }
  function update(){if(typeof state!=='undefined'&&state.tab==='data'){const el=document.getElementById('cloud-card');if(el)el.outerHTML=panel();}}
  function setBusy(value){busy=value;update();}
  function requireOnline(){if(!navigator.onLine)throw new Error('Connect to the internet to use Google Drive. Your local records still work offline.');}
  async function googleFetch(url,options={}){
    if(!authorized())throw new Error('Google authorization expired. Tap Reconnect first.');
    const response=await fetch(url,{...options,headers:{...(options.headers||{}),Authorization:'Bearer '+token},cache:'no-store'});
    if(!response.ok)throw await apiError(response);
    return response;
  }
  async function grant(){
    requireOnline();
    if(!configured())throw new Error('Google OAuth Web Client ID has not been configured for TruckLedger.');
    if(!window.google?.accounts?.oauth2)throw new Error('Google sign-in is not loaded. Open TruckLedger in Safari while online, then try again.');
    return new Promise((resolve,reject)=>{
      const client=google.accounts.oauth2.initTokenClient({
        client_id:GOOGLE_CLIENT_ID,scope:SCOPE,
        callback:result=>{
          if(result.error||!result.access_token){reject(new Error(result.error_description||result.error||'Google sign-in was cancelled'));return;}
          resolve(result);
        },
        error_callback:()=>reject(new Error('Google sign-in popup was closed or blocked. Open TruckLedger in Safari and retry.'))
      });
      // Called from a user's tap to permit the authorization popup on iPhone.
      client.requestAccessToken({prompt:'select_account'});
    });
  }
  async function link(){
    if(busy)return;
    setBusy(true);
    try{
      const result=await grant();
      const tempToken=result.access_token;
      const info=await fetch('https://www.googleapis.com/oauth2/v3/userinfo',{headers:{Authorization:'Bearer '+tempToken},cache:'no-store'});
      if(!info.ok)throw await apiError(info);
      const profile=await info.json();
      if(!profile.email||profile.email_verified===false)throw new Error('Google did not provide a verified email address.');
      const chosen=profile.email.toLowerCase();
      if(email&&email!==chosen){
        throw new Error('This device is linked to '+email+'. Unlink that account first, then connect '+chosen+'. Local records will remain on this device.');
      }
      token=tempToken;expires=Date.now()+Math.max(0,Number(result.expires_in||3600)-60)*1000;
      email=chosen;localStorage.setItem(KEY,email);
      backups=[];toast('Google account linked: '+email);
      await listCore();
    }catch(e){alert('Google linking: '+e.message);}
    finally{setBusy(false);}
  }
  function unlink(){
    if(busy)return;
    if(!confirm('Unlink '+email+' from this device? Local records stay here, and cloud backups remain in that Google account.'))return;
    if(token&&window.google?.accounts?.oauth2)google.accounts.oauth2.revoke(token,()=>{});
    token='';expires=0;email='';backups=[];localStorage.removeItem(KEY);update();toast('Google account unlinked from this device');
  }
  async function listCore(){
    const url='https://www.googleapis.com/drive/v3/files?'+new URLSearchParams({
      spaces:'appDataFolder',q:"name contains '"+PREFIX+"' and trashed = false",
      fields:'nextPageToken,files(id,name,size,createdTime,modifiedTime)',
      orderBy:'createdTime desc',pageSize:'100'
    });
    const result=await (await googleFetch(url)).json();
    backups=(result.files||[]).filter(f=>f.name.startsWith(PREFIX)&&f.name.endsWith('.zip'));
    update();return backups;
  }
  async function list(){
    if(busy)return;setBusy(true);
    try{requireOnline();await listCore();toast(backups.length?backups.length+' cloud backup(s) found':'No cloud backups yet');}
    catch(e){alert('Cloud backup listing failed: '+e.message);}
    finally{setBusy(false);}
  }
  async function backup(){
    if(busy)return;setBusy(true);
    try{
      requireOnline();
      const blob=await makeExport('backup');
      const name=PREFIX+new Date().toISOString().replace(/[:.]/g,'-')+'.zip';
      const boundary='truckledger_'+Math.random().toString(36).slice(2);
      const meta=JSON.stringify({name,parents:['appDataFolder'],mimeType:'application/zip'});
      const body=new Blob(['--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+meta+'\r\n--'+boundary+'\r\nContent-Type: application/zip\r\n\r\n',blob,'\r\n--'+boundary+'--'],{type:'multipart/related; boundary='+boundary});
      const res=await googleFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,createdTime',{
        method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body
      });
      const file=await res.json();
      // Verify that the uploaded file is listed before reporting success.
      await listCore();
      if(!backups.some(b=>b.id===file.id))throw new Error('Upload completed, but verification could not find the backup. Please check cloud backups before relying on it.');
      toast('Cloud backup saved and verified');
      alert('Backup saved to '+email+'.\n\n'+name+'\n\nYou can also export a ZIP to Files for independent recovery.');
    }catch(e){alert('Cloud backup failed: '+e.message);}
    finally{setBusy(false);}
  }
  async function restore(){
    if(busy)return;
    const id=document.getElementById('cloud-file')?.value;
    const file=backups.find(f=>f.id===id);
    if(!file){alert('Select a cloud backup first.');return;}
    if(!confirm('Download the '+time(file.createdTime)+' backup from '+email+'?\n\nRestoring it will REPLACE your current local records after a second confirmation. Back up current records first.'))return;
    setBusy(true);
    try{
      requireOnline();
      const response=await googleFetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id)+'?alt=media');
      const blob=await response.blob();
      await restoreBackup(new File([blob],file.name,{type:'application/zip'}));
    }catch(e){alert('Cloud restore failed: '+e.message);}
    finally{setBusy(false);}
  }
  function bind(){
    document.addEventListener('click',event=>{
      const button=event.target.closest('button[data-cloud]');
      if(!button)return;
      event.preventDefault();
      if(button.dataset.cloud==='link')link();
      if(button.dataset.cloud==='unlink')unlink();
      if(button.dataset.cloud==='backup')backup();
      if(button.dataset.cloud==='list')list();
      if(button.dataset.cloud==='restore')restore();
    });
  }
  bind();
  return {panel};
})();