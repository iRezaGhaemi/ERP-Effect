/* ============================================================
   EFFECT ERP · Customer Project Workspace (v2.3)
   هاب عملیاتی پروژه مشتری — ۸ تب: نمای کلی/تسک‌ها/دارایی‌ها/برند/
   تقویم محتوا/گزارش‌ها/اعضا/تنظیمات
   ============================================================ */
let CP_F={folder:'',q:''};
let CP_UP={cid:'',folder:''};
function cpTab(v){S.tabs.cp=v;render();}

function cproView(){
  const route=parseRoute();const id=route.split('/')[1];
  if(!id)return cproList();
  const cp=cpro(id);
  if(!cp)return `<div class="pg">${emptyState('فضای کار یافت نشد','این پروژه مشتری حذف یا منتقل شده است.',`<button class="btn btn-pr btn-sm" onclick="go('#/crm')">بازگشت به CRM</button>`,'briefcase')}</div>`;
  const tab=S.tabs.cp||'ov';
  const c=cust(cp.cust),b=BRAND[cp.cust],p=prj(cp.prj);
  const ctasks=TASKS.filter(t=>t.project===cp.prj);
  const fwT=cpFwTotal(cp,'fw'),fwD=cpFwTotal(cp,'done');
  return `<div class="pg">${pgHead(cp.name,c.name+' · '+p.name,
   `<button class="btn btn-sec" onclick="cpOpenTask('${cp.id}')">${ic('plus',14)} تسک جدید</button>
    <button class="btn btn-ghost" onclick="go('#/crm')">${ic('arrowright',14)} CRM</button>`,
   [{t:'داشبورد'},{t:'CRM',h:'#/crm'},{t:cp.name}])}
  <div class="card mb16"><div class="cp-hero">
    <span class="cp-logo" style="background:${b.colors.primary}">${ic('briefcase',22)}</span>
    <div class="grow min0"><div class="row g8 wrap"><h2 class="t-h2">${cp.name}</h2>${stBadge(p.status)}</div>
     <p class="t-bs mt4">${c.name} · ${b.company} · ${ic('cal',12)} سررسید ${dFaL(p.due)}</p></div>
    <div class="row g16 mr-auto wrap">${avStack(cp.members.map(m=>emp(m).name))}<span class="t-cap">${fa(cp.members.length)} عضو</span></div>
  </div>
  <div class="row g8 px16 pb16 wrap">
    <span class="chip">${ic('kanban',12)} ${fa(ctasks.length)} تسک</span>
    <span class="chip">${ic('film',12)} ${fa(fwD)} از ${fa(fwT)} محتوای ماه</span>
    <span class="chip">${ic('folder',12)} ${fa(assetsOf(cp.cust).length)} دارایی</span>
    <span class="chip">${ic('tagi',12)} ${b.name}</span></div></div>
  ${tabsBar('cp',[
    {v:'ov',t:'نمای کلی'},{v:'tasks',t:'تسک‌ها',cnt:ctasks.length},{v:'assets',t:'دارایی‌ها',cnt:assetsOf(cp.cust).length},
    {v:'brand',t:'برند'},{v:'plan',t:'تقویم محتوا'},{v:'reports',t:'گزارش‌ها'},{v:'members',t:'اعضا',cnt:cp.members.length},
    {v:'settings',t:'تنظیمات'}],tab,'cpTab')}
  <div class="card"><div class="sub-tab-body">
  ${tab==='ov'?cpTabOv(cp,ctasks,fwT,fwD)
  :tab==='tasks'?cpTabTasks(cp,ctasks)
  :tab==='assets'?cpTabAssets(cp)
  :tab==='brand'?cpTabBrand(cp)
  :tab==='plan'?cpTabPlan(cp)
  :tab==='reports'?cpTabReports(cp,ctasks)
  :tab==='members'?cpTabMembers(cp)
  :cpTabSettings(cp)}
  </div></div></div>`;
}

/* ---------- helpers ---------- */
const CP_TYPES=[['post','پست','image'],['reel','ریلز','film'],['story','استوری','book'],['video','ویدیو','film'],['image','تصویری','palette'],['ad','تبلیغاتی','chart'],['edu','آموزشی','type'],['event','مناسبتی','cal']];
function cpFwTotal(cp,key){const f=cp[key];return CP_TYPES.reduce((a,[k])=>a+(f[k]||0),0)+(f.custom||[]).reduce((a,x)=>a+x.n,0);}
function cpPct(d,t){return t?Math.round(d/t*100):0;}
function cpOpenTask(cpid){const cp=cpro(cpid);closeDrawer();taskModal(null);/* پروژه در مودال انتخاب می‌شود */}

