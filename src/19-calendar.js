/* ============================================================
   EFFECT ERP · Calendar & meetings (Solar Hijri)
   ============================================================ */
function calEventsFor(ds){
  const meets=MEETS.filter(m=>m.date===ds).map(m=>({t:m.t,cls:'meet',ic:'cal',dur:m.from,fn:`meetInfo('${m.id}')`}));
  const deads=TASKS.filter(t=>t.due===ds&&t.status!=='done').map(t=>({t:'سررسید: '+t.title,cls:'task',ic:'check',fn:`taskDrawer('${t.id}')`}));
  const leaves=LEAVES.filter(l=>l.status==='تایید شده'&&ds>=l.from&&ds<=l.to).map(l=>({t:'مرخصی '+emp(l.emp).name,cls:'leave',ic:'leave',fn:'—'}));
  return meets.concat(deads).concat(leaves);
}
function calView(){
  const view=S.calView;
  const y=S.calY,m=S.calM;
  const firstDow=(jDow({jy:y,jm:m,jd:1})+1)%7;const len=jMonthLen(y,m);
  let cells='';
  for(let i=0;i<firstDow;i++)cells+='<div class="cal-d oth"></div>';
  for(let d=1;d<=len;d++){
    const ds=y+'/'+pad2(m)+'/'+pad2(d);
    const evs=calEventsFor(ds);
    const isT=ds==='1405/06/05';
    cells+=`<div class="cal-d ${isT?'today':''} ${((firstDow+d-1)%7)===6?'j':''}" onclick="calDay('${ds}')" role="button" tabindex="0">
      <span class="n">${fa(d)}</span>
      ${evs.slice(0,3).map(e=>`<span class="ev ${e.cls}" onclick="event.stopPropagation();${e.fn==='—'?'':e.fn}">${e.ic?ic(e.ic,9):''}<span>${esc(e.t)}</span></span>`).join('')}
      ${evs.length>3?`<span class="ev more">+${fa(evs.length-3)}</span>`:''}</div>`;
  }
  return `<div class="row g12 cal-wrap" style="align-items:flex-start">
   <div class="grow card cal">
    <div class="cal-h">
      <div class="row g6">
        <button class="ibtn" onclick="calNav(-1)" aria-label="ماه قبل">${ic('chevright',16)}</button>
        <button class="ibtn" onclick="calNav(1)" aria-label="ماه بعد">${ic('chevleft',16)}</button>
        <span class="mo">${FA_MONTHS[m-1]} ${fa(y)}</span>
        <button class="btn btn-sm btn-ghost" onclick="S.calY=${TODAY.jy};S.calM=${TODAY.jm};render()">امروز</button></div>
      <div class="mr-auto">${seg('cv',[{v:'day',t:'روز'},{v:'week',t:'هفته'},{v:'month',t:'ماه'},{v:'list',t:'لیست'}],view,'setCalView')}</div>
      <button class="btn btn-pr btn-sm" onclick="meetModal()">${ic('plus',14)} جلسه جدید</button></div>
    ${view==='month'?`<div class="cal-g">${FA_WD_S.map((w,i)=>`<span class="cal-wh ${i===6?'j':''}">${w}</span>`).join('')}</div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr)">${cells}</div>`
    :view==='week'?calWeek():view==='day'?calDayView():calList()}
   </div>
   <div class="cal-side" style="width:300px;flex:none">
     <div class="card"><div class="card-h">${ic('cal',16)}<span class="t-h3 grow">روز انتخاب شده</span></div>
      <div class="card-b" id="cal-side">${calSideHtml(S.calSel||'1405/06/05')}</div></div>
     <div class="card"><div class="card-h">${ic('clock',16)}<span class="t-h3 grow">جلسات پیش رو</span></div>
      <div class="card-b" style="padding-top:2px">
      ${MEETS.filter(m=>m.status==='pre').slice(0,4).map(m=>`<div class="agenda" style="cursor:pointer" onclick="meetInfo('${m.id}')">
        <div class="tm">${fa(m.from)}</div><div class="bd"><b>${m.t}</b><p>${dFaM(m.date)} · ${m.who.map(w=>emp(w).name.split(' ')[0]).join('، ')}</p></div></div>`).join('')}
      </div></div>
     <div class="card"><div class="card-h">${ic('history',16)}<span class="t-h3 grow">جلسات گذشته</span></div>
      <div class="card-b" style="padding-top:2px">
      ${MEETS.filter(m=>m.status==='done').map(m=>`<div class="agenda" style="cursor:pointer" onclick="meetInfo('${m.id}')">
        <div class="tm" style="border-color:var(--t3);color:var(--t3)">${fa(m.from)}</div><div class="bd"><b>${m.t}</b><p>${dFaM(m.date)} — صورت‌جلسه ثبت شد</p></div></div>`).join('')}
      </div></div>
   </div></div>`;
}
function calNav(d){S.calM+=d;if(S.calM>12){S.calM=1;S.calY++;}if(S.calM<1){S.calM=12;S.calY--;}render();}
function setCalView(v){S.calView=v;render();}
function calDay(ds){S.calSel=ds;const el=$('#cal-side');if(el)el.innerHTML=calSideHtml(ds);$$('.cal-d.today').forEach(e=>e.classList.remove('today'));}
function calSideHtml(ds){
  const evs=calEventsFor(ds);
  return `<div class="t-h4 mb8">${jDowFa(toJ(ds))} ${dFaL(ds)}</div>
  ${evs.length?evs.map(e=>`<div class="row g10" style="padding:8px 0;border-bottom:1px solid var(--bd)">
    <span class="ev ${e.cls}" style="padding:4px 8px">${esc(e.t)}</span></div>`).join(''):`<div class="empty-mini">رویدادی در این روز نیست</div>`}
  <button class="btn btn-sec btn-sm btn-blk mt8" onclick="meetModal('${ds}')">${ic('plus',13)} افزودن رویداد</button>`;
}
function calWeek(){
  const start=jAdd(TODAY,-((jDow(TODAY)+1)%7));
  return `<div style="display:grid;grid-template-columns:repeat(7,1fr);border-top:1px solid var(--bd)">
  ${[...Array(7)].map((_,i)=>{const d=jAdd(start,i);const ds=d.jy+'/'+pad2(d.jm)+'/'+pad2(d.jd);
    const evs=calEventsFor(ds);
    return `<div style="border-left:1px solid var(--bd);min-height:280px;padding:8px">
     <div class="tc mb8"><div class="t-cap">${FA_WD_S[i]}</div><b style="font-size:16px;${ds==='1405/06/05'?'color:var(--pr3)':''}">${fa(d.jd)}</b></div>
     ${evs.map(e=>`<div class="ev ${e.cls}" style="margin-bottom:4px;padding:4px 8px" onclick="${e.fn==='—'?'':e.fn}"><span>${esc(e.t)}</span></div>`).join('')}</div>`;}).join('')}</div>`;
}
function calDayView(){
  const ds=S.calSel||'1405/06/05';const evs=calEventsFor(ds);
  return `<div style="padding:16px">
   <h3 class="t-h3 mb12">${jDowFa(toJ(ds))} ${dFaL(ds)}</h3>
   ${evs.length?evs.map(e=>`<div class="row g12" style="padding:12px;border:1px solid var(--bd);border-radius:10px;background:var(--s2);margin-bottom:8px">
     <span class="ev ${e.cls}" style="padding:4px 12px">${esc(e.t)}</span>
     <span class="t-cap mr-auto">${e.dur||'تمام روز'}</span>
     ${e.fn!=='—'?`<button class="btn btn-sm btn-ghost" onclick="${e.fn}">جزئیات</button>`:''}</div>`).join(''):
   `<div class="empty-mini" style="padding:40px">رویدادی برای این روز ثبت نشده است.</div>`}</div>`;
}
function calList(){
  const all=[];
  MEETS.forEach(m=>all.push({d:m.date,t:m.t,cls:'meet',l:'جلسه — '+m.who.map(w=>emp(w).name.split(' ')[0]).join('، '),fn:`meetInfo('${m.id}')`}));
  TASKS.filter(t=>t.due&&t.status!=='done').forEach(t=>all.push({d:t.due,t:'سررسید: '+t.title,cls:'task',l:'تسک — '+emp(t.assignee).name,fn:`taskDrawer('${t.id}')`}));
  all.sort((a,b)=>a.d<b.d?-1:1);
  return `<div style="padding:8px 16px 16px">${all.slice(0,12).map(e=>`
   <div class="row g12" style="padding:12px 0;border-bottom:1px solid var(--bd);cursor:pointer" onclick="${e.fn}">
     <span style="width:110px" class="t-cap num">${dFa(e.d)}</span>
     <span class="ev ${e.cls}" style="padding:4px 12px">${esc(e.t)}</span>
     <span class="t-cap mr-auto ellip">${esc(e.l)}</span></div>`).join('')}</div>`;
}
function meetInfo(id){
  const m=MEETS.find(x=>x.id===id);
  openDrawer({title:m.t,sub:jDowFa(toJ(m.date))+' '+dFaL(m.date)+' — ساعت '+fa(m.from),icon:'cal',body:`
   <div class="row g8 wrap mb16"><span class="badge bd-pr">${fa(m.from)} تا ${fa(addMin(m.from,m.dur))}</span><span class="chip">${ic('timer',12)} ${fa(m.dur)} دقیقه</span></div>
   ${fld('شرکت‌کنندگان',`<div class="row g6 wrap">${m.who.map(w=>`<span class="chip">${av(emp(w).name,'xs')}${emp(w).name}</span>`).join('')}</div>`)}
   <h4 class="t-h4 mt16 mb8">لینک جلسه</h4>
   <div class="key-mask"><span class="k">${m.link}</span><button class="ibtn" onclick="toast('ok','لینک کپی شد')">${ic('copy',13)}</button></div>
   <h4 class="t-h4 mt16 mb8">دستور جلسه</h4><p class="t-bs" style="color:var(--t1)">${m.agenda}</p>
   ${m.note?`<h4 class="t-h4 mt16 mb8">یادداشت</h4><p class="t-bs">${m.note}</p>`:''}`,
   footer:`<button class="btn btn-pr" onclick="toast('info','ورود به جلسه','در نسخه متصل به سرویس ویدئوکنفرانس فعال است.')">ورود به جلسه</button>
    <button class="btn btn-sec" onclick="closeDrawer();meetModal(null,'${m.id}')">ویرایش</button>
    <button class="btn btn-ghost mr-auto" onclick="closeDrawer();toast('warn','لغو جلسه','برای حاضران اطلاع‌رسانی می‌شود.')">لغو جلسه</button>`});
}
const addMin=(hhmm,min)=>{const[h,m]=hhmm.split(':').map(Number);const t=h*60+m+min;return pad2(Math.floor(t/60))+':'+pad2(t%60);};
function meetModal(datePreset,editId){
  openModal({title:editId?'ویرایش جلسه':'جلسه جدید',body:`
   ${fld('عنوان جلسه','<input class="inp" id="mt-t" placeholder="مثلاً: جلسه نیازسنجی مشتری" value="">')}
   <div class="frow mt12">
    ${dpField('mt-d','تاریخ',datePreset||'1405/06/06')}
    ${fld('ساعت شروع','<input class="inp num" id="mt-h" value="۱۰:۰۰" placeholder="۱۰:۰۰">')}
   </div>
   <div class="frow mt12">
    ${fld('مدت (دقیقه)',selWrap('mt-du',[{v:'15',t:'۱۵ دقیقه'},{v:'30',t:'۳۰ دقیقه'},{v:'60',t:'۱ ساعت'},{v:'90',t:'۱.۵ ساعت'},{v:'120',t:'۲ ساعت'}],'60'))}
    ${fld('لینک جلسه','<input class="inp" dir="ltr" id="mt-l" value="meet.effectstudio.ir/new">')}
   </div>
   ${fld('شرکت‌کنندگان','<div class="row g6 wrap mt4">'+['رضا قایمی','الهام رستمی','سارا احمدی'].map(n=>`<span class="chip chip-sel">${av(n,'xs')}${n}</span>`).join('')+`<button class="chip">${ic('plus',12)} افزودن</button></div>`,'<span class="hint">۳ نفر انتخاب شده</span>')}
   ${fld('دستور جلسه','<textarea class="txa" id="mt-a" placeholder="موضوعات و اهداف جلسه…"></textarea>')}
   `,footer:`<button class="btn btn-pr" onclick="meetCreate()">ایجاد جلسه</button><button class="btn btn-ghost" onclick="closeModal()">انصراف</button>`});
}
function meetCreate(){
  const t=$('#mt-t').value.trim()||'جلسه بدون عنوان';
  const d=$('#mt-d').dataset.val||'1405/06/06';
  MEETS.push({id:uid('m'),t,date:d,from:enDigits($('#mt-h').value)||'10:00',dur:+$('#mt-du').value||60,who:['e1','e2'],link:$('#mt-l').value,agenda:$('#mt-a').value,note:'',status:'pre'});
  closeModal();render();toast('ok','جلسه ایجاد شد','«'+t+'» — '+dFaM(d)+' ساعت '+fa(enDigits($('#mt-h')?$('#mt-h').value:'10:00')));
}
VIEWS['calendar']={title:'تقویم',vw:()=>`<div class="pg">${pgHead('تقویم','تقویم شمسی — جلسات، سررسید تسک‌ها، مرخصی و رویدادها','',[{t:'داشبورد'},{t:'تقویم'}])}${calView()}</div>`};
