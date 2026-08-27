/* ============================================================
   EFFECT ERP · CRM (pipeline/companies/contacts/opps/activities)
   ============================================================ */
function crmView(){
  const route=parseRoute();
  const tab=route.split('/')[1]||'pipeline';S.crmTab=tab;
  return `<div class="pg">${pgHead('CRM — مدیریت ارتباط با مشتریان','قیف فروش، سرنخ‌ها و فرصت‌های در جریان',
    `<button class="btn btn-sec" onclick="go('#/social')">${ic('share',14)} تحلیل شبکه‌ها</button>
     <button class="btn btn-pr" onclick="leadModal()">${ic('plus',15)} سرنخ جدید</button>`,
    [{t:'داشبورد'},{t:'CRM'},{t:PIPE_TABS.find(t=>t.v===tab).t}])}
  ${tabsBar('crm',PIPE_TABS,tab,'crmTabGo')}
  <div class="mt16">${tab==='pipeline'?crmPipeline():tab==='companies'?crmCompanies():tab==='contacts'?crmContacts():tab==='opps'?crmOpps():crmActs()}</div></div>`;
}
const PIPE_TABS=[{v:'pipeline',t:'سرنخ‌ها — قیف فروش',cnt:LEADS.length},{v:'companies',t:'شرکت‌ها',cnt:14},{v:'contacts',t:'مخاطبین',cnt:12},{v:'opps',t:'فرصت‌های فروش',cnt:5},{v:'acts',t:'فعالیت‌ها',cnt:CRM_ACT.length}];
function crmTabGo(v){go('#/crm/'+v);}
function crmPipeline(){
  const total=LEADS.reduce((s,l)=>s+l.value,0);
  return `<div class="pipe-sum mb16">${PIPE.map(st=>{const ls=LEADS.filter(l=>l.stage===st.id);const v=ls.reduce((s,l)=>s+l.value,0);
    const max=Math.max(...PIPE.map(s2=>LEADS.filter(l=>l.stage===s2.id).length))||1;
    return `<div class="st"><span class="row g6" style="justify-content:space-between"><b>${st.t}</b><span class="ts">${fa(ls.length)}</span></span>
     <span class="num" style="font-size:11.5px;color:var(--t2);font-weight:600">${faCompact(v)} تومان</span>
     <div class="bar"><i style="width:${(ls.length/max)*100}%"></i></div></div>`;}).join('')}</div>
  <div class="kb" style="max-height:none">
  ${PIPE.map(st=>{const ls=LEADS.filter(l=>l.stage===st.id);
    return `<div class="kb-col" ondragover="event.preventDefault();this.classList.add('dragover')" ondragleave="this.classList.remove('dragover')" ondrop="leadDrop(event,'${st.id}')">
     <div class="kb-h"><span class="t">${st.t}</span><span class="cnt">${fa(ls.length)}</span></div>
     <div class="kb-body">
     ${ls.map(l=>`<div class="lead-card" draggable="true" ondragstart="kbDrag(event,'${l.id}')" onclick="leadDrawer('${l.id}')">
       <div class="co"><span class="co-t" style="background:${avHue(l.co)}">${initials(l.co)}</span>
         <div class="grow ellip"><b>${l.co}</b><span>${l.contact} · ${l.src}</span></div></div>
       <div class="val num">${faCompact(l.value)} <span style="font-size:10px;color:var(--t3)">تومان</span></div>
       <div class="prog" style="height:4px"><i style="width:${l.prob}%"></i></div>
       <div class="foot"><span class="row g4">${av(emp(l.owner).name,'xs')}${emp(l.owner).name.split(' ')[0]}</span>
         <span class="sp"></span><span class="due ${l.next!=='—'&&dueCls(l.next)==='over'?'over':'nrm'}">${ic('cal',10)}${l.next==='—'?'—':dueTxt(l.next)}</span></div>
     </div>`).join('')||'<div class="empty-mini" style="border-style:dashed">سرنخی نیست</div>'}
     </div></div>`;}).join('')}</div>`;
}
function leadDrop(e,stage){
  e.preventDefault();$$('.kb-col').forEach(c=>c.classList.remove('dragover'));
  const id=e.dataTransfer.getData('text/plain');const l=LEADS.find(x=>x.id===id);if(!l||l.stage===stage)return;
  const old=l.stage;l.stage=stage;render();
  if(stage==='won'){toast('ok','برنده شدید!','قرارداد '+l.co+' — '+faCompact(l.value)+' تومان');}
  else toast('ok','سرنخ منتقل شد',l.co+' ← '+PIPE.find(s=>s.id===stage).t,{t:'واگرد',fn:`LEADS.find(x=>x.id==='${id}').stage='${old}';render()`});
}
function leadDrawer(id){
  const l=LEADS.find(x=>x.id===id);
  const F=(lb,v,icn)=>`<div class="panel" style="padding:12px 12px;display:flex;align-items:center;gap:8px">${icn?ic(icn,15):''}<div><span class="t-cap" style="display:block">${lb}</span><b class="t-bs" style="color:var(--t1)">${v}</b></div></div>`;
  openDrawer({title:l.co,sub:'سرنخ فروش — '+PIPE.find(s=>s.id===l.stage).t,icon:'target',wide:true,body:`
   <div class="row g8 wrap mb16"><span class="badge bd-pr">${PIPE.find(s=>s.id===l.stage).t}</span>
     <span class="chip">${ic('trendup',12)} احتمال ${fa(l.prob)}٪</span>
     <span class="chip">${ic('wallet',12)} ارزش ${faMoney(l.value)}</span>
     <span class="chip">${ic('cal',12)} پیگیری ${dFa(l.next)}</span></div>
   <div class="grid grid-2" style="gap:12px">
    ${F('نام مخاطب',l.contact,'user')}${F('شماره تماس','<span class="num">'+l.phone+'</span>','phone')}
    ${F('ایمیل','<span dir="ltr">'+l.email+'</span>','mail')}${F('اینستاگرام','<span dir="ltr">'+l.ig+'</span>','share')}
    ${F('وب‌سایت','<span dir="ltr">'+l.web+'</span>','globe')}${F('منبع آشنایی',l.src,'sparkles')}
    ${F('مسئول فروش',emp(l.owner).name,'users')}${F('ارزش قرارداد','<span class="num">'+faMoney(l.value)+'</span>','wallet')}
   </div>
   <h4 class="t-h4 mt20 mb8">یادداشت</h4><p class="t-bs" style="color:var(--t1);line-height:1.9">${l.note}</p>
   <h4 class="t-h4 mt20 mb8">تایم‌لاین پیگیری</h4>
   ${[['تماس اولیه انجام شد','۲ روز پیش',0],['ایمیل معرفی خدمات ارسال شد','دیروز',0],['جلسه نیازسنجی — پیش رو','فردا',1]].map(a=>`
     <div class="act-row"><span class="act-ic ${a[2]?'pr':''}">${ic(a[2]?'cal':'phone',13)}</span><div class="grow"><p class="t-bs">${a[0]}</p><time class="t-cap">${a[1]}</time></div></div>`).join('')}
   <div class="row g8 mt8"><input class="inp grow" placeholder="افزودن یادداشت پیگیری…"><button class="btn btn-sec" onclick="toast('ok','یادداشت ثبت شد')">${ic('plus',14)}</button></div>`,
  footer:`<button class="btn btn-pr" onclick="closeDrawer();leadDropSim('${id}','negotiation')">${ic('trendup',14)} پیشبرد به مذاکره</button>
   <button class="btn btn-sec" onclick="closeDrawer();leadModal('${id}')">ویرایش</button>
   <button class="btn btn-err mr-auto" onclick="confirmDlg('حذف سرنخ','سرنخ ${l.co} حذف شود؟',()=>{LEADS.splice(LEADS.findIndex(x=>x.id==='${id}'),1);render();toast('ok','سرنخ حذف شد')},'حذف',true)">حذف</button>`});
}
function leadDropSim(id,st){const l=LEADS.find(x=>x.id===id);if(l.stage!==st){l.stage=st;render();}toast('ok','سرنخ پیشبرد شد',l.co+' ← '+PIPE.find(s=>s.id===st).t);}
function leadModal(editId){
  openModal({title:'سرنخ جدید',body:`
   <div class="frow">${fld('نام شرکت','<input class="inp" id="ld-co" placeholder="مثلاً: فروشگاه آنلاین مدینو">')}${fld('نام مخاطب','<input class="inp" id="ld-c" placeholder="نام و نام خانوادگی">')}</div>
   <div class="frow mt12">${fld('شماره تماس','<input class="inp num" id="ld-p" dir="ltr" placeholder="۰۹۱۲…">')}${fld('ایمیل','<input class="inp" id="ld-e" dir="ltr" placeholder="name@co.ir">')}</div>
   <div class="frow mt12">${fld('اینستاگرام','<input class="inp" id="ld-i" dir="ltr" placeholder="@brand">')}${fld('وب‌سایت','<input class="inp" id="ld-w" dir="ltr" placeholder="brand.ir">')}</div>
   <div class="frow mt12">${fld('منبع',selWrap('ld-s',['اینستاگرام','معرفی مشتری','وب‌سایت','نمایشگاه','لینکدین'].map(x=>({v:x,t:x})),'اینستاگرام'))}${fld('مسئول فروش',selWrap('ld-o',[e5(),e12()].map(e=>({v:e.id,t:e.name})),e5().id))}</div>
   <div class="frow mt12">${fld('ارزش قرارداد (تومان)','<input class="inp num" id="ld-v" inputmode="numeric" placeholder="۱۵۰٬۰۰۰٬۰۰۰">')}${fld('احتمال تبدیل',selWrap('ld-pr',[{v:20,t:'۲۰٪'},{v:40,t:'۴۰٪'},{v:60,t:'۶۰٪'},{v:80,t:'۸۰٪'}],40))}</div>
   <div class="mt12">${dpField('ld-n','پیگیری بعدی','1405/06/10')}</div>
   <div class="mt12">${fld('یادداشت','<textarea class="txa" id="ld-note" placeholder="خلاصه نیاز مشتری…"></textarea>')}</div>`,
  footer:`<button class="btn btn-pr" onclick="leadCreate()">ثبت سرنخ</button><button class="btn btn-ghost" onclick="closeModal()">انصراف</button>`});
}
const e5=()=>EMP.find(e=>e.id==='e5'),e12=()=>EMP.find(e=>e.id==='e12');
function leadCreate(){
  const co=$('#ld-co').value.trim();if(!co){$('#ld-co').classList.add('err');return;}
  LEADS.unshift({id:uid('l'),co,contact:$('#ld-c').value||'—',phone:$('#ld-p').value||'—',email:$('#ld-e').value||'—',ig:$('#ld-i').value||'—',web:$('#ld-w').value||'—',
    src:$('#ld-s').value,owner:$('#ld-o').value,value:+enDigits($('#ld-v').value).replace(/[٬,]/g,'')||50000000,prob:+$('#ld-pr').value,stage:'new',next:$('#ld-n').dataset.val||'—',note:$('#ld-note').value});
  closeModal();render();toast('ok','سرنخ ثبت شد','«'+co+'» به ستون سرنخ جدید اضافه شد');
}
function crmCompanies(){
  const rows=LEADS.map(l=>({id:l.id,name:l.co,ind:'—',owner:l.owner,stage:PIPE.find(s=>s.id===l.stage).t,value:l.value,contact:l.contact,src:l.src}))
    .concat(CUST.map(c=>({id:c.id,name:c.name,ind:c.ind,owner:c.owner,stage:'مشتری',value:c.value,contact:(c.contacts[0]||{}).n||'—',src:'قرارداد فعال'})));
  return tblInit('crm-co',[
   {k:'name',l:'شرکت',mobFull:true,r:r=>`<span class="row g8"><span class="ws-tile" style="width:26px;height:26px;border-radius:7px;background:${avHue(r.name)};font-size:10px">${initials(r.name)}</span><b>${r.name}</b></span>`},
   {k:'contact',l:'مخاطب اصلی',r:r=>`<span class="t2c">${r.contact}</span>`},
   {k:'ind',l:'صنعت/منبع',r:r=>`<span class="t2c">${r.ind}</span>`,hideMob:true},
   {k:'owner',l:'مسئول',r:r=>`<span class="row g6">${av(emp(r.owner).name,'xs')}<span class="t2c">${emp(r.owner).name}</span></span>`},
   {k:'stage',l:'وضعیت',r:r=>`<span class="badge ${r.stage==='مشتری'?'bd-ok':r.stage==='برنده'?'bd-ok':r.stage==='از دست رفته'?'bd-err':'bd-mut'}">${r.stage}</span>`},
   {k:'value',l:'ارزش',num:true,r:r=>`<b class="num">${faMoney(r.value,false)}</b><span class="t-cap"> تومان</span>`,sv:r=>r.value},
  ],rows,{per:8,onRow:r=>r.id.startsWith('c')?`custDrawer`:'leadDrawer',empty:'شرکتی یافت نشد'});
}
function crmContacts(){
  const rows=[];
  CUST.forEach(c=>c.contacts.forEach(ct=>rows.push({id:ct.n,name:ct.n,co:c.name,role:ct.r||'—',phone:ct.p||'—',email:ct.e||'—'})));
  LEADS.slice(0,5).forEach(l=>rows.push({id:l.id,name:l.contact,co:l.co,role:'سرنخ',phone:l.phone,email:l.email}));
  return tblInit('crm-ct',[
   {k:'name',l:'نام',mobFull:true,r:r=>`<span class="row g8">${av(r.name,'sm')}<b>${r.name}</b></span>`},
   {k:'co',l:'شرکت',r:r=>`<span class="t2c">${r.co}</span>`},
   {k:'role',l:'نقش',r:r=>`<span class="t2c">${r.role}</span>`,hideMob:true},
   {k:'phone',l:'شماره تماس',num:true,r:r=>`<span class="num t2c">${r.phone}</span>`},
   {k:'email',l:'ایمیل',num:true,hideMob:true,r:r=>`<span class="t2c" dir="ltr">${r.email}</span>`},
   {k:'act',l:'',r:r=>`<span class="row g4"><button class="ibtn" data-tip="تماس" onclick="toast('info','تماس','در نسخه متصل به سانترال فعال است.')">${ic('phone',14)}</button><button class="ibtn" data-tip="ایمیل" onclick="toast('info','ایمیل','در نسخه متصل به سرویس ایمیل فعال است.')">${ic('mail',14)}</button></span>`},
  ],rows,{per:8,empty:'مخاطبی یافت نشد'});
}
function crmOpps(){
  const rows=LEADS.filter(l=>['qualified','proposal','negotiation'].includes(l.stage));
  return tblInit('crm-op',[
   {k:'co',l:'فرصت',mobFull:true,r:l=>`<b>${l.co}</b><div class="sub">${PIPE.find(s=>s.id===l.stage).t} · ${l.src}</div>`},
   {k:'owner',l:'مسئول',r:l=>`<span class="row g6">${av(emp(l.owner).name,'xs')}<span class="t2c">${emp(l.owner).name}</span></span>`},
   {k:'value',l:'ارزش قرارداد',num:true,r:l=>`<b class="num">${faMoney(l.value,false)}</b><span class="t-cap"> تومان</span>`,sv:l=>l.value},
   {k:'prob',l:'احتمال',r:l=>`<div class="row g8"><div class="prog" style="width:64px"><i style="width:${l.prob}%"></i></div><span class="num ts">${fa(l.prob)}٪</span></div>`,sv:l=>l.prob},
   {k:'next',l:'پیگیری بعدی',r:l=>dueBadge(l.next),hideMob:true},
   {k:'wa',l:'وزن‌دار',num:true,hideMob:true,r:l=>`<span class="num t2c">${faMoney(Math.round(l.value*l.prob/100),false)}</span>`,sv:l=>l.value*l.prob},
  ],rows,{per:8,onRow:'leadDrawer',empty:'فرصت فعالی وجود ندارد',emptySub:'سرنخ‌ها را در قیف فروش پیش ببرید تا فرصت ثبت شود.'});
}
function crmActs(){
  return `<div class="card" style="max-width:760px"><div class="card-h">${ic('activity',16)}<span class="t-h3 grow">آخرین فعالیت‌های CRM</span>
    <button class="btn btn-sm btn-pr" onclick="toast('info','ثبت فعالیت','در نسخه متصل به سانترال/ایمیل، فعالیت‌ها خودکار ثبت می‌شوند.')">${ic('plus',13)} ثبت فعالیت</button></div>
   <div class="card-b">${CRM_ACT.map(a=>`
    <div class="act-row"><span class="act-ic ${a.type==='meet'?'pr':a.type==='call'?'ok':''}">${ic(a.type==='call'?'phone':a.type==='mail'?'mail':a.type==='meet'?'cal':'edit',13)}</span>
     <div class="grow"><p class="t-bs"><b>${emp(a.who).name}</b> — ${a.t} · <span class="t2c">${a.subj}</span></p><time class="t-cap">${relTime(a.time)}</time></div>
     <button class="btn btn-sm btn-ghost" onclick="leadDrawer('${a.rel}')">مشاهده سرنخ</button></div>`).join('')}</div></div>`;
}
/* ---------- customers ---------- */
const CUST_TABS=[{v:'info',t:'نمای کلی'},{v:'projects',t:'پروژه‌ها'},{v:'contacts',t:'مخاطبین'},{v:'assets',t:'دارایی‌ها'},{v:'brand',t:'برند'},{v:'invoices',t:'فاکتورها'},{v:'payments',t:'پرداخت‌ها'},{v:'social',t:'شبکه‌های اجتماعی'},{v:'reports',t:'گزارش‌ها'},{v:'activity',t:'فعالیت‌ها'},{v:'notes',t:'یادداشت‌ها'}];
function custView(){
  const route=parseRoute();const id=route.split('/')[1];
  if(id)return custDetail(id);
  return `<div class="pg">${pgHead('مشتریان','مدیریت ۳۶۰ درجه مشتریان استودیو اثر',
    `<button class="btn btn-sec" onclick="go('#/crm')">${ic('crm',14)} قیف فروش</button><button class="btn btn-pr" onclick="custModal()">${ic('plus',15)} مشتری جدید</button>`,
    [{t:'داشبورد'},{t:'مشتریان'}])}
  ${filterbar(`<span class="lb">${ic('filter',13)} فیلترها</span>
    ${selWrap2('وضعیت',['','فعال','مکث','پایان'],'وضعیت','custF','st')}
    ${selWrap2('مسئول',['','علی کریمی','نیلوفر آرام','زهرا نوری'],'مسئول','custF','own')}
    ${selWrap2('وضعیت پرداخت',['','به‌روز','معوق','بخشی پرداخت شده'],'پرداخت','custF','pay')}`)}
  ${tblInit('cst',[
    {k:'name',l:'مشتری',mobFull:true,r:c=>`<span class="row g10"><span class="cust-tile" style="width:34px;height:34px;border-radius:9px;font-size:13px;background:${avHue(c.name)}">${initials(c.name)}</span><div><b>${c.name}</b><div class="sub">${c.ind}</div></div></span>`},
    {k:'owner',l:'مسئول',r:c=>`<span class="row g6">${av(emp(c.owner).name,'xs')}<span class="t2c">${emp(c.owner).name}</span></span>`},
    {k:'status',l:'وضعیت',r:x=>stBadge(x.status)},
    {k:'projects',l:'پروژه فعال',num:true,r:c=>fa(c.projects.length),sv:c=>c.projects.length},
    {k:'value',l:'ارزش قرارداد',num:true,r:c=>`<b class="num">${faMoney(c.value,false)}</b><span class="t-cap"> تومان</span>`,sv:c=>c.value},
    {k:'last',l:'آخرین فعالیت',r:c=>`<span class="t2c">${dueTxt(c.last)}</span>`,hideMob:true},
    {k:'pay',l:'پرداخت',r:c=>payBadge(c.pay)},
   ],CUST.filter(c=>(!CUST_F.st||c.status===CUST_F.st)&&(!CUST_F.own||emp(c.owner).name===CUST_F.own)&&(!CUST_F.pay||c.pay===CUST_F.pay)),
   {per:8,onRow:'custDrawer',empty:'مشتری‌ای یافت نشد',emptySub:'فیلترها را تغییر دهید یا مشتری جدید ثبت کنید.',emptyCta:`<button class="btn btn-pr btn-sm" onclick="custModal()">${ic('plus',13)} افزودن مشتری</button>`})}
  </div>`;
}
let CUST_F={st:'',own:'',pay:''};
function selWrap2(label,opts,ph,stateRoot,key){
  return `<div class="sel-wrap"><select class="sel fsel" onchange="CUST_F.${key}=this.value;render()">
   <option value="">${ph}: همه</option>${opts.slice(1).map(o=>`<option ${CUST_F[key]===o?'selected':''} value="${o}">${o}</option>`).join('')}</select>${ic('chevdown',13)}</div>`;
}
function custDrawer(id){go('#/customers/'+id);}
function custDetail(id){
  const c=cust(id);const tab=S.tabs.cust||'info';
  const invs=INV.filter(i=>i.cust===id);const socs=SOC.filter(s=>s.cust===id);
  return `<div class="pg">${pgHead(c.name,c.ind+' · مشتری از '+dFa(c.since)+' · مسئول: '+emp(c.owner).name,
   `${cproByCust(id)?`<button class="btn btn-pr" onclick="go('#/cpro/${cproByCust(id).id}')">${ic('briefcase',14)} فضای کاری پروژه</button>`:''}
    <button class="btn btn-sec" onclick="toast('info','تماس','در نسخه متصل فعال است.')">${ic('phone',14)} تماس</button>
    <button class="btn btn-sec" onclick="invModal(false,'${id}')">${ic('filetext',14)} فاکتور جدید</button>
    <button class="btn btn-ghost" onclick="go('#/customers')">${ic('arrowright',14)} بازگشت</button>`,
   [{t:'داشبورد'},{t:'مشتریان'},{t:c.name,h:'#/customers'}])}
  <div class="card mb16"><div class="cust-hero">
    <span class="cust-tile" style="background:${avHue(c.name)}">${initials(c.name)}</span>
    <div class="grow"><div class="row g8"><h2 class="t-h2">${c.name}</h2>${stBadge(c.status)}${payBadge(c.pay)}</div>
      <p class="t-bs mt4">${c.ind} · ${c.city} · ${fa(c.projects.length)} پروژه فعال</p></div>
    <div class="row g20 mr-auto" style="flex-wrap:wrap">
      <div class="metric-mini"><b class="num">${faMoney(c.value,false)}</b><span>ارزش قرارداد (تومان)</span></div>
      <div class="metric-mini"><b class="num">${fa(invs.reduce((s,i)=>s+(i.pay||0),0)/1e6)}</b><span>میلیون دریافت شده</span></div>
      <div class="metric-mini"><b class="num">${dueTxt(c.last)}</b><span>آخرین تعامل</span></div></div></div>
  ${tabsBar('cud',CUST_TABS,tab,'custTabGo')}</div>
  <div class="card"><div class="sub-tab-body">
  ${tab==='info'?`<div class="grid grid-2" style="gap:16px;max-width:760px">
     ${[['نام شرکت',c.name],['صنعت',c.ind],['شهر',c.city],['مسئول حساب',emp(c.owner).name],['شروع همکاری',dFaL(c.since)],['وضعیت پرداخت',c.pay]].map(x=>`
      <div class="panel" style="padding:12px 16px"><span class="t-cap" style="display:block">${x[0]}</span><b class="t-bs" style="color:var(--t1)">${x[1]}</b></div>`).join('')}</div>`
  :tab==='assets'?(assetsOf(id).length?assetsHtml(id):`<div class="empty-mini">${ic('folder',16)} دارایی‌ای ثبت نشده — با ساخت پروژه مشتری، کتابخانه دارایی به‌صورت خودکار فعال می‌شود.</div>`)
  :tab==='brand'?brandHtml(id)
  :tab==='contacts'?tblInit('cud-c',[{k:'n',l:'نام',mobFull:true,r:x=>`<span class="row g8">${av(x.n,'sm')}<b>${x.n}</b></span>`},{k:'r',l:'نقش',r:x=>`<span class="t2c">${x.r||'—'}</span>`},{k:'p',l:'تماس',num:true,r:x=>`<span class="num t2c">${x.p||'—'}</span>`},{k:'e',l:'ایمیل',num:true,r:x=>`<span class="t2c" dir="ltr">${x.e||'—'}</span>`}],c.contacts,{per:5,mob:false})
  :tab==='projects'?tblInit('cud-p',[{k:'name',l:'پروژه',mobFull:true,r:p=>`<b>${p.name}</b>`},{k:'lead',l:'مدیر',r:p=>`<span class="t2c">${emp(p.lead).name}</span>`},{k:'status',l:'وضعیت',r:x=>stBadge(x.status)},{k:'progress',l:'پیشرفت',r:p=>`<div class="row g8"><div class="prog" style="width:70px"><i style="width:${p.progress}%"></i></div><span class="ts num">${fa(p.progress)}٪</span></div>`},{k:'due',l:'سررسید',r:p=>dFa(p.due)}],PRJ.filter(p=>p.cust===id),{per:5,onRow:'projInfo',mob:false,empty:'پروژه فعالی ثبت نشده است'})
  :tab==='invoices'?tblInit('cud-i',[{k:'id',l:'شماره',r:i=>`<b class="num">${i.id}</b>`,mobFull:true},{k:'date',l:'تاریخ صدور',r:i=>dFa(i.date)},{k:'total',l:'مبلغ',num:true,r:i=>`<span class="num">${faMoney(i.total,false)}</span>`},{k:'status',l:'وضعیت',r:i=>invBadge(i.status)}],invs,{per:5,onRow:'invPreview',mob:false,empty:'فاکتوری ثبت نشده است'})
  :tab==='payments'?tblInit('cud-py',[{k:'id',l:'تراکنش',r:x=>`<b class="num">${x.id}</b>`,mobFull:true},{k:'date',l:'تاریخ',r:x=>dFa(x.date)},{k:'amt',l:'مبلغ',num:true,r:x=>`<span class="num" style="color:var(--ok)">${faMoney(x.amt,false)}</span>`},{k:'desc',l:'شرح',r:x=>`<span class="t2c">${x.desc}</span>`}],TX.filter(x=>x.cust===id),{per:5,mob:false,empty:'پرداختی ثبت نشده است'})
  :tab==='social'?`<div class="grid grid-3">${socs.length?socs.map(s=>`
     <div class="panel" style="padding:16px"><div class="row g10"><span class="plat-ic ${s.plat}">${plat(s.plat,18)}</span>
      <div class="grow"><b dir="ltr" style="display:block;font-size:12.5px">@${s.handle}</b><span class="t-cap">${cust(s.cust).name}</span></div></div>
     <div class="row g20 mt12">${[['فالوور',fa(s.followers)],['رشد ۷روز',fa(s.g7)+'٪'],['نرخ تعامل',fa(s.er)+'٪']].map(m=>`<div class="metric-mini"><b class="num">${m[1]}</b><span>${m[0]}</span></div>`).join('')}</div>
     <div class="mt8">${spark(s.grow,{w:'100%',h:36})}</div>
     <button class="btn btn-sm btn-sec btn-blk mt8" onclick="go('#/social')">تحلیل کامل</button></div>`).join(''):'<div class="empty-mini">اکانت شبکه اجتماعی متصل نیست</div>'}</div>`
  :tab==='reports'?tblInit('cud-r',[{k:'t',l:'گزارش',r:r=>`<b>${r.t}</b>`,mobFull:true},{k:'range',l:'بازه',r:r=>`<span class="t2c num">${r.range}</span>`},{k:'by',l:'تهیه‌کننده',r:r=>`<span class="t2c">${emp(r.by).name}</span>`},{k:'at',l:'زمان',r:r=>`<span class="t-cap">${relTime(r.at)}</span>`}],RPT_HIST.filter(r=>{const sc=socs;return true}),{per:5,mob:false,empty:'گزارشی تهیه نشده است'})
  :tab==='activity'?ACTIVITY.slice(0,7).map(a=>`<div class="act-row"><span class="act-ic pr">${ic('activity',13)}</span><div class="grow"><p class="t-bs"><b>${emp(a.who).name}</b> — ${a.act} · <span class="t2c">${a.det}</span></p><time class="t-cap">${relTime(a.min)}</time></div></div>`).join('')
  :`<div class="row b g10" style="align-items:flex-start">${av('مریم حسینی')}<div class="grow"><p class="t-bs" style="color:var(--t1);line-height:1.9">تمرکز این دوره روی کمپین پاییزه است؛ بودجه تاییدشده و تیم محتوا اختصاص یافته. جلسه بعدی بازبینی خروجی‌ها: ۱۸ شهریور.</p><time class="t-cap">ثبت توسط مریم حسینی · ۲ روز پیش</time></div></div>
    <div class="row g8 mt12"><input class="inp grow" placeholder="یادداشت جدید بنویسید…"><button class="btn btn-sec" onclick="toast('ok','یادداشت ثبت شد')">${ic('send',13)}</button></div>`}
  </div></div></div>`;
}
function custTabGo(v){S.tabs.cust=v;render();}
function custModal(){
  openModal({title:'مشتری جدید',body:`
   ${fld('نام مشتری','<input class="inp" id="cu-n" placeholder="نام شرکت یا برند">')}
   <div class="frow mt12">${fld('صنعت',selWrap('cu-i',['مد و پوشاک','رستوران و کافه','سلامت و زیبایی','نرم‌افزار و SaaS','آموزش','توزیع و پخش','سایر'].map(x=>({v:x,t:x})),'سایر'))}${fld('مسئول حساب',selWrap('cu-o',EMP.map(e=>({v:e.id,t:e.name})),e5().id))}</div>
   <div class="frow mt12">${fld('شهر','<input class="inp" id="cu-c" placeholder="تهران">')}${fld('ارزش قرارداد (تومان)','<input class="inp num" id="cu-v" inputmode="numeric" placeholder="۱۵۰٬۰۰۰٬۰۰۰">')}</div>
   <div class="mt12">${fld('مخاطب اول',`<input class="inp" id="cu-p" placeholder="نام مخاطب اصلی">`)}</div>
   <div class="divider mt12 mb12"></div>
   <div class="frow">${fld('پروژه اولیه','<input class="inp" id="cu-pr" placeholder="مثلاً: مدیریت شبکه‌های اجتماعی">')}${fld('مدیر پروژه',selWrap('cu-pl',EMP.map(e=>({v:e.id,t:e.name})),'e2'))}</div>
   <label class="ckb" style="padding:8px 0"><input type="checkbox" id="cu-ws" checked><span class="bx">${ic('check',11)}</span>
     <span class="txt">ساخت خودکار فضای کاری عملیاتی (برد تسک، دارایی‌ها، برند، تقویم محتوا)</span></label>`,
  footer:`<button class="btn btn-pr" onclick="custCreate()">ثبت مشتری</button><button class="btn btn-ghost" onclick="closeModal()">انصراف</button>`});
}
function custCreate(){
  const n=$('#cu-n').value.trim();if(!n){$('#cu-n').classList.add('err');return;}
  CUST.unshift({id:uid('c'),name:n,ind:$('#cu-i').value,owner:$('#cu-o').value,status:'فعال',since:'1405/06/05',projects:[],value:+enDigits($('#cu-v').value).replace(/[٬,]/g,'')||0,pay:'به‌روز',last:'1405/06/05',city:$('#cu-c').value||'تهران',contacts:[{n:$('#cu-p').value||'—',r:'مخاطب اصلی'}]});
  const c0=CUST[0];
  let wsMsg='«'+n+'» به لیست مشتریان اضافه شد';
  const pn=$('#cu-pr')?$('#cu-pr').value.trim():'';
  const mkWs=$('#cu-ws')?$('#cu-ws').checked:false;
  if(pn&&mkWs){
    const pid='p'+(PRJ.length+10);
    PRJ.unshift({id:pid,name:pn,cust:c0.id,lead:$('#cu-pl').value||'e2',status:'فعال',progress:0,due:'1405/09/30',budget:Math.max(c0.value,80000000)});
    c0.projects=[pid];
    const cp={id:uid('cp'),cust:c0.id,prj:pid,name:pn,status:'فعال',progress:0,
      members:[$('#cu-pl').value||'e2','e4','e11'],
      fw:{post:8,reel:4,story:20,video:2,image:4,ad:2,edu:0,event:0,custom:[]},
      done:{post:0,reel:0,story:0,video:0,image:0,ad:0,edu:0,event:0,custom:[]},
      brief:{goals:'—',audience:'—',tone:'—',guide:'—',banned:'—',topics:[],competitors:'—',cta:'—',platforms:'Instagram',notes:'بریف اولیه پس از جلسه کیک‌آف تکمیل شود.'}};
    CPRO.unshift(cp);
    BRAND[c0.id]={name:n,company:n,desc:'—',slogan:'—',web:'—',ig:'—',social:'—',
      colors:{primary:'#6F6AEB',secondary:'#FFFFFF',bg:'#F6F6F8',text:'#1A1A24',accent:'#0E7C93'},
      fonts:{heading:'IRANSansX',body:'IRANSansX'},guideFile:'—'};
    ASSETS.push({id:uid('a'),cust:c0.id,folder:'brand',name:'brand-starter-kit.zip',type:'ZIP',size:'۴.۲ MB',by:'e2',date:'1405/06/28'});
    wsMsg='«'+n+'» ثبت شد و فضای کاری «'+pn+'» به‌صورت خودکار ساخته شد';
    closeModal();render();
    toast('ok','مشتری + فضای کاری ساخته شد',wsMsg);
    setTimeout(()=>go('#/cpro/'+cp.id),600);
    return;
  }
  closeModal();render();toast('ok','مشتری ثبت شد',wsMsg);
}
VIEWS['crm']={title:'CRM',vw:crmView};
VIEWS['customers']={title:'مشتریان',vw:custView};