/* ---------- تب نمای کلی ---------- */
function cpTabOv(cp,ctasks,fwT,fwD){
  const b=BRAND[cp.cust];
  const act=ctasks.filter(t=>t.status!=='done');
  const doing=ctasks.filter(t=>t.status==='doing').length;
  return `<div class="grid grid-4 mb16">
   <div class="kpi"><div class="k-l">${ic('kanban',14)}تعداد تسک‌ها</div><div class="k-v num">${fa(ctasks.length)}</div><div class="k-d">${fa(act.length)} فعال</div></div>
   <div class="kpi"><div class="k-l">${ic('check',14)}تسک‌های انجام‌شده</div><div class="k-v num">${fa(ctasks.filter(t=>t.status==='done').length)}</div><div class="k-d up">${fa(cpPct(ctasks.filter(t=>t.status==='done').length,ctasks.length))}٪ کل</div></div>
   <div class="kpi"><div class="k-l">${ic('clock',14)}در حال انجام</div><div class="k-v num">${fa(doing)}</div><div class="k-d">${fa(ctasks.filter(t=>t.status==='review').length)} در انتظار بررسی</div></div>
   <div class="kpi"><div class="k-l">${ic('chart',14)}پیشرفت پروژه</div><div class="k-v num">${fa(cp.progress)}٪</div><div class="prog mt8"><i style="width:${cp.progress}%"></i></div></div>
   <div class="kpi"><div class="k-l">${ic('film',14)}محتوای تولیدشده</div><div class="k-v num">${fa(fwD)}</div><div class="k-d up">${fa(cpPct(fwD,fwT))}٪ چارچوب ماه</div></div>
   <div class="kpi"><div class="k-l">${ic('clock',14)}محتوای باقی‌مانده</div><div class="k-v num">${fa(fwT-fwD)}</div><div class="k-d dn">از ${fa(fwT)} محتوای ماه</div></div>
   <div class="kpi"><div class="k-l">${ic('image',14)}پست ماه</div><div class="k-v num">${fa(cp.fw.post||0)}</div><div class="k-d">${fa(cp.done.post||0)} تولیدشده</div></div>
   <div class="kpi"><div class="k-l">${ic('film',14)}ریلز ماه</div><div class="k-v num">${fa(cp.fw.reel||0)}</div><div class="k-d">${fa(cp.done.reel||0)} تولیدشده</div></div>
   <div class="kpi"><div class="k-l">${ic('book',14)}استوری ماه</div><div class="k-v num">${fa(cp.fw.story||0)}</div><div class="k-d">${fa(cp.done.story||0)} تولیدشده</div></div></div>
  <div class="grid grid-2" style="gap:16px">
   <div><h4 class="t-h4 mb8">چارچوب محتوای ماه</h4>
    <div class="panel" style="padding:12px">${CP_TYPES.filter(([k])=>cp.fw[k]).map(([k,t])=>{const d=cp.done[k]||0,n=cp.fw[k]||0;return `
     <div class="plan-row"><span class="nm">${t}</span><div class="prog"><i style="width:${cpPct(d,n)}%"></i></div><span class="pc num">${fa(d)}/${fa(n)}</span></div>`;}).join('')}
    ${(cp.fw.custom||[]).map(x=>`<div class="plan-row"><span class="nm">${x.t}</span><div class="prog"><i style="width:${cpPct((cp.done.custom||[]).find(c=>c.t===x.t)?((cp.done.custom||[]).find(c=>c.t===x.t).n):0,x.n)}%"></i></div><span class="pc num">${fa((cp.done.custom||[]).find(c=>c.t===x.t)?((cp.done.custom||[]).find(c=>c.t===x.t).n):0)}/${fa(x.n)}</span></div>`).join('')}</div>
    <button class="btn btn-sec btn-sm mt8" onclick="S.tabs.cp='plan';render()">${ic('cal',13)} تقویم کامل محتوا</button></div>
   <div><h4 class="t-h4 mb8">خلاصه بریف پروژه</h4>
    <div class="panel" style="padding:12px">
     <div class="mb8"><span class="t-lbl">اهداف</span><p class="t-bs mt4">${cp.brief.goals}</p></div>
     <div class="mb8"><span class="t-lbl">لحن برند</span><p class="t-bs mt4">${cp.brief.tone}</p></div>
     <div><span class="t-lbl">ممنوعه‌ها</span><p class="t-bs mt4" style="color:var(--err)">${cp.brief.banned}</p></div></div>
    <button class="btn btn-sec btn-sm mt8" onclick="S.tabs.cp='settings';render()">${ic('book',13)} بریف کامل</button></div>
  </div>`;
}

