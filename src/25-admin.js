/* ============================================================
   EFFECT ERP · Integrations · RBAC · Reports · Settings · Log
   ============================================================ */
let INT_CAT='همه';
function intView(){
  const cats=['همه'].concat(INT_CATS);
  const list=INTS.filter(i=>INT_CAT==='همه'||i.cat===INT_CAT);
  return `<div class="pg">${pgHead('اتصالات و API','مدیریت اتصالات سرویس‌های خارجی، کلیدها و وب‌هوک‌ها',
   `<button class="btn btn-sec" onclick="toast('info','درخواست اتصال جدید','اتصال‌های سازمانی توسط مدیر سیستم تایید می‌شود.')">${ic('plus',14)} درخواست اتصال</button>`,
   [{t:'داشبورد'},{t:'اتصالات'}])}
  <div class="row g6 wrap mb16">${cats.map(c=>`<button class="chip ${INT_CAT===c?'chip-sel on':''}" onclick="INT_CAT='${c}';render()">${c}</button>`).join('')}</div>
  <div class="grid grid-3">${list.map(i=>`
   <div class="int-card">
    <div class="row"><span class="int-logo ${i.status==='غیرفعال'?'gr':''}" style="background:${i.status==='غیرفعال'?'':i.color}">${i.letter}</span>
     <div class="grow"><b class="t-h4">${i.name}</b><p class="t-cap">${i.cat}</p></div>
     <span class="badge bd-${i.status==='متصل'?'ok':i.status==='خطا'?'err':'mut'}"><span class="dot"></span>${i.status}</span></div>
    <p class="t-bs t2c grow" style="min-height:38px">${i.desc}</p>
    <div class="row g8">
     ${i.status==='متصل'?`<span class="t-cap">${ic('activity',12)} ${fa(i.calls.toLocaleString('en-US'))} فراخوانی این ماه</span>
       <button class="btn btn-sm btn-sec mr-auto" onclick="intDrawer('${i.id}')">مدیریت</button>`
     :i.status==='خطا'?`<span class="t-cap" style="color:var(--err)">${ic('alert',12)} خطای احراز — نیاز به اتصال مجدد</span>
       <button class="btn btn-sm btn-ok mr-auto" onclick="intDrawer('${i.id}')">اتصال مجدد</button>`
     :`<span class="t-cap">${ic('zap',12)} آماده اتصال</span>
       <button class="btn btn-sm btn-pr mr-auto" onclick="intConnect('${i.id}')">اتصال</button>`}</div>
   </div>`).join('')}</div></div>`;
}
function intConnect(id){const i=INTS.find(x=>x.id===id);i.status='متصل';render();toast('ok','اتصال برقرار شد',i.name+' با موفقیت متصل شد.');}
function intDrawer(id){
  S._openInt=id;
  const i=INTS.find(x=>x.id===id);
  const tab=S.tabs.int||'st';
  openDrawer({title:i.name,sub:i.cat+' — '+i.desc,icon:'plug',wide:true,body:
   `<div class="row g8 wrap mb16"><span class="badge bd-${i.status==='متصل'?'ok':i.status==='خطا'?'err':'mut'}"><span class="dot"></span>${i.status==='متصل'?'متصل — عملکرد عادی':i.status}</span>
     ${i.plan!=='—'?`<span class="chip">${ic('card',12)} پلن ${i.plan}</span>`:''}
     <span class="chip">${ic('activity',12)} ${fa(i.calls.toLocaleString('en-US'))} فراخوانی</span></div>
   ${tabsBar('int',[
     {v:'st',t:'وضعیت و کلید'},{v:'wh',t:'وب‌هوک‌ها',cnt:WEBHOOKS.length},{v:'us',t:'مصرف'},{v:'lg',t:'لاگ‌ها'}],tab,'intTabGo')}
   <div class="mt12">
   ${tab==='st'?`
     ${i.key!=='—'?`<h4 class="t-h4 mb8">کلید API</h4>
     <div class="key-mask mb4"><span class="k">${i.key}</span>
       <button class="ibtn" data-tip="کپی" onclick="toast('ok','کلید کپی شد','مقدار کامل کلید فقط در سرور ذخیره می‌شود.')">${ic('copy',13)}</button>
       <button class="ibtn" data-tip="چرخش کلید" onclick="toast('warn','کلید چرخش یافت','کلید جدید تولید شد؛ کلید قبلی ۲۴ ساعت دیگر غیرفعال می‌شود.')">${ic('refresh',13)}</button></div>
     <p class="t-cap mb12">${ic('shield',12)} کلید به‌صورت ماسک‌شده نمایش داده می‌شود و هرگز به‌صورت کامل ظاهر نمی‌شود.</p>`:''}
     <h4 class="t-h4 mb8">دسترسی‌های داده‌شده (OAuth)</h4>
     <div class="row g6 wrap">${['read:insights','read:profile','write:media','manage:comments'].slice(0,i.cat==='شبکه‌های اجتماعی'?4:2).map(s=>`<span class="tag pr">${s}</span>`).join('')}</div>
     <h4 class="t-h4 mt16 mb8">عملیات</h4>
     <div class="row g8 wrap">
       <button class="btn btn-sm btn-sec" onclick="toast('info','تست اتصال','Ping ارسال شد — پاسخ ۲۰۰ OK (۸۴ms)')">تست اتصال</button>
       ${i.status==='متصل'?`<button class="btn btn-sm btn-err" onclick="confirmDlg('قطع اتصال','اتصال ${i.name} قطع شود؟ داده‌های ذخیره‌شده حفظ می‌شوند.',()=>{INTS.find(x=>x.id==='${id}').status='غیرفعال';closeDrawer();render();toast('warn','اتصال قطع شد')},'قطع اتصال',true)">قطع اتصال</button>`:''}</div>`
   :tab==='wh'?WEBHOOKS.map(w=>`
     <div class="panel" style="padding:12px 16px;margin-bottom:8px"><div class="row g8">
       ${ic('webhook',15)}<span class="num t-bs" style="color:var(--t1)" dir="ltr">${w.url}</span>
       <span class="badge bd-ok mr-auto">${w.status}</span></div>
       <p class="t-cap mt4">رویداد: <span class="num" dir="ltr">${w.ev}</span> · آخرین تحویل: موفق (۴ دقیقه پیش)</p></div>`).join('')+
     `<button class="btn btn-sm btn-sec" onclick="toast('info','وب‌هوک جدید','در نسخه متصل قابل تنظیم است.')">${ic('plus',13)} افزودن وب‌هوک</button>`
   :tab==='us'?`<div class="kpi mb12"><div class="k-l">${ic('activity',14)}فراخوانی ۳۰ روز اخیر</div>
      <div class="k-v num">${fa(i.calls.toLocaleString('en-US'))}</div><div class="k-d up">سهمیه پلن: ۱۰۰٬۰۰۰</div></div>
     ${chLine([220,480,610,540,720,890,1050,980,1240,1180,1420,1610].map(v=>Math.round(v*i.calls/16000)),{h:130})}${chartLbls(['۶ مرداد','','','۱۳ مرداد','','','۲۰ مرداد','','','۲۷ مرداد','',''])}`
   :tblInit('intlg',[{k:'t',l:'زمان',r:x=>`<span class="num t2c">${x.t}</span>`,mobFull:true},
      {k:'api',l:'اندپوینت',r:x=>`<span class="num t2c" dir="ltr">${x.api}</span>`},
      {k:'code',l:'کد',r:x=>`<span class="badge bd-${x.code===200?'ok':x.code===429?'warn':'err'}">${fa(x.code)}</span>`},
      {k:'ms',l:'زمان پاسخ',num:true,r:x=>`<span class="num">${fa(x.ms)}ms</span>`}],INT_LOG,{per:6,mob:false})}
   </div>`,
  footer:`<button class="btn btn-sec" onclick="closeDrawer()">بستن</button>
   <span class="t-cap mr-auto">${ic('shield',12)} اتصال امن TLS · آخرین همگام‌سازی: ${fa(4)} دقیقه پیش</span>`});
}
function intTabGo(v){S.tabs.int=v;intDrawer(S._openInt||'i1');}
/* ---------- RBAC ---------- */
let RBAC_MX=JSON.parse(JSON.stringify(ROLES));
function rbacView(){
  const role=RBAC_MX.find(r=>r.id===S.role)||RBAC_MX[0];
  return `<div class="pg">${pgHead('نقش‌ها و دسترسی‌ها','ماتریس کنترل دسترسی نقش‌محور (RBAC) — '+role.t,
   `<button class="btn btn-sec" onclick="toast('info','افزودن نقش','نقش سفارشی با انتخاب مجوزها ساخته می‌شود.')">${ic('plus',14)} نقش جدید</button>
    <button class="btn btn-pr" onclick="toast('ok','دسترسی‌ها ذخیره شد','تغییرات «'+('${role.t}')+'» برای '+fa(role.n)+' کاربر اعمال شد.')">${ic('check',14)} ذخیره تغییرات</button>`,
   [{t:'تنظیمات'},{t:'نقش‌ها و دسترسی‌ها'}])}
  <div class="grid" id="rbac-wrap" style="grid-template-columns:250px minmax(0,1fr)">
   <div class="card" style="padding:12px;height:fit-content"><div class="col g4">
    ${RBAC_MX.map(r=>`<button class="role-li ${r.id===role.id?'on':''}" onclick="S.role='${r.id}';render()">
      ${ic(r.id==='r1'?'shield':r.id==='r2'?'key':r.id==='r7'?'wallet':r.id==='r6'?'crm':'user',16)}
      <div class="grow"><b>${r.t}</b><span>${fa(r.n)} کاربر</span></div></button>`).join('')}
   </div></div>
   <div>
    <div class="card mb12" style="padding:12px 16px"><div class="row">
      <b class="t-h3">${role.t}</b><span class="badge bd-pr">${fa(role.n)} کاربر</span>
      <div class="row g6 mr-auto">${avStack(['رضا قایمی','کاوه دهقان'])}<span class="t-cap">و ${fa(Math.max(0,role.n-2))} نفر دیگر</span></div>
      <button class="btn btn-sm btn-ghost" onclick="toast('info','کپی نقش','نسخه قابل ویرایشی از این نقش ساخته می‌شود.')">${ic('copy',13)} کپی</button></div></div>
    <div class="rbac-mat"><table>
     <thead><tr><th style="text-align:right">ماژول</th>${PERM_LVLS.map(l=>`<th>${l}</th>`).join('')}</tr></thead>
     <tbody>${PERM_CATS.map((cat,ci)=>`<tr>
       <td class="rn">${cat}</td>
       ${role.mx[ci].map((v,li)=>`<td><button class="mx ${v?'on':''}" role="checkbox" aria-checked="${!!v}" aria-label="${cat} — ${PERM_LVLS[li]}" onclick="rbacTog('${role.id}',${ci},${li})">${ic('check',11)}</button></td>`).join('')}
     </tr>`).join('')}</tbody></table></div>
    <p class="t-cap mt8">${ic('info',12)} «مدیر کل» به همه ماژول‌ها دسترسی کامل دارد و قابل ویرایش نیست. تغییرات پس از ذخیره، بلافاصله برای کاربران اعمال می‌شود.</p>
   </div></div></div>`;
}
function rbacTog(rid,ci,li){
  const role=RBAC_MX.find(r=>r.id===rid);
  if(rid==='r1'){toast('warn','دسترسی غیرقابل تغییر','دسترسی‌های نقش «مدیر کل» قفل است.');return;}
  role.mx[ci][li]=role.mx[ci][li]?0:1;render();
}
/* ---------- activity log ---------- */
let ACT_F={mod:'',who:''};
function actView(){
  const mods=[...new Set(ACTIVITY.map(a=>a.mod))];
  const list=ACTIVITY.filter(a=>(!ACT_F.mod||a.mod===ACT_F.mod)&&(!ACT_F.who||a.who===ACT_F.who));
  return `<div class="pg">${pgHead('لاگ فعالیت‌ها','ردیابی کامل تغییرات سیستم — چه کسی، چه زمانی، چه کاری',
   `<button class="btn btn-sec" onclick="toast('info','خروجی لاگ','فایل کامل در نسخه متصل قابل دریافت است.')">${ic('download',14)} خروجی</button>`,
   [{t:'تنظیمات'},{t:'لاگ فعالیت‌ها'}])}
  ${filterbar(`<span class="lb">${ic('filter',13)} فیلترها</span>
   <div class="sel-wrap"><select class="sel fsel" onchange="ACT_F.mod=this.value;render()"><option value="">همه ماژول‌ها</option>${mods.map(m=>`<option ${ACT_F.mod===m?'selected':''}>${m}</option>`).join('')}</select>${ic('chevdown',13)}</div>
   <div class="sel-wrap"><select class="sel fsel" onchange="ACT_F.who=this.value;render()"><option value="">همه کاربران</option>${EMP.map(e=>`<option value="${e.id}" ${ACT_F.who===e.id?'selected':''}>${e.name}</option>`).join('')}</select>${ic('chevdown',13)}</div>
   <span class="t-cap mr-auto">${fa(list.length)} رخداد</span>`)}
  ${tblInit('act',[
   {k:'who',l:'کاربر',mobFull:true,r:a=>`<span class="row g8">${av(a.who,'sm')}<div><b>${emp(a.who).name}</b><div class="sub">${emp(a.who).role}</div></div></span>`},
   {k:'act',l:'عملیات',r:a=>`<span class="badge bd-${a.act.includes('حذف')||a.act.includes('خطا')?'err':a.act.includes('تایید')||a.act.includes('ثبت پرداخت')?'ok':'pr'}">${a.act}</span>`},
   {k:'mod',l:'ماژول',r:a=>`<span class="t2c">${a.mod}</span>`,hideMob:true},
   {k:'det',l:'جزئیات',r:a=>`<span class="t2c">${a.det}</span>`},
   {k:'min',l:'زمان',r:a=>`<span class="t-cap">${relTime(a.min)}</span>`,sv:a=>a.min},
  ],list,{per:9,empty:'رخدادی یافت نشد',emptySub:'فیلترها را تغییر دهید.'})}</div>`;
}
/* ---------- notifications center ---------- */
function notifCenterView(){
  const f=S.notifFilter==='all'?null:S.notifFilter;
  const list=NOTIFS.filter(n=>!f||n.type===f);
  return `<div class="pg">${pgHead('مرکز اعلان‌ها','همه اعلان‌های سیستم در یک جا',
   `<button class="btn btn-sec" onclick="markAll();render()">${ic('check',14)} خواندن همه</button>`,[{t:'تنظیمات'},{t:'مرکز اعلان‌ها'}])}
  <div class="row g6 wrap mb16">${[['all','همه'],['task','تسک‌ها'],['leave','مرخصی'],['finance','مالی'],['meet','جلسات'],['crm','CRM'],['system','سیستم']].map(c=>`
    <button class="chip ${S.notifFilter===c[0]?'chip-sel on':''}" onclick="S.notifFilter='${c[0]}';render()">${c[1]}</button>`).join('')}</div>
  <div class="card" style="max-width:820px">${list.length?list.map(n=>`
   <div class="ntf ${n.unread?'unread':''}" onclick="markOne('${n.id}')"><span class="ic ${n.cls}">${ic(n.ic,15)}</span>
    <div class="grow"><p>${n.t}</p><time>${relTime(n.time)}</time></div>
    ${n.unread?'<span class="badge bd-pr">جدید</span>':''}</div>`).join(''):
   `<div class="state" style="padding:70px"><div class="ic ok">${ic('check',26)}</div><h4>همه اعلان‌ها خوانده شد</h4><p>اعلان جدیدی باقی نمانده است.</p></div>`}</div></div>`;
}
function markOne(id){const n=NOTIFS.find(x=>x.id===id);n.unread=false;render();}
function markAll(){NOTIFS.forEach(n=>n.unread=false);toast('ok','همه اعلان‌ها خوانده شد');}
/* ---------- reports ---------- */
function reportsView(){
  return `<div class="pg">${pgHead('گزارش‌ها','ساخت، ذخیره و اشتراک‌گذاری گزارش‌های سازمانی',
   `<button class="btn btn-sec" onclick="go('#/social/report')">${ic('share',14)} گزارش مشتری</button>
    <button class="btn btn-pr" onclick="rptBuilderModal()">${ic('plus',15)} گزارش جدید</button>`,
   [{t:'داشبورد'},{t:'گزارش‌ها'}])}
  <div class="grid grid-3 mb16">
   <div class="kpi"><div class="k-l">${ic('chart',14)}گزارش‌های ذخیره‌شده</div><div class="k-v num">${fa(REPORTS.length)}</div><div class="k-d">۲ گزارش خودکار هفتگی</div></div>
   <div class="kpi"><div class="k-l">${ic('clock',14)}آخرین اجرا</div><div class="k-v num" style="font-size:17px">۲ ساعت پیش</div><div class="k-d">عملکرد تیم — شهریور</div></div>
   <div class="kpi"><div class="k-l">${ic('users',14)}اشتراک فعال</div><div class="k-v num">۳</div><div class="k-d">با مدیران تیم</div></div></div>
  ${tblInit('rps',[
   {k:'t',l:'گزارش',mobFull:true,r:r=>`<span class="row g8">${ic('chart',15)}<b>${r.t}</b></span><div class="sub">${r.type}</div>`},
   {k:'range',l:'بازه',r:r=>`<span class="t2c num">${r.range}</span>`},
   {k:'by',l:'ایجادکننده',r:r=>`<span class="row g6">${av(emp(r.by).name,'xs')}<span class="t2c">${emp(r.by).name}</span></span>`},
   {k:'charts',l:'اجزا',num:true,r:r=>`<span class="num t2c">${fa(r.charts)} نمودار</span>`,hideMob:true},
   {k:'at',l:'آخرین اجرا',r:r=>`<span class="t-cap">${relTime(r.at)}</span>`,sv:r=>r.at},
   {k:'ac',l:'',r:r=>`<span class="row g4">
     <button class="ibtn" data-tip="اجرا" onclick="rptRun('${r.t}')">${ic('play',14)}</button>
     <button class="ibtn" data-tip="ویرایش" onclick="rptBuilderModal()">${ic('edit',14)}</button>
     <button class="ibtn" data-tip="تکرار" onclick="rptDup('${r.t}')">${ic('copy',14)}</button>
     <button class="ibtn" data-tip="خروجی" onclick="toast('info','خروجی CSV','در نسخه متصل فعال است.')">${ic('download',14)}</button></span>`},
  ],REPORTS,{per:6,mob:false,empty:'گزارشی ذخیره نشده است',emptyCta:`<button class="btn btn-pr btn-sm" onclick="rptBuilderModal()">${ic('plus',13)} ساخت گزارش</button>`})}
  <div class="card mt16"><div class="card-h">${ic('chart',16)}<span class="t-h3 grow">پیش‌نمایش — عملکرد تیم · شهریور ۱۴۰۵</span>
    <span class="badge bd-ok">آخرین اجرا: ۲ ساعت پیش</span></div>
   <div class="card-b"><div class="grid grid-4 mb16">
    ${[['تسک‌های انجام‌شده','۱۲۸','+۱۴٪'],['میانگین زمان تحویل','۳.۲ روز','-۸٪'],['تسک‌های عقب‌افتاده','۹','-۲ مورد'],['رضایت مشتری','۴.۸/۵','+۰.۲']].map(k=>`
    <div class="kpi"><div class="k-l">${k[0]}</div><div class="k-v num">${k[1]}</div><div class="k-d ${k[2].startsWith('-')&&k[0].includes('زمان')?'up':k[2].startsWith('+')?'up':'dn'}">${k[2]}</div></div>`).join('')}</div>
    ${chBars([86,94,102,118,128].map(v=>({v})),{h:140})}${chartLbls(['هفته ۱','هفته ۲','هفته ۳','هفته ۴','هفته جاری'])}
    <div class="legend mt8"><span><i style="background:var(--pr)"></i>تسک‌های انجام‌شده هفتگی</span><span class="mr-auto t-cap">مرتب‌سازی بر اساس دپارتمان: طراحی در صدر</span></div></div></div></div>`;
}
function rptRun(t){toast('ok','گزارش اجرا شد','«'+t+'» با داده‌های به‌روز بازتولید شد.');}
function rptDup(t){REPORTS.unshift({id:uid('rp'),t:t+' (کپی)',type:'عملکرد',range:'۰۵/۰۶ تا ۱۲/۰۶',by:'e1',at:0,charts:3});render();toast('ok','گزارش تکرار شد','نسخه جدید قابل ویرایش است.');}
function rptBuilderModal(){
  openModal({title:'گزارش‌ساز',wide:true,body:`
   <div class="frow">${fld('عنوان گزارش','<input class="inp" placeholder="مثلاً: درآمد به تفکیک مشتری">')}${fld('نوع',selWrap('rb-t2',[['عملکرد','عملکرد'],['مالی','مالی'],['فروش','فروش'],['منابع انسانی','منابع انسانی'],['شبکه‌های اجتماعی','شبکه‌های اجتماعی']].map(x=>({v:x[0],t:x[1]})),'عملکرد'))}</div>
   <div class="frow mt12">${dpField('rb-f2','از تاریخ','1405/06/01')}${dpField('rb-t2d','تا تاریخ','1405/06/05')}</div>
   <h4 class="t-h4 mt16 mb8">اجزای گزارش</h4>
   <div class="row g6 wrap">${['جدول','نمودار خطی','نمودار میله‌ای','متریک (KPI)','فیلتر','گروه‌بندی'].map(x=>`<button class="chip chip-sel">${x}</button>`).join('')}</div>
   <h4 class="t-h4 mt16 mb8">خروجی</h4>
   <div class="row g8">${['CSV','Excel','PDF'].map(x=>`<button class="chip">${x}</button>`).join('')}
    <label class="sw mr-auto"><input type="checkbox" checked><span class="tr"></span>اشتراک با مدیران</label></div>`,
  footer:`<button class="btn btn-pr" onclick="closeModal();REPORTS.unshift({id:uid('rp'),t:document.getElementById('rb-t2')?$('#rb-t2').previousElementSibling.value||'گزارش جدید':'گزارش جدید',type:'سفارشی',range:'۰۱/۰۶ تا ۰۵/۰۶',by:'e1',at:0,charts:3});render();toast('ok','گزارش ساخته شد','از کتابخانه اجرا و شخصی‌سازی کنید.')">ساخت گزارش</button>
   <button class="btn btn-ghost" onclick="closeModal()">انصراف</button>`});
}
/* ---------- settings ---------- */
function setView(){
  const tab=S.setTab;
  return `<div class="pg">${pgHead('تنظیمات','پیکربندی سازمان، کاربران و سیستم',
   `<button class="btn btn-pr" onclick="toast('ok','تنظیمات ذخیره شد')">${ic('check',14)} ذخیره</button>`,[{t:'تنظیمات'}])}
  ${tabsBar('set',[
   {v:'general',t:'عمومی'},{v:'members',t:'اعضا و دعوت‌ها',cnt:EMP.length},{v:'notif',t:'اعلان‌ها'},
   {v:'theme',t:'ظاهر'},{v:'labels',t:'برچسب‌ها',cnt:LABELS.length},{v:'security',t:'امنیت'},{v:'api',t:'API سازمانی'}],tab,'setTabGo')}
  <div class="mt16">${tab==='general'?setGeneral():tab==='members'?setMembers():tab==='notif'?setNotif():tab==='theme'?setTheme():tab==='labels'?setLabels():tab==='security'?setSecurity():setApi()}</div></div>`;
}
function setLabels(){
  const usage=l=>TASKS.filter(t=>t.labels&&t.labels.includes(l.id)).length;
  return `<div class="card"><div class="card-h">${ic('tagi',16)}<span class="t-h3 grow">مدیریت برچسب‌ها</span>
    <button class="btn btn-pr btn-sm" onclick="lblModal()">${ic('plus',13)} برچسب جدید</button></div>
   <div class="card-b">
   ${LABELS.map(l=>`<div class="lb-mng">
    ${lbChip(l.id)}
    <span class="t-cap grow min0 ellip">${l.d||'—'}</span>
    <span class="chip">${fa(usage(l))} استفاده</span>
    <button class="ibtn" data-tip="ویرایش" onclick="lblModal('${l.id}')">${ic('edit',13)}</button>
    <button class="ibtn ibtn-err" data-tip="حذف" onclick="lblDel('${l.id}')">${ic('trash',13)}</button></div>`).join('')||'<div class="empty-mini">برچسبی تعریف نشده است</div>'}
   <p class="t-cap mt12">${ic('lock',12)} حذف برچسب از همه تسک‌ها برداشته می‌شود؛ برچسب‌های سیستمی حذف نمی‌شوند.</p></div></div>`;
}
function lblDel(id){
  const l=lb(id);if(!l)return;
  confirmDlg('حذف برچسب','برچسب «'+l.n+'» از '+fa(TASKS.filter(t=>t.labels&&t.labels.includes(id)).length)+' تسک برداشته می‌شود. ادامه می‌دهید؟',()=>{
    TASKS.forEach(t=>{if(t.labels){const i=t.labels.indexOf(id);if(i>-1)t.labels.splice(i,1);}});
    LABELS.splice(LABELS.findIndex(x=>x.id===id),1);render();toast('ok','برچسب حذف شد',l.n);
  },'حذف',true);
}
function setTabGo(v){S.setTab=v;render();}
function setGeneral(){
  return `<div class="card" style="max-width:720px"><div class="card-b col g16">
   <div class="frow">${fld('نام سازمان','<input class="inp" value="استودیو اثر (Effect Studio)">')}${fld('شناسه سازمان','<input class="inp" dir="ltr" value="effect-studio">')}</div>
   <div class="frow">${fld('واحد پول','<input class="inp" value="تومان" readonly style="opacity:.7">')}${fld('زمان‌بندی','<input class="inp" value="تهران (GMT+3:30)" readonly style="opacity:.7">')}</div>
   <div class="frow">${dpField('st-hy','شروع سال مالی','1405/01/01')}${fld('روزهای کاری',selWrap('st-wd',[{v:'5',t:'شنبه تا چهارشنبه'},{v:'6',t:'شنبه تا پنجشنبه'}],'5'))}</div>
   ${fld('تعطیلات رسمی سال','<div class="row g6 wrap">'+['نوروز','۱۲ فروردین','۱ خرداد','۱۴ خرداد','۱۵ خرداد','۲۲ بهمن','۲۹ اسفند'].map(h=>`<span class="chip">${h}</span>`).join('')+`<button class="chip">${ic('plus',12)} افزودن</button></div>`)}
   <label class="sw"><input type="checkbox" checked><span class="tr"></span><div><b class="t-bs" style="color:var(--t1)">تقویم شمسی پیش‌فرض</b><p class="t-cap">تمام تاریخ‌های سیستم بر پایه تقویم هجری شمسی نمایش داده می‌شوند.</p></div></label>
  </div></div>`;
}
function setMembers(){
  return tblInit('setm',[
   {k:'name',l:'عضو',mobFull:true,r:e=>`<span class="row g8">${av(e.name,'sm')}<div><b>${e.name}</b><div class="sub">${e.email}</div></div></span>`},
   {k:'role',l:'نقش',r:e=>`<span class="badge bd-mut">${e.role}</span>`},
   {k:'dept',l:'دپارتمان',r:e=>`<span class="t2c">${e.dept}</span>`,hideMob:true},
   {k:'status',l:'وضعیت',r:e=>`<span class="badge bd-${e.status==='in'?'ok':e.status==='leave'?'warn':'mut'}">${{in:'فعال',remote:'دورکار',leave:'مرخصی',off:'غیرفعال'}[e.status]}</span>`},
   {k:'ac',l:'',r:e=>`<span class="row g4"><button class="ibtn" data-tip="نقش‌ها" onclick="go('#/permissions')">${ic('shield',14)}</button><button class="ibtn ibtn-err" data-tip="حذف" onclick="confirmDlg('حذف عضو','${e.name} از سازمان حذف شود؟',()=>toast('warn','حذف شد','در نسخه متصل قابل اجراست.'),'حذف',true)">${ic('trash',14)}</button></span>`},
  ],EMP,{per:6,mob:false,empty:'عضوی نیست'})+
  `<button class="btn btn-pr mt12" onclick="toast('info','دعوت همکار','لینک دعوت کپی شد — effectstudio.ir/erp/inv')">${ic('plus',14)} دعوت عضو جدید</button>`;
}
function setNotif(){
  const rows=[['تسک جدید','ایمیل + درون‌برنامه‌ای',1],['منشن و کامنت','درون‌برنامه‌ای',1],['درخواست مرخصی','ایمیل + پیامک',1],['تایید مرخصی','درون‌برنامه‌ای',1],['پرداخت مشتری','ایمیل + پیامک',1],['یادآوری جلسه','درون‌برنامه‌ای + پیامک',1],['پیگیری CRM','درون‌برنامه‌ای',0],['گزارش هفتگی سیستم','ایمیل',0]];
  return `<div class="card" style="max-width:720px"><div class="card-b" style="display:flex;flex-direction:column;gap:8px">
   ${rows.map(r=>`<label class="sw" style="padding:12px 0;border-bottom:1px solid var(--bd)"><input type="checkbox" ${r[2]?'checked':''}><span class="tr"></span>
    <div class="grow"><b class="t-bs" style="color:var(--t1)">${r[0]}</b><p class="t-cap">کانال: ${r[1]}</p></div></label>`).join('')}
   <p class="t-cap mt8">${ic('info',12)} اعلان‌های فوری همیشه از طریق پیامک ارسال می‌شوند (خروج از قاعده پیکربندی).</p></div></div>`;
}
function setTheme(){
  return `<div class="card" style="max-width:720px"><div class="card-b">
   <h4 class="t-h4 mb12">حالت نمایش</h4>
   <div class="grid grid-2" style="max-width:520px">
    <button class="panel" style="padding:16px;text-align:center;border-color:${S.theme==='light'?'var(--pr2)':'var(--bd)'}" onclick="S.theme='light';saveTheme();render()">
     <div style="height:80px;border-radius:8px;background:#171717;border:1px solid #353535;position:relative;overflow:hidden;margin-bottom:8px">
       <div style="position:absolute;right:0;top:0;bottom:0;width:26px;background:#202020"></div>
       <div style="position:absolute;right:34px;top:12px;left:12px;height:10px;border-radius:99px;background:#6f6aeb"></div>
       <div style="position:absolute;right:34px;top:30px;left:12px;height:8px;border-radius:99px;background:#262626"></div>
       <div style="position:absolute;right:34px;top:46px;left:40px;height:8px;border-radius:99px;background:#2a2a2a"></div></div>
     <b class="t-bs" style="color:var(--t1)">روشن (پیش‌فرض)</b>${S.theme==='light'?'<span class="badge bd-pr mt4">فعال</span>':''}</button>
    <button class="panel" style="padding:16px;text-align:center;border-color:${S.theme==='dark'?'var(--pr2)':'var(--bd)'}" onclick="S.theme='dark';saveTheme();render()">
     <div style="height:80px;border-radius:8px;background:#f4f4f5;border:1px solid #e4e4e7;position:relative;overflow:hidden;margin-bottom:8px">
       <div style="position:absolute;right:0;top:0;bottom:0;width:26px;background:#ffffff"></div>
       <div style="position:absolute;right:34px;top:12px;left:12px;height:10px;border-radius:99px;background:#5853e0"></div>
       <div style="position:absolute;right:34px;top:30px;left:12px;height:8px;border-radius:99px;background:#e4e4e7"></div>
       <div style="position:absolute;right:34px;top:46px;left:40px;height:8px;border-radius:99px;background:#eeeef2"></div></div>
     <b class="t-bs" style="color:var(--t1)">تاریک</b>${S.theme==='dark'?'<span class="badge bd-pr mt4">فعال</span>':''}</button>
   </div>
   <div class="divider my16"></div>
   <div class="frow" style="max-width:520px">
    ${fld('اندازه فونت',selWrap('st-fs',[{v:'sm',t:'کوچک'},{v:'md',t:'متوسط (پیش‌فرض)'},{v:'lg',t:'بزرگ'}],'md'))}
    ${fld('فونت سازمان','<input class="inp" value="IRANSansX (ایران‌سنس‌ایکس)" readonly style="opacity:.7">')}</div>
   <p class="t-cap mt8">${ic('info',12)} فونت سازمانی IRANSansX به‌صورت self-hosted بارگذاری می‌شود و در نبود آن از فونت جایگزین سیستمی استفاده می‌گردد.</p>
  </div></div>`;
}
function setSecurity(){
  return `<div class="card" style="max-width:720px"><div class="card-b col g16">
   <div class="panel" style="padding:16px 16px"><div class="row"><div class="grow"><b class="t-bs" style="color:var(--t1)">ورود دو مرحله‌ای با پیامک</b><p class="t-cap">روش احراز هویت اجباری همه کاربران</p></div><span class="badge bd-ok">فعال — اجباری</span></div></div>
   <div class="frow">${fld('طول عمر کد تایید (دقیقه)','<input class="inp num" value="۲">')}${fld('حداکثر تلاش ورود','<input class="inp num" value="۳">')}</div>
   <h4 class="t-h4">نشست‌های فعال</h4>
   ${[['iPhone 15 — تهران','Chrome · همین حالا',1],['MacBook Pro — تهران','Chrome · ۲ ساعت پیش',0],['Windows — مشهد','Edge · ۳ روز پیش',0]].map(s=>`
    <div class="row" style="justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--bd)">
     <div><b class="t-bs" style="color:var(--t1)">${s[0]}</b><p class="t-cap">${s[1]}</p></div>
     ${s[2]?'<span class="badge bd-ok">نشست فعلی</span>':`<button class="btn btn-sm btn-err" onclick="toast('warn','نشست پایان یافت','دستگاه از حساب خارج شد.')">خروج</button>`}</div>`).join('')}
   <button class="btn btn-err" style="align-self:flex-start" onclick="confirmDlg('خروج از همه دستگاه‌ها','همه نشست‌ها به‌جز دستگاه فعلی پایان یابند؟',()=>toast('warn','همه نشست‌ها پایان یافت'),'خروج همه',true)">پایان همه نشست‌های دیگر</button>
  </div></div>`;
}
function setApi(){
  return `<div class="card" style="max-width:720px"><div class="card-b col g12">
   <h4 class="t-h4">کلید API سازمان</h4>
   <div class="key-mask"><span class="k">fx-live-••••••••••••••••••••</span>
    <button class="ibtn" data-tip="کپی" onclick="toast('ok','کلید کپی شد')">${ic('copy',13)}</button>
    <button class="ibtn" data-tip="چرخش" onclick="toast('warn','کلید چرخش یافت')">${ic('refresh',13)}</button></div>
   <h4 class="t-h4 mt8">وب‌هوک عمومی</h4>
   <div class="key-mask"><span class="k">https://erp.effectstudio.ir/api/v1/hooks</span>${ic('link',13)}</div>
   <h4 class="t-h4 mt8">محدودیت نرخ</h4>
   <div class="row g12"><span class="chip">۱٬۰۰۰ درخواست/دقیقه</span><span class="chip">۱۰٬۰۰۰ درخواست/ساعت</span></div>
   <p class="t-cap">${ic('shield',12)} تمام کلیدها رمزنگاری‌شده ذخیره می‌شوند و هرگز به‌صورت کامل نمایش داده نمی‌شوند.</p>
  </div></div>`;
}
VIEWS['integrations']={title:'اتصالات و API',vw:intView};
VIEWS['permissions']={title:'نقش‌ها و دسترسی‌ها',vw:rbacView};
VIEWS['activity']={title:'لاگ فعالیت‌ها',vw:actView};
VIEWS['notifications']={title:'مرکز اعلان‌ها',vw:notifCenterView};
VIEWS['reports']={title:'گزارش‌ها',vw:reportsView};
VIEWS['settings']={title:'تنظیمات',vw:setView};
