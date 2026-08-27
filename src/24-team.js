/* ============================================================
   EFFECT ERP · Team — directory + employee profile
   ============================================================ */
let TEAM_F={dept:'',st:'',q:''};
function teamView(){
  const route=parseRoute();const id=route.split('/')[1];
  if(id)return teamProfile(id);
  const list=EMP.filter(e=>(!TEAM_F.dept||e.dept===TEAM_F.dept)&&(!TEAM_F.st||e.status===TEAM_F.st)&&(!TEAM_F.q||e.name.includes(TEAM_F.q)));
  const stMap={in:'در دفتر',remote:'دورکار',leave:'مرخصی',off:'غیرفعال'};
  return `<div class="pg">${pgHead('تیم','فهرست کارکنان استودیو اثر — ۱۳ نفر',
   `<button class="btn btn-sec" onclick="toast('info','دعوت همکار','لینک دعوت کپی شد.')">${ic('users',14)} دعوت همکار</button>`,
   [{t:'داشبورد'},{t:'تیم'}])}
  <div class="grid grid-4 mb16">
   <div class="kpi"><div class="k-l">${ic('users',14)}کل اعضا</div><div class="k-v num">۱۳</div><div class="k-d">۶ دپارتمان</div></div>
   <div class="kpi"><div class="k-l">${ic('check',14)}حاضر امروز</div><div class="k-v num">۱۱</div><div class="k-d up">۸۵٪ حضور</div></div>
   <div class="kpi"><div class="k-l">${ic('leave',14)}در مرخصی</div><div class="k-v num">۱</div><div class="k-d">حسین شریفی</div></div>
   <div class="kpi"><div class="k-l">${ic('chart',14)}میانگین بار کاری</div><div class="k-v num">۷۲٪</div><div class="k-d">سالم</div></div></div>
  ${filterbar(`<span class="lb">${ic('filter',13)} فیلترها</span>
   <div class="inp-ic" style="width:200px"><input class="inp" style="height:32px;padding-left:32px" placeholder="جستجوی نام…" value="${TEAM_F.q}" oninput="TEAM_F.q=this.value;debRender()"></div>
   <div class="sel-wrap"><select class="sel fsel" onchange="TEAM_F.dept=this.value;render()"><option value="">همه دپارتمان‌ها</option>${[...new Set(EMP.map(e=>e.dept))].map(d=>`<option ${TEAM_F.dept===d?'selected':''}>${d}</option>`).join('')}</select>${ic('chevdown',13)}</div>
   <div class="sel-wrap"><select class="sel fsel" onchange="TEAM_F.st=this.value;render()"><option value="">همه وضعیت‌ها</option>${Object.entries(stMap).map(([k,v])=>`<option value="${k}" ${TEAM_F.st===k?'selected':''}>${v}</option>`).join('')}</select>${ic('chevdown',13)}</div>`)}
  ${withLoading('team',()=>`<div class="grid grid-4">${list.length?list.map(e=>`
   <div class="card hoverable" style="padding:16px;cursor:pointer" onclick="go('#/team/${e.id}')">
    <div class="row">${av(e.name,'lg','avwrap'+(e.status!=='off'?' st-'+(e.status==='leave'?'leave':e.status==='remote'?'off':'ok'):''))}
     <div class="grow"><b class="t-h4" style="display:block">${e.name}</b><span class="t-cap">${e.role}</span></div></div>
    <div class="row g6 mt12 wrap"><span class="tag">${e.dept}</span><span class="tag">${stMap[e.status]}</span></div>
    <div class="loadbar mt8"><span class="nm">بار کاری</span><div class="prog ${e.load>85?'warn':e.load<50?'':'ok'}"><i style="width:${e.load}%"></i></div><span class="pc">${fa(e.load)}٪</span></div>
   </div>`).join(''):`<div class="card">${emptyState('همکاری یافت نشد','فیلترها را تغییر دهید.',`<button class="btn btn-sm btn-sec" onclick="TEAM_F={dept:'',st:'',q:''};render()">حذف فیلترها</button>`,'users')}</div>`}</div>`)}</div>`;
}
function teamProfile(id){
  const e=emp(id);const tab=S.tabs.emp||'personal';
  const etasks=TASKS.filter(t=>t.assignee===id);
  const eproj=PRJ.filter(p=>p.lead===id||TASKS.some(t=>t.project===p.id&&t.assignee===id));
  const bal=LEAVE_BAL.find(b=>b.emp===id);
  return `<div class="pg">${pgHead(e.name,e.role+' · '+e.dept+' · همکاری از '+dFaL(e.start),
   `<button class="btn btn-sec" onclick="toast('info','پیام','در نسخه متصل به پیام‌رسان فعال است.')">${ic('msg',14)} پیام</button>
    <button class="btn btn-ghost" onclick="go('#/team')">${ic('arrowright',14)} بازگشت</button>`,
   [{t:'داشبورد'},{t:'تیم'},{t:e.name,h:'#/team'}])}
  <div class="card mb16"><div class="cust-hero" style="padding:16px 24px">
    <div class="col g8" style="align-items:flex-start">
     ${av(e.name,'xl')}
     ${id==='e1'?`<button class="btn btn-sec btn-sm" onclick="S._editProf=true;S.tabs.emp='personal';render()">${ic('edit',12)} ویرایش پروفایل</button>`:''}
     ${id!=='e1'&&can('team','e')?`<span class="t-cap">${ic('lock',11)} ویرایش این پروفایل از «مدیریت کاربران»</span>`:''}
     ${id!=='e1'&&!can('team','e')?`<span class="t-cap">${ic('lock',11)} پروفایل فقط-خواندنی است</span>`:''}
    </div>
    <div class="grow min0"><div class="row g8 wrap"><h2 class="t-h2">${e.name}</h2><span class="badge bd-${e.status==='in'?'ok':e.status==='leave'?'warn':'mut'}"><span class="dot"></span>${{in:'در دفتر',remote:'دورکار',leave:'در مرخصی',off:'غیرفعال'}[e.status]}</span></div>
     <p class="t-bs mt4">${e.role} · دپارتمان ${e.dept}</p></div>
    <div class="row g20 mr-auto" style="flex-wrap:wrap">
      <div class="metric-mini"><b class="num">${fa(etasks.filter(t=>t.status!=='done').length)}</b><span>تسک فعال</span></div>
      <div class="metric-mini"><b class="num">${fa(etasks.filter(t=>t.status==='done').length)}</b><span>انجام‌شده</span></div>
      <div class="metric-mini"><b class="num">${fa(e.score)}</b><span>امتیاز عملکرد</span></div></div></div>
   <div class="row g8 px-18" style="padding:0 16px 16px">
     <span class="chip">${ic('mail',12)} ${e.email}</span><span class="chip">${ic('phone',12)} <span class="num">${e.phone}</span></span></div>
  ${tabsBar('emp',[
    {v:'personal',t:'شخصی'},{v:'work',t:'کاری'},{v:'tasks',t:'تسک‌ها',cnt:etasks.length},{v:'projects',t:'پروژه‌ها',cnt:eproj.length},
    {v:'leave',t:'مرخصی'},{v:'pay',t:'پرداخت‌ها'},{v:'bank',t:'اطلاعات بانکی'},{v:'acts',t:'فعالیت‌ها'},{v:'perms',t:'دسترسی‌ها'}],tab,'empTabGo')}</div>
  <div class="card"><div class="sub-tab-body">
  ${tab==='personal'?empTabPersonal(e)
  :tab==='work'?empTabWork(e,etasks)
  :tab==='acts'?`<h4 class="t-h4 mb8">فعالیت‌های اخیر</h4>
     ${ACTIVITY.filter(a=>a.who===id).slice(0,10).map(a=>`<div class="act-row"><span class="act-ic pr">${ic('activity',13)}</span><div class="grow"><p class="t-bs"><b>${a.act}</b> · <span class="t2c">${a.det}</span></p><time class="t-cap">${relTime(a.min)} · ${a.mod}</time></div></div>`).join('')||'<div class="empty-mini">فعالیتی ثبت نشده</div>'}`
  :tab==='perms'?empTabPerms(e)
  :tab==='bank'?empTabBank(e)
  :tab==='ov'?`<div class="grid grid-4 mb16">
     <div class="kpi"><div class="k-l">${ic('mytask',14)}تسک‌های فعال</div><div class="k-v num">${fa(etasks.filter(t=>t.status!=='done').length)}</div><div class="k-d dn">${fa(etasks.filter(t=>t.due&&dueCls(t.due)==='over').length)} عقب‌افتاده</div></div>
     <div class="kpi"><div class="k-l">${ic('check',14)}انجام‌شده (۱۴۰۵)</div><div class="k-v num">${fa(etasks.filter(t=>t.status==='done').length+42)}</div><div class="k-d up">+۱۵٪ سه‌ماهه</div></div>
     <div class="kpi"><div class="k-l">${ic('chart',14)}بار کاری</div><div class="k-v num">${fa(e.load)}٪</div><div class="k-d">${e.load>85?'بالا — توازن لازم':'سالم'}</div></div>
     <div class="kpi"><div class="k-l">${ic('leave',14)}مانده مرخصی</div><div class="k-v num">${fa(bal.total-bal.used)}<span class="un">روز</span></div><div class="k-d">از ${fa(bal.total)} روز</div></div></div>
     <h4 class="t-h4 mb8">فعالیت‌های اخیر</h4>
     ${ACTIVITY.filter(a=>a.who===id).slice(0,5).map(a=>`<div class="act-row"><span class="act-ic pr">${ic('activity',13)}</span><div class="grow"><p class="t-bs"><b>${a.act}</b> · <span class="t2c">${a.det}</span></p><time class="t-cap">${relTime(a.min)} · ${a.mod}</time></div></div>`).join('')||'<div class="empty-mini">فعالیتی ثبت نشده</div>'}`
  :tab==='projects'?tblInit('emp-p',[{k:'name',l:'پروژه',mobFull:true,r:p=>`<b>${p.name}</b>`},{k:'cust',l:'مشتری',r:p=>`<span class="t2c">${cust(p.cust).name}</span>`},{k:'status',l:'وضعیت',r:x=>stBadge(x.status)},{k:'progress',l:'پیشرفت',r:p=>`<div class="row g8"><div class="prog" style="width:70px"><i style="width:${p.progress}%"></i></div><span class="ts num">${fa(p.progress)}٪</span></div>`}],eproj,{per:5,onRow:'projInfo',mob:false,empty:'در پروژه‌ای عضو نیست'})
  :tab==='tasks'?tblInit('emp-t',[{k:'title',l:'تسک',mobFull:true,r:t=>`<b>${t.title}</b>`},{k:'status',l:'وضعیت',r:t=>`<span class="badge bd-${t.status==='done'?'ok':t.status==='doing'?'pr':t.status==='review'?'info':'mut'}">${ST_COLS.find(c=>c.id===t.status).t}</span>`},{k:'prio',l:'اولویت',r:t=>prioBadge(t.prio)},{k:'due',l:'سررسید',r:t=>dueBadge(t.due)}],etasks,{per:6,onRow:'taskDrawer',mob:false,empty:'تسکی ندارد'})
  :tab==='skills'?`<div class="webkit">${e.skills.map(s=>`<span class="skill">${ic('star',12)} ${s}</span>`).join('')}</div>
     <h4 class="t-h4 mt16 mb8">سطح مهارت‌ها</h4>
     ${e.skills.map((s,i)=>`<div class="loadbar"><span class="nm">${s}</span><div class="prog"><i style="width:${88-i*12}%"></i></div><span class="pc">${fa(88-i*12)}٪</span></div>`).join('')}`
  :tab==='leave'?`<div class="row g16 mb16">${ringPct(Math.round(bal.used/bal.total*100),{size:72,color:'var(--warn)',label:fa(bal.used)+' روز'})}
     <div class="col"><b class="t-bs" style="color:var(--t1)">${fa(bal.used)} روز از ${fa(bal.total)} روز استفاده شده</b><span class="t-cap">مانده: ${fa(bal.total-bal.used)} روز · سال ۱۴۰۵</span></div></div>
     ${LEAVES.filter(l=>l.emp===id).map(l=>`<div class="appr">${ic('leave',15)}<div class="bd grow"><b>${l.type} — ${fa(l.days)} روز</b><span>${dFa(l.from)} تا ${dFa(l.to)} · «${l.reason}»</span></div>${leaveBadge(l.status)}</div>`).join('')||'<div class="empty-mini">تاریخچه‌ای ندارد</div>'}`
  :tab==='pay'?`<h4 class="t-h4 mb8">تاریخچه پرداخت‌ها</h4>
     ${PAYROLL_HIST(id).map(h=>`<div class="appr">${ic('wallet',15)}<div class="bd grow"><b>${h.m}</b><span>${h.date}</span></div><span class="badge bd-${h.status==='پرداخت شده'?'ok':'warn'}">${h.status}</span></div>`).join('')}
     <button class="btn btn-sm btn-sec mt8" onclick="payHist('${id}')">جزئیات ماه جاری</button>`
  :`<div class="grid" style="grid-template-columns:minmax(0,1fr) 320px">
     <div class="card"><div class="card-h">${ic('chart',15)}<span class="t-h3 grow">امتیاز عملکرد ماهانه</span></div>
      <div class="card-b">${chBars([82,86,84,89,88,e.score].map(v=>({v})),{h:150})}${chartLbls(['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور'])}</div></div>
     <div class="card"><div class="card-h">${ic('star',15)}<span class="t-h3 grow">ارزیابی اخیر</span></div><div class="card-b">
      ${ringPct(e.score,{size:80})}
      <p class="t-bs mt12" style="color:var(--t1);line-height:1.9">«کیفیت خروجی‌ها فوق‌العاده و تحویل به‌موقع. پیشنهاد توسعه نقش در پروژه‌های استراتژیک.»</p>
      <p class="t-cap mt8">ارزیاب: رضا قایمی · مرداد ۱۴۰۵</p></div></div></div>`}
  </div></div></div>`;
}
function empTabGo(v){S.tabs.emp=v;if(v!=='personal')S._editProf=false;render();}
function empTabPersonal(e){
  if(S._editProf&&e.id==='e1')return empTabEdit(e);
  const bal=LEAVE_BAL.find(b=>b.emp===e.id);
  return `<div class="grid grid-2" style="gap:16px">
   <div><h4 class="t-h4 mb8">اطلاعات شخصی</h4>
    <div class="panel" style="padding:16px">
     ${[['نام و نام خانوادگی',e.name],['سمت',e.role],['دپارتمان',e.dept],['ایمیل',e.email],['موبایل',`<span class="num">${e.phone}</span>`],['شروع همکاری',dFaL(e.start)],['وضعیت',{in:'در دفتر',remote:'دورکار',leave:'در مرخصی',off:'غیرفعال'}[e.status]],['درباره',e.bio||'—']].map(([k,v])=>`
      <div class="frow mb8"><span class="t-lbl" style="min-width:120px">${k}</span><span class="t-bs grow min0">${v}</span></div>`).join('')}</div></div>
   <div><h4 class="t-h4 mb8">خلاصه</h4>
    <div class="grid grid-2" style="gap:12px">
     <div class="kpi"><div class="k-l">${ic('mytask',13)}تسک فعال</div><div class="k-v num">${fa(TASKS.filter(t=>t.assignee===e.id&&t.status!=='done').length)}</div></div>
     <div class="kpi"><div class="k-l">${ic('leave',13)}مانده مرخصی</div><div class="k-v num">${fa(bal?bal.total-bal.used:0)}<span class="un">روز</span></div></div></div>
    <div class="panel mt12" style="padding:16px"><span class="t-lbl">آواتار</span>
     <div class="row g12 mt8" style="flex-wrap:wrap">${av(e.name,'xl')}
      <button class="btn btn-sec btn-sm" onclick="photoUpModal('${e.id}')">${ic('upload',12)} بارگذاری عکس</button>
      <button class="btn btn-ghost btn-sm" onclick="toast('info','حذف عکس','در نسخه متصل فعال است.')">${ic('trash',12)} حذف</button></div>
     <p class="t-cap mt8">${ic('lock',12)} عکس پروفایل در تمام ماژول‌ها به‌روزرسانی می‌شود.</p></div></div></div>`;
}
function empTabEdit(e){
  return `<div class="card" style="max-width:640px"><div class="card-h">${ic('edit',15)}<span class="t-h3 grow">ویرایش پروفایل</span>
    <span class="badge bd-warn">${ic('lock',11)} فقط اطلاعات خودتان قابل ویرایش است</span></div>
   <div class="card-b col g12">
    <div class="row g12 wrap" style="align-items:center">
     ${av(e.name,'xl')}
     <div class="col g8">
      <div class="row g8 wrap">
       <label class="btn btn-sec btn-sm" style="cursor:pointer">${ic('upload',12)} تغییر تصویر
        <input type="file" accept="image/*" class="hide" onchange="toast('ok','تصویر انتخاب شد','پیش‌نمایش پس از ذخیره اعمال می‌شود.')"></label>
       <button class="btn btn-ghost btn-sm" onclick="toast('info','برش تصویر','برش خودکار دایره‌ای اعمال می‌شود.')">${ic('scissor',12)} برش</button>
       <button class="btn btn-ghost btn-sm" style="color:var(--err)" onclick="toast('warn','حذف تصویر','به‌جای عکس، حروف اول نام نمایش داده می‌شود.')">${ic('trash',12)} حذف تصویر</button>
      </div>
      <span class="t-cap">فرمت JPG/PNG · حداکثر ۲ مگابایت · برش دایره‌ای خودکار</span>
     </div></div>
    ${fld('نام و نام خانوادگی',`<input class="inp" id="pf-n" value="${e.name}">`)}
    <div class="frow">${fld('ایمیل',`<input class="inp" id="pf-em" dir="ltr" value="${e.email}">`)}${fld('موبایل',`<input class="inp num" id="pf-ph" value="${e.phone}">`)}</div>
    ${fld('درباره من (Bio)',`<textarea class="txa" id="pf-bio" placeholder="چند خط درباره تخصص و تجربه شما…">${e.bio||''}</textarea>`)}
    <div class="row g8">
     <button class="btn btn-pr" onclick="profSave('${e.id}')">${ic('check',13)} ذخیره تغییرات</button>
     <button class="btn btn-ghost" onclick="S._editProf=false;render()">انصراف</button></div>
   </div></div>`;
}
function profSave(id){
  const e=emp(id);
  const n=$('#pf-n').value.trim();
  if(!n){$('#pf-n').classList.add('err');return;}
  e.name=n;e.email=$('#pf-em').value.trim()||e.email;e.phone=$('#pf-ph').value.trim()||e.phone;e.bio=$('#pf-bio').value.trim();
  S._editProf=false;render();
  toast('ok','تغییرات ذخیره شد','اطلاعات پروفایل شما به‌روزرسانی شد.');
}
function empTabWork(e,etasks){
  return `<div class="grid grid-4 mb16">
   <div class="kpi"><div class="k-l">${ic('check',14)}انجام‌شده (۱۴۰۵)</div><div class="k-v num">${fa(etasks.filter(t=>t.status==='done').length+42)}</div><div class="k-d up">+۱۵٪ سه‌ماهه</div></div>
   <div class="kpi"><div class="k-l">${ic('chart',14)}بار کاری</div><div class="k-v num">${fa(e.load)}٪</div><div class="k-d">${e.load>85?'بالا — توازن لازم':'سالم'}</div></div>
   <div class="kpi"><div class="k-l">${ic('star',14)}امتیاز عملکرد</div><div class="k-v num">${fa(e.score)}</div><div class="k-d up">${e.score>90?'ممتاز':'خوب'}</div></div>
   <div class="kpi"><div class="k-l">${ic('briefcase',14)}پروژه‌های فعال</div><div class="k-v num">${fa(PRJ.filter(p=>p.lead===e.id).length)}</div><div class="k-d">سرپرستی مستقیم</div></div></div>
  <h4 class="t-h4 mb8">مهارت‌ها</h4>
  <div class="webkit mb16">${e.skills.map(s=>`<span class="skill">${ic('star',12)} ${s}</span>`).join('')}</div>
  <h4 class="t-h4 mb8">سطح مهارت‌ها</h4>
  ${e.skills.map((s,i)=>`<div class="loadbar"><span class="nm">${s}</span><div class="prog"><i style="width:${88-i*12}%"></i></div><span class="pc">${fa(88-i*12)}٪</span></div>`).join('')}`;
}
function empTabBank(e){
  const b=EMP_BANK[e.id];
  const allowed=canSeeBank();
  const shown=S._bankShown&&S._bankShown[e.id];
  const val=(mask,full)=>shown?full:mask;
  return `<div class="grid grid-2 mb16" style="gap:16px">
   <div class="kpi"><div class="k-l">${ic('bank',14)}حساب حقوق اصلی</div><div class="k-v num">${b?b.bank:'—'}</div><div class="k-d">${b?'بانک '+b.bank:'ثبت نشده'}</div></div>
   <div class="kpi ${allowed?'':'dimmed'}"><div class="k-l">${ic('lock',14)}سطح دسترسی شما</div><div class="k-v" style="font-size:15px">${allowed?'مجاز به مشاهده':'بدون مجوز'}</div>
    <div class="k-d">${allowed?'مشاهده با تاییدیه ثانویه':'فقط ارقام ماسک‌شده'}</div></div></div>
   <div class="panel" style="padding:16px">
    ${[['صاحب حساب',b?b.owner:'—'],['بانک',b?b.bank:'—'],['شماره کارت',b?val(maskCard(b.card),b?b.card:'—'):'—'],['شماره حساب',b?val(maskAcc(b.acc),b?b.acc:'—'):'—'],['شماره شبا',b?val(maskIban(b.iban),b?b.iban:'—'):'—'],['توضیحات',b&&b.note!=='—'?b.note:'—']].map(([k,v])=>`
     <div class="bank-row"><span class="t-lbl">${k}</span>
      <span class="t-bs num grow min0" id="bk-v-${k==='شماره کارت'?'card':k==='شماره شبا'?'iban':'acc'}">${v}</span></div>`).join('')}
    <div class="row g8 mt12 wrap">
     ${allowed&&!shown?`<button class="btn btn-pr btn-sm" onclick="bankReveal('${e.id}')">${ic('eye',13)} نمایش اطلاعات</button>`:''}
     ${allowed&&shown?`<span class="badge bd-warn">${ic('eye',11)} اطلاعات در حال نمایش کامل است</span>
       <button class="btn btn-sec btn-sm" onclick="bankHide('${e.id}')">${ic('eyeoff',13)} پنهان‌سازی</button>`:''}
     ${!allowed?`<span class="badge bd-mut">${ic('lock',11)} نمایش اطلاعات بانکی نیازمند مجوز «مشاهده اطلاعات بانکی پرسنل» است</span>`:''}
     <button class="btn btn-sec btn-sm" onclick="toast('info','ویرایش اطلاعات بانکی','در نسخه متصل به سرور فعال است.')">${ic('edit',13)} ویرایش</button>
     <span class="t-cap mr-auto">${ic('activity',11)} هر مشاهده در لاگ حسابرسی ثبت می‌شود.</span></div></div>
   <h4 class="t-h4 mt16 mb8">لاگ حسابرسی بانکی</h4>
   ${BANK_AUDIT.filter(a=>a.emp===e.id).slice(0,5).map(a=>`<div class="act-row"><span class="act-ic">${ic('lock',13)}</span><div class="grow"><p class="t-bs"><b>${a.act}</b> · <span class="t2c">${a.by}</span></p><time class="t-cap">${a.when}</time></div></div>`).join('')||'<div class="empty-mini">رویدادی ثبت نشده</div>'}`;
}
function bankReveal(id){
  const b=EMP_BANK[id];if(!b){toast('info','اطلاعاتی ثبت نیست','برای این همکار حسابی ثبت نشده است.');return;}
  openModal({title:'نمایش اطلاعات بانکی',body:`
   <p class="t-bs" style="line-height:1.9">${ic('lock',14)} اطلاعات بانکی «<b>${emp(id).name}</b>» به‌صورت کامل نمایش داده می‌شود.<br>این مشاهده در لاگ حسابرسی ثبت خواهد شد.</p>`,
  footer:`<button class="btn btn-pr" onclick="bankDoReveal('${id}')">${ic('eye',14)} نمایش اطلاعات</button>
   <button class="btn btn-ghost" onclick="closeModal()">انصراف</button>`});
}
function bankDoReveal(id){
  if(!EMP_BANK[id])return;
  S._bankShown=S._bankShown||{};S._bankShown[id]=true;
  BANK_AUDIT.unshift({emp:id,act:'مشاهده کامل اطلاعات بانکی',by:'رضا قایمی (مدیر کل)',when:'لحظه پیش · ۱۴۰۵/۰۶/۲۸'});
  closeModal();render();
  toast('warn','اطلاعات نمایش داده شد','این مشاهده در لاگ حسابرسی ثبت شد.');
}
function bankHide(id){S._bankShown=S._bankShown||{};delete S._bankShown[id];render();}
function photoUpModal(id){
  const e=emp(id);
  openModal({title:'عکس پروفایل — '+e.name,body:`
   <div class="photo-up">${av(e.name,'xl')}
    <span class="t-cap">فرمت JPG یا PNG · حداکثر ۲ مگابایت · دایره‌ای برش می‌خورد</span>
    <label class="btn btn-sec btn-sm" style="cursor:pointer">${ic('upload',13)} انتخاب تصویر
     <input type="file" accept="image/*" class="hide" onchange="toast('ok','پیش‌نمایش اعمال شد','تغییر پس از ذخیره نهایی اعمال می‌شود.');closeModal()"></label></div>`,
  footer:`<button class="btn btn-pr" onclick="toast('ok','عکس ذخیره شد','آواتار در تمام ماژول‌ها به‌روزرسانی شد.');closeModal()">ذخیره</button>
   <button class="btn btn-err" onclick="toast('info','حذف عکس','در نسخه متصل فعال است.')">حذف عکس</button>
   <button class="btn btn-ghost" onclick="closeModal()">انصراف</button>`});
}
VIEWS['team']={title:'تیم',vw:teamView};