/* ---------- تب تسک‌ها (برد اختصاصی پروژه) ---------- */
function cpTabTasks(cp,ctasks){
  return `<div class="kb-board">${ST_COLS.map(col=>{
    const ts=ctasks.filter(t=>t.status===col.id);
    return `<div class="kb-col"><div class="kb-ch"><b class="t-bs">${col.t}</b><span class="cnt num">${fa(ts.length)}</span>
      <button class="ibtn kb-add" data-tip="تسک جدید در این ستون" onclick="cpOpenTask('${cp.id}')">${ic('plus',14)}</button></div>
     ${ts.map(t=>`<div class="kb-card" draggable="true" ondragstart="kbDrag(event,'${t.id}')" ondragend="this.classList.remove('dragging')" onclick="taskDrawer('${t.id}')" ondragover="event.preventDefault();this.classList.add('dragover')" ondragleave="this.classList.remove('dragover')" ondrop="kbDrop(event,'${col.id}')">
      ${t.labels.length?`<div class="kb-lbs mb8">${t.labels.slice(0,3).map(l=>lbChip(l)).join('')}</div>`:''}
      <div class="meta">${prioBadge(t.prio)}</div>
      <div class="tt">${t.title}</div>
      <div class="row g6 mb8 wrap">${dueBadge(t.due)}</div>
      ${t.checklist.length?`<div class="row g6 mb8"><div class="prog" style="flex:1;min-width:60px"><i style="width:${Math.round(ckDone(t)/t.checklist.length*100)}%"></i></div><span class="t-cap">${ic('check',11)} ${fa(ckDone(t))}/${fa(t.checklist.length)}</span></div>`:''}
      <div class="kb-f">
        <span class="kb-ico" data-tip="چک‌لیست">${ic('check',12)} ${fa(ckDone(t))}/${fa(t.checklist.length)}</span>
        ${t.cm?`<span class="kb-ico" data-tip="کامنت">${ic('msg',12)} ${fa(t.cm)}</span>`:''}
        ${t.att?`<span class="kb-ico" data-tip="پیوست">${ic('paperclip',12)} ${fa(t.att)}</span>`:''}
        <span class="mr-auto" data-tip="${emp(t.assignee).name}">${av(emp(t.assignee).name,'xs')}</span></div></div>`).join('')||`<div class="kb-empty">${fa(0)} تسک</div>`}
    </div>`;}).join('')}</div>`;
}

/* ---------- تب دارایی‌ها ---------- */
const CP_FILEIC={SVG:'palette',PNG:'image',WOFF2:'type',PDF:'book',ZIP:'folder',MP4:'film',PSD:'palette',JPG:'image'};
const brandOf=cid=>BRAND[cid]||{name:cust(cid).name,company:cust(cid).name,desc:'—',slogan:'—',web:'—',ig:'—',social:'—',
  colors:{primary:'#6F6AEB',secondary:'#FFFFFF',bg:'#F6F6F8',text:'#1A1A24',accent:'#0E7C93'},fonts:{heading:'IRANSansX',body:'IRANSansX'},guideFile:'—'};
