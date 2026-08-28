/* ============================================================
   EFFECT ERP · Finance — dashboard/payments/invoices/payroll
   ============================================================ */
function invCalc(i){const sub=i.items.reduce((s,x)=>s+x.q*x.u,0);const net=sub-i.disc;const tax=Math.round(net*0.1);return{sub,net,tax,total:net+tax};}
INV.concat(PROFORMA).forEach(i=>{i.total=invCalc(i).total;});
const ALL_INV_W_STATUS=()=>INV;
function finView(){
  const route=parseRoute();const sub=route.split('/')[1]||'dash';
  const tabs=[{v:'dash',t:'داشبورد مالی'},{v:'in',t:'دریافت‌ها'},{v:'pay',t:'پرداخت‌ها'},{v:'exp',t:'هزینه‌ها'},{v:'invoices',t:'فاکتورها',cnt:INV.length},{v:'proforma',t:'پیش‌فاکتورها',cnt:PROFORMA.length},{v:'payroll',t:'پرداخت پرسنل'},{v:'bank',t:'اطلاعات بانکی پرسنل'},{v:'acc',t:'حساب‌ها'},{v:'tx',t:'تراکنش‌ها',cnt:TX.length},{v:'rpt',t:'گزارش مالی'}];
  return `<div class="pg">${pgHead('مالی','درآمد، هزینه، فاکتورها و پرداخت‌ها در یک نگاه',
   `<button class="btn btn-sec" onclick="txModal('in')">${ic('download',14)} ثبت دریافت</button>
    <button class="btn btn-pr" onclick="invModal(false)">${ic('plus',15)} فاکتور جدید</button>`,
   [{t:'داشبورد'},{t:'مالی'},{t:tabs.find(t=>t.v===sub).t}])}
  ${tabsBar('fin',tabs,sub,'finGo')}
  <div class="mt16">${({dash:finDash,in:finIn,pay:finPay,exp:finExp,invoices:invList,proforma:()=>invList(true),payroll:payrollView,bank:finBank,acc:finAcc,tx:finTx,rpt:finRpt})[sub]()}</div></div>`;
}
function finGo(v){go('#/finance/'+v);}
/* ---------- اطلاعات بانکی پرسنل (ماسک‌شده + مجوز) ---------- */
function finBank(){
  if(!canSeeBank()){
    return `<div class="card">${emptyState('دسترسی محدود','مشاهده اطلاعات بانکی پرسنل نیازمند مجوز «مشاهده اطلاعات بانکی پرسنل» است. با مدیر سیستم تماس بگیرید.',`<button class="btn btn-sec btn-sm" onclick="go('#/finance/payroll')">${ic('wallet',13)} پرداخت پرسنل</button>`,'lock')}</div>`;
  }
  const rows=EMP.filter(e=>EMP_BANK[e.id]);
  return `<div class="card mb16"><div class="card-h">${ic('bank',16)}<span class="t-h3 grow">اطلاعات بانکی پرسنل</span>
    <span class="badge bd-warn">${ic('lock',12)} داده حساس — ماسک‌شده</span></div>
   <div class="card-b" style="padding-top:4px">
   ${tblInit('fbank',[
    {k:'emp',l:'کارمند',mobFull:true,r:e=>`<span class="row g8" style="cursor:pointer" onclick="go('#/team/${e.id}')">${av(e.name,'sm')}<b>${e.name}</b></span>`},
    {k:'bank',l:'بانک',r:e=>`<span class="t2c">${EMP_BANK[e.id].bank}</span>`,hideMob:true},
    {k:'owner',l:'صاحب حساب',r:e=>`<span class="t2c">${EMP_BANK[e.id].owner}</span>`,hideMob:true},
    {k:'card',l:'شماره کارت',num:true,r:e=>`<span class="num t2c" dir="ltr">${maskCard(EMP_BANK[e.id].card)}</span>`},
    {k:'iban',l:'شماره شبا',num:true,r:e=>`<span class="num t2c" dir="ltr">${maskIban(EMP_BANK[e.id].iban)}</span>`,hideMob:true},
    {k:'act',l:'',r:e=>`<button class="btn btn-sec btn-sm" onclick="S.tabs.emp='bank';go('#/team/${e.id}')">${ic('eye',12)} مشاهده</button>`},
   ],rows,{per:10,empty:'اطلاعاتی ثبت نشده است'})}
   <p class="t-cap">${ic('lock',12)} ارقام کامل فقط در پروفایل هر کارمند و با تاییدیه ثانویه نمایش داده می‌شود؛ ${fa(EMP.length-rows.length)} همکار بدون حساب ثبت‌شده.</p></div></div>
  <div class="card"><div class="card-h">${ic('activity',16)}<span class="t-h3 grow">لاگ حسابرسی بانکی</span></div>
   <div class="card-b">${BANK_AUDIT.map(a=>`<div class="act-row"><span class="act-ic pr">${ic('lock',13)}</span>
    <div class="grow"><p class="t-bs"><b>${a.act}</b> — <span class="t2c">${emp(a.emp).name}</span> · <span class="t2c">${a.by}</span></p><time class="t-cap">${a.when}</time></div></div>`).join('')}</div></div>`;
}
function finDash(){
  const overdue=INV.filter(i=>i.status==='سررسید گذشته');
  const receivable=INV.filter(i=>['ارسال شده','بخشی پرداخت شده','سررسید گذشته'].includes(i.status)).reduce((s,i)=>s+i.total-(i.pay||0),0);
  const profit=REV_6M.reduce((s,m)=>s+m.r-m.e,0);
  return `<div class="grid grid-6 mb16">
   <div class="kpi accent"><div class="k-l">${ic('trendup',15)}درآمد این ماه</div><div class="k-v num">۲۸۵<span class="un">میلیون تومان</span></div><div class="k-d up">${ic('trendup',12)}+۱۸.۴٪</div></div>
   <div class="kpi"><div class="k-l">${ic('download',15)}هزینه این ماه</div><div class="k-v num">۱۶۳<span class="un">میلیون تومان</span></div><div class="k-d dn">${ic('trendup',12)}+۸.۶٪</div></div>
   <div class="kpi"><div class="k-l">${ic('wallet',15)}سود خالص</div><div class="k-v num">۱۲۲<span class="un">میلیون</span></div><div class="k-d up">مارجین ۴۲.۸٪</div></div>
   <div class="kpi"><div class="k-l">${ic('receipt',15)}مطالبات</div><div class="k-v num">${faCompact(receivable)}<span class="un">تومان</span></div><div class="k-d dn">${fa(overdue.length)} فاکتور سررسیدشده</div></div>
   <div class="kpi"><div class="k-l">${ic('card',15)}بدهی‌ها</div><div class="k-v num">۳۴.۲<span class="un">میلیون تومان</span></div><div class="k-d">۲ تامین‌کننده</div></div>
   <div class="kpi"><div class="k-l">${ic('alert',15)}پرداخت‌های معوق</div><div class="k-v num">۴۱<span class="un">میلیون</span></div><div class="k-d dn">۲ مورد — پیگیری لازم</div></div>
  </div>
  <div class="grid grid-split">
   <div class="col g16">
    <div class="card"><div class="card-h">${ic('chart',16)}<span class="t-h3 grow">درآمد در برابر هزینه</span><span class="t-cap">۶ ماه اخیر · میلیون تومان</span></div>
     <div class="card-b">${chBars(REV_6M.map(m=>({v:m.r,v2:m.e})),{h:170})}${chartLbls(REV_6M.map(m=>m.m))}
      <div class="legend mt8"><span><i style="background:var(--pr)"></i>درآمد</span><span><i style="background:var(--bd2)"></i>هزینه</span></div></div></div>
    <div class="grid grid-2">
     <div class="card"><div class="card-h">${ic('trendup',16)}<span class="t-h3 grow">روند سود</span></div>
      <div class="card-b">${chLine(REV_6M.map(m=>m.r-m.e),{h:130})}${chartLbls(REV_6M.map(m=>m.m))}</div></div>
     <div class="card"><div class="card-h">${ic('banknote',16)}<span class="t-h3 grow">جریان نقدی</span></div>
      <div class="card-b">${chLine([62,84,71,98,124,122],{h:130,color:'var(--info)'})}${chartLbls(REV_6M.map(m=>m.m))}</div></div>
    </div>
    <div class="card"><div class="card-h">${ic('receipt',16)}<span class="t-h3 grow">فاکتورهای اخیر</span>
      <button class="btn btn-sm btn-ghost" onclick="go('#/finance/invoices')">همه فاکتورها</button></div>
      <div class="card-b" style="padding-top:2px">
      ${INV.slice(0,5).map(i=>`<div class="appr" style="cursor:pointer" onclick="invPreview('${i.id}')">
        <div class="bd grow"><b class="num">${i.id}</b><span>${cust(i.cust).name} · ${dFa(i.date)}</span></div>
        <b class="num">${faMoney(i.total,false)}</b><span class="t-cap">تومان</span>${invBadge(i.status)}</div>`).join('')}
      </div></div>
   </div>
   <div class="col g16">
    <div class="card"><div class="card-h">${ic('banknote',16)}<span class="t-h3 grow">ترکیب هزینه‌ها</span><span class="t-cap">ماه جاری</span></div>
     <div class="card-b row g16">${chDonut(EXP_CATS.map(e=>({v:e.v,c:e.c})),{center:{v:'۹۴۳M',l:'کل (تومان)'}})}
      <div class="col grow" style="gap:8px">${EXP_CATS.map(e=>`<div class="row g6"><span class="stat-dot" style="background:${e.c}"></span><span class="t-bs grow" style="color:var(--t1)">${e.t}</span><b class="num ts">${fa(e.pct)}٪</b></div>`).join('')}</div></div></div>
    <div class="card"><div class="card-h">${ic('alert',15)}<span class="t-h3 grow">نیازمند پیگیری</span></div>
     <div class="card-b" style="padding-top:2px">
     ${overdue.map(i=>`<div class="appr"><div class="bd grow"><b class="num">${i.id}</b><span>${cust(i.cust).name}</span></div>
       <button class="btn btn-sm btn-ok" onclick="toast('ok','یادآوری ارسال شد','پیامک و ایمیل یادآوری ارسال شد.')">یادآوری</button></div>`).join('')}
     <p class="t-cap mt8">مجموع مطالبات سررسیدشده: ${faMoney(overdue.reduce((s,i)=>s+i.total,0))}</p></div></div>
    <div class="card"><div class="card-h">${ic('card',16)}<span class="t-h3 grow">آخرین تراکنش‌ها</span></div>
     <div class="card-b" style="padding-top:2px">
     ${TX.slice(0,5).map(x=>`<div class="appr"><span class="act-ic ${x.t==='in'?'ok':'err'}" style="width:28px;height:28px">${ic(x.t==='in'?'download':'arrowleft',13)}</span>
       <div class="bd grow"><b>${x.desc}</b><span>${dFa(x.date)}</span></div>
       <b class="num" style="color:var(--${x.t==='in'?'ok':'err'})">${faMoney(x.amt,false)}</b></div>`).join('')}</div></div>
   </div>
  </div>`;
}
function finIn(){return tblInit('fin-in',[
  {k:'id',l:'شناسه',r:x=>`<b class="num">${x.id}</b>`,mobFull:true},
  {k:'cust',l:'پرداخت‌کننده',r:x=>`<span class="row g6">${av(cust(x.cust).name,'xs')}<span>${cust(x.cust).name}</span></span>`},
  {k:'amt',l:'مبلغ',num:true,r:x=>`<b class="num" style="color:var(--ok)">${faMoney(x.amt,false)}</b>`,sv:x=>x.amt},
  {k:'date',l:'تاریخ',r:x=>dFa(x.date),sv:x=>x.date},
  {k:'meth',l:'روش پرداخت',r:x=>`<span class="t2c">${x.meth}</span>`,hideMob:true},
  {k:'acc',l:'حساب',r:x=>`<span class="t2c">${x.acc}</span>`,hideMob:true},
  {k:'desc',l:'شرح',r:x=>`<span class="t2c">${x.desc}</span>`,hideMob:true},
 ],TX.filter(x=>x.t==='in'),{per:8,empty:'دریافتی ثبت نشده است',emptyCta:`<button class="btn btn-pr btn-sm" onclick="txModal('in')">${ic('plus',13)} ثبت دریافت</button>`});}
