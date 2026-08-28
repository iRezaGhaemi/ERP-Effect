/* ============================================================
   EFFECT ERP · Dashboard + daily mission popup
   ============================================================ */
const myTasks=()=>TASKS.filter(t=>t.assignee==='e1'&&t.status!=='done');
const todayTasks=()=>TASKS.filter(t=>t.assignee==='e1'&&t.status!=='done'&&t.due&&jDiff(TODAY,toJ(t.due))<=0);
const overdueTasks=()=>TASKS.filter(t=>t.status!=='done'&&t.due&&dueCls(t.due)==='over');
function dashboardView(){
  const missions=todayTasks(),overdues=overdueTasks(),meetsToday=MEETS.filter(m=>m.date==='1405/06/05');
  const kpis=[
    {l:'درآمد این ماه',v:'۲۸۵٬۰۰۰٬۰۰۰',u:'تومان',d:'+۱۸.۴٪ نسبت به مرداد',up:true,ic:'trendup',accent:true,spk:spark([142,168,151,196,224,285]),m:'finance'},
    {l:'مطالبات',v:'۹۶٬۵۰۰٬۰۰۰',u:'تومان',d:'۴ فاکتور سررسیدشده',up:false,ic:'receipt',spk:spark([220,190,240,210,260,290],{color:'var(--warn)'})},
    {l:'مشتریان فعال',v:'۲۴',d:'+۲ این ماه',up:true,ic:'building'},
    {l:'پروژه‌های فعال',v:'۱۷',d:'۵ نزدیک تحویل',up:false,ic:'briefcase'},
    {l:'تسک‌های امروز',v:fa(missions.length),d:fa(overdues.filter(t=>t.assignee==='e1').length)+' عقب‌افتاده',up:false,ic:'mytask'},
    {l:'درخواست مرخصی',v:'۲',d:'در انتظار تایید شما',up:false,ic:'leave',m:'leaves'},
  ];
  /* سلسله‌مراتب صفحه: سربرگ ← KPI ← تحلیل اصلی ← امروز ← نیازمند توجه ← اطلاعات تکمیلی */
  return `<div class="pg">
  <div class="pg-head"><div class="grow">
    <div class="crumb"><a href="#/dashboard">استودیو اثر</a><span class="sep">${ic('chevleft',11)}</span><span>داشبورد</span></div>
    <h1 class="t-display">سلام رضا</h1>
    <p class="t-bs mt8">${jDowFa(TODAY)}، ${jStrL(TODAY)}</p></div>
    <div class="pg-actions">
      <button class="btn btn-sec" onclick="missionPopup()">${ic('zap',15)} گزارش شروع روز</button>
      <button class="btn btn-pr" onclick="taskModal(null)">${ic('plus',15)} ایجاد تسک</button></div></div>

  <div class="col" style="gap:24px">
  <div class="grid grid-6">${kpis.filter(k=>!k.m||can(k.m)).map(k=>`
    <div class="kpi ${k.accent?'accent':''}"><div class="k-l">${ic(k.ic,16)}${k.l}</div>
      <div class="row" style="justify-content:space-between"><div class="k-v num">${k.v}${k.u?`<span class="un">${k.u}</span>`:''}</div>${k.spk||''}</div>
      <div class="k-d ${k.up?'up':''}">${k.up?ic("trendup",12):""}${k.d}</div></div>`).join('')}
  </div>

  <div>
    <div class="sec-title" style="margin-top:0">${ic('chart',15)} تحلیل اصلی<span class="ln"></span></div>
    <div class="grid grid-split">
      ${can('finance')?`<div class="card"><div class="card-h">${ic('trendup',16)}<span class="t-h3 grow">درآمد و هزینه</span><span class="t-cap">میلیون تومان</span></div>
        <div class="card-b">${chBars(REV_6M.map(m=>({v:m.r,v2:m.e})),{h:160})}
          ${chartLbls(REV_6M.map(m=>m.m))}
          <div class="legend mt8"><span><i style="background:var(--pr)"></i>درآمد</span><span><i style="background:var(--bd2)"></i>هزینه</span><span class="mr-auto t-cap">سود شهریور: ۱۲۲ میلیون</span></div></div></div>`:''}
      ${can('crm')?`<div class="card"><div class="card-h">${ic('crm',16)}<span class="t-h3 grow">CRM — قیف فروش</span>
        <button class="btn btn-sm btn-ghost" onclick="go('#/crm')">جزئیات</button></div>
        <div class="card-b" style="display:flex;flex-direction:column;gap:8px">
        ${PIPE.slice(0,6).map(st=>{const ls=LEADS.filter(l=>l.stage===st.id);const val=ls.reduce((s,l)=>s+l.value,0);
          return `<div class="loadbar"><span class="nm">${st.t}</span><div class="prog"><i style="width:${Math.min(100,ls.length?ls.length*28+12:4)}%"></i></div>
            <span class="pc num">${fa(ls.length)}</span></div>`;}).join('')}
        <p class="t-cap mt8">ارزش کل در جریان: ۳٬۲۴۵٬۰۰۰٬۰۰۰ تومان</p></div></div>`:''}
    </div></div>

  <div>
    <div class="sec-title">${ic('zap',15)} امروز من<span class="ln"></span></div>
    <div class="grid grid-split">
      <div class="card">
        <div class="card-h">${ic('mytask',16)}<span class="t-h3 grow">ماموریت‌های امروز</span>
          <button class="btn btn-sm btn-ghost" onclick="go('#/mytasks')">مشاهده همه ${ic('chevleft',13)}</button></div>
        <div class="card-b" style="padding-top:4px">
        ${missions.length?missions.slice(0,5).map(t=>`
          <div class="todo"><span class="ckb"><input type="checkbox" onchange="taskDone('${t.id}')"><span class="bx">${ic('check',11)}</span></span>
            <div class="bd grow" style="min-width:0"><b class="ellip">${esc(t.title)}</b>
              <p>${prj(t.project).name} · ${emp(t.assignee).name}</p></div>
            ${prioBadge(t.prio)}${dueBadge(t.due)}</div>`).join(''):
          `<div class="empty-mini mt8">مامورتی برای امروز باقی نمانده — عالی است</div>`}
        </div></div>
      <div class="card">
        <div class="card-h">${ic('cal',16)}<span class="t-h3 grow">جلسات امروز</span>
          <button class="btn btn-sm btn-ghost" onclick="go('#/calendar')">تقویم</button></div>
        <div class="card-b">
        ${meetsToday.length?meetsToday.map(m=>`<div class="meet-mini"><div class="tm"><b>${fa(m.from)}</b><span>${fa(Math.round(m.dur/60*10)/10)} دقیقه</span></div>
          <div class="bd grow" style="min-width:0"><b>${m.t}</b>
           <div class="row g6 mt4 wrap">${avStack(m.who.map(w=>emp(w).name))}<span class="t-cap">${m.who.map(w=>emp(w).name).join('، ')}</span></div></div>
          <button class="btn btn-sm btn-sec" onclick="toast('info','لینک جلسه','meet.effectstudio.ir — در نسخه متصل به سیستم ویدئوکنفرانس')">${ic('link',13)} ورود</button></div>`).join(''):
          '<div class="empty-mini">جلسه‌ای برای امروز ثبت نشده است</div>'}
        </div></div>
    </div></div>

  <div>
    <div class="sec-title">${ic('alert',15)} نیازمند توجه<span class="ln"></span></div>
    <div class="grid grid-3">
      <div class="card"><div class="card-h">${ic('alert',15)}<span class="t-h3 grow">کارهای عقب‌افتاده</span><span class="badge bd-err">${fa(overdues.length)}</span></div>
        <div class="card-b" style="padding-top:4px">
        ${overdues.slice(0,4).map(t=>`<div class="appr" onclick="taskDrawer('${t.id}')" style="cursor:pointer">
          <div class="bd grow" style="min-width:0"><b class="ellip">${esc(t.title)}</b><span>${emp(t.assignee).name} · ${prj(t.project).name}</span></div>${dueBadge(t.due)}</div>`).join('')}
        </div></div>
      ${can('leaves')?`<div class="card"><div class="card-h">${ic('leave',15)}<span class="t-h3 grow">درخواست‌های مرخصی</span>
          <button class="btn btn-sm btn-ghost" onclick="go('#/leaves')">همه</button></div>
        <div class="card-b" style="padding-top:4px">
        ${LEAVES.filter(l=>l.status==='در انتظار تایید').map(l=>`
          <div class="appr">${av(emp(l.emp).name)}<div class="bd grow" style="min-width:0"><b>${emp(l.emp).name}</b><span>${l.type} · ${dFaM(l.from)} تا ${dFaM(l.to)} (${fa(l.days)} روز)</span></div>
            <button class="ibtn" data-tip="تایید" onclick="leaveAct('${l.id}','تایید شده')">${ic('check',15)}</button>
            <button class="ibtn ibtn-err" data-tip="رد" onclick="leaveAct('${l.id}','رد شده')">${ic('x',15)}</button></div>`).join('')}
        </div></div>`:''}
      ${can('invoices')?`<div class="card"><div class="card-h">${ic('receipt',15)}<span class="t-h3 grow">فاکتورهای سررسیدشده</span></div>
        <div class="card-b" style="padding-top:4px">
        ${INV.filter(i=>i.status==='سررسید گذشته').map(i=>`
          <div class="appr"><div class="bd grow" style="min-width:0"><b class="num">${i.id}</b><span>${cust(i.cust).name} · ${fa(jDiff(toJ(i.due),TODAY))} روز تاخیر</span></div>
            <button class="btn btn-sm btn-ok" onclick="payReminder('${i.id}')">یادآوری</button></div>`).join('')}
        </div></div>`:''}
    </div></div>

  <div>
    <div class="sec-title">${ic('activity',15)} اطلاعات تکمیلی<span class="ln"></span></div>
    <div class="grid grid-split">
      <div class="card">
        <div class="card-h">${ic('users',16)}<span class="t-h3 grow">وضعیت تیم</span><span class="badge bd-ok"><span class="dot"></span>۹ نفر آنلاین</span></div>
        <div class="card-b">${EMP.filter(e=>['e2','e10','e3','e8','e4','e11'].includes(e.id)).map(e=>`
          <div class="loadbar">${av(e.name)}<span class="nm">${e.name}</span>
            <div class="prog ${e.load>85?'warn':''}"><i style="width:${e.load}%"></i></div><span class="pc">${fa(e.load)}٪</span></div>`).join('')}
          <p class="t-cap mt8">حجم کار بالای ۸۵٪: الهام رستمی و سارا احمدی — توازن بار پیشنهاد می‌شود.</p></div></div>
      <div class="card"><div class="card-h">${ic('leave',16)}<span class="t-h3 grow">مانده مرخصی من</span></div>
        <div class="card-b row g16">
          ${ringPct(64,{size:72,label:'۱۴ روز'})}
          <div class="col" style="gap:4px;min-width:0"><span class="t-bs" style="color:var(--t1)">۱۴ روز از ۲۲ روز باقی مانده</span>
            <span class="t-cap">۷ روز در ۱۴۰۵ استفاده شده</span>
            <a href="#/leaves" style="font-size:12px">درخواست مرخصی جدید ${ic('chevleft',11)}</a></div></div></div>
    </div>
    <div class="grid grid-2 mt24">
      <div class="card"><div class="card-h">${ic('bell',15)}<span class="t-h3 grow">اعلان‌های اخیر</span>
          <button class="btn btn-sm btn-ghost" onclick="openNotifDrawer()">همه</button></div>
        <div style="padding:0 8px">${NOTIFS.slice(0,4).map(n=>`<div class="ntf ${n.unread?'unread':''}" style="padding:12px" onclick="notifClick('${n.id}')">
          <span class="ic ${n.cls}">${ic(n.ic,14)}</span><div class="grow" style="min-width:0"><p>${n.t}</p><time>${relTime(n.time)}</time></div></div>`).join('')}</div></div>
      <div class="card"><div class="card-h">${ic('activity',15)}<span class="t-h3 grow">فعالیت‌های اخیر</span></div>
        <div class="card-b" style="padding-top:4px">
        ${ACTIVITY.slice(0,5).map(a=>`<div class="feed"><span class="dot" style="background:${['مالی','تنظیمات'].includes(a.mod)?'var(--ok)':'var(--pr)'}"></span>
          <div class="grow" style="min-width:0"><p><b>${a.who==='e1'?'شما':emp(a.who).name}</b> — ${a.act} · <span class="t2c">${a.det}</span></p><time>${relTime(a.min)}</time></div></div>`).join('')}
        </div></div>
    </div></div>
  </div></div></div>`;
}