function cpTabAssets(cp){return assetsHtml(cp.cust);}
function assetsHtml(cid){
  const all=assetsOf(cid);
  const list=all.filter(a=>(!CP_F.folder||a.folder===CP_F.folder)&&(!CP_F.q||a.name.includes(CP_F.q)));
  return `<div class="dropzone mb16" id="cp-dz" onclick="cpUpModal('${cid}','${CP_F.folder}')"
     ondragover="event.preventDefault();this.classList.add('over')" ondragleave="this.classList.remove('over')"
     ondrop="event.preventDefault();this.classList.remove('over');cpFakeUpload('${cid}','${CP_F.folder}')">
    ${ic('upload',24)}<b class="t-bs mt8">فایل را اینجا رها کنید یا کلیک کنید</b>
    <span class="t-cap">حداکثر ۲۵۰ مگابایت · فرمت‌های مجاز تصویر، ویدیو، فونت و سند</span></div>
  <div class="row g8 mb12 wrap">
   <button class="chip ${!CP_F.folder?'chip-sel on':''}" onclick="CP_F.folder='';render()">همه (${fa(all.length)})</button>
   ${ASSET_FOLDERS.map(([k,t])=>{const n=all.filter(a=>a.folder===k).length;return n?`<button class="chip ${CP_F.folder===k?'chip-sel on':''}" onclick="CP_F.folder='${k}';render()">${t} (${fa(n)})</button>`:'';}).join('')}
   <span class="mr-auto"></span>
   <div class="inp-ic" style="width:200px"><input class="inp" style="height:32px;padding-left:32px" placeholder="جستجوی فایل…" value="${CP_F.q}" oninput="CP_F.q=this.value;debRender()"></div></div>
  ${list.length?`<div class="asset-grid">${list.map(a=>`
   <div class="card asset-card">
    <div class="asset-th ${a.type==='MP4'||a.type==='ZIP'||a.type==='PSD'?'':''}"><span class="asset-ic" style="background:var(--pr-soft);color:var(--pr)">${ic(CP_FILEIC[a.type]||'file',18)}</span></div>
    <div class="min0 grow"><b class="t-bs ellip" title="${a.name}">${a.name}</b>
     <span class="t-cap">${a.type} · ${a.size} · ${dFaL(a.date)}</span></div>
    <div class="asset-acts">
     <button class="ibtn" data-tip="پیش‌نمایش" onclick="cpAssetPrev('${a.id}')">${ic('eye',14)}</button>
     <button class="ibtn" data-tip="دانلود" onclick="toast('ok','دانلود شروع شد','${a.name}')">${ic('download',14)}</button>
     <button class="ibtn" data-tip="کپی لینک" onclick="toast('ok','لینک کپی شد','effectstudio.ir/d/${a.cust}/${a.id}')">${ic('link',14)}</button>
     <button class="ibtn" data-tip="تغییر نام" onclick="cpAssetRename('${a.id}')">${ic('edit',14)}</button>
     <button class="ibtn" data-tip="انتقال" onclick="cpAssetMove('${a.id}')">${ic('folder',14)}</button>
     <button class="ibtn ibtn-err" data-tip="حذف" onclick="cpAssetDel('${a.id}')">${ic('trash',14)}</button></div></div>`).join('')}</div>`
   :`<div class="empty-mini">${ic('folder',16)} دارایی‌ای در این پوشه نیست</div>`}`;
}
function cpUpModal(cid,folder){
  CP_UP={cid,folder:folder||'photos'};
  openModal({title:'بارگذاری دارایی جدید',body:`
   <div class="dropzone" style="padding:24px" onclick="document.getElementById('cp-file').click()">${ic('upload',22)}<b class="t-bs mt8">انتخاب فایل از سیستم</b><span class="t-cap">یا فایل را اینجا رها کنید</span></div>
   <input type="file" id="cp-file" class="hide" multiple onchange="cpDoUpload(this)">
   <div class="frow mt12">
    ${fld('نام نمایشی','<input class="inp" id="cp-fn" placeholder="مثلاً: عکس محصولات فصل">')}
    ${fld('پوشه مقصد',selWrap('cp-ff',ASSET_FOLDERS.map(([k,t])=>({v:k,t})),CP_UP.folder))}</div>`,
  footer:`<button class="btn btn-pr" onclick="cpDoUpload(null)">${ic('upload',14)} بارگذاری</button><button class="btn btn-ghost" onclick="closeModal()">انصراف</button>`});
}
function cpDoUpload(inp){
  const fn=$('#cp-fn')?$('#cp-fn').value.trim():'';
  const ff=$('#cp-ff')?$('#cp-ff').value:'photos';
  const names=inp&&inp.files&&inp.files.length?[...inp.files].map(f=>f.name):(fn?[fn+'.zip']:['new-asset.zip']);
  names.forEach(n=>{const ext=(n.split('.').pop()||'zip').toUpperCase();
    ASSETS.unshift({id:uid('a'),cust:CP_UP.cid,folder:ff,name:n,type:ext,size:'۲.۴ MB',by:'e1',date:'1405/06/28'});});
  closeModal();render();toast('ok','بارگذاری شد',fa(names.length)+' فایل به «'+(ASSET_FOLDERS.find(f=>f[0]===ff)||['',''])[1]+'» افزوده شد.');
}
function cpFakeUpload(cid,folder){cpUpModal(cid,folder);setTimeout(()=>cpDoUpload(null),400);}
function cpAssetPrev(id){const a=ASSETS.find(x=>x.id===id);const icn=CP_FILEIC[a.type]||'file';
  openModal({title:a.name,body:`<div class="panel" style="padding:32px;text-align:center"><span class="asset-ic lg" style="background:var(--pr-soft);color:var(--pr)">${ic(icn,36)}</span>
   <p class="t-bs mt12">${a.name}</p><span class="t-cap">${a.type} · ${a.size} · بارگذاری ${dFaL(a.date)} توسط ${emp(a.by).name}</span></div>
   <div class="row g8 mt12 wrap">${ASSET_FOLDERS.find(f=>f[0]===a.folder)?`<span class="chip">${ic('folder',12)} ${(ASSET_FOLDERS.find(f=>f[0]===a.folder))[1]}</span>`:''}<span class="chip">${ic('userplus',12)} ${emp(a.by).name}</span></div>`,
  footer:`<button class="btn btn-pr" onclick="toast('ok','دانلود شروع شد','${a.name}')">${ic('download',14)} دانلود</button><button class="btn btn-ghost" onclick="closeModal()">بستن</button>`});}
function cpAssetRename(id){const a=ASSETS.find(x=>x.id===id);
  openModal({title:'تغییر نام دارایی',body:fld('نام جدید',`<input class="inp" id="cp-rn" value="${a.name}">`),
  footer:`<button class="btn btn-pr" onclick="(function(){const v=document.getElementById('cp-rn').value.trim();if(!v)return;ASSETS.find(x=>x.id==='${id}').name=v;closeModal();render();toast('ok','نام تغییر کرد','${a.name} ← '+v);})()">ذخیره</button><button class="btn btn-ghost" onclick="closeModal()">انصراف</button>`});}
function cpAssetMove(id){const a=ASSETS.find(x=>x.id===id);
  openModal({title:'انتقال دارایی',body:`<p class="t-bs mb12">${a.name}</p>`+fld('پوشه مقصد',selWrap('cp-mf',ASSET_FOLDERS.map(([k,t])=>({v:k,t})),a.folder)),
  footer:`<button class="btn btn-pr" onclick="(function(){const v=document.getElementById('cp-mf').value;ASSETS.find(x=>x.id==='${id}').folder=v;closeModal();render();toast('ok','انتقال انجام شد','به «'+(ASSET_FOLDERS.find(f=>f[0]===v)||['',''])[1]+'»');})()">انتقال</button><button class="btn btn-ghost" onclick="closeModal()">انصراف</button>`});}
function cpAssetDel(id){const a=ASSETS.find(x=>x.id===id);
  confirmDlg('حذف دارایی','از حذف «'+a.name+'» مطمئن هستید؟ این عمل قابل بازگشت نیست.',()=>{ASSETS.splice(ASSETS.findIndex(x=>x.id===id),1);render();toast('ok','دارایی حذف شد',a.name);},'حذف',true);}

