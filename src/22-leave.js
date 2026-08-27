/* ============================================================
   EFFECT ERP · Leave management (Solar Hijri)
   ============================================================ */
function leaveView(){
  const tab=S.tabs.lv||'reqs';
  const pend=LEAVES.filter(l=>l.status==='در انتظار تایید');
  const approvedM=LEAVES.filter(l=>l.status==='تایید شده'&&l.from.startsWith('1405/06'));
  const today=LEAVES.filter(l=>l.status==='تایید شده'&&l.from<='1405/06/05'&&l.to>='1405/06/05');
  const myBal=LEAVE_BAL.find(b=>b.emp==='e1');
  return `<div class="pg">${pgHead('مدیریت مرخصی','درخواست‌ها، تاییدها و مانده مرخصی تیم',
   `<button class="btn btn-pr" onclick="leaveModal()">${ic('plus',15)} درخواست مرخصی</button>`,[{t:'داشبورد'},{t:'مرخصی'}])}
  <div class="grid grid-4 mb16 kpi-row">
   <div class="kpi"><div class="k-l">${ic('users',14)}مرخصی امروز</div><div class="k-v num">${fa(today.length)}<span class="un">نفر</span></div>
     <div class="row g4 mt4">${today.map(l=>av(emp(l.emp).name,'xs')).join('')||'<span class="t-cap">همه حاضرند</span>'}</div></div>
   <div class="kpi accent"><div class="k-l">${ic('clock',14)}در انتظار تایید</div><div class="k-v num">${fa(pend.length)}</div><div class="k-d dn">${ic('alert',12)}نیازمند اقدام شما</div></div>
   <div class="kpi"><div class="k-l">${ic('check',14)}تاییدشده این ماه</div><div class="k-v num">${fa(approvedM.length)}</div><div class="k-d">${fa(approvedM.reduce((s,l)=>s+l.days,0))} روز از ${fa(LEAVES.filter(l=>l.from.startsWith('1405/06')).reduce((s,l)=>s+l.days,0))} روز این ماه</div></div>
   <div class="kpi"><div class="k-l">${ic('leave',14)}مانده مرخصی من</div><div class="k-v num">${fa(myBal.total-myBal.used)}<span class="un">روز</span></div><div class="k-d">از ${fa(myBal.total)} روز سالانه</div></div>
  </div>
  ${tabsBar('lv',[{v:'reqs',t:'درخواست‌ها',cnt:LEAVES.length},{v:'analytics',t:'تحلیل'},{v:'hist',t:'تاریخچه من'}],tab,'lvTab')}
  <div class="mt16">${tab==='reqs'?lvReqs(pend):tab==='analytics'?lvAnalytics():lvHist()}</div></div>`;
}
function lvTab(v){S.tabs.lv=v;render();}
function lvReqs(pend){
  return (pend.length?`<div class="card mb16"><div class="card-h">${ic('zap',16)}<span class="t-h3 grow">در انتظار تایید شما</span></div>
   <div class="card-b" style="padding-top:2px">${pend.map(l=>`
    <div class="appr" style="cursor:pointer" onclick="leaveDrawer('${l.id}')">${av(emp(l.emp).name)}<div class="bd grow"><b>${emp(l.emp).name} — ${l.type}</b>
      <span>${dFaL(l.from)} تا ${dFaL(l.to)} · ${fa(l.days)} روز · «${l.reason}»</span></div>
      <span class="t-cap">${relTime(l.at)}</span>
      <button class="btn btn-sm btn-ok" onclick="leaveAct('${l.id}','تایید شده')">${ic('check',13)} تایید</button>
      <button class="btn btn-sm btn-err" onclick="leaveAct('${l.id}','رد شده')">${ic('x',13)} رد</button></div>`).join('')}</div></div>`:'')+
  tblInit('lv',[
   {k:'emp',l:'کارمند',mobFull:true,r:l=>`<span class="row g8">${av(emp(l.emp).name,'sm')}<b>${emp(l.emp).name}</b></span>`},
   {k:'type',l:'نوع',r:l=>`<span class="badge bd-${l.type==='استحقاقی'?'info':l.type==='استعلاجی'?'warn':l.type==='تشویقی'?'pr':'mut'}">${l.type}</span>`},
   {k:'from',l:'از تاریخ',r:l=>dFa(l.from),sv:l=>l.from},
   {k:'to',l:'تا تاریخ',r:l=>dFa(l.to),hideMob:true},
   {k:'days',l:'مدت',num:true,r:l=>`<b class="num">${fa(l.days)}</b> روز`,sv:l=>l.days},
   {k:'status',l:'وضعیت',r:l=>leaveBadge(l.status)},
   {k:'at',l:'ثبت',r:l=>`<span class="t-cap">${relTime(l.at)}</span>`,hideMob:true},
  ],LEAVES,{per:8,onRow:'leaveDrawer',empty:'درخواستی ثبت نشده است',emptyCta:`<button class="btn btn-pr btn-sm" onclick="leaveModal()">${ic('plus',13)} ثبت درخواست</button>`});
}
function lvAnalytics(){
  const months=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور'];
  const used=[6,9,4,11,14,8];
  return `<div class="grid" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)">
   <div class="card"><div class="card-h">${ic('chart',16)}<span class="t-h3 grow">روند مصرف مرخصی تیم</span><span class="t-cap">روز در ماه</span></div>
    <div class="card-b">${chBars(used.map(v=>({v})),{h:160})}${chartLbls(months)}<p class="t-cap mt8">اوج مصرف در مرداد — برنامه‌ریزی پوشش نیرو در تیر توصیه می‌شود.</p></div></div>
   <div class="card"><div class="card-h">${ic('users',16)}<span class="t-h3 grow">مانده مرخصی کارکنان</span></div>
    <div class="card-b" style="padding-top:4px">${LEAVE_BAL.slice(0,9).map(b=>{const e=emp(b.emp);const rest=b.total-b.used;
     return `<div class="loadbar">${av(e.name,'xs')}<span class="nm">${e.name}</span>
      <div class="prog ${rest<8?'err':rest<14?'warn':'ok'}"><i style="width:${(b.used/b.total)*100}%"></i></div><span class="pc">${fa(rest)} روز</span></div>`;}).join('')}</div></div>
  </div>`;
}
function lvHist(){
  return `<div class="card" style="max-width:720px"><div class="card-h">${ic('history',16)}<span class="t-h3 grow">تاریخچه مرخصی من</span></div>
   <div class="card-b">${LEAVES.filter(l=>l.emp==='e1').length?LEAVES.filter(l=>l.emp==='e1').map(l=>`
    <div class="appr"><span class="act-ic ${l.status==='تایید شده'?'ok':l.status==='رد شده'?'err':''}">${ic('leave',13)}</span>
     <div class="bd grow"><b>${l.type} — ${fa(l.days)} روز</b><span>${dFa(l.from)} تا ${dFa(l.to)} · «${l.reason}»</span></div>${leaveBadge(l.status)}</div>`).join(''):
   `<div class="empty-mini">شما در این سال مرخصی استفاده نکرده‌اید.</div>`}
   <div class="divider mt12 mb12"></div>
   <div class="row" style="justify-content:space-between"><span class="t-bs">مانده فعلی: <b>${fa(22-7)} روز</b> از ۲۲ روز</span>
    <button class="btn btn-sm btn-pr" onclick="leaveModal()">${ic('plus',13)} درخواست جدید</button></div></div></div>`;
}
function leaveModal(){
  openModal({title:'درخواست مرخصی',body:`
   <div class="row g12" style="background:var(--s2);border:1px solid var(--bd);border-radius:10px;padding:12px 16px;margin-bottom:16px">
    ${ringPct(64,{size:56,label:'۱۴'})}<div class="col"><b class="t-bs" style="color:var(--t1)">مانده مرخصی شما: ۱۴ روز</b>
    <span class="t-cap">۷ روز از ۲۲ روز سالانه استفاده شده است</span></div></div>
   ${fld('نوع مرخصی',selWrap('lv-t',LEAVE_TYPES.map(t=>({v:t.t,t:t.t+(t.id==='unpaid'?' (بدون حقوق)':'')})),'استحقاقی'))}
   <div class="frow mt12">
    <div>${dpField('lv-f','از تاریخ','1405/06/10')}</div>
    <div>${dpField('lv-to','تا تاریخ','1405/06/12')}</div>
   </div>
   <p class="hint mt8" id="lv-days">${ic('cal',12)} مدت درخواست: ۳ روز کاری</p>
   <div class="mt12">${fld('دلیل / توضیح','<textarea class="txa" id="lv-r" placeholder="دلیل مرخصی را بنویسید…"></textarea>')}</div>
   <div class="mt12">${fld('ارسال درخواست به',`
    <div class="inp-ic mb8" style="width:220px"><input class="inp" style="height:34px;padding-left:32px" id="lv-apq" placeholder="جستجوی تاییدگر…" oninput="apFilter(this.value)">${ic('search',13)}</div>
    <div class="ap-list" id="lv-aplist">${apListHtml(APPROVERS,'e2')}</div>
    <p class="hint mt8">${ic('lock',12)} فقط مدیران مجاز در این فهرست هستند؛ روند تایید ۵ مرحله‌ای است.</p>`)}</div>
   <div class="mt12 lv-flow">
    <span class="t-lbl">مسیر تایید</span>
    <div class="row g4 mt8 wrap">${LV_FLOW.map((f,i)=>`<span class="chip ${i===0?'chip-sel on':''}">${ic(i<2?'check':'clock',11)} ${fa(i+1)}. ${f}</span>${i<LV_FLOW.length-1?'<span class="t-cap">←</span>':''}`).join('')}</div></div>`,
  footer:`<button class="btn btn-pr" onclick="leaveCreate()">ارسال درخواست</button><button class="btn btn-ghost" onclick="closeModal()">انصراف</button>`});
}
const LV_FLOW=['ثبت درخواست','ارسال به تاییدگر','بررسی تاییدگر','تایید نهایی','اعلام به کارجو و منابع انسانی'];
function apListHtml(ids,sel,q){
  return ids.map(id=>{const e=emp(id);if(q&&!e.name.includes(q)&&!e.role.includes(q))return '';
   return `<button type="button" class="ap-item ${id===sel?'on':''}" data-ap="${id}" onclick="apPick('${id}')">
    ${av(e.name,'md')}
    <span class="who"><b>${e.name}</b><span>${e.role} · ${e.dept}</span></span>
    <span class="rad-bx"></span></button>`;}).join('')||'<div class="empty-mini">تاییدگری یافت نشد</div>';
}
let AP_SEL='e2';
function apPick(id){AP_SEL=id;$$('#lv-aplist .ap-item').forEach(b=>b.classList.toggle('on',b.dataset.ap===id));}
function apFilter(q){const el=$('#lv-aplist');if(el)el.innerHTML=apListHtml(APPROVERS,AP_SEL,q);}
function leaveCreate(){
  const to=AP_SEL||'e2';
  LEAVES.unshift({id:uid('lv'),emp:'e1',type:$('#lv-t').value,from:$('#lv-f').dataset.val||'1405/06/10',to:$('#lv-to').dataset.val||'1405/06/12',
    days:3,reason:$('#lv-r').value||'—',status:'در انتظار تایید',at:0,to,mgrNote:'',step:2});
  closeModal();S.tabs.lv='reqs';render();
  toast('ok','درخواست مرخصی شما ارسال شد','درخواست شما برای «'+emp(to).name+'» ارسال شد (مرحله ۲ از ۵). وضعیت: در انتظار بررسی.');
}
function leaveAct(id,st){
  const l=LEAVES.find(x=>x.id===id);if(!l)return;
  if(st==='رد شده'){
    openModal({title:'رد درخواست مرخصی',body:`
     <div class="appr mb12">${av(emp(l.emp).name)}<div class="bd grow"><b>${emp(l.emp).name} — ${l.type}</b><span>${dFaL(l.from)} تا ${dFaL(l.to)} · ${fa(l.days)} روز</span></div></div>
     ${fld('دلیل رد (الزامی)','<textarea class="txa" id="rej-r" placeholder="دلیل رد را برای کارمند شفاف بنویسید…"></textarea>')}`,
    footer:`<button class="btn btn-err" onclick="leaveActDo('${id}','رد شده')">رد درخواست</button><button class="btn btn-ghost" onclick="closeModal()">انصراف</button>`});
  }else{
    openModal({title:'تایید درخواست مرخصی',body:`
     <div class="appr mb12">${av(emp(l.emp).name)}<div class="bd grow"><b>${emp(l.emp).name} — ${l.type}</b><span>${dFaL(l.from)} تا ${dFaL(l.to)} · ${fa(l.days)} روز</span></div></div>
     ${fld('توضیح مدیر (اختیاری)','<textarea class="txa" id="ok-r" placeholder="مثلاً: با هماهنگی جانشین تایید شد…"></textarea>')}`,
    footer:`<button class="btn btn-ok" onclick="leaveActDo('${id}','تایید شده')">تایید نهایی</button><button class="btn btn-ghost" onclick="closeModal()">انصراف</button>`});
  }
}
function leaveActDo(id,st){
  const l=LEAVES.find(x=>x.id===id);if(!l)return;
  if(st==='رد شده'){const r=$('#rej-r')?$('#rej-r').value.trim():'';if(!r){$('#rej-r').classList.add('err');$('#rej-r').focus();return;}l.reason=r;l.mgrNote=r;}
  else{l.mgrNote=$('#ok-r')?$('#ok-r').value.trim():'با هماهنگی تیم تایید شد.';}
  l.status=st;l.step=5;closeModal();render();
  toast(st==='تایید شده'?'ok':'err',st==='تایید شده'?'درخواست تایید شد':'درخواست رد شد',emp(l.emp).name+(st==='تایید شده'?' — اعلام به منابع انسانی انجام شد.':' — دلیل رد برای او ارسال شد.'));
}
function lvStep(l){
  if(l.status==='رد شده')return 3;
  if(l.status==='تایید شده')return 5;
  return l.step||2;
}
function leaveDrawer(id){
  const l=LEAVES.find(x=>x.id===id);if(!l)return;
  const e=emp(l.emp),ap=emp(l.to||'e2');const st=lvStep(l);
  openDrawer({title:'درخواست مرخصی — '+e.name,sub:l.type+' · '+fa(l.days)+' روز',icon:'leave',body:`
   <div class="row g12 mb16">${av(e.name,'xl')}
    <div class="grow min0"><b class="t-h4" style="display:block">${e.name}</b><span class="t-cap">${e.role} · دپارتمان ${e.dept}</span></div>
    ${leaveBadge(l.status)}</div>
   <div class="lv-flow mb16">
    <span class="t-lbl">مسیر تایید (۵ مرحله)</span>
    <div class="row g4 mt8 wrap">${LV_FLOW.map((f,i)=>`<span class="chip ${i<st?'chip-sel on':i===st?'':'dim'}">${i<st?ic('check',11):ic('clock',11)} ${fa(i+1)}. ${f}</span>${i<LV_FLOW.length-1?'<span class="t-cap">←</span>':''}`).join('')}</div></div>
   <div class="grid grid-2 mb16" style="gap:12px">
    ${[['نوع مرخصی',l.type],['مدت',fa(l.days)+' روز'],['از تاریخ',dFaL(l.from)],['تا تاریخ',dFaL(l.to)],['دلیل',l.reason||'—'],['گیرنده تایید',ap.name+' — '+ap.role],['تاریخ درخواست',dFaL('1405/06/28')+' · '+relTime(l.at)],['وضعیت',l.status]].map(([k,v])=>`
     <div class="panel" style="padding:12px"><span class="t-lbl">${k}</span><div class="mt4 t-bs" style="color:var(--t1)">${v}</div></div>`).join('')}</div>
   <div class="panel" style="padding:12px"><span class="t-lbl">توضیح مدیر</span><p class="t-bs mt4">${l.mgrNote||'هنوز ثبت نشده است.'}</p></div>`,
  footer:`
   ${l.status==='در انتظار تایید'?`<button class="btn btn-ok" onclick="closeDrawer();leaveAct('${l.id}','تایید شده')">${ic('check',14)} تایید</button>
   <button class="btn btn-err" onclick="closeDrawer();leaveAct('${l.id}','رد شده')">${ic('x',14)} رد</button>`:''}
   <button class="btn btn-ghost mr-auto" onclick="closeDrawer()">بستن</button>`});
}
VIEWS['leaves']={title:'مرخصی',vw:leaveView};