function finPay(){return tblInit('fin-pay',[
  {k:'id',l:'شناسه',r:x=>`<b class="num">${x.id}</b>`,mobFull:true},
  {k:'v',l:'دریافت‌کننده',r:x=>`<span>${x.v||(x.who?emp(x.who).name+' (پرداخت پرسنل)':'—')}</span>`},
  {k:'amt',l:'مبلغ',num:true,r:x=>`<b class="num" style="color:var(--err)">${faMoney(x.amt,false)}</b>`,sv:x=>x.amt},
  {k:'date',l:'تاریخ',r:x=>dFa(x.date),sv:x=>x.date},
  {k:'meth',l:'روش',r:x=>`<span class="t2c">${x.meth}</span>`,hideMob:true},
  {k:'desc',l:'شرح',r:x=>`<span class="t2c">${x.desc}</span>`,hideMob:true},
 ],TX.filter(x=>x.t==='out'),{per:8,empty:'پرداختی ثبت نشده است',emptyCta:`<button class="btn btn-pr btn-sm" onclick="txModal('out')">${ic('plus',13)} ثبت پرداخت</button>`});}
function finExp(){
  return `<div class="grid grid-split-eq">
   <div class="card"><div class="card-h">${ic('banknote',16)}<span class="t-h3 grow">ترکیب هزینه‌ها</span></div>
    <div class="card-b" style="display:flex;flex-direction:column;align-items:center;gap:16px">
     ${chDonut(EXP_CATS.map(e=>({v:e.v,c:e.c})),{size:150,center:{v:'۹۴۳',l:'میلیون تومان'}})}
     <div class="col grow" style="width:100%;gap:12px">${EXP_CATS.map(e=>`<div class="row g6"><span class="stat-dot" style="background:${e.c}"></span><span class="t-bs grow" style="color:var(--t1)">${e.t}</span><b class="num t-bs">${faCompact(e.v*1e6)}</b><span class="t-cap">تومان</span></div>`).join('')}</div>
     <button class="btn btn-sec btn-sm btn-blk" onclick="txModal('out')">${ic('plus',13)} ثبت هزینه</button></div></div>
   <div>${tblInit('fin-exp',[
    {k:'v',l:'هزینه',mobFull:true,r:x=>`<b>${x.v}</b>`},
    {k:'amt',l:'مبلغ',num:true,r:x=>`<b class="num" style="color:var(--err)">${faMoney(x.amt,false)}</b>`,sv:x=>x.amt},
    {k:'date',l:'تاریخ',r:x=>dFa(x.date)},
    {k:'meth',l:'روش',r:x=>`<span class="t2c">${x.meth}</span>`,hideMob:true},
    {k:'desc',l:'شرح',r:x=>`<span class="t2c">${x.desc}</span>`,hideMob:true},
   ],TX.filter(x=>x.t==='out'&&!x.who),{per:7,empty:'هزینه‌ای ثبت نشده است'})}</div></div>`;
}
function finAcc(){
  return `<div class="grid grid-3 mb16">${ACCOUNTS.map(a=>`
   <div class="bank-card"><div class="row"><span class="act-ic" style="width:38px;height:38px;background:var(--pr-soft);border:0;color:var(--pr3)">${ic('card',18)}</span>
    <div class="grow"><b class="t-h4">${a.name}</b><p class="t-cap">${a.type}</p></div></div>
    <div class="t-h2 num mt12">${faMoney(a.balance,false)} <span style="font-size:12px;color:var(--t3)">تومان</span></div>
    <p class="t-cap num mt8" dir="ltr" style="text-align:right">${a.iban}</p></div>`).join('')}
   <div class="card" style="display:flex;align-items:center;justify-content:center;border-style:dashed">
    <button class="btn btn-sec" onclick="toast('info','افزودن حساب','در نسخه متصل به سامانه بانکی فعال است.')">${ic('plus',14)} افزودن حساب بانکی</button></div></div>
  <p class="t-cap">${ic('info',13)} مجموع موجودی: <b class="num" style="color:var(--t1)">۵۹۹٬۲۰۰٬۰۰۰ تومان</b> — به‌روزرسانی: امروز ۰۹:۳۰</p>`;
}
function finTx(){return tblInit('fin-tx',[
  {k:'id',l:'شناسه',r:x=>`<b class="num">${x.id}</b>`,mobFull:true},
  {k:'t',l:'نوع',r:x=>`<span class="badge ${x.t==='in'?'bd-ok':'bd-err'}">${x.t==='in'?'دریافت':'پرداخت'}</span>`},
  {k:'party',l:'طرف حساب',r:x=>`<span class="row g6">${x.cust?av(cust(x.cust).name,'xs'):av(x.v?x.v:'استودیو اثر','xs')}<span>${x.cust?cust(x.cust).name:(x.v||'پرداخت پرسنل')}</span></span>`},
  {k:'amt',l:'مبلغ',num:true,r:x=>`<b class="num" style="color:var(--${x.t==='in'?'ok':'err'})">${faMoney(x.amt,false)}</b>`,sv:x=>x.amt},
  {k:'date',l:'تاریخ',r:x=>dFa(x.date),sv:x=>x.date},
  {k:'meth',l:'روش',r:x=>`<span class="t2c">${x.meth}</span>`,hideMob:true},
  {k:'desc',l:'شرح',r:x=>`<span class="t2c">${x.desc}</span>`,hideMob:true},
 ],TX,{per:9,empty:'تراکنشی ثبت نشده است',emptyCta:`<button class="btn btn-pr btn-sm" onclick="txModal('in')">${ic('plus',13)} ثبت تراکنش</button>`});}