/* ---------- تب برند ---------- */
function cpTabBrand(cp){return brandHtml(cp.cust);}
function brandHtml(cid){
  const b=brandOf(cid);
  const CF=[['primary','اصلی'],['secondary','ثانویه'],['bg','پس‌زمینه'],['text','متن'],['accent','تأکیدی']];
  return `<div class="grid grid-2" style="gap:16px">
   <div><h4 class="t-h4 mb8">اطلاعات برند</h4>
    <div class="panel" style="padding:16px">
     ${[['name','نام برند'],['company','شرکت'],['slogan','شعار'],['desc','توضیح'],['web','وب‌سایت'],['ig','اینستاگرام'],['social','سایر شبکه‌ها']].map(([k,l])=>`
      <div class="frow mb8" style="align-items:flex-start"><span class="t-lbl" style="min-width:104px">${l}</span><span class="t-bs grow min0">${b[k]||'—'}</span></div>`).join('')}
     <div class="row g8 mt12"><button class="btn btn-sec btn-sm" onclick="toast('info','ویرایش برند','در نسخه متصل به سرور فعال است.')">${ic('edit',13)} ویرایش</button>
      <button class="btn btn-sec btn-sm" onclick="toast('ok','Brand Kit دانلود شد','${b.guideFile}')">${ic('download',13)} Brand Kit</button></div></div>
    <h4 class="t-h4 mt16 mb8">فونت‌های برند</h4>
    <div class="panel" style="padding:16px">
     <div class="frow mb8"><span class="t-lbl" style="min-width:104px">تیترها</span><span class="t-bs">${b.fonts.heading}</span></div>
     <div class="frow"><span class="t-lbl" style="min-width:104px">متن</span><span class="t-bs">${b.fonts.body}</span></div></div></div>
   <div><h4 class="t-h4 mb8">پالت رنگ برند</h4>
    <div class="panel" style="padding:16px">
     ${CF.map(([k,l])=>`<div class="swatch-row">
       <span class="swatch lg" style="background:${b.colors[k]}"></span>
       <div class="grow min0"><b class="t-bs">${l}</b><span class="t-cap num">${b.colors[k]}</span></div>
       <button class="ibtn" data-tip="کپی HEX" onclick="toast('ok','کپی شد','${b.colors[k]}')">${ic('copy',13)}</button>
       <button class="ibtn" data-tip="ویرایش رنگ" onclick="cpColorPick('${cid}','${k}')">${ic('palette',13)}</button></div>`).join('')}
     <p class="t-cap mt8">${ic('swatch',12)} رنگ‌ها مبنای تولید محتوا و قالب‌های این مشتری هستند.</p></div>
    <h4 class="t-h4 mt16 mb8">راهنمای برند</h4>
    <div class="panel" style="padding:16px"><div class="row g8 wrap">
     <span class="chip">${ic('book',12)} ${b.guideFile}</span>
     <button class="btn btn-sec btn-sm" onclick="toast('ok','دانلود شروع شد','${b.guideFile}')">${ic('download',13)} دانلود</button>
     <button class="btn btn-sec btn-sm" onclick="toast('info','مشاهده آنلاین','در نسخه متصل فعال است.')">${ic('eye',13)} مشاهده</button></div></div></div>
  </div>`;
}
function cpColorPick(cid,key){
  const b=BRAND[cid];
  openModal({title:'ویرایش رنگ '+({primary:'اصلی',secondary:'ثانویه',bg:'پس‌زمینه',text:'متن',accent:'تأکیدی'}[key]),body:`
   <div class="row g12"><span class="swatch xl" id="cc-sw" style="background:${b.colors[key]}"></span>
    ${fld('کد HEX',`<input class="inp num" id="cc-hex" value="${b.colors[key]}" oninput="document.getElementById('cc-sw').style.background=this.value">`)}</div>
   <p class="t-cap mt8">${ic('lock',12)} تغییر پالت برند روی قالب‌های محتوای این مشتری اعمال می‌شود.</p>`,
  footer:`<button class="btn btn-pr" onclick="(function(){const v=document.getElementById('cc-hex').value.trim();BRAND['${cid}'].colors['${key}']=v;closeModal();render();toast('ok','رنگ به‌روزرسانی شد',v);})()">ذخیره</button><button class="btn btn-ghost" onclick="closeModal()">انصراف</button>`});
}

