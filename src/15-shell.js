/* ============================================================
   EFFECT ERP · App shell — sidebar(right) · topbar · ⌘K · router
   ============================================================ */
const NAV=[
 {sec:'عمومی'},
 {r:'dashboard',t:'داشبورد',icn:'dashboard'},
 {r:'mytasks',t:'کارهای من',icn:'mytask'},
 {r:'calendar',t:'تقویم',icn:'cal'},
 {sec:'عملیات'},
 {r:'workspaces',t:'فضاهای کاری',icn:'briefcase',sub:[['tasks','برد تسک‌ها',null],['workspaces','مدیریت فضاهای کاری',null]]},
 {r:'crm',t:'CRM',icn:'crm',sub:[['crm/pipeline','سرنخ‌ها',LEADS.length],['crm/companies','شرکت‌ها',13],['crm/contacts','مخاطبین',11],['crm/opps','فرصت‌های فروش',5],['crm/acts','فعالیت‌ها',null]]},
 {r:'customers',t:'مشتریان',icn:'building'},
 {r:'cpro',t:'پروژه‌های مشتریان',icn:'briefcase'},
 {r:'leaves',t:'مرخصی',icn:'leave',badge:2},
 {sec:'مدیریت'},
 {r:'finance',t:'مالی',icn:'wallet',sub:[['finance/in','دریافت‌ها',null],['finance/pay','پرداخت‌ها',null],['finance/invoices','فاکتورها',12],['finance/proforma','پیش‌فاکتورها',5],['finance/payroll','پرداخت پرسنل',null],['finance/bank','اطلاعات بانکی پرسنل',null],['finance/tx','تراکنش‌ها',null]]},
 {r:'reports',t:'گزارش‌ها',icn:'chart'},
 {r:'social',t:'شبکه‌های اجتماعی',icn:'share',sub:[['social/posts','پست‌ها و تحلیل',14],['social/report','گزارش مشتری',null]]},
 {r:'team',t:'تیم',icn:'users'},
 {r:'integrations',t:'اتصالات',icn:'plug',dot:true},
 {r:'settings',t:'تنظیمات',icn:'sliders',sub:[['permissions','نقش‌ها و دسترسی‌ها',null],['users','مدیریت کاربران',null],['activity','لاگ فعالیت‌ها',null],['notifications','مرکز اعلان‌ها',null]]},
];
function navActive(route){return NAV.find(n=>n.r&&n.r===route.split('/')[0])||NAV.find(n=>n.r===route);}
function shellHtml(pageHtml,route){
  const ws=WS.find(w=>w.id===S.ws)||WS[0];
  const grpOpen=n=>n.sub&&n.sub.some(s=>('#/'+s[0])===('#/'+route)||route.startsWith(n.r+'/')||route.split('/')[0]===n.r&&n.sub.some(x=>x[0].split('/')[1]===route.split('/')[1]));
  const isOpen=n=>n.sub&&(route.split('/')[0]===n.r||(n.r==='settings'&&['permissions','activity','notifications'].includes(route.split('/')[0])));
  const unread=NOTIFS.filter(n=>n.unread).length;
  const navItems=NAV.filter(n=>{
    if(n.sec)return true;
    if(!can(modOfRoute(n.r),'v'))return false;
    if(n.sub){n._sub=n.sub.filter(x=>can(modOfRoute(x[0].split('/')[0]),'v'));return n._sub.length>0;}
    return true;});
  const secs={};navItems.forEach(n=>{if(n.sec)secs[n.sec]=false;});
  const navFinal=[];let cur=null;
  navItems.forEach(n=>{if(n.sec){cur=n.sec;return;}
    if(cur){navFinal.push({sec:cur});cur=null;}
    navFinal.push(n);});
  return `<div class="shell">
  <aside class="sb ${S.sbMini?'mini':''}" id="sb" aria-label="ناوبری اصلی">
    <div class="sb-brand">${logo()}<div class="nm">Effect ERP<small>استودیو اثر</small></div>
      <button class="ibtn sb-collapse" data-tip="${S.sbMini?'باز کردن منو':'جمع کردن منو'}" onclick="toggleSb()" aria-label="جمع/باز کردن منو">${ic(S.sbMini?'chevleft':'chevright',16)}</button></div>
    <div class="sb-ws"><button class="sb-ws-btn" onclick="wsMenu(event)" aria-label="تغییر فضای کاری">
      <span class="ws-tile" style="background:${ws.color}">${initials(ws.name)}</span>
      <span class="nm"><b>${ws.name}</b><span>فضای کاری فعال</span></span>${ic('chevdown',14)}</button></div>
    <nav class="sb-nav">
    ${navFinal.map(n=>n.sec?`<div class="sb-sec">${n.sec}</div>`:
      n.sub?`<div class="sb-grp ${isOpen(n)?'open':''}">
        <button class="sb-item" onclick="this.parentElement.classList.toggle('open')">${ic(n.icn,17)}<span>${n.t}</span>${n.badge?`<span class="n-badge">${fa(n.badge)}</span>`:''}${ic('chevdown',13,'chev')}</button>
        <div class="sb-sub">${(n._sub||n.sub).map(s=>`<button class="${('#/'+s[0])==='#/'+route.split('/')[0]+'/'+(route.split('/')[1]||'')?'on':''}" onclick="go('#/${s[0]}')">${s[1]}${s[2]!=null?`<span class="cnt">${fa(s[2])}</span>`:''}</button>`).join('')}</div></div>`
      :`<button class="sb-item ${route.split('/')[0]===n.r?'on':''}" onclick="go('#/${n.r}')">${ic(n.icn,17)}<span>${n.t}</span>${n.badge?`<span class="n-badge">${fa(n.badge)}</span>`:''}${n.dot?`<span class="p-dot" data-tip="خطای اتصال"></span>`:''}</button>`).join('')}
    </nav>
    <div class="sb-user">${av('رضا قایمی','lg')}
      <div class="nm"><b>رضا قایمی</b><span>مدیرعامل</span></div>
      <button class="ibtn" onclick="userMenu(event)" aria-label="منوی کاربر" data-tip="حساب کاربری">${ic('more',16)}</button></div>
  </aside>
  <div class="main">
    <header class="tb">
      <div class="tb-r">
        <button class="ibtn hamb" onclick="$('#sb').classList.add('open');sbVeil()" aria-label="منو">${ic('list',18)}</button>
        <div class="tb-page tb-ws-txt" id="tb-title">${VIEWS[route]?VIEWS[route].title:''}</div>
      </div>
      <button class="tb-search" onclick="togglePalette(true)" aria-label="جستجوی سراسری">${ic('search',15)}<span class="grow ellip" style="text-align:right">جستجو در تسک‌ها، مشتریان، فاکتورها…</span><kbd>⌘K</kbd></button>
      <div class="tb-l">
        <button class="btn btn-pr btn-sm" onclick="quickCreate(event)">${ic('plus',15)} ایجاد سریع</button>
        <button class="ibtn tb-cal" data-tip="تقویم" onclick="go('#/calendar')" aria-label="تقویم">${ic('calplus',17)}</button>
        <button class="ibtn tb-bell" data-tip="اعلان‌ها" onclick="openNotifs()" aria-label="اعلان‌ها">${ic('bell',17)}${unread?`<span class="n"></span>`:''}</button>
        <button class="ibtn tb-help" data-tip="راهنما" onclick="openHelp()" aria-label="راهنما">${ic('help',17)}</button>
        <span style="width:1px;height:22px;background:var(--bd)"></span>
        <button class="tb-av" onclick="userMenu(event)" aria-label="پروفایل">${av('رضا قایمی')}<span class="txt" style="text-align:right"><b>رضا قایمی</b><span>مدیرعامل</span></span>${ic('chevdown',13)}</button>
      </div>
    </header>
    ${pageHtml}
  </div></div>`;
}
function sbVeil(){const v=document.createElement('div');v.className='sb-veil';v.onclick=()=>{v.remove();$('#sb').classList.remove('open');};document.body.appendChild(v);}
function toggleSb(){S.sbMini=!S.sbMini;render();}
function wsMenu(e){
  menu(e.currentTarget,WS.map(w=>({t:w.name,ic:'briefcase',fn:`S.ws='${w.id}';render();toast('info','فضای کاری تغییر کرد','فعال: ${w.name}')`})).concat(['-',{t:'ایجاد فضای کاری جدید',ic:'plus',fn:'wsCreateModal()'}]),'فضاهای کاری');
}
function userMenu(e){
  menu(e.currentTarget,[
    {t:'پروفایل من',ic:'user',fn:"go('#/team/e1')"},
    {t:'تنظیمات',ic:'sliders',fn:"go('#/settings')"},
    {t:S.theme==='dark'?'حالت روشن':'حالت تاریک',ic:S.theme==='dark'?'sun':'moon',fn:"S.theme=S.theme==='dark'?'light':'dark';saveTheme();render();"},
    '-',
    {t:'خروج از حساب',ic:'logout',danger:true,fn:'logout()'},
  ],'رضا قایمی — reza@effectstudio.ir');
}
function logout(){confirmDlg('خروج از حساب','آیا می‌خواهید از حساب کاربری خود خارج شوید؟',()=>{S.authed=false;location.hash='#/login';render();toast('info','خروج انجام شد','به امید دیدار مجدد');},'خروج',true);}
function wsCreateModal(){
  openModal({title:'ایجاد فضای کاری جدید',body:
    fld('نام فضای کاری','<input class="inp" placeholder="مثلاً: تیم کیفیت">')+
    fld('توضیح','<input class="inp" placeholder="هدف این فضای کاری چیست؟">')+
    fld('اعضای اولیه','<input class="inp" placeholder="جستجوی افراد…"><div class="row g6 mt8 wrap">'+avStack(['سارا احمدی','محمد رضایی','الهام رستمی'])+'<span class="t-cap">۳ عضو انتخاب شده</span></div>'),
    footer:`<button class="btn btn-pr" onclick="closeModal();toast('ok','فضای کاری ایجاد شد','در نسخه متصل، دعوت‌نامه برای اعضا ارسال می‌شود.')">ایجاد فضای کاری</button><button class="btn btn-ghost" onclick="closeModal()">انصراف</button>`});
}
/* ---------- quick create ---------- */
function quickCreate(e){
  menu(e.currentTarget,[
    can('mytasks','c')?{t:'تسک جدید',ic:'tasks',k:'T',fn:'taskModal(null)'}:null,
    can('calendar','c')?{t:'جلسه جدید',ic:'calplus',fn:'meetModal()'}:null,
    can('invoices','c')?{t:'فاکتور جدید',ic:'filetext',fn:'invModal(false)'}:null,
    can('invoices','c')?{t:'پیش‌فاکتور جدید',ic:'receipt',fn:'invModal(true)'}:null,
    can('customers','c')?{t:'مشتری جدید',ic:'building',fn:'custModal()'}:null,
    can('crm','c')?{t:'سرنخ جدید',ic:'target',fn:'leadModal()'}:null,
    '-',
    {t:'درخواست مرخصی',ic:'leave',fn:'leaveModal()'},
    {t:'گزارش جدید',ic:'chart',fn:"go('#/reports')"},
  ],'ایجاد سریع');
}
/* ---------- help ---------- */
function openHelp(){
  openDrawer({title:'راهنما و میان‌برها',icon:'help',body:`
   <h3 class="t-h4 mb12">میان‌برهای صفحه‌کلید</h3>
   <div class="grid" style="gap:8px">
    ${[['جستجوی سراسری','⌘K یا Ctrl+K'],['بستن پنجره‌ها','Esc'],['حرکت در نتایج جستجو','↑ ↓'],['انتخاب نتیجه','Enter'],['جمع‌کردن نوار کنار','⌘B'],['ایجاد سریع تسک','T'],['اعلان‌ها','N']].map(r=>`
     <div class="row" style="justify-content:space-between;background:var(--s2);border:1px solid var(--bd);border-radius:9px;padding:12px 16px">
      <span class="t-bs" style="color:var(--t1)">${r[0]}</span><kbd>${r[1]}</kbd></div>`).join('')}
   </div>
   <h3 class="t-h4 mt20 mb8">پشتیبانی</h3>
   <p class="t-bs">برای آموزش‌ها و راهنمای کامل ماژول‌ها به ویکی داخلی استودیو اثر مراجعه کنید یا با کاوه دهقان (مدیر سیستم) تماس بگیرید.</p>
   <div class="row g8 mt12"><button class="btn btn-sec btn-sm" onclick="toast('info','ویکی داخلی','در نسخه سازمانی متصل می‌شود.')">${ic('external',14)} ویکی داخلی</button><button class="btn btn-sec btn-sm" onclick="toast('info','تیکت پشتیبانی','فرم ثبت تیکت در نسخه متصل فعال است.')">${ic('msg',14)} ثبت تیکت</button></div>`});
}
/* ---------- notifications ---------- */
function openNotifs(){
  go('#/notifications');
}
function notifDrawerBody(filter){
  const f=filter||'all';
  const list=NOTIFS.filter(n=>f==='all'||n.type===f);
  const groups=[['امروز',list.filter(n=>n.time<1440)],['دیروز',list.filter(n=>n.time>=1440&&n.time<2880)],['این هفته',list.filter(n=>n.time>=2880)]];
  const chips=[['all','همه'],['task','تسک‌ها'],['leave','مرخصی'],['finance','مالی'],['meet','جلسات'],['crm','CRM'],['system','سیستم']];
  return `<div class="row g8 wrap" style="padding:12px 16px;border-bottom:1px solid var(--bd)">
    ${chips.map(c=>`<button class="chip ${f===c[0]?'chip-sel on':''}" onclick="S.notifFilter='${c[0]}';openNotifDrawer()">${c[1]}</button>`).join('')}
    <button class="btn btn-sm btn-ghost mr-auto" onclick="markAllRead()">${ic('check',13)} خواندن همه</button></div>
   ${list.length?groups.map(g=>g[1].length?`<div class="m-hd" style="padding:12px 16px 4px;font-size:10.5px;color:var(--t3);font-weight:600">${g[0]}</div>`+g[1].map(n=>`
    <div class="ntf ${n.unread?'unread':''}" onclick="notifClick('${n.id}')"><span class="ic ${n.cls==='mut'?'':n.cls}">${ic(n.ic,15)}</span>
      <div class="grow"><p>${n.t}</p><time>${relTime(n.time)}</time></div></div>`).join(''):'').join(''):
   `<div class="state" style="padding:60px 24px"><div class="ic ok">${ic('check',24)}</div><h4>همه اعلان‌ها خوانده شد</h4><p>اعلان جدیدی برای شما باقی نمانده است.</p></div>`}`;
}
function openNotifDrawer(){
  openDrawer({title:'اعلان‌ها',icon:'bell',body:notifDrawerBody(S.notifFilter),
    footer:`<button class="btn btn-sec btn-sm" onclick="toast('info','تنظیمات اعلان','از منوی تنظیمات ← اعلان‌ها قابل تغییر است.')">${ic('sliders',14)} تنظیمات اعلان</button>
    <button class="btn btn-sm btn-ghost mr-auto" onclick="closeDrawer();go('#/notifications')">مشاهده همه</button>`});
}
function notifClick(id){const n=NOTIFS.find(x=>x.id===id);n.unread=false;render();openNotifDrawer();
  if(n.type==='task')go('#/mytasks');if(n.type==='leave')go('#/leaves');if(n.type==='finance')go('#/finance/invoices');}