function finRpt(){
  return `<div class="grid grid-3 mb16">
   <div class="kpi"><div class="k-l">${ic('chart',14)}درآمد فصل تابستان</div><div class="k-v num">۹۵۴<span class="un">میلیون</span></div><div class="k-d up">+۲۴٪ فصل قبل</div></div>
   <div class="kpi"><div class="k-l">${ic('download',14)}هزینه فصل</div><div class="k-v num">۵۶۴<span class="un">میلیون</span></div><div class="k-d up">+۹٪</div></div>
   <div class="kpi"><div class="k-l">${ic('wallet',14)}سود فصل</div><div class="k-v num">۳۹۰<span class="un">میلیون</span></div><div class="k-d up">مارجین ۴۱٪</div></div></div>
  <div class="card"><div class="card-h">${ic('chart',16)}<span class="t-h3 grow">گزارش سود و زیان — تابستان ۱۴۰۵</span>
    <button class="btn btn-sm btn-sec" onclick="toast('info','خروجی Excel','در نسخه متصل فعال است.')">${ic('download',13)} Excel</button>
    <button class="btn btn-sm btn-sec" onclick="window.print()">${ic('filetext',13)} چاپ / PDF</button></div>
   <div class="card-b">
   ${[['درآمد خدمات','۹۵۴٬۰۰۰٬۰۰۰','+'],['هزینه حقوق و دستمزد','(۵۳۴٬۰۰۰٬۰۰۰)','-'],['اجاره و تجهیزات','(۲۲۷٬۰۰۰٬۰۰۰)','-'],['تبلیغات و کمپین','(۸۶٬۰۰۰٬۰۰۰)','-'],['زیرساخت و نرم‌افزار','(۴۲٬۰۰۰٬۰۰۰)','-'],['سایر','(۵۴٬۰۰۰٬۰۰۰)','-'],['سود عملیاتی','۳۹۰٬۰۰۰٬۰۰۰','+']].map((r,i,arr)=>`
    <div class="row" style="justify-content:space-between;padding:12px 4px;${i===arr.length-1?'border-top:2px solid var(--bd2);font-weight:600':''}border-bottom:1px solid var(--bd)">
     <span class="t-bs" style="color:var(--t1);font-weight:${i===arr.length-1?800:600}">${r[0]}</span>
     <b class="num" style="color:var(--${r[2]==='+'?'ok':'err'})">${r[1]} <span style="font-size:10px">تومان</span></b></div>`).join('')}
   </div></div>`;
}
/* ---------- invoices ---------- */
function invList(isPro){
  const list=isPro?PROFORMA:INV;
  return `<div class="row mb12" style="justify-content:space-between;flex-wrap:wrap;gap:12px">
    <span class="t-cap">مجموع: <b class="num" style="color:var(--t1)">${faMoney(list.reduce((s,i)=>s+i.total,0))}</b></span>
    <div class="row g8"><button class="btn btn-sec btn-sm" onclick="toast('info','خروجی Excel','در نسخه متصل فعال است.')">${ic('download',13)} خروجی</button>
    <button class="btn btn-pr btn-sm" onclick="invModal(${!!isPro})">${ic('plus',13)} ${isPro?'پیش‌فاکتور':'فاکتور'} جدید</button></div></div>`+
  tblInit(isPro?'pf':'inv',[
   {k:'id',l:'شماره',r:i=>`<b class="num">${i.id}</b>`,mobFull:true},
   {k:'cust',l:'مشتری',r:i=>`<span class="row g6">${av(cust(i.cust).name,'xs')}<span>${cust(i.cust).name}</span></span>`},
   {k:'total',l:'مبلغ نهایی',num:true,r:i=>`<b class="num">${faMoney(i.total,false)}</b>`,sv:i=>i.total},
   {k:'date',l:'تاریخ صدور',r:i=>dFa(i.date),sv:i=>i.date},
   {k:'due',l:'سررسید',r:i=>`<span class="${dueCls(i.due)==='over'&&i.status!=='پرداخت شده'?'':''}">${dFa(i.due)}</span>`,hideMob:true},
   {k:'status',l:'وضعیت',r:i=>invBadge(i.status)},
   {k:'pay',l:'پرداخت',num:true,hideMob:true,r:i=>i.pay!=null&&i.pay>0?`<span class="num t2c">${faMoney(i.pay,false)}</span>`:'<span class="t3c">—</span>'},
  ],list,{per:8,onRow:'invPreview',rowAct:i=>`<button class="ibtn" data-tip="پیش‌نمایش" onclick="invPreview('${i.id}')">${ic('eye',15)}</button>`,
   empty:(isPro?'پیش‌فاکتور':'فاکتور')+'ای ثبت نشده است',emptyCta:`<button class="btn btn-pr btn-sm" onclick="invModal(${!!isPro})">${ic('plus',13)} صدور ${isPro?'پیش‌فاکتور':'فاکتور'}</button>`});
}
function invPreview(id){
  const all=INV.concat(PROFORMA);const i=all.find(x=>x.id===id);if(!i)return;
  const c=invCalc(i);const isPro=i.id.startsWith('PF');
  const steps=isPro?['پیش‌نویس','ارسال شده','تایید شده']:['پیش‌نویس','ارسال شده','پرداخت شده'];
  const stepIdx=isPro?(i.status==='پیش‌نویس'?0:i.status==='ارسال شده'?1:2):(i.status==='پیش‌نویس'?0:i.status==='پرداخت شده'?2:1);
  const nextInv=()=>{const idx=all.findIndex(x=>x.id===id);const nx=all[(idx+1)%all.length];closeDrawer();invPreview(nx.id);};
  const prevInv=()=>{const idx=all.findIndex(x=>x.id===id);const nx=all[(idx-1+all.length)%all.length];closeDrawer();invPreview(nx.id);};
  openDrawer({title:(isPro?'پیش‌فاکتور ':'فاکتور ')+i.id,sub:cust(i.cust).name,icon:'filetext',wide:true,body:`
   <div class="paper-wrap"><div class="paper">
    ${i.status==='پرداخت شده'?'<span class="stamp paid">پرداخت شده</span>':i.status==='سررسید گذشته'?'<span class="stamp pend">سررسید گذشته</span>':''}
    <div class="paper-head">
      <div><div class="row" style="gap:12px"><span class="logo-mark sm" style="border-radius:8px;background:#4c1d95">${ic('dotlogo',15)}</span>
        <div><h2>استودیو اثر</h2><div class="pl" style="font-size:11px">Effect Studio — Digital Marketing & Product Design</div></div></div>
        <div class="pl" style="font-size:11px;margin-top:12px">تهران، خیابان ولیعصر، برج نگین، طبقه ۱۲<br>finance@effectstudio.ir · ۰۲۱-۸۸۷۷۶۶۵۵</div></div>
      <div style="text-align:left">
        <div style="font-size:20px;font-weight:600;color:#4c1d95">${isPro?'پیش‌فاکتور':'فاکتور فروش'}</div>
        <div class="pl num" style="font-size:13px;margin-top:4px">${i.id}</div>
        <div class="paper-meta" style="margin-top:12px">
          <span>تاریخ صدور: <b>${dFa(i.date)}</b></span><span>تاریخ سررسید: <b>${dFa(i.due)}</b></span></div></div>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:16px">
      <div><div class="pl" style="font-size:11px">صورتحساب برای:</div>
        <div style="font-weight:600;font-size:15px">${cust(i.cust).name}</div>
        <div class="pl" style="font-size:11.5px">${cust(i.cust).ind} · ${cust(i.cust).city}</div></div>
      <div style="text-align:left"><div class="pl" style="font-size:11px">وضعیت</div><div style="font-weight:600;color:${i.status==='پرداخت شده'?'#1d7a53':i.status==='سررسید گذشته'?'#b45309':'#4c1d95'}">${i.status}</div>
        <div class="pl" style="font-size:11px;margin-top:4px">شرایط پرداخت: ${i.terms}</div></div></div>
    <table><thead><tr><th style="width:34px">#</th><th>شرح خدمات / محصول</th><th style="width:70px;text-align:center">تعداد</th><th style="width:120px">قیمت واحد (تومان)</th><th style="width:120px">مبلغ (تومان)</th></tr></thead><tbody>
     ${i.items.map((x,xi)=>`<tr><td class="num">${fa(xi+1)}</td><td>${x.d}</td><td style="text-align:center" class="num">${fa(x.q)}</td><td class="num">${fa(x.u,false)}</td><td class="num">${fa(x.q*x.u,false)}</td></tr>`).join('')}
     <tr class="tot"><td colspan="3"></td><td style="text-align:left;font-weight:600">جمع کل:</td><td class="num">${fa(c.sub,false)}</td></tr>
     ${i.disc?`<tr class="tot"><td colspan="3"></td><td style="text-align:left;font-weight:600">تخفیف:</td><td class="num" style="color:#b45309">(${fa(i.disc,false)})</td></tr>`:''}
     <tr class="tot"><td colspan="3"></td><td style="text-align:left;font-weight:600">مالیات بر ارزش افزوده (۱۰٪):</td><td class="num">${fa(c.tax,false)}</td></tr>
     <tr class="tot"><td colspan="2" class="grand" style="border-radius:10px;padding:12px"><b>مبلغ قابل پرداخت</b></td><td colspan="3" class="grand num" style="border-radius:10px;text-align:left;padding:12px;font-size:15px">${fa(c.total,false)} تومان</td></tr>
     ${i.pay?`<tr class="tot"><td colspan="3"></td><td style="text-align:left;font-weight:600;color:#1d7a53">پرداخت شده:</td><td class="num" style="color:#1d7a53">${fa(i.pay,false)}</td></tr>
       <tr class="tot"><td colspan="3"></td><td style="text-align:left;font-weight:600;color:#b45309">مانده:</td><td class="num" style="color:#b45309;font-weight:600">${fa(c.total-i.pay,false)}</td></tr>`:''}
    </tbody></table>
    <div style="margin-top:24px;display:flex;justify-content:space-between;align-items:flex-end">
      <div class="pl" style="font-size:11px;line-height:2">این ${isPro?'پیش‌فاکتور':'فاکتور'} به صورت الکترونیکی صادر شده و اعتبار قانونی دارد.<br>واریز به حساب: بانک ملت — استودیو اثر · شماره کارت ۶۱۰۴-۳۳۷۸-****-****</div>
      <div style="text-align:center"><div style="border-top:1px solid #1c1917;padding-top:8px;font-size:11.5px;font-weight:600">مهر و امضای فروشنده</div></div></div>
   </div></div>
   <div class="card mt16 no-print"><div class="card-b" style="padding:16px 16px">
    <div class="status-step mb4">${steps.map((s,si)=>`<div class="st ${si<stepIdx?'done':si===stepIdx?'on':''}"><i>${si<stepIdx?ic('check',11):si+1}</i><span>${s}</span></div>${si<steps.length-1?`<div class="ln ${si<stepIdx?'done':''}"></div>`:''}`).join('')}</div>
    <p class="t-cap tc mt8">وضعیت رسیدن به نتیجه — صدور: ${dFa(i.date)} · سررسید: ${dFa(i.due)}</p></div></div>`,
  footer:`
   <button class="btn btn-ghost" id="inv-prev">${ic('chevright',14)} قبلی</button>
   <button class="btn btn-ghost" id="inv-next">بعدی ${ic('chevleft',14)}</button>
   <button class="btn btn-sec" onclick="window.print()">${ic('filetext',14)} چاپ / PDF</button>
   <button class="btn btn-sec" onclick="toast('info','ارسال فاکتور','لینک فاکتور برای مشتری پیامک و ایمیل می‌شود.')">${ic('send',14)} ارسال به مشتری</button>
   ${i.status!=='پرداخت شده'?`<button class="btn btn-pr mr-auto" onclick="invPay('${i.id}')">${ic('check',14)} ثبت پرداخت</button>`:''}`});
  const pb=document.getElementById('inv-prev'),nb=document.getElementById('inv-next');
  if(pb)pb.onclick=prevInv;if(nb)nb.onclick=nextInv;
}
function invPay(id){
  const i=INV.concat(PROFORMA).find(x=>x.id===id);
  openModal({title:'ثبت پرداخت — '+i.id,body:`
   <div class="panel" style="padding:12px 16px;margin-bottom:16px;display:flex;justify-content:space-between"><span class="t-bs">مبلغ فاکتور</span><b class="num">${faMoney(i.total)}</b></div>
   ${fld('مبلغ دریافتی (تومان)','<input class="inp num" id="ip-a" value="'+fa(i.total.toLocaleString('en-US'))+'">')}
   <div class="frow mt12">${fld('روش پرداخت',selWrap('ip-m',['انتقال بانکی','کارت بانکی','چک','نقدی','درگاه آنلاین'].map(x=>({v:x,t:x})),'انتقال بانکی'))}${fld('تاریخ',dpFieldStatic('1405/06/05'))}</div>`,
  footer:`<button class="btn btn-pr" onclick="closeDrawer();closeModal();toast('ok','پرداخت ثبت شد','دریافت از ${cust(i.cust).name} — موجودی حساب‌ها به‌روزرسانی شد')">ثبت پرداخت</button><button class="btn btn-ghost" onclick="closeModal()">انصراف</button>`});
}
const dpFieldStatic=v=>`<input class="inp" readonly value="${dFa(v)}" style="cursor:pointer" onclick="toast('info','تاریخ','تقویم شمسی در نسخه متصل')">`;
function invModal(isPro,custPreset){
  openModal({title:isPro?'صدور پیش‌فاکتور':'صدور فاکتور جدید',wide:true,body:`
   <div class="frow">${fld('مشتری',selWrap('iv-c',CUST.map(c=>({v:c.id,t:c.name})),custPreset||'c1'))}${fld('تاریخ سررسید',dpField('iv-d','سررسید','1405/06/20'))}</div>
   <div class="frow mt12">${fld('شرایط پرداخت',selWrap('iv-t',['پرداخت در ۱۴ روز','پیش‌پرداخت','دو قسط','سه قسط (۴۰٪ - ۳۰٪ - ۳۰٪)'].map(x=>({v:x,t:x})),'پرداخت در ۱۴ روز'))}${fld('تخفیف (تومان)','<input class="inp num" id="iv-disc" value="۰" oninput="this.value=fa(enDigits(this.value))">')}</div>
   <h4 class="t-h4 mt16 mb8">اقلام فاکتور</h4>
   <div class="tbl-wrap"><table class="tbl mobilize" style="min-width:520px"><thead><tr><th>شرح خدمت</th><th style="width:70px">تعداد</th><th style="width:130px">قیمت واحد (تومان)</th></tr></thead><tbody>
    ${[0,1].map(n=>`<tr><td data-l="شرح"><input class="inp" style="height:34px" placeholder="مثلاً: مدیریت شبکه‌های اجتماعی — مرداد" id="iv-d${n}"></td>
     <td data-l="تعداد"><input class="inp num" style="height:34px" value="۱" id="iv-q${n}" oninput="this.value=fa(enDigits(this.value))"></td>
     <td data-l="قیمت"><input class="inp num" style="height:34px" placeholder="۴۲٬۰۰۰٬۰۰۰" id="iv-u${n}" oninput="fxMoney(this)"></td></tr>`).join('')}
   </tbody></table></div>
   <div class="row g8 mt8"><button class="btn btn-sm btn-ghost" onclick="toast('info','ردیف جدید','در نسخه کامل، ردیف‌های نامحدود پشتیبانی می‌شود.')">${ic('plus',13)} افزودن ردیف</button></div>
   <div class="mt12">${fld('توضیحات','<textarea class="txa" id="iv-n" placeholder="یادداشت فاکتور برای مشتری…"></textarea>')}</div>`,
  footer:`<button class="btn btn-sec" onclick="invCreate(${!!isPro},'draft')">ذخیره پیش‌نویس</button>
   <button class="btn btn-pr" onclick="invCreate(${!!isPro},'sent')">${isPro?'صدور و ارسال پیش‌فاکتور':'صدور و ارسال فاکتور'}</button>`});
}
function fxMoney(el){el.value=fa(enDigits(el.value).replace(/[^\d]/g,'').replace(/\B(?=(\d{3})+(?!\d))/g,'٬'));}
function invCreate(isPro,mode){
  const items=[];
  for(let n=0;n<2;n++){const d=$('#iv-d'+n).value.trim();const q=+enDigits($('#iv-q'+n).value)||0;const u=+enDigits($('#iv-u'+n)?$('#iv-u'+n).value:'').replace(/[٬,]/g,'')||0;
    if(d&&q&&u)items.push({d,q,u});}
  if(!items.length){toast('err','اقلام ناقص','حداقل یک ردیف با شرح، تعداد و قیمت وارد کنید.');return;}
  const now=1405;
  const obj={id:(isPro?'PF-':'EF-')+now+'-0'+(isPro?32+PROFORMA.length:144+INV.length),cust:$('#iv-c').value,date:'1405/06/05',due:$('#iv-d').dataset.val||'1405/06/20',
    status:mode==='draft'?'پیش‌نویس':'ارسال شده',items,disc:+enDigits($('#iv-disc').value).replace(/[٬,]/g,'')||0,pay:null,terms:$('#iv-t').value};
  obj.total=invCalc(obj).total;
  (isPro?PROFORMA:INV).unshift(obj);
  closeModal();render();toast('ok',isPro?'پیش‌فاکتور صادر شد':'فاکتور صادر شد',obj.id+' — '+cust(obj.cust).name+' · '+faMoney(obj.total));
}
/* ---------- payroll ---------- */
function payrollView(){
  const rows=PAYROLL.rows.map(r=>({...r,net:r.base+r.bonus-r.ded}));
  const paid=rows.filter(r=>r.paid).length;
  return `<div class="grid grid-4 mb16">
   <div class="kpi"><div class="k-l">${ic('users',14)}تعداد پرسنل</div><div class="k-v num">${fa(rows.length)}</div><div class="k-d">${PAYROLL.month}</div></div>
   <div class="kpi"><div class="k-l">${ic('wallet',14)}جمع خالص</div><div class="k-v num">${faCompact(rows.reduce((s,r)=>s+r.net,0))}<span class="un">تومان</span></div><div class="k-d">پایه + پاداش − کسور</div></div>
   <div class="kpi"><div class="k-l">${ic('check',14)}پرداخت شده</div><div class="k-v num">${fa(paid)}<span class="un">نفر</span></div><div class="k-d up">${faMoney(rows.filter(r=>r.paid).reduce((s,r)=>s+r.net,0),false)}</div></div>
   <div class="kpi"><div class="k-l">${ic('clock',14)}در انتظار</div><div class="k-v num">${fa(rows.length-paid)}<span class="un">نفر</span></div><div class="k-d">${faMoney(rows.filter(r=>!r.paid).reduce((s,r)=>s+r.net,0),false)}</div></div></div>
  <div class="row mb12 wrap" style="justify-content:space-between">
   <div class="row g8 wrap"><span class="t-cap">تاریخ پرداخت: ${dFaL(PAYROLL.payDate)}</span></div>
   <div class="row g8 wrap"><button class="btn btn-sec btn-sm" onclick="toast('info','خروجی بانکی','فایل پرداخت گروهی (سامانه بانکی) در نسخه متصل فعال است.')">${ic('download',13)} فایل پرداخت گروهی</button>
   <button class="btn btn-pr btn-sm" onclick="payrollRun()">${ic('zap',13)} اجرای پرداخت ${fa(rows.length-paid)} نفر باقی‌مانده</button></div></div>
  ${tblInit('prl',[
   {k:'emp',l:'کارمند',mobFull:true,r:r=>`<span class="row g8">${av(emp(r.emp).name)}<div><b>${emp(r.emp).name}</b><div class="sub">${emp(r.emp).role}</div></div></span>`},
   {k:'base',l:'حقوق پایه',num:true,r:r=>`<span class="num">${faMoney(r.base,false)}</span>`,sv:r=>r.base},
   {k:'bonus',l:'پاداش',num:true,r:r=>`<span class="num" style="color:var(--ok)">${r.bonus?'+'+fa(r.bonus/1e6)+'M':'—'}</span>`,sv:r=>r.bonus},
   {k:'ded',l:'کسورات',num:true,r:r=>`<span class="num" style="color:var(--err)">${fa(r.ded/1e6)}M</span>`,sv:r=>r.ded},
   {k:'net',l:'خالص پرداختی',num:true,r:r=>`<b class="num">${faMoney(r.net,false)}</b>`,sv:r=>r.net},
   {k:'paid',l:'وضعیت',r:r=>`<span class="badge bd-${r.paid?'ok':'warn'}">${r.paid?'پرداخت شده':'پرداخت نشده'}</span>`},
   {k:'date',l:'تاریخ پرداخت',r:r=>r.paid?dFa(PAYROLL.payDate):'—',hideMob:true},
  ],rows,{per:8,onRow:'payHist',empty:'پرسنلی ثبت نشده است'})}`;
}
function payrollRun(){
  PAYROLL.rows.forEach(r=>r.paid=true);render();
  toast('ok','پرداخت گروهی اجرا شد','۴ حکم باقی‌مانده به صف پرداخت بانکی ارسال شد.');
}
function payHist(id){
  const r=PAYROLL.rows.find(x=>x.emp===id);const net=r.base+r.bonus-r.ded;const e=emp(id);
  openDrawer({title:'سابقه پرداخت — '+e.name,sub:PAYROLL.month+' · خالص این ماه: '+faMoney(net),icon:'wallet',body:`
   <div class="grid grid-2" style="gap:12px">
    ${[['حقوق پایه',faMoney(r.base)],['پاداش',r.bonus?faMoney(r.bonus):'—'],['کسورات',faMoney(r.ded)],['خالص پرداختی',faMoney(net)]].map(x=>`
     <div class="panel" style="padding:12px 16px"><span class="t-cap" style="display:block">${x[0]}</span><b class="t-bs num" style="color:var(--t1)">${x[1]}</b></div>`).join('')}</div>
   <h4 class="t-h4 mt16 mb8">تاریخچه</h4>
   ${PAYROLL_HIST(id).map(h=>`<div class="appr"><div class="bd grow"><b>${h.m}</b><span>${h.status} · ${h.date}</span></div>
     <span class="badge bd-${h.status==='پرداخت شده'?'ok':'warn'}">${h.status==='پرداخت شده'?ic('check',10):'…'}</span></div>`).join('')}
   <h4 class="t-h4 mt16 mb8">روند ۶ ماه اخیر</h4>${chLine([96,98,101,99,104,Math.round(net/1e6)],{h:120})}${chartLbls(['فرو','ارد','خرد','تیر','مرد','شهر'])}`,
  footer:`<button class="btn btn-sec" onclick="toast('info','فیش حقوقی','فیش PDF در نسخه متصل صادر می‌شود.')">${ic('download',14)} فیش حقوقی</button>
   <button class="btn btn-pr mr-auto" onclick="closeDrawer();toast('ok','پرداخت ثبت شد','پرداخت انفرادی برای '+e.name+' ثبت شد.')">ثبت پرداخت انفرادی</button>`});
}
/* ---------- transaction modal ---------- */
function txModal(dir){
  openModal({title:dir==='in'?'ثبت دریافت':'ثبت پرداخت / هزینه',body:`
   ${fld(dir==='in'?'پرداخت‌کننده':'دریافت‌کننده',dir==='in'?selWrap('tx-c',CUST.map(c=>({v:c.id,t:c.name})),'c1'):'<input class="inp" id="tx-n" placeholder="نام شخص / شرکت">')}
   <div class="frow mt12">${fld('مبلغ (تومان)','<input class="inp num" id="tx-a" oninput="fxMoney(this)" placeholder="۵۰٬۰۰۰٬۰۰۰">')}${dpField('tx-d','تاریخ','1405/06/05')}</div>
   <div class="frow mt12">${fld('روش',selWrap('tx-m',['انتقال بانکی','کارت بانکی','چک','نقدی','درگاه آنلاین'].map(x=>({v:x,t:x})),'انتقال بانکی'))}${fld('حساب',selWrap('tx-ac',ACCOUNTS.map(a=>({v:a.name,t:a.name})),'بانک ملت — جاری ۸۸۴۵'))}</div>
   <div class="mt12">${fld('شرح','<input class="inp" id="tx-de" placeholder="شرح تراکنش…">')}</div>`,
  footer:`<button class="btn btn-pr" onclick="txCreate('${dir}')">ثبت تراکنش</button><button class="btn btn-ghost" onclick="closeModal()">انصراف</button>`});
}
function txCreate(dir){
  const amt=+enDigits($('#tx-a').value).replace(/[٬,]/g,'');
  if(!amt){$('#tx-a').classList.add('err');toast('err','مبلغ نامعتبر','مبلغ تراکنش را وارد کنید.');return;}
  const custId=dir==='in'?$('#tx-c').value:null;
  TX.unshift({id:'TR-'+(8413+TX.length),t:dir,cust:custId,v:custId?null:$('#tx-n').value,amt,date:$('#tx-d').dataset.val||'1405/06/05',meth:$('#tx-m').value,acc:$('#tx-ac').value,desc:$('#tx-de').value||'—'});
  closeModal();render();toast('ok',dir==='in'?'دریافت ثبت شد':'پرداخت ثبت شد',faMoney(amt)+(custId?' از '+cust(custId).name:''));
}
VIEWS['finance']={title:'مالی',vw:finView};