/* ---------- تب تقویم محتوا ---------- */
function cpTabPlan(cp){
  const rows=CP_TYPES.filter(([k])=>cp.fw[k]||cp.done[k]).map(([k,t])=>{const n=cp.fw[k]||0,d=cp.done[k]||0;return {t,n,d,r:Math.max(n-d,0)};})
   .concat((cp.fw.custom||[]).map(x=>({t:x.t,n:x.n,d:(cp.done.custom||[]).find(c=>c.t===x.t)?((cp.done.custom||[]).find(c=>c.t===x.t).n):0})));
  const tot=rows.reduce((a,r)=>a+r.n,0),don=rows.reduce((a,r)=>a+r.d,0),rem=tot-don;
  const months=['خرداد ۱۴۰۵','تیر ۱۴۰۵','مرداد ۱۴۰۵','شهریور ۱۴۰۵'];
  const mi=S._cpMonth!=null?S._cpMonth:2;const month=months[mi];
  return `<div class="row g8 mb12 wrap"><span class="t-lbl">${ic('cal',13)} ماه انتخاب شده:</span>
   ${months.map((m,i)=>`<button class="chip ${i===mi?'chip-sel on':''}" onclick="S._cpMonth=${i};render()">${m}</button>`).join('')}</div>
  <div class="grid grid-4 mb16">
   <div class="kpi"><div class="k-l">${ic('chart',14)}هدف ماه</div><div class="k-v num">${fa(tot)}</div><div class="k-d">${month}</div></div>
   <div class="kpi"><div class="k-l">${ic('check',14)}تکمیل‌شده</div><div class="k-v num">${fa(don)}</div><div class="k-d up">${fa(cpPct(don,tot))}٪</div></div>
   <div class="kpi"><div class="k-l">${ic('clock',14)}باقی‌مانده</div><div class="k-v num">${fa(rem)}</div><div class="k-d dn">${fa(Math.max(0,rem-Math.round(tot/4)))} عقب‌از‌برنامه</div></div>
   <div class="kpi"><div class="k-l">${ic('film',14)}نرخ انتشار</div><div class="k-v num">${fa(Math.round(don/4.3*10)/10)}</div><div class="k-d">محتوا در روز</div></div></div>
  <div class="grid grid-2" style="gap:16px">
   <div><h4 class="t-h4 mb8">چارچوب تولید ماهانه</h4>
    <div class="panel" style="padding:12px">
     <div class="plan-row plan-hd"><span class="nm">نوع محتوا</span><div class="prog-hd"></div><span class="pc">هدف · انجام · باقی</span></div>
     ${rows.map(r=>`<div class="plan-row"><span class="nm">${r.t}</span><div class="prog"><i style="width:${cpPct(r.d,r.n)}%"></i></div><span class="pc num">${fa(r.n)} · ${fa(r.d)} · <b style="color:${r.r>0?'var(--err)':'var(--ok)'}">${fa(r.r)}</b></span></div>`).join('')}
     <div class="plan-row plan-tot"><span class="nm">جمع</span><div class="prog"><i style="width:${cpPct(don,tot)}%"></i></div><span class="pc num">${fa(tot)} · ${fa(don)} · ${fa(rem)}</span></div></div>
    <button class="btn btn-sec btn-sm mt8" onclick="toast('info','ویرایش چارچوب','در نسخه متصل به سرور فعال است.')">${ic('edit',13)} ویرایش چارچوب</button></div>
   <div><h4 class="t-h4 mb8">تقویم انتشار — ${month}</h4>
    <div class="panel" style="padding:12px">
     <div class="cp-cal">${['ش','ی','د','س','چ','پ','ج'].map(d=>`<span class="cp-cal-h">${d}</span>`).join('')}
      ${cpCalCells(cp).map(c=>`<span class="cp-cal-d ${c.n?'has':''} ${c.today?'today':''}" ${c.n?`data-tip="${fa(c.n)} محتوا"`:''}>${fa(c.d)}</span>`).join('')}</div>
     <div class="row g12 mt12 wrap"><span class="row g6"><i class="cp-dot"></i><span class="t-cap">روز با انتشار</span></span>
      <span class="row g6"><i class="cp-dot" style="background:var(--bd)"></i><span class="t-cap">بدون انتشار</span></span>
      <span class="row g6"><i class="cp-dot" style="background:var(--pr)"></i><span class="t-cap">امروز</span></span></div></div>
    <p class="t-cap mt8">${ic('cal',12)} برنامه انتشار بر اساس چارچوب ماهانه به‌صورت خودکار توزیع شده است.</p></div>
  </div>`;
}
function cpCalCells(cp){
  const cells=[];const don=cpFwTotal(cp,'done');
  const days=cpDonDays(cp);
  for(let i=1;i<=31;i++)cells.push({d:i,n:days[i]||0,today:i===28});
  const off=5; /* شروع ماه: جمعه */
  for(let i=0;i<off;i++)cells.unshift({d:0,n:0});
  return cells;
}
function cpDonDays(cp){
  /* توزیع واقع‌نمایانه انتشارها روی روزهای ماه */
  const map={};let pool=[];
  CP_TYPES.forEach(([k])=>{for(let i=0;i<(cp.done[k]||0);i++)pool.push(k);});
  (cp.done.custom||[]).forEach(x=>{for(let i=0;i<x.n;i++)pool.push('x');});
  const step=Math.max(1,Math.floor(31/Math.max(pool.length,1)));
  pool.forEach((k,i)=>{const d=Math.min(31,1+i*step);map[d]=(map[d]||0)+1;});
  return map;
}

