/* ============================================================
   EFFECT ERP · مدیریت کاربران + دسترسی فردی (v2.5)
   فقط مدیران · ایجاد/ویرایش/غیرفعال · ماتریس دسترسی · لاگ
   ============================================================ */
const canManageUsers=()=>can('users','m');
function usrView(){
  if(!can('users','v'))
    return `<div class="pg">${emptyState('دسترسی محدود','مدیریت کاربران فقط برای مدیران سیستم و مدیر کل قابل مشاهده است.',`<button class="btn btn-pr btn-sm" onclick="go('#/settings')">تنظیمات</button>`,'lock')}</div>`;
  const rows=EMP.filter(e=>USER_ACC[e.id]);
  return `<div class="pg">${pgHead('مدیریت کاربران','کاربران پنل، نقش‌ها و دسترسی‌های فردی — اصل کمترین دسترسی',
   canManageUsers()?`<button class="btn btn-pr" onclick="usrModal()">${ic('userplus',15)} ایجاد کاربر</button>`:'',[{t:'تنظیمات'},{t:'مدیریت کاربران'}])}
  <div class="card"><div class="card-h">${ic('users',16)}<span class="t-h3 grow">کاربران پنل (${fa(rows.length)})</span>
    <span class="badge bd-pr">${ic('shield',12)} ${isSuperAdmin(S_UID())?'دسترسی کامل مدیر سیستم':'دسترسی مدیریتی'}</span></div>
   <div class="card-b" style="padding-top:4px">
   ${tblInit('usr',[
    {k:'name',l:'کاربر',mobFull:true,r:e=>`<span class="row g8" style="cursor:pointer" onclick="go('#/team/${e.id}')">${av(e.name,'sm')}<span class="min0"><b>${e.name}</b><span class="t-cap" style="display:block">${e.role}</span></span></span>`},
    {k:'dept',l:'دپارتمان',hideMob:true,r:e=>`<span class="t2c">${e.dept}</span>`},
    {k:'phone',l:'موبایل',num:true,hideMob:true,r:e=>`<span class="num t2c">${e.phone}</span>`},
    {k:'role',l:'نقش',r:e=>`<span class="badge bd-${isSuperAdmin(e.id)?'pr':'mut'}">${isSuperAdmin(e.id)?'Super Admin':roleName(e)}</span>`},
    {k:'st',l:'وضعیت حساب',r:e=>{const st=USER_ACC[e.id].st;return `<span class="badge bd-${st==='فعال'?'ok':st==='غیرفعال'?'err':'warn'}"><span class="dot"></span>${st}</span>`;}},
    {k:'last',l:'آخرین ورود',hideMob:true,r:e=>`<span class="t-cap">${USER_ACC[e.id].last}</span>`},
    {k:'act',l:'عملیات',r:e=>canManageUsers()?`
     <span class="row g4" style="flex-wrap:nowrap">
      <button class="ibtn" data-tip="مشاهده" onclick="go('#/team/${e.id}')">${ic('eye',13)}</button>
      <button class="ibtn" data-tip="ویرایش" onclick="usrEdit('${e.id}')">${ic('edit',13)}</button>
      <button class="ibtn" data-tip="مدیریت دسترسی" onclick="permDrawer('${e.id}')">${ic('key',13)}</button>
      ${isSuperAdmin(e.id)?'':`<button class="ibtn ${USER_ACC[e.id].st==='فعال'?'ibtn-err':''}" data-tip="${USER_ACC[e.id].st==='فعال'?'غیرفعال کردن':'فعال‌سازی'}" onclick="usrToggle('${e.id}')">${ic(USER_ACC[e.id].st==='فعال'?'lock':'check',13)}</button>`}
     </span>`:`<button class="btn btn-sec btn-sm" onclick="go('#/team/${e.id}')">مشاهده</button>`},
   ],rows,{per:10,empty:'کاربری ثبت نشده است'})}
   <p class="t-cap mt8">${ic('lock',12)} غیرفعال‌سازی حساب، داده‌های تاریخی (تسک، پیام، فاکتور) را حفظ می‌کند؛ فقط دسترسی پنل قطع می‌شود.</p></div></div>
  <div class="card"><div class="card-h">${ic('history',16)}<span class="t-h3 grow">لاگ حسابرسی دسترسی</span></div>
   <div class="card-b" style="padding-top:2px">${PERM_AUDIT.map(a=>`
    <div class="act-row"><span class="act-ic pr">${ic('key',13)}</span>
     <div class="grow min0"><p class="t-bs"><b>${a.who}</b> ${a.what} را برای <b>${a.for}</b> ${a.chg}</p><time class="t-cap">${a.when}</time></div></div>`).join('')||'<div class="empty-mini">رویدادی ثبت نشده</div>'}</div></div></div>`;
}
const roleName=e=>((ROLES.find(r=>r.t===e.role)||{}).t)||e.role;
function usrModal(){
  openModal({title:'ایجاد کاربر پنل',body:`
   ${fld('نام و نام خانوادگی','<input class="inp" id="nu-n" placeholder="مثلاً: مریم حسینی">')}
   <div class="frow mt8">${fld('شماره موبایل','<input class="inp num" id="nu-ph" placeholder="۰۹۱۲۱۲۳۴۵۶۷">')}${fld('ایمیل','<input class="inp" id="nu-em" dir="ltr" placeholder="name@effectstudio.ir">')}</div>
   <div class="frow mt8">${fld('سمت',selWrap('nu-role',ROLES.map(r=>({v:r.id,t:r.t})),'r5'))}${fld('دپارتمان',selWrap('nu-dep',[...new Set(EMP.map(e=>e.dept))].map(d=>({v:d,t:d})),'تولید محتوا'))}</div>
   <div class="frow mt8">${fld('تصویر پروفایل',`<label class="photo-up" style="padding:8px;cursor:pointer"><input type="file" accept="image/*" class="hide" onchange="toast('ok','تصویر انتخاب شد','پس از ایجاد کاربر اعمال می‌شود.')"><span class="row g6">${ic('upload',12)}<span class="t-cap">بارگذاری تصویر</span></span></label>`)}
    ${fld('وضعیت حساب',selWrap('nu-st',[{v:'فعال',t:'فعال'},{v:'در انتظار فعال‌سازی',t:'در انتظار فعال‌سازی'}],'فعال'))}</div>
   <p class="hint mt8">${ic('key',12)} پس از ایجاد، دسترسی‌های فردی کاربر را در «مدیریت دسترسی» پیکربندی کنید.</p>`,
  footer:`<button class="btn btn-pr" onclick="usrCreate()">ایجاد کاربر</button><button class="btn btn-ghost" onclick="closeModal()">انصراف</button>`});
}
function usrCreate(){
  const n=$('#nu-n').value.trim();
  if(!n){$('#nu-n').classList.add('err');return;}
  const ph=$('#nu-ph').value.trim()||'۰۹۱۲۰۰۰۰۰۰۰';
  const rid=$('#nu-role').value;
  const e={id:uid('e'),name:n,role:ROLES.find(r=>r.id===rid).t,dept:$('#nu-dep').value,
    email:$('#nu-em').value.trim()||'new@effectstudio.ir',phone:ph,start:'1405/06/28',status:'in',
    skills:[],load:0,score:0};
  EMP.unshift(e);
  USER_ACC[e.id]={st:$('#nu-st').value,last:'—'};
  permAuditAdd(n,'حساب پنل','ایجاد شد (نقش: '+e.role+')');
  closeModal();render();
  toast('ok','کاربر با موفقیت ایجاد شد','«'+n+'» با نقش '+e.role+' ایجاد شد؛ اکنون دسترسی‌ها را پیکربندی کنید.');
  setTimeout(()=>permDrawer(e.id),500);
}
function usrEdit(id){
  const e=emp(id);
  openModal({title:'ویرایش کاربر — '+e.name,body:`
   ${fld('نام','<input class="inp" id="eu-n" value="'+e.name+'">')}
   <div class="frow mt8">${fld('سمت',selWrap('eu-role',ROLES.map(r=>({v:r.id,t:r.t})),(ROLES.find(r=>r.t===e.role)||{}).id||'r5'))}${fld('دپارتمان',selWrap('eu-dep',[...new Set(EMP.map(x=>x.dept))].map(d=>({v:d,t:d})),e.dept))}</div>
   <div class="frow mt8">${fld('موبایل',`<input class="inp num" id="eu-ph" value="${e.phone}">`)}${fld('ایمیل',`<input class="inp" id="eu-em" dir="ltr" value="${e.email}">`)}</div>`,
  footer:`<button class="btn btn-pr" onclick="usrSave('${id}')">ذخیره</button><button class="btn btn-ghost" onclick="closeModal()">انصراف</button>`});
}
function usrSave(id){
  const e=emp(id);
  const n=$('#eu-n').value.trim();if(!n)return;
  permAuditAdd(e.name,'اطلاعات کاربر','ویرایش شد');
  e.name=n;e.role=ROLES.find(r=>r.id===$('#eu-role').value).t;e.dept=$('#eu-dep').value;
  e.phone=$('#eu-ph').value;e.email=$('#eu-em').value;
  closeModal();render();toast('ok','کاربر به‌روزرسانی شد',n);
}
function usrToggle(id){
  const e=emp(id);const acc=USER_ACC[id];
  const deactivating=acc.st==='فعال';
  const doIt=()=>{
    acc.st=deactivating?'غیرفعال':'فعال';
    permAuditAdd(e.name,'وضعیت حساب',deactivating?'غیرفعال شد':'فعال شد');
    render();toast(deactivating?'warn':'ok',deactivating?'کاربر غیرفعال شد':'کاربر فعال شد',e.name+(deactivating?' — داده‌های تاریخی حفظ می‌شود':''));
  };
  if(deactivating)confirmDlg('غیرفعال‌سازی کاربر','«'+e.name+'» دیگر به پنل دسترسی نخواهد داشت؛ داده‌های تاریخی او حفظ می‌شود.',doIt,'غیرفعال‌سازی',true);
  else doIt();
}
/* ---------- ماتریس دسترسی فردی ---------- */
function permDrawer(id){
  const e=emp(id);
  if(isSuperAdmin(id)){
    openDrawer({title:'دسترسی‌ها — '+e.name,sub:'Super Admin',icon:'shield',body:`
     <div class="panel" style="padding:16px;display:flex;align-items:center;gap:12px">
      ${ic('shield',24)}<div class="grow min0"><b class="t-bs">دسترسی کامل مدیر سیستم</b>
      <p class="t-cap">دسترسی‌های Super Admin از طریق رابط کاربری قابل حذف نیست؛ فقط مدیر سیستم دیگر می‌تواند آن را مدیریت کند.</p></div></div>`,
    footer:`<button class="btn btn-ghost mr-auto" onclick="closeDrawer()">بستن</button>`});
    return;
  }
  const rid=empRid(e);
  const ov=USER_OVERRIDES[id]||{};
  const acts=['v','c','e','d','ok','m','x'];
  openDrawer({title:'مدیریت دسترسی — '+e.name,sub:'نقش: '+e.role,icon:'key',body:`
   <div class="panel mb12" style="padding:12px"><span class="t-cap">دسترسی نهایی = پیش‌فرض نقش + دسترسی‌های اختصاصی این کاربر. نشان «اختصاصی» یعنی تفاوت با نقش.</span></div>
   <div class="perm-mx">
    <div class="perm-hd"><span>قابلیت</span>${acts.map(a=>`<span>${ACT_FA[a]}</span>`).join('')}</div>
    ${MODS.map(m=>`
     <div class="perm-row" data-mod="${m.id}">
      <span class="pm-t">${m.t}${ov[m.id]&&Object.keys(ov[m.id]).length?`<span class="badge bd-pr">اختصاصی</span>`:`<span class="t-cap">از نقش</span>`}</span>
      ${acts.map(a=>{
        const applicable=m.acts.includes(a);
        const on=can(m.id,a,id,rid);
        return `<span>${applicable?`<button type="button" class="ptgl ${on?'on':''}" data-mod="${m.id}" data-act="${a}" data-uid="${id}" onclick="permTgl(this)">${ic('check',11)}</button>`:''}</span>`;}).join('')}
     </div>`).join('')}
   </div>
   <p class="t-cap mt12">${ic('lock',12)} تغییرات بلافاصله در ناوبری و عملیات این کاربر اعمال می‌شود و در لاگ حسابرسی ثبت می‌گردد.</p>`,
  footer:`<button class="btn btn-pr" onclick="permReset('${id}')">بازنشانی به نقش</button>
   <button class="btn btn-ghost mr-auto" onclick="closeDrawer();render()">بستن</button>`});
}
function permTgl(btn){
  const {mod,act,uid}=btn.dataset;
  USER_OVERRIDES[uid]=USER_OVERRIDES[uid]||{};
  const o=USER_OVERRIDES[uid];
  const rid=empRid(emp(uid));
  const roleVal=can(mod,act,null,rid);
  o[mod]=o[mod]||{};
  const cur=o[mod][act]!==undefined?o[mod][act]:roleVal;
  o[mod][act]=cur?0:1;
  if(o[mod][act]==(roleVal?1:0))delete o[mod][act];
  if(Object.keys(o[mod]).length===0)delete o[mod];
  if(Object.keys(o).length===0)delete USER_OVERRIDES[uid];
  btn.classList.toggle('on');
  const row=btn.closest('.perm-row');
  const badge=row.querySelector('.pm-t .badge, .pm-t .t-cap');
  const hasOv=(USER_OVERRIDES[uid]||{})[mod];
  if(badge)badge.outerHTML=hasOv?'<span class="badge bd-pr">اختصاصی</span>':'<span class="t-cap">از نقش</span>';
  permAuditAdd(emp(uid).name,'دسترسی «'+(MODS.find(m=>m.id===mod)||{}).t+'» ('+ACT_FA[act]+')',(o[mod]&&o[mod][act])||(!hasOv&&roleVal)?'فعال شد':'غیرفعال شد');
}
function permReset(id){
  delete USER_OVERRIDES[id];
  permAuditAdd(emp(id).name,'دسترسی‌ها','بازنشانی به پیش‌فرض نقش');
  closeDrawer();render();
  toast('ok','دسترسی‌ها بازنشانی شد','برای '+emp(id).name+' فقط دسترسی‌های نقش باقی ماند.');
}
/* ---------- تب دسترسی‌ها در پروفایل ---------- */
function empTabPerms(e){
  const rid=empRid(e);
  const uid=e.id;
  const mods=MODS.filter(m=>canAs(uid,m.id));
  const denied=MODS.filter(m=>!canAs(uid,m.id));
  const ov=USER_OVERRIDES[uid]||{};
  return `<div class="row g12 mb16 wrap">
    <span class="badge bd-pr">${ic('shield',12)} ${isSuperAdmin(uid)?'Super Admin — دسترسی کامل مدیر سیستم':roleName(e)}</span>
    <span class="badge bd-ok"><span class="dot"></span>${USER_ACC[uid]?USER_ACC[uid].st:'فعال'}</span></div>
   ${isSuperAdmin(uid)?`<div class="panel" style="padding:16px">${ic('shield',16)} دسترسی کامل مدیر سیستم — قابل محدودسازی نیست.</div>`:`
   <div class="grid grid-2" style="gap:16px">
    <div><h4 class="t-h4 mb8">ماژول‌های قابل دسترسی (${fa(mods.length)})</h4>
     <div class="row g6 wrap">${mods.map(m=>`<span class="chip chip-sel on">${ic('check',11)} ${m.t}${ov[m.id]?' <span class="t-cap">(اختصاصی)</span>':''}</span>`).join('')||'<div class="empty-mini">ماژولی فعال نیست</div>'}</div></div>
    <div><h4 class="t-h4 mb8">بدون دسترسی (${fa(denied.length)})</h4>
     <div class="row g6 wrap">${denied.map(m=>`<span class="chip" style="opacity:.6">${ic('x',11)} ${m.t}</span>`).join('')||'<div class="empty-mini">—</div>'}</div>
     <p class="t-cap mt8">${ic('lock',12)} محدودیت‌ها مطابق اصل کمترین دسترسی؛ تغییر فقط توسط مدیر سیستم در «مدیریت کاربران».</p></div>
   </div>`}`;
}
VIEWS['users']={title:'مدیریت کاربران',vw:usrView};