function taskDone(id){const t=task(id);t.status='done';toast('ok','تسک انجام شد','«'+t.title+'» به ستون انجام شده منتقل شد',{t:'واگرد',fn:`task('${id}').status='${'doing'}';render()`});render();}
function payReminder(id){toast('ok','یادآوری ارسال شد','پیامک و ایمیل یادآوری پرداخت برای '+cust(INV.find(i=>i.id===id).cust).name+' ارسال شد.');}
function leaveAct(id,st){const l=LEAVES.find(x=>x.id===id);l.status=st;render();
  toast(st==='تایید شده'?'ok':'warn',st==='تایید شده'?'مرخصی تایید شد':'مرخصی رد شد',emp(l.emp).name+' — '+l.type+' ('+fa(l.days)+' روز)');}
function missionPopup(){
  const missions=todayTasks(),over=overdueTasks(),meets=MEETS.filter(m=>m.date==='1405/06/05');
  const urgent=missions.filter(t=>t.prio==='urgent').length+over.length;
  openModal({title:'',wide:true,body:`
   <div class="mission-pop">
    <div class="row" style="justify-content:space-between;gap:16px;flex-wrap:wrap">
     <div class="min0" style="max-width:420px">
      <h2 class="t-h2" style="white-space:nowrap">${greeting()}، رضا</h2>
      <p class="t-bs mt4">بیایید روز را با یک برنامه مشخص شروع کنیم.</p></div>
     ${ringPct(62,{size:64,color:'var(--pr)'})}</div>
    <h4 class="t-h4 mt16 mb8">ماموریت‌های امروز</h4>
    <div class="msn-grid">
      <div class="msn"><span class="ic" style="background:var(--pr-soft);color:var(--pr)">${ic('mytask',16)}</span><div><b class="num">${fa(missions.length)}</b><span>کار امروز</span></div></div>
      <div class="msn"><span class="ic" style="background:var(--err-soft);color:var(--err)">${ic('flag',16)}</span><div><b class="num">${fa(urgent)}</b><span>فوری و عقب‌افتاده</span></div></div>
      <div class="msn"><span class="ic" style="background:var(--info-soft);color:var(--info)">${ic('cal',16)}</span><div><b class="num">${fa(meets.length)}</b><span>جلسه امروز</span></div></div>
      <div class="msn"><span class="ic" style="background:var(--ok-soft);color:var(--ok)">${ic('check',16)}</span><div><b class="num">${fa(missions.filter(t=>t.status==='doing').length)}</b><span>در حال انجام</span></div></div>
    </div>
    <div class="col mt16" style="gap:8px">
    ${missions.slice(0,3).map(t=>`<div class="row g8 mission-li" style="flex-wrap:wrap">
      ${prioBadge(t.prio)}<span class="t-bs grow min0 ellip" style="color:var(--t1)">${esc(t.title)}</span>${dueBadge(t.due)}</div>`).join('')}
    ${meets.slice(0,1).map(m=>`<div class="row g8 mission-li" style="flex-wrap:wrap">
      <span class="badge bd-pr num">${fa(m.from)}</span><span class="t-bs grow min0 ellip" style="color:var(--t1)">${m.t}</span></div>`).join('')}
    </div></div>`,
    footer:`<button class="btn btn-pr" onclick="closeModal();toast('ok','روز خوبی داشته باشی رضا','ماموریت‌ها در «کارهای من» پیگیری می‌شود')">شروع روز</button>
    <button class="btn btn-sec" onclick="closeModal();go('#/mytasks')">مشاهده کارها</button>
    <button class="btn btn-ghost mr-auto" onclick="closeModal()">بعداً</button>`});
}
VIEWS['dashboard']={title:'داشبورد',vw:dashboardView,after(){if(!S.missionSeen){S.missionSeen=true;setTimeout(missionPopup,500);}}};