/* ---------- تب گزارش‌ها ---------- */
function cpTabReports(cp,ctasks){
  const done=ctasks.filter(t=>t.status==='done').length;
  const months=[['فروردین',32],['اردیبهشت',45],['خرداد',51],['تیر',58],['مرداد',cpFwTotal(cp,'done')]];
  const mx=Math.max(...months.map(m=>m[1]));
  return `<div class="grid grid-4 mb16">
   <div class="kpi"><div class="k-l">${ic('check',14)}تسک‌های انجام‌شده</div><div class="k-v num">${fa(done)}</div><div class="k-d">از ${fa(ctasks.length)} تسک</div></div>
   <div class="kpi"><div class="k-l">${ic('clock',14)}میانگین تحویل</div><div class="k-v num">${fa(4.2)}<span class="un">روز</span></div><div class="k-d up">۰.۸ روز بهتر از هدف</div></div>
   <div class="kpi"><div class="k-l">${ic('chart',14)}نرخ تایید اول</div><div class="k-v num">${fa(78)}٪</div><div class="k-d">میانگین صناعت ۷۰٪</div></div>
   <div class="kpi"><div class="k-l">${ic('users',14)}رضایت مشتری</div><div class="k-v num">${fa(4.6)}<span class="un">/۵</span></div><div class="k-d up">نظرسنجی مرداد</div></div></div>
  <h4 class="t-h4 mb8">روند انتشار محتوا (۵ ماه اخیر)</h4>
  <div class="panel mb16" style="padding:16px">
   <div class="bar-chart">${months.map(([m,v])=>`<div class="bar-col"><div class="bar-val num">${fa(v)}</div><div class="bar" style="height:${Math.round(v/mx*120)}px"></div><span class="bar-lb">${m}</span></div>`).join('')}</div></div>
  <h4 class="t-h4 mb8">عملکرد اعضای پروژه</h4>
  ${tblInit('cp-rp',[
    {k:'name',l:'عضو',mobFull:true,r:m=>`<span class="row g6">${av(emp(m).name,'xs')}<b>${emp(m).name}</b></span>`},
    {k:'role',l:'نقش',hideMob:true,r:m=>`<span class="t2c">${emp(m).role}</span>`},
    {k:'done',l:'تحویل‌شده',num:true,r:m=>`<span class="num t2c">${fa(3+m.length)}</span>`},
    {k:'load',l:'بار کاری',r:m=>`<div class="row g8"><div class="prog" style="width:70px"><i style="width:${emp(m).load}%"></i></div><span class="ts num">${fa(emp(m).load)}٪</span></div>`}],
   cp.members.map(m=>Object.assign({name:emp(m).name,role:emp(m).role,done:0,load:emp(m).load,id:m})),
   {per:6,empty:'عضوی ندارد'})}`;
}

/* ---------- تب اعضا ---------- */
function cpTabMembers(cp){
  return `<div class="row g8 mb12"><button class="btn btn-sec btn-sm" onclick="cpAddMember('${cp.id}')">${ic('userplus',13)} افزودن عضو</button>
   <span class="t-cap">${fa(cp.members.length)} نفر به این فضای کاری دسترسی دارند</span></div>
  <div class="grid grid-3">${cp.members.map(m=>{const e=emp(m);return `
   <div class="card" style="padding:16px;cursor:pointer" onclick="go('#/team/${e.id}')">
    <div class="row">${av(e.name,'lg')}
     <div class="grow min0"><b class="t-h4" style="display:block" class="ellip">${e.name}</b><span class="t-cap">${e.role}</span></div></div>
    <div class="row g6 mt12 wrap"><span class="tag">${e.dept}</span>
     <span class="badge bd-${e.status==='in'?'ok':e.status==='leave'?'warn':'mut'}"><span class="dot"></span>${{in:'در دفتر',remote:'دورکار',leave:'مرخصی',off:'غیرفعال'}[e.status]}</span>
     <span class="tag">دسترس: ${m===cp.members[0]?'مدیر پروژه':'عضو'}</span></div></div>`;}).join('')}</div>`;
}
function cpAddMember(cpid){const cp=cpro(cpid);
  openModal({title:'افزودن عضو به فضای کاری',body:`
   ${fld('همکار',selWrap('cp-mem',EMP.filter(e=>!cp.members.includes(e.id)).map(e=>({v:e.id,t:e.name+' — '+e.role})),''))}
   <div class="row g8 mt12 wrap">${EMP.filter(e=>!cp.members.includes(e.id)).slice(0,5).map(e=>`<button class="chip" onclick="document.getElementById('cp-mem').value='${e.id}'">${av(e.name,'xs')} ${e.name}</button>`).join('')}</div>`,
  footer:`<button class="btn btn-pr" onclick="(function(){const v=document.getElementById('cp-mem').value;if(!v)return;CPRO.find(c=>c.id==='${cpid}').members.push(v);closeModal();render();toast('ok','عضو افزوده شد',emp(v).name+' به فضای کاری دسترسی یافت.');})()">افزودن</button><button class="btn btn-ghost" onclick="closeModal()">انصراف</button>`});
}