function markAllRead(){NOTIFS.forEach(n=>n.unread=false);render();openNotifDrawer();toast('ok','همه اعلان‌ها خوانده شد');}

/* ---------- command palette ---------- */
let CMD=[],cmdSel=0;
function buildCmd(){
  CMD=[];
  const push=(g,items)=>items.forEach(i=>CMD.push({g,...i}));
  push('دستورات سریع',[
    {t:'ایجاد تسک جدید',ic:'plus',sub:'T',fn:'taskModal(null)'},
    {t:'جلسه جدید',ic:'calplus',sub:'',fn:'meetModal()'},
    {t:'فاکتور جدید',ic:'filetext',sub:'',fn:'invModal(false)'},
    {t:'درخواست مرخصی',ic:'leave',sub:'',fn:'leaveModal()'},
  ].filter(Boolean));
  push('رفتن به',[
    {t:'داشبورد',ic:'dashboard',sub:'',fn:"go('#/dashboard')"},
    {t:'کارهای من',ic:'mytask',sub:'',fn:"go('#/mytasks')"},
    {t:'تقویم',ic:'cal',sub:'',fn:"go('#/calendar')"},
    {t:'CRM — قیف فروش',ic:'crm',sub:'',fn:"go('#/crm')"},
    {t:'مشتریان',ic:'building',sub:'',fn:"go('#/customers')"},
    {t:'مالی — داشبورد',ic:'wallet',sub:'',fn:"go('#/finance')"},
    {t:'شبکه‌های اجتماعی',ic:'share',sub:'',fn:"go('#/social')"},
    {t:'تیم',ic:'users',sub:'',fn:"go('#/team')"},
    {t:'اتصالات',ic:'plug',sub:'',fn:"go('#/integrations')"},
  ]);
  push('تسک‌ها',TASKS.map(t=>({t:t.title,ic:'tasks',sub:prj(t.project).name==='—'?'بدون پروژه':prj(t.project).name,fn:`taskDrawer('${t.id}')`})));
  push('پروژه‌ها',PRJ.map(p=>({t:p.name,ic:'briefcase',sub:cust(p.cust).name,fn:`projInfo('${p.id}')`})));
  push('مشتریان',CUST.map(c=>({t:c.name,ic:'building',sub:c.ind,fn:`custDrawer('${c.id}')`})));
  push('سرنخ‌ها',LEADS.map(l=>({t:l.co,ic:'target',sub:l.stage==='won'?'برنده':PIPE.find(s=>s.id===l.stage).t,fn:`leadDrawer('${l.id}')`})));
  push('فاکتورها',INV.map(i=>({t:i.id,ic:'filetext',sub:cust(i.cust).name,fn:`invPreview('${i.id}')`})));
  push('همکاران',EMP.map(e=>({t:e.name,ic:'user',sub:e.role,fn:`go('#/team/${e.id}')`})));
  push('جلسات',MEETS.map(m=>({t:m.t,ic:'cal',sub:dFaM(m.date)+' '+m.from,fn:"go('#/calendar')"})));
}
function togglePalette(open){
  S.searchOpen=open===undefined?!S.searchOpen:open;
  const ex=$('#cmdp');if(ex)ex.remove();
  if(!S.searchOpen)return;
  buildCmd();cmdSel=0;
  const w=document.createElement('div');w.id='cmdp';w.className='cmdp';
  w.innerHTML=`<div class="ovl" style="position:absolute;inset:0" onclick="togglePalette(false)"></div>
   <div class="box" role="dialog" aria-label="جستجوی سراسری">
    <div class="cmd-in">${ic('search',18)}<input id="cmd-q" placeholder="جستجو یا اجرای دستور… مثلاً: فاکتور تاج محل" autocomplete="off"><kbd>Esc</kbd></div>
    <div class="cmd-list" id="cmd-list"></div>
    <div class="cmd-f"><span>میزان حرکت با کلیدهای بالا و پایین</span><span>Enter انتخاب</span><span>Esc بستن</span><span class="mr-auto">${ic('command',11)} جستجوی هوشمند</span></div></div>`;
  document.body.appendChild(w);
  const inp=w.querySelector('#cmd-q');
  inp.addEventListener('input',()=>cmdFilter(inp.value));
  inp.addEventListener('keydown',e=>{
    const items=getCmdItems();
    if(e.key==='ArrowDown'){e.preventDefault();cmdSel=Math.min(cmdSel+1,items.length-1);cmdPaint();}
    if(e.key==='ArrowUp'){e.preventDefault();cmdSel=Math.max(cmdSel-1,0);cmdPaint();}
    if(e.key==='Enter'&&items[cmdSel]){togglePalette(false);const f=items[cmdSel].fn;new Function('return ('+f+')')();}
  });
  inp.focus();cmdFilter('');
}
function getCmdItems(){return Array.from(document.querySelectorAll('.cmd-i')).map(el=>CMD[+el.dataset.i]);}
function cmdFilter(q){
  cmdSel=0;const norm=s=>String(s).replace(/ي/g,'ی').replace(/ك/g,'ک');
  q=norm(q.trim());
  const hits=CMD.map((c,i)=>({c,i})).filter(x=>!q||norm(x.c.t).includes(q)||norm(x.c.g).includes(q)).slice(0,24);
  const list=$('#cmd-list');
  if(!hits.length){list.innerHTML=`<div class="state" style="padding:32px"><div class="ic">${ic('search',22)}</div><h4>نتیجه‌ای یافت نشد</h4><p>عبارت دیگری را امتحان کنید یا از دستورات سریع استفاده کنید.</p></div>`;return;}
  let html='',lastG=null,idx=0;
  hits.forEach(h=>{
    if(h.c.g!==lastG){html+=`<div class="cmd-g">${h.c.g}</div>`;lastG=h.c.g;}
    html+=`<button class="cmd-i" data-i="${h.i}" data-idx="${idx}" onclick="togglePalette(false);const f=CMD[${h.i}].fn;new Function('return ('+f+')')()">${ic(h.c.ic,16)}<span>${hl(h.c.t,q)}</span><span class="sub">${h.c.sub||''}</span></button>`;
    idx++;
  });
  list.innerHTML=html;cmdPaint();
}
function hl(t,q){if(!q)return esc(t);const i=t.indexOf(q);if(i<0)return esc(t);return esc(t.slice(0,i))+'<span class="cmd-hl">'+esc(t.slice(i,i+q.length))+'</span>'+esc(t.slice(i+q.length));}
function cmdPaint(){const items=$$('.cmd-i');items.forEach((el,i)=>el.classList.toggle('sel',i===cmdSel));const sel=items[cmdSel];if(sel)sel.scrollIntoView({block:'nearest'});}