/* ---------- تب تنظیمات + بریف + برچسب‌ها ---------- */
function cpTabSettings(cp){
  const bf=cp.brief;
  const BF=[['goals','اهداف'],['audience','مخاطب هدف'],['tone','لحن برند'],['guide','راهنمای تولید'],['banned','ممنوعه‌ها'],['competitors','رقبا'],['cta','دعوت به اقدام'],['platforms','پلتفرم‌ها'],['notes','ملاحظات']];
  return `<h4 class="t-h4 mb8">بریف پروژه</h4>
  <div class="panel" style="padding:16px">
   ${BF.map(([k,l])=>`<div class="mb12"><span class="t-lbl">${l}</span><p class="t-bs mt4" style="color:${k==='banned'?'var(--err)':'var(--t2)'}">${bf[k]}</p></div>`).join('')}
   <div><span class="t-lbl">موضوعات محتوایی</span><div class="row g6 mt8 wrap">${bf.topics.map(t=>`<span class="tag pr">${t}</span>`).join('')}</div></div>
   <div class="row g8 mt16"><button class="btn btn-sec btn-sm" onclick="toast('info','ویرایش بریف','در نسخه متصل به سرور فعال است.')">${ic('edit',13)} ویرایش بریف</button>
    <button class="btn btn-sec btn-sm" onclick="toast('ok','PDF بریف ساخته شد','brief-${cp.id}.pdf')">${ic('download',13)} خروجی PDF</button></div></div>
  <h4 class="t-h4 mt20 mb8">برچسب‌های این فضای کاری</h4>
  <div class="panel" style="padding:16px">${lbPicker(LABELS.map(l=>l.id),'__ro')}
   <p class="t-cap mt8">${ic('tagi',12)} برچسب‌ها در تنظیمات فضای کاری به‌صورت متمرکز مدیریت می‌شوند.</p>
   <button class="btn btn-sec btn-sm mt8" onclick="lblModal()">${ic('plus',13)} برچسب جدید</button></div>
  <h4 class="t-h4 mt20 mb8" style="color:var(--err)">ناحیه خطر</h4>
  <div class="panel" style="padding:16px;border-color:var(--err)">
   <div class="row g8 wrap" style="justify-content:space-between"><div class="min0"><b class="t-bs">حذف فضای کاری مشتری</b><p class="t-cap">تسک‌ها، دارایی‌ها و تقویم محتوای این پروژه بایگانی می‌شود.</p></div>
    <button class="btn btn-err" onclick="toast('info','حذف فضای کاری','در نسخه متصل به سرور فعال است.')">${ic('trash',14)} حذف</button></div></div>`;
}

function cproList(){
  return `<div class="pg">${pgHead('پروژه‌های مشتریان','فضاهای کاری عملیاتی مشتریان — تسک، دارایی، برند و تقویم محتوا',
   `<button class="btn btn-sec" onclick="toast('info','پروژه جدید','پس از ساخت مشتری و پروژه در CRM، فضای کاری به‌صورت خودکار ساخته می‌شود.')">${ic('plus',14)} پروژه جدید</button>`,
   [{t:'داشبورد'},{t:'پروژه‌های مشتریان'}])}
  <div class="grid grid-4 mb16">
   <div class="kpi"><div class="k-l">${ic('briefcase',14)}فضاهای فعال</div><div class="k-v num">${fa(CPRO.length)}</div><div class="k-d up">همه در حال اجرا</div></div>
   <div class="kpi"><div class="k-l">${ic('mytask',14)}تسک‌های مرتبط</div><div class="k-v num">${fa(TASKS.filter(t=>t.project&&cproByPrj(t.project)).length)}</div><div class="k-d">در بوردهای اختصاصی</div></div>
   <div class="kpi"><div class="k-l">${ic('folder',14)}دارایی‌های مشتریان</div><div class="k-v num">${fa(ASSETS.length)}</div><div class="k-d">لگوی برند، فونت، عکس</div></div>
   <div class="kpi"><div class="k-l">${ic('film',14)}محتوای این ماه</div><div class="k-v num">${fa(CPRO.reduce((a,c)=>a+cpFwTotal(c,'done'),0))}</div><div class="k-d up">چارچوب ماهانه</div></div></div>
  <div class="grid grid-2">${CPRO.map(cp=>{const b=BRAND[cp.cust];const ct=TASKS.filter(t=>t.project===cp.prj);return `
   <div class="card" style="padding:16px;cursor:pointer" onclick="go('#/cpro/${cp.id}')">
    <div class="row g12">${`<span class="cp-logo" style="width:44px;height:44px;background:${b.colors.primary}">${ic('briefcase',18)}</span>`}
     <div class="grow min0"><b class="t-h4" style="display:block" class="ellip">${cp.name}</b><span class="t-cap">${cust(cp.cust).name} · ${fa(ct.length)} تسک · ${fa(assetsOf(cp.cust).length)} دارایی</span></div>
     ${stBadge(prj(cp.prj).status)}</div>
    <div class="loadbar mt12"><span class="nm">پیشرفت</span><div class="prog"><i style="width:${cp.progress}%"></i></div><span class="pc">${fa(cp.progress)}٪</span></div>
    <div class="row g8 mt12 wrap">${avStack(cp.members.map(m=>emp(m).name))}<span class="t-cap">${fa(cp.members.length)} عضو</span>
     <span class="chip mr-auto">${ic('arrowleft',12)} ورود به فضای کاری</span></div></div>`;}).join('')}</div></div>`;
}
VIEWS['cpro']={title:'فضای کاری مشتری',vw:cproView};