/* ---------- router & render ---------- */
const VIEWS={};
function parseRoute(){let h=location.hash.replace(/^#\/?/,'').trim();if(!h)h='dashboard';return h;}
function render(){
  applyTheme();
  const app=$('#app');
  if(!S.authed){app.innerHTML=authView();return;}
  const route=parseRoute();
  const scrollY=window.scrollY;
  const v=VIEWS[route]||VIEWS[route.split('/')[0]]||VIEWS['dashboard'];
  const html=routeAllowed(route)?v.vw():`<div class="pg" style="padding-top:64px">${emptyState('دسترسی به این بخش ندارید','برای دریافت دسترسی با مدیر سیستم خود تماس بگیرید.',`<button class="btn btn-pr btn-sm" onclick="go('#/dashboard')">بازگشت به داشبورد</button>`,'lock')}</div>`;
  app.innerHTML=shellHtml(html,route);
  window.scrollTo(0,S._keepScroll?scrollY:0);S._keepScroll=false;
  if(v.after)v.after(route);
}
function onRoute(){S._goto=true;render();}
window.addEventListener('hashchange',onRoute);
document.addEventListener('keydown',e=>{
  const tag=(e.target.tagName||'').toLowerCase();const typing=tag==='input'||tag==='textarea'||tag==='select';
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(S.authed)togglePalette(true);}
  else if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='b'&&S.authed&&!typing){e.preventDefault();toggleSb();}
  else if(e.key==='Escape'){escClose(e);}
  else if(S.authed&&!typing&&!$('#ovl')&&!S.searchOpen){
    if(e.key==='t'||e.key==='T'){taskModal(null);}
    if(e.key==='n'||e.key==='N'){openNotifDrawer();}
  }
});
