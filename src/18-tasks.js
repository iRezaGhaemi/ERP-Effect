/* ============================================================
   EFFECT ERP · Tasks (board/list/calendar/timeline) + Workspaces
   ============================================================ */
function scopedTasks(){
  const sc=S.taskScope;
  if(sc==='my')return TASKS.filter(t=>t.assignees.includes('e1'));
  if(sc==='ws'){const ws=WS.find(w=>w.id===S.ws)||WS[0];const pids=PRJ.filter(p=>p.ws===ws.id).map(p=>p.id);return TASKS.filter(t=>t.project&&pids.includes(t.project));}
  if(sc==='cp')return TASKS.filter(t=>t.project&&cproByPrj(t.project));
  return TASKS.slice();
}
function filteredTasks(assignMe){
  const f=S.taskFilters;
  const base=assignMe?TASKS:scopedTasks();
  return base.filter(t=>{
    if(assignMe&&!t.assignees.includes('e1'))return false;
    if(f.proj&&t.project!==f.proj)return false;
    if(f.asgn&&!t.assignees.includes(f.asgn))return false;
    if(f.prio&&t.prio!==f.prio)return false;
    if(f.st&&t.status!==f.st)return false;
    if(f.q&&!t.title.includes(f.q))return false;
    return true;});
}
function taskFiltersBar(){
  const f=S.taskFilters;
  return filterbar(`
   <span class="lb">${ic('filter',13)} فیلترها</span>
   <div class="inp-ic" style="width:210px"><input class="inp" style="height:32px;padding-left:32px" placeholder="جستجوی تسک…" value="${esc(f.q)}" oninput="S.taskFilters.q=this.value;debRender()"></div>
   <div class="sel-wrap"><select class="sel fsel" onchange="S.taskFilters.proj=this.value;render()">
     <option value="">همه پروژه‌ها</option>${PRJ.map(p=>`<option ${f.proj===p.id?'selected':''} value="${p.id}">${p.name}</option>`).join('')}</select>${ic('chevdown',13)}</div>
   <div class="sel-wrap"><select class="sel fsel" onchange="S.taskFilters.asgn=this.value;render()">
     <option value="">همه مسئول‌ها</option>${EMP.map(e=>`<option ${f.asgn===e.id?'selected':''} value="${e.id}">${e.name}</option>`).join('')}</select>${ic('chevdown',13)}</div>
   <div class="sel-wrap"><select class="sel fsel" onchange="S.taskFilters.prio=this.value;render()">
     <option value="">همه اولویت‌ها</option>${PRIOS.map(p=>`<option ${f.prio===p.id?'selected':''} value="${p.id}">${p.t}</option>`).join('')}</select>${ic('chevdown',13)}</div>
   ${f.proj||f.asgn||f.prio||f.st||f.q?`<button class="btn btn-sm btn-ghost" onclick="S.taskFilters={proj:'',asgn:'',prio:'',st:'',q:''};render()">${ic('x',13)} حذف فیلترها</button>`:''}
  `);
}
const debRender=debounce(render,300);
function taskViewSeg(){return seg('tv',[{v:'board',t:'برد',ic:'kanban'},{v:'list',t:'لیست',ic:'list'},{v:'cal',t:'تقویم',ic:'cal'},{v:'tl',t:'Timeline',ic:'chart'}],S.taskView,'setTaskView');}
function setTaskView(v){S.taskView=v;render();}
function myTasksView(){
  const tasks=filteredTasks(true);
  const now=tasks.filter(t=>t.due&&jDiff(TODAY,toJ(t.due))<=0&&t.status!=='done');
  return `<div class="pg">${pgHead('کارهای من','همه تسک‌هایی که به شما واگذار شده است',
    `<span class="badge bd-pr">${fa(TASKS.filter(t=>t.assignees.includes('e1')&&t.status!=='done').length)} تسک باز</span>
     <button class="btn btn-pr" onclick="taskModal(null)">${ic('plus',15)} تسک جدید</button>`,
    [{t:'داشبورد'},{t:'کارهای من'}])}
  ${taskFiltersBar()}
  <div class="grid grid-2 mb16">
    <div class="kpi accent"><div class="k-l">${ic('zap',15)}ماموریت‌های امروز</div><div class="k-v num">${fa(now.filter(t=>dueCls(t.due)!=='over').length)}</div><div class="k-d up">${ic('check',12)}۲ مورد امروز انجام شد</div></div>
    <div class="kpi"><div class="k-l">${ic('alert',15)}عقب‌افتاده</div><div class="k-v num">${fa(now.filter(t=>dueCls(t.due)==='over').length)}</div><div class="k-d dn">${ic('trenddn',12)}نیاز به پیگیری فوری</div></div>
  </div>
  ${tblInit('myt',[
    {k:'title',l:'عنوان',r:t=>`<b>${esc(t.title)}</b>${t.tags.length?`<div class="sub">${t.tags.map(x=>`<span class="tag">${esc(x)}</span>`).join(' ')}</div>`:''}`,mobFull:true},
    {k:'project',l:'پروژه',hideMob:true,r:t=>`<span class="t2c">${prj(t.project).name}</span>`},
    {k:'status',l:'وضعیت',r:t=>ST_COLS.find(c=>c.id===t.status)?`<span class="badge bd-${t.status==='done'?'ok':t.status==='doing'?'pr':t.status==='review'?'info':'mut'}">${ST_COLS.find(c=>c.id===t.status).t}</span>`:'—'},
    {k:'prio',l:'اولویت',r:t=>prioBadge(t.prio)},
    {k:'due',l:'سررسید',r:t=>dueBadge(t.due)},
  ],tasks,{onRow:'taskDrawer',per:10,sort:'due',empty:'تسکی یافت نشد',emptySub:'با تغییر فیلترها دوباره تلاش کنید یا تسک جدیدی بسازید.',emptyCta:`<button class="btn btn-pr btn-sm" onclick="taskModal(null)">${ic('plus',13)} ایجاد کار</button>`})}
  </div>`;
}
function tasksBoardView(){
  const tasks=filteredTasks();
  return `<div class="pg">${pgHead('مدیریت تسک‌ها','برد کارها — '+(WS.find(w=>w.id===S.ws)||{}).name,
    `<button class="btn btn-sec" onclick="go('#/workspaces')">${ic('briefcase',14)} فضاهای کاری</button>
     <button class="btn btn-pr" onclick="taskModal(null)">${ic('plus',15)} تسک جدید</button>`,
    [{t:'داشبورد'},{t:'عملیات'},{t:'تسک‌ها'}])}
  <div class="scopebar">
    <span class="lb-t">${ic('layers',13)} محدوده:</span>
    ${[['all','همه شرکت'],['ws','فضای کاری فعال'],['cp','پروژه‌های مشتریان'],['my','کارهای من']].map(x=>`<button class="chip ${S.taskScope===x[0]?'chip-sel on':''}" onclick="S.taskScope='${x[0]}';render()">${x[1]}</button>`).join('')}
    <span class="t-cap mr-auto">${fa(tasks.length)} تسک در نمای فعلی</span>
  </div>
  <div class="row mb12" style="justify-content:space-between;flex-wrap:wrap;gap:12px">${taskViewSeg()}
    <button class="btn btn-sec btn-sm" onclick="lblModal()">${ic('tagi',13)} مدیریت برچسب‌ها</button></div>
  ${taskFiltersBar()}
  ${S.taskView==='board'?kanbanHtml(tasks):S.taskView==='list'?tasksListHtml(tasks):S.taskView==='cal'?tasksCalHtml(tasks):tasksTlHtml(tasks)}
  </div>`;
}
function kanbanHtml(tasks){
  return `<div class="kb" id="kb">${ST_COLS.map(col=>{
    const items=tasks.filter(t=>t.status===col.id);
    return `<div class="kb-col" ondragover="event.preventDefault();this.classList.add('dragover')" ondragleave="this.classList.remove('dragover')" ondrop="kbDrop(event,'${col.id}')">
      <div class="kb-h"><span class="t">${col.t}</span><span class="cnt">${fa(items.length)}</span>
        <button class="ibtn kb-add" data-tip="تسک جدید در این ستون" onclick="taskModal(null,'${col.id}')">${ic('plus',15)}</button></div>
      <div class="kb-body" data-scroll="${col.id}">
      ${items.length?items.map(t=>`
        <div class="kb-card" draggable="true" ondragstart="kbDrag(event,'${t.id}')" ondragend="this.classList.add('dragging')" onclick="taskDrawer('${t.id}')">
          ${t.labels.length?`<div class="kb-lbs mb8">${t.labels.slice(0,3).map(l=>lbChip(l)).join('')}</div>`:''}
          <div class="meta">${prioBadge(t.prio)}</div>
          <div class="tt">${esc(t.title)}</div>
          <div class="row g6 mb8" style="flex-wrap:wrap">${dueBadge(t.due)}<span class="badge bd-mut" style="font-size:10px">${prj(t.project).name}</span></div>
          ${t.checklist.length?`<div class="row g6 mb8"><div class="prog" style="flex:1;min-width:60px"><i style="width:${Math.round(ckDone(t)/t.checklist.length*100)}%"></i></div><span class="t-cap">${ic('check',11)} ${fa(ckDone(t))}/${fa(t.checklist.length)}</span></div>`:''}
          <div class="kb-f">
            ${t.checklist.length?`<span class="kb-ico" data-tip="چک‌لیست">${ic('check',12)} ${fa(ckDone(t))}/${fa(t.checklist.length)}</span>`:''}
            <span class="kb-ico" data-tip="کامنت">${ic('msg',12)} ${fa(t.cm)}</span>
            <span class="kb-ico" data-tip="پیوست">${ic('paperclip',12)} ${fa(t.att)}</span>
            <span class="sp"></span>${avStack(t.assignees.map(a=>emp(a).name),3)}${t.assignees.length>3?`<span class="t-cap">+${fa(t.assignees.length-3)}</span>`:''}
          </div></div>`).join(''):
        `<div class="empty-mini" style="border-style:dashed">تسکی در این ستون نیست</div>`}
      </div></div>`;}).join('')}</div>`;
}
function kbDrag(e,id){e.dataTransfer.setData('text/plain',id);e.target.classList.add('dragging');}
function kbDrop(e,col){e.preventDefault();$$('.kb-col').forEach(c=>c.classList.remove('dragover'));
  const id=e.dataTransfer.getData('text/plain');const t=task(id);if(!t||t.status===col)return;
  const old=t.status;t.status=col;render();
  toast('ok','تسک جابه‌جا شد','«'+t.title+'» ← '+ST_COLS.find(c=>c.id===col).t,{t:'واگرد',fn:`task('${id}').status='${old}';render()`});}
function tasksListHtml(tasks){
  return tblInit('tsk',[
    {k:'title',l:'عنوان',mobFull:true,r:t=>`<b>${esc(t.title)}</b>${t.labels.length?`<div class="kb-lbs mt4">${t.labels.slice(0,3).map(l=>lbChip(l)).join('')}</div>`:''}`},
    {k:'assignee',l:'مسئولین',r:t=>`<span class="row g6">${avStack(t.assignees.map(a=>emp(a).name),3)}<span class="t2c ellip">${t.assignees.map(a=>emp(a).name.split(' ')[0]).join('، ')}</span></span>`},
    {k:'project',l:'پروژه',hideMob:true,r:t=>`<span class="t2c">${prj(t.project).name}</span>`},
    {k:'status',l:'وضعیت',r:t=>`<span class="badge bd-${t.status==='done'?'ok':t.status==='doing'?'pr':t.status==='review'?'info':'mut'}">${ST_COLS.find(c=>c.id===t.status).t}</span>`},
    {k:'prio',l:'اولویت',r:t=>prioBadge(t.prio),hideMob:true},
    {k:'due',l:'سررسید',r:t=>dueBadge(t.due)},
    {k:'ck',l:'چک‌لیست',num:true,hideMob:true,r:t=>`<span class="num t2c">${fa(ckDone(t))}/${fa(t.checklist.length)}</span>`,sv:t=>t.checklist.length?ckDone(t)/t.checklist.length:0},
  ],tasks,{onRow:'taskDrawer',per:9,empty:'هنوز کاری ایجاد نشده است',emptySub:'اولین تسک این فضای کاری را بسازید.',emptyCta:`<button class="btn btn-pr btn-sm" onclick="taskModal(null)">${ic('plus',13)} ایجاد کار</button>`});
}
function tasksCalHtml(tasks){
  const y=TODAY.jy,m=TODAY.jm;
  const firstDow=(jDow({jy:y,jm:m,jd:1})+1)%7;const len=jMonthLen(y,m);
  let cells='';
  for(let i=0;i<firstDow;i++)cells+='<div class="cal-d oth"></div>';
  for(let d=1;d<=len;d++){
    const ds=y+'/'+pad2(m)+'/'+pad2(d);
    const dayTasks=tasks.filter(t=>t.due===ds);
    const isT=d===TODAY.jd&&m===TODAY.jm;
    cells+=`<div class="cal-d ${isT?'today':''}" onclick="daySheet('${ds}')"><span class="n">${fa(d)}</span>
      ${dayTasks.slice(0,3).map(t=>`<span class="ev task" onclick="event.stopPropagation();taskDrawer('${t.id}')">${ic('check',9)} ${esc(t.title)}</span>`).join('')}
      ${dayTasks.length>3?`<span class="ev more">+${fa(dayTasks.length-3)} مورد</span>`:''}</div>`;
  }
  return `<div class="cal"><div class="cal-g">${FA_WD_S.map((w,i)=>`<span class="cal-wh ${i===6?'j':''}">${w}</span>`).join('')}</div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr)">${cells}</div></div>
    <p class="t-cap mt8">${ic('info',12)} برای دیدن جزئیات هر روز روی آن کلیک کنید — تقویم کامل شامل جلسات و مرخصی در ماژول «تقویم».</p>`;
}
function daySheet(ds){
  const dayTasks=TASKS.filter(t=>t.due===ds);
  const dayMeets=MEETS.filter(m2=>m2.date===ds);
  openDrawer({title:jStrL(toJ(ds)),sub:'رویدادهای این روز',icon:'cal',body:
    (dayMeets.length?`<h4 class="t-h4 mb8">جلسات</h4>`+dayMeets.map(m2=>`<div class="meet-mini mb8"><div class="tm"><b>${fa(m2.from)}</b></div><div class="bd grow"><b>${m2.t}</b><p>${m2.who.map(w=>emp(w).name).join('، ')}</p></div></div>`).join(''):'')+
    (dayTasks.length?`<h4 class="t-h4 mb8 mt8">سررسید تسک‌ها</h4>`+dayTasks.map(t=>`<div class="appr" style="cursor:pointer" onclick="closeDrawer();taskDrawer('${t.id}')">${av(emp(t.assignee).name,'sm')}<div class="bd grow"><b>${esc(t.title)}</b><span>${prj(t.project).name}</span></div>${prioBadge(t.prio)}</div>`).join(''):
    `<div class="empty-mini">تسکی با سررسید این روز نیست</div>`)});
}
function tasksTlHtml(tasks){
  const y=TODAY.jy,m=TODAY.jm,len=jMonthLen(y,m);
  const monthTasks=tasks.filter(t=>t.due&&(t.due.startsWith(y+'/'+pad2(m))));
  const monthDays=[...Array(len)].map((_,i)=>i+1);
  return `<div class="tl"><div class="tl-scroll"><div class="tl-in">
    <div class="tl-head"><div class="lb" style="width:240px;flex:none;border-left:1px solid var(--bd);padding:8px 16px;font-size:11.5px;font-weight:600;color:var(--t3)">تسک</div>
      ${monthDays.filter(d=>d===1||d%7===1).map(d=>`<div class="m">۱ تا ${fa(Math.min(d+6,len))} ${FA_MONTHS[m-1]}</div>`).join('')}</div>
    ${monthTasks.map(t=>{
      const s=t.start?toJ(t.start):toJ(t.due);const e=toJ(t.due);
      const sd=Math.max(1,s.jm===m?s.jd:1),ed=Math.min(len,e.jm===m?e.jd:len);
      const w=Math.max(3,((ed-sd+1)/len)*100),right=((sd-1)/len)*100;
      const cls=t.status==='done'?'done':dueCls(t.due)==='over'?'over':'';
      return `<div class="tl-row"><div class="lb">${prioBadge(t.prio)}<span class="ellip t-bs" style="color:var(--t1);font-weight:600">${esc(t.title)}</span></div>
        <div class="tl-track">${monthDays.filter(d=>d===1||d%7===0).map(()=>'<div class="tick"></div>').join('')}
          <div class="tl-today" style="right:${((TODAY.jd-1)/len)*100}%"></div>
          <div class="tl-bar ${cls}" style="right:${right}%;width:${w}%">${emp(t.assignee).name.split(' ')[0]}</div></div></div>`;}).join('')}
  </div></div></div>`;
}
/* ---------- task detail drawer ---------- */
function taskDrawer(id){
  const t=task(id);if(!t)return;
  const comments=[...(t.comments||[])].reverse().map(c=>[emp(c.who).name,c.at,c.text]).concat([
    ['الهام رستمی','۲ ساعت پیش','@رضا فایل نهایی رو تو گوگل درایو گذاشتم، لطفاً قبل از جلسه چک کن.'],
    ['سارا احمدی','دیروز','پیشنهاد می‌کنم نسخه دوم سناریو رو هم بررسی کنیم؛ نرخ کلیک بهتری داشت.']]);
  openDrawer({title:t.title,sub:prj(t.project).name+' · '+t.id.toUpperCase(),icon:'tasks',wide:true,body:`
   <div class="row g8 wrap mb16">${prioBadge(t.prio)}
     <span class="badge bd-${t.status==='done'?'ok':t.status==='doing'?'pr':t.status==='review'?'info':'mut'}">${ST_COLS.find(c=>c.id===t.status).t}</span>
     ${dueBadge(t.due)}<span class="chip">${ic('timer',12)} ${fa(t.est)} ساعت تخمینی</span></div>
   <p class="t-bs" style="color:var(--t1);line-height:1.9">${esc(t.desc)}</p>
   <div class="grid grid-2 mt16" style="gap:12px">
    <div class="panel" style="padding:12px"><span class="t-lbl">مسئولین (${fa(t.assignees.length)})</span><div class="row g8 mt4 wrap">${avStack(t.assignees.map(a=>emp(a).name),4)}${t.assignees.length>4?`<span class="t-cap">+${fa(t.assignees.length-4)}</span>`:''}</div><div class="row g6 mt8 wrap">${t.assignees.map(a=>`<span class="tag">${emp(a).name}</span>`).join('')}</div></div>
    <div class="panel" style="padding:12px"><span class="t-lbl">همکاران</span><div class="row g8 mt4">${avStack([emp(t.assignee).name,'سارا احمدی','الهام رستمی'])}<span class="t-cap">+۲</span></div></div>
    <div class="panel" style="padding:12px"><span class="t-lbl">تاریخ شروع</span><div class="mt4 t-bs" style="color:var(--t1)">${dFaL(t.start)}</div></div>
    <div class="panel" style="padding:12px"><span class="t-lbl">تاریخ سررسید</span><div class="mt4 t-bs" style="color:var(--t1)">${dFaL(t.due)}</div></div>
   </div>
   <h4 class="t-h4 mt20 mb8">برچسب‌ها</h4>
   ${lbPicker(t.labels,t.id)}
   <div class="row g6 mt8">${t.tags.map(x=>`<span class="tag">${esc(x)}</span>`).join('')}</div>
   ${ckBlock(t,can('tasks','e'))}
   <h4 class="t-h4 mt20 mb8">وابستگی‌ها</h4>
   <div class="panel" style="padding:12px 12px" class="row"><span class="t-cap">این تسک به‌صورت خودکار پس از تکمیل «تایید بودجه» آغاز می‌شود (وابستگی پایان ← شروع).</span></div>
   <h4 class="t-h4 mt20 mb8">پیوست‌ها (${fa(t.att)})</h4>
   <div class="row g8 wrap">${[...Array(Math.max(1,t.att))].map((_,i)=>`<span class="chip">${ic('paperclip',12)} فایل-${fa(i+1)}.zip</span>`).join('')}
     <button class="chip" onclick="toast('info','بارگذاری فایل','در نسخه متصل به Google Drive فعال است.')">${ic('plus',12)} افزودن</button></div>
   <h4 class="t-h4 mt20 mb8">کامنت‌ها (${fa(t.cm)})</h4>
   ${comments.map(c=>`
     <div class="row b g10 mb12">${av(c[0],'sm')}<div class="grow"><div class="row g6"><b class="t-bs" style="color:var(--t1)">${esc(c[0])}</b><span class="t-cap">${esc(c[1])}</span></div>
     <p class="t-bs mt4">${esc(c[2])}</p></div></div>`).join('')}
   <div class="row g8"><input class="inp grow" id="cmt-in" placeholder="کامنت بنویسید… (@منشن)"><button class="btn btn-pr" onclick="addCmt('${id}')">${ic('send',14)}</button></div>
   <h4 class="t-h4 mt20 mb8">فعالیت‌ها</h4>
   ${[['سارا احمدی','وضعیت ← در انتظار بررسی','۳ ساعت پیش'],[emp(t.assignee).name,'تسک ایجاد کرد','۲ روز پیش'],['سارا احمدی','چک‌لیست افزود','۲ روز پیش']].map(a=>`
     <div class="act-row"><span class="act-ic">${ic('activity',14)}</span><div class="grow"><p class="t-bs"><b>${a[0]}</b> ${a[1]}</p><time class="t-cap">${a[2]}</time></div></div>`).join('')}
  `,footer:`
   ${can('tasks','e')?`<button class="btn btn-pr" onclick="taskEdit('${t.id}')">${ic('edit',14)} ویرایش تسک</button>`:''}
   <button class="btn btn-sec" onclick="closeDrawer();taskDone('${t.id}')" ${t.status==='done'?'disabled':''}>انجام شد</button>
   <button class="btn btn-ghost mr-auto" onclick="toast('info','لینک کپی شد','effectstudio.ir/erp/t/${t.id}')">${ic('link',14)} کپی لینک</button>
   ${can('tasks','d')?`<button class="ibtn ibtn-err" data-tip="حذف" onclick="confirmDlg('حذف تسک','از حذف این تسک مطمئن هستید؟ این عمل قابل بازگشت نیست.',()=>{TASKS.splice(TASKS.findIndex(x=>x.id==='${t.id}'),1);closeDrawer();render();toast('ok','تسک حذف شد')},'حذف تسک',true)">${ic('trash',15)}</button>`:''}`});
}
function addCmt(id){
  const t=task(id),el=$('#cmt-in');if(!t||!el)return;
  const text=el.value.trim();if(!text){el.focus();return;}
  if(!Array.isArray(t.comments))t.comments=[];
  t.comments.push({id:uid('cm'),who:'e1',at:'همین حالا',text});
  t.cm=(t.cm||0)+1;
  taskDrawer(id);
  toast('ok','کامنت ثبت شد','پیام شما به تسک اضافه شد.');
}
function tglTaskLbl(tid,lid){
  if(tid==='_new'){S._newLbls=S._newLbls||[];const i=S._newLbls.indexOf(lid);i>-1?S._newLbls.splice(i,1):S._newLbls.push(lid);const el=document.getElementById('tk-lbs');if(el)el.innerHTML=lbPicker(S._newLbls,'_new');return;}
  const t=task(tid);if(!t)return;const i=t.labels.indexOf(lid);i>-1?t.labels.splice(i,1):t.labels.push(lid);render();if($('#ovl'))taskDrawer(tid);
}
/* ---------- task create/edit form — LEFT side drawer (v2.6) ---------- */
function taskModal(_e,status){taskForm(null,status);}
function taskEdit(id){taskForm(id);}
function taskForm(id,status){
  asgDdClose();
  const t=id?task(id):null;
  if(t&&!can('tasks','e')){toast('err','دسترسی لازم را ندارید','ویرایش تسک برای حساب شما مجاز نیست.');return;}
  ASG_NEW=t?t.assignees.slice():['e1'];
  S._tf={id:t?t.id:null,st:status||(t?t.status:'todo'),
    ws:t&&t.project?(prj(t.project).ws||''):'',
    labels:t?t.labels.slice():[],
    ck:t?t.checklist.map(c=>({id:c.id,taskId:c.taskId,title:c.title,completed:c.completed,order:c.order,createdAt:c.createdAt,updatedAt:c.updatedAt})):[]};
  openDrawer({title:t?'ویرایش تسک':'ایجاد تسک',
    sub:t?'ویرایش کامل اطلاعات تسک — تغییرات با «ذخیره تغییرات» اعمال می‌شود.':'تسک جدید برای پروژه یا فضای کاری ایجاد کنید.',
    icon:'tasks',cls:'dw-tf',
    body:taskFormHtml(t),
    footer:`<button class="btn btn-ghost" onclick="closeDrawer()">لغو</button>
      <button class="btn btn-pr" onclick="taskSave()">${ic('check',14)} ${t?'ذخیره تغییرات':'ایجاد تسک'}</button>`});
  setTimeout(()=>{const i=$('#tk-t');if(i)i.focus();},60);
}
function tfPrjOpts(sel){
  const ws=S._tf.ws;const list=ws?PRJ.filter(p=>p.ws===ws):PRJ;
  return `<option value="">بدون پروژه</option>`+list.map(p=>`<option value="${p.id}" ${p.id===sel?'selected':''}>${p.name}</option>`).join('');
}
function taskFormHtml(t){
  const f=S._tf;
  return `
  <div class="tf-h">${ic('info',13)} اطلاعات پایه</div>
  ${fld('عنوان تسک',`<input class="inp" id="tk-t" placeholder="مثلاً: بازبینی سناریوی تیزر" value="${t?esc(t.title):''}">`)}
  <div class="mt12">${fld('توضیحات',`<textarea class="txa" id="tk-d" placeholder="جزئیات، معیارهای پذیرش و منابع مورد نیاز…">${t?esc(t.desc):''}</textarea>`)}</div>
  <div class="tf-h">${ic('briefcase',13)} فضای کاری و پروژه</div>
  <div class="frow">
   ${fld('فضای کاری',selWrap('tk-ws',[{v:'',t:'همه فضاهای کاری'}].concat(WS.map(w=>({v:w.id,t:w.name}))),f.ws,'onchange="tfWs(this.value)"'))}
   ${fld('پروژه',`<div class="sel-wrap" id="tk-p-wrap"><select class="sel" id="tk-p">${tfPrjOpts(t?t.project:null)}</select>${ic('chevdown',14)}</div>`)}
  </div>
  <div class="tf-h">${ic('users',13)} مسئولین</div>
  ${fld('مسئولین تسک',asgFieldHtml())}
  <div class="tf-h">${ic('flag',13)} وضعیت و اولویت</div>
  <div class="frow">
   ${fld('وضعیت',selWrap('tk-st',ST_COLS.map(c=>({v:c.id,t:c.t})),f.st))}
   ${fld('اولویت',selWrap('tk-pr',PRIOS.map(p=>({v:p.id,t:p.t}))),t?t.prio:'mid')}
  </div>
  <div class="tf-h">${ic('cal',13)} تاریخ‌ها</div>
  <div class="frow">
   ${dpField('tk-start','تاریخ شروع',t?t.start:null)}
   ${dpField('tk-due','مهلت انجام',t?t.due:'')}
  </div>
  <div class="frow mt12">
   ${fld('زمان تخمینی (ساعت)',`<input class="inp num" id="tk-est" inputmode="numeric" value="${t?fa(t.est):'۴'}" oninput="this.value=fa(this.value.replace(/[^0-9]/g,''))">`)}
   ${fld('برچسب متنی (اختیاری)',`<input class="inp" id="tk-tags" placeholder="مثلاً: کمپین تابستان، بازبینی" value="${t?esc(t.tags.join('، ')):''}">`)}
  </div>
  <div class="tf-h">${ic('mytask',13)} چک‌لیست</div>
  <div id="tf-ck">${tfCkHtml()}</div>
  <div class="tf-h">${ic('tagi',13)} برچسب‌ها</div>
  <div id="tf-lbs">${tfLbPicker()}</div>
  <span class="hint">${ic('tagi',11)} برچسب رنگی با کلیک انتخاب یا لغو می‌شود؛ برچسب جدید را همین‌جا بسازید.</span>`;
}
function tfWs(v){
  S._tf.ws=v;
  const cur=$('#tk-p').value;
  const keep=PRJ.some(p=>p.id===cur&&(v===''||p.ws===v));
  $('#tk-p').innerHTML=tfPrjOpts(keep?cur:'');
}
function tfLbPicker(){
  return `<div class="row g6 wrap">${LABELS.map(l=>`<button type="button" class="lb" style="background:${S._tf.labels.includes(l.id)?LB_SOFT[l.c]:'var(--s2)'};color:${LB_COLORS[l.c]};border:1px solid ${S._tf.labels.includes(l.id)?'transparent':'var(--bd)'};cursor:pointer" onclick="tfLbl('${l.id}')"><i style="background:${LB_COLORS[l.c]}"></i>${esc(l.n)}</button>`).join('')}<button type="button" class="lb-add" onclick="lblModal()">${ic('plus',11)} برچسب جدید</button></div>`;
}
function tfLbl(lid){const i=S._tf.labels.indexOf(lid);i>-1?S._tf.labels.splice(i,1):S._tf.labels.push(lid);const el=$('#tf-lbs');if(el)el.innerHTML=tfLbPicker();}
/* ---------- checklist editor (inside form drawer) ---------- */
function tfCkHtml(){
  const ck=S._tf.ck;const done=ck.filter(c=>c.completed).length;
  const pct=ck.length?Math.round(done/ck.length*100):0;
  return `${ck.length?`<div class="row" style="justify-content:space-between"><span class="t-lbl">پیشرفت چک‌لیست</span><span class="t-cap num">${ic('check',11)} ${fa(done)} / ${fa(ck.length)} انجام شده · ${fa(pct)}٪</span></div><div class="prog mt8 mb8"><i style="width:${pct}%"></i></div>`:''}
   <div id="tf-ck-list">${ck.map((c,i)=>tfCkRow(c,i)).join('')||'<span class="hint">زیرکارها و مراحل انجام را فهرست کنید؛ پیشرفت به‌صورت خودکار محاسبه می‌شود.</span>'}</div>
   <button type="button" class="btn btn-sm btn-sec mt4" onclick="tfCkAdd()">${ic('plus',13)} افزودن مورد</button>`;
}
function tfCkRow(c,i){
  return `<div class="ck-item ${c.completed?'done':''}">
    <label class="ckb"><input type="checkbox" ${c.completed?'checked':''} onchange="tfCkTgl(${i})"><span class="bx">${ic('check',11)}</span></label>
    <input class="inp ck-inp grow" id="cki-${i}" value="${esc(c.title)}" placeholder="مورد ${fa(i+1)} — مثلاً: آماده‌سازی سناریو" oninput="S._tf.ck[${i}].title=this.value" onkeydown="if(event.key==='Enter'){event.preventDefault();tfCkAdd(${i});}">
    <span class="ord"><button type="button" data-tip="جابه‌جایی به بالا" onclick="tfCkMove(${i},-1)" ${i===0?'disabled style="opacity:.3"':''} style="transform:rotate(180deg)">${ic('chevdown',11)}</button><button type="button" data-tip="جابه‌جایی به پایین" onclick="tfCkMove(${i},1)" ${i===S._tf.ck.length-1?'disabled style="opacity:.3"':''}>${ic('chevdown',11)}</button></span>
    <button type="button" class="ibtn ibtn-err" data-tip="حذف" onclick="tfCkDel(${i})">${ic('trash',13)}</button></div>`;
}
function tfCkRer(){const el=$('#tf-ck');if(el)el.innerHTML=tfCkHtml();}
function tfCkAdd(after){const at=(after!=null?after+1:S._tf.ck.length);S._tf.ck.splice(at,0,{title:'',completed:false});tfCkRer();const el=$('#cki-'+at);if(el)el.focus();}
function tfCkTgl(i){S._tf.ck[i].completed=!S._tf.ck[i].completed;tfCkRer();}
function tfCkDel(i){S._tf.ck.splice(i,1);tfCkRer();}
function tfCkMove(i,d){const j=i+d;if(j<0||j>=S._tf.ck.length)return;const a=S._tf.ck;[a[i],a[j]]=[a[j],a[i]];tfCkRer();}
/* ---------- assignee searchable multi-select dropdown ---------- */
let ASG_NEW=['e1'];
let ASG_DD=null;
function asgFieldHtml(){
  return `<div class="asg-fld" id="asg-fld">
    <div class="asg-box" id="asg-box" tabindex="0" role="combobox" aria-haspopup="listbox" aria-expanded="false" onclick="asgDdToggle()" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();asgDdToggle();}">${asgChipsHtml()}
      <button type="button" class="ibtn asg-clr" id="asg-clr" data-tip="حذف همه انتخاب‌ها" style="${ASG_NEW.length?'':'display:none'}" onclick="event.stopPropagation();asgClear()">${ic('x',13)}</button>
      <span class="asg-chev">${ic('chevdown',14)}</span></div>
    <span class="hint">${ic('users',11)} با کلیک روی فیلد، جستجو و انتخاب چند مسئول؛ تسک در «کارهای من» همه اعضا دیده می‌شود.</span></div>`;
}
function asgChipsHtml(){
  return `<div class="row g6 wrap grow" id="tf-asg-chips">${ASG_NEW.map(id=>{const e=emp(id);return `<span class="chip chip-sel on">${av(e.name,'xs')} ${e.name}<button type="button" class="ibtn" style="width:20px;height:20px" aria-label="حذف ${e.name}" onclick="event.stopPropagation();asgRemove('${id}')">${ic('x',10)}</button></span>`;}).join('')||'<span class="asg-ph">انتخاب مسئولین تسک…</span>'}</div>`;
}
function tfAsgChips(){const c=$('#tf-asg-chips');if(c)c.outerHTML=asgChipsHtml();const cl=$('#asg-clr');if(cl)cl.style.display=ASG_NEW.length?'':'none';}
function asgDdToggle(){ASG_DD?asgDdClose():asgDdOpen();}
function asgDdOpen(){
  asgDdClose();
  const box=$('#asg-box');if(!box)return;
  const el=document.createElement('div');el.className='asg-dd';el.id='asg-dd';
  el.innerHTML=`<div class="asg-dd-q">${ic('search',13)}<input id="asg-q" placeholder="جستجوی همکار…" oninput="asgDdSearch(this.value)" onkeydown="asgDdKeys(event)"></div>
    <div class="asg-dd-list" id="asg-dd-list" role="listbox"></div>
    <div class="asg-dd-f"><button type="button" class="btn btn-sm btn-ghost" onclick="asgClear()">${ic('x',12)} پاک کردن انتخاب‌ها</button><span class="t-cap" id="asg-dd-cnt"></span></div>`;
  document.body.appendChild(el);ASG_DD=el;
  const r=box.getBoundingClientRect();
  const w=Math.max(Math.round(r.width),250);
  el.style.width=w+'px';
  const h=Math.min(330,innerHeight-20);
  el.style.maxHeight=h+'px';
  let top=r.bottom+6;
  if(top+Math.min(el.offsetHeight||h,h)>innerHeight-8)top=r.top-6-h;
  el.style.top=Math.max(8,Math.min(top,innerHeight-80))+'px';
  el.style.left=Math.max(8,Math.min(r.left,innerWidth-w-8))+'px';
  box.classList.add('open');box.setAttribute('aria-expanded','true');
  S._asgHl=0;asgDdSearch('');
  setTimeout(()=>{const q=$('#asg-q');if(q){q.focus();q.select();}},30);
  setTimeout(()=>{document.addEventListener('mousedown',asgDdOut);document.addEventListener('scroll',asgDdScrl,true);},0);
}
function asgDdClose(){
  if(ASG_DD){ASG_DD.remove();ASG_DD=null;}
  const b=$('#asg-box');if(b){b.classList.remove('open');b.setAttribute('aria-expanded','false');}
  document.removeEventListener('mousedown',asgDdOut);document.removeEventListener('scroll',asgDdScrl,true);
}
function asgDdOut(e){if(ASG_DD&&!ASG_DD.contains(e.target)&&!(e.target.closest&&e.target.closest('#asg-box')))asgDdClose();}
function asgDdScrl(){asgDdClose();}
function asgDdSearch(q){
  const list=$('#asg-dd-list');if(!list)return;
  q=(q||'').trim();
  const hits=EMP.filter(e=>!q||e.name.includes(q)||e.role.includes(q)||e.dept.includes(q));
  S._asgHits=hits;
  if(!hits.length||S._asgHl>=hits.length)S._asgHl=0;
  list.innerHTML=hits.map((e,i)=>`<button type="button" class="asg-opt${ASG_NEW.includes(e.id)?' sel':''}${i===S._asgHl?' hl':''}" role="option" aria-selected="${ASG_NEW.includes(e.id)}" onclick="asgToggle('${e.id}')" onmousemove="asgHl(${i})">${av(e.name,'sm')}<span class="who"><b>${e.name}</b><span>${e.role} · ${e.dept}</span></span><span class="asg-bx">${ic('check',12)}</span></button>`).join('')||'<div class="asg-dd-empty">همکاری با این نام یافت نشد</div>';
  const cnt=$('#asg-dd-cnt');if(cnt)cnt.textContent=fa(ASG_NEW.length)+' نفر انتخاب شده';
  const hl=list.querySelector('.asg-opt.hl');if(hl)hl.scrollIntoView({block:'nearest'});
}
function asgHl(i){if(S._asgHl===i)return;S._asgHl=i;const list=$('#asg-dd-list');if(!list)return;const opts=list.querySelectorAll('.asg-opt');opts.forEach((x,xi)=>x.classList.toggle('hl',xi===i));}
function asgDdKeys(e){
  const hits=S._asgHits||[];
  if(e.key==='Escape'){e.stopPropagation();asgDdClose();}
  else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();e.stopPropagation();if(!hits.length)return;S._asgHl=(S._asgHl+(e.key==='ArrowDown'?1:-1)+hits.length)%hits.length;asgDdSearch($('#asg-q').value);}
  else if(e.key==='Enter'){e.preventDefault();e.stopPropagation();if(hits[S._asgHl])asgToggle(hits[S._asgHl].id);}
}
function asgToggle(id){const i=ASG_NEW.indexOf(id);i>-1?ASG_NEW.splice(i,1):ASG_NEW.push(id);if(ASG_DD)asgDdSearch($('#asg-q')?$('#asg-q').value:'');tfAsgChips();}
function asgRemove(id){ASG_NEW=ASG_NEW.filter(x=>x!==id);if(ASG_DD)asgDdSearch($('#asg-q')?$('#asg-q').value:'');tfAsgChips();}
function asgClear(){ASG_NEW=[];if(ASG_DD)asgDdSearch('');tfAsgChips();}
/* ---------- save (create + edit) ---------- */
function taskSave(){
  const f=S._tf||{};
  const title=($('#tk-t').value||'').trim();
  if(!title){const el=$('#tk-t');el.classList.add('err');el.focus();return;}
  const asg=ASG_NEW.length?ASG_NEW.slice():['e1'];
  const st=$('#tk-st').value;
  const data={title,desc:$('#tk-d').value,project:$('#tk-p').value||null,status:st,prio:$('#tk-pr').value,
    assignee:asg[0],assignees:asg,
    start:($('#tk-start').dataset&&$('#tk-start').dataset.val)||null,
    due:($('#tk-due').dataset&&$('#tk-due').dataset.val)||'',
    est:+enDigits($('#tk-est').value)||4,
    tags:$('#tk-tags').value?$('#tk-tags').value.split(/[،,]/).map(x=>x.trim()).filter(Boolean):[],
    labels:f.labels.slice(),
    checklist:f.ck.filter(c=>(c.title||'').trim()).map((c,i)=>({id:c.id||uid('ck'),taskId:f.id||'',title:c.title.trim(),completed:!!c.completed,order:i,createdAt:c.createdAt||Date.now(),updatedAt:Date.now()}))};
  asgDdClose();closeDrawer();
  if(f.id){
    const t=task(f.id);if(!t)return;
    Object.assign(t,data);
    t.checklist=data.checklist.map(c=>(c.taskId=t.id,c));
    S._tf=null;render();
    toast('ok','تسک به‌روزرسانی شد','تغییرات «'+title+'» ذخیره شد.');
    return;
  }
  const id=uid('t');
  TASKS.unshift(Object.assign({id,cm:0,att:0},data,{checklist:data.checklist.map(c=>(c.taskId=id,c))}));
  S._tf=null;render();
  toast('ok','تسک ایجاد شد','«'+title+'» به '+ST_COLS.find(c=>c.id===st).t+' افزوده شد');
}
function projInfo(id){const p=prj(id);
  openDrawer({title:p.name,sub:'پروژه — '+cust(p.cust).name,icon:'briefcase',body:`
   <div class="row g8 wrap mb16">${stBadge(p.status)}<span class="chip">${ic('cal',12)} سررسید ${dFaL(p.due)}</span><span class="chip">${ic('users',12)} ${emp(p.lead).name}</span></div>
   <div class="grid grid-2" style="gap:12px">
    <div class="panel" style="padding:12px"><span class="t-lbl">بودجه</span><div class="t-h3 mt4 num">${faMoney(p.budget)}</div></div>
    <div class="panel" style="padding:12px"><span class="t-lbl">بilled شده</span><div class="t-h3 mt4 num">${faMoney(Math.round(p.budget*p.progress/100))}</div></div>
   </div>
   <h4 class="t-h4 mt16 mb8">پیشرفت (${fa(p.progress)}٪)</h4><div class="prog"><i style="width:${p.progress}%"></i></div>
   <h4 class="t-h4 mt16 mb8">تسک‌های مرتبط</h4>
   ${TASKS.filter(t=>t.project===id).slice(0,6).map(t=>`<div class="appr" style="cursor:pointer" onclick="closeDrawer();taskDrawer('${t.id}')">
     <div class="bd grow"><b>${esc(t.title)}</b><span>${emp(t.assignee).name}</span></div>${prioBadge(t.prio)}</div>`).join('')||'<div class="empty-mini">تسکی ثبت نشده</div>'}`,
  footer:`<button class="btn btn-pr" onclick="closeDrawer();taskModal(null)">تسک جدید در پروژه</button><button class="btn btn-ghost" onclick="closeDrawer()">بستن</button>`});}
/* ---------- workspaces ---------- */
function wsView(){
  const ws=WS.find(w=>w.id===S.ws)||WS[0];
  const wtasks=TASKS.filter(t=>{const p=PRJ.find(x=>x.id===t.project);return p&&p.ws===ws.id;});
  const wprojs=PRJ.filter(p=>p.ws===ws.id);
  const tab=S.tabs.ws||'overview';
  return `<div class="pg">${pgHead('فضاهای کاری','سازمان‌دهی تیم‌ها، پروژه‌ها و تسک‌ها در بسترهای مستقل',
    `<button class="btn btn-pr" onclick="wsCreateModal()">${ic('plus',15)} فضای کاری جدید</button>`,[{t:'داشبورد'},{t:'فضاهای کاری'}])}
  <div class="grid grid-3 mb16">${WS.map(w=>`
    <div class="card hoverable ${w.id===S.ws?'':''}" style="padding:16px;cursor:pointer;${w.id===S.ws?'border-color:var(--pr2);box-shadow:0 0 0 1px var(--pr2)':''}" onclick="S.ws='${w.id}';render()">
      <div class="row g10"><span class="ws-tile" style="background:${w.color}">${initials(w.name)}</span>
        <div class="grow"><b class="t-h4">${w.name}</b><p class="t-cap">${w.desc}</p></div>
        ${w.id===S.ws?'<span class="badge bd-pr">فعال</span>':''}</div>
      <div class="row g12 mt12 t-cap">${avStack(w.members.map(m=>emp(m).name))}<span>${fa(w.members.length)} عضو</span><span class="sep">·</span><span>${fa(w.projects.length)} پروژه</span><span class="sep">·</span><span>${fa(w.act)} فعالیت این هفته</span></div>
    </div>`).join('')}</div>
  <div class="card">
    <div class="card-h"><span class="ws-tile" style="background:${ws.color}">${initials(ws.name)}</span>
      <span class="t-h3 grow">${ws.name}</span>
      <button class="btn btn-sm btn-sec" onclick="toast('info','دعوت عضو','لینک دعوت کپی شد — effectstudio.ir/erp/inv/${ws.id}')">${ic('users',13)} دعوت عضو</button>
      <button class="btn btn-sm btn-ghost" onclick="wsCreateModal()">ویرایش</button></div>
    ${tabsBar('ws',[{v:'overview',t:'نمای کلی'},{v:'projects',t:'پروژه‌ها',cnt:wprojs.length},{v:'members',t:'اعضا',cnt:ws.members.length},{v:'tasks',t:'تسک‌ها',cnt:wtasks.length},{v:'acts',t:'فعالیت‌ها'}],tab,'wsTab')}
    <div class="sub-tab-body">
    ${tab==='overview'?`<div class="grid grid-4">
       <div class="kpi"><div class="k-l">${ic('briefcase',14)}پروژه‌ها</div><div class="k-v num">${fa(wprojs.length)}</div><div class="k-d">${fa(wprojs.filter(p=>p.status==='فعال').length)} فعال</div></div>
       <div class="kpi"><div class="k-l">${ic('tasks',14)}تسک‌های باز</div><div class="k-v num">${fa(wtasks.filter(t=>t.status!=='done').length)}</div><div class="k-d dn">${fa(wtasks.filter(t=>t.due&&dueCls(t.due)==='over').length)} عقب‌افتاده</div></div>
       <div class="kpi"><div class="k-l">${ic('users',14)}اعضا</div><div class="k-v num">${fa(ws.members.length)}</div><div class="k-d">میانگین بار ۷۴٪</div></div>
       <div class="kpi"><div class="k-l">${ic('activity',14)}فعالیت هفته</div><div class="k-v num">${fa(ws.act)}</div><div class="k-d up">+۱۲٪</div></div></div>`
    :tab==='projects'?tblInit('wsp',[{k:'name',l:'پروژه',mobFull:true,r:p=>`<b>${p.name}</b><div class="sub">${cust(p.cust).name}</div>`},
       {k:'lead',l:'مدیر',r:p=>`<span class="row g6">${av(emp(p.lead).name,'xs')}<span class="t2c">${emp(p.lead).name}</span></span>`},
       {k:'status',l:'وضعیت',r:x=>stBadge(x.status)},{k:'progress',l:'پیشرفت',r:p=>`<div class="row g8"><div class="prog" style="width:70px"><i style="width:${p.progress}%"></i></div><span class="num ts">${fa(p.progress)}٪</span></div>`,sv:p=>p.progress},
       {k:'due',l:'سررسید',r:p=>dFa(p.due),hideMob:true}],wprojs,{onRow:'projDrawer',per:6})
    :tab==='members'?`<div class="grid grid-3">${ws.members.map(m=>{const e=emp(m);return `
       <div class="panel" style="padding:16px"><div class="row g10">${av(e.name,'lg')}<div class="grow"><b class="t-h4">${e.name}</b><p class="t-cap">${e.role} · ${e.dept}</p></div></div>
       <div class="loadbar mt8"><span class="nm">بار کاری</span><div class="prog ${e.load>85?'warn':''}"><i style="width:${e.load}%"></i></div><span class="pc">${fa(e.load)}٪</span></div></div>`;}).join('')}</div>`
    :tab==='tasks'?tblInit('wst',[{k:'title',l:'تسک',mobFull:true,r:t=>`<b>${esc(t.title)}</b>`},{k:'assignee',l:'مسئولین',r:t=>`<span class="row g6">${avStack(t.assignees.map(a=>emp(a).name),3)}<span class="t2c ellip">${t.assignees.map(a=>emp(a).name.split(' ')[0]).join('، ')}</span></span>`},
       {k:'status',l:'وضعیت',r:t=>`<span class="badge bd-mut">${ST_COLS.find(c=>c.id===t.status).t}</span>`},{k:'due',l:'سررسید',r:dueBadge}],wtasks,{onRow:'taskDrawer',per:7})
    :ACTIVITY.slice(0,6).map(a=>`<div class="act-row"><span class="act-ic pr">${ic('activity',14)}</span><div class="grow"><p class="t-bs"><b>${emp(a.who).name}</b> — ${a.act} · <span class="t2c">${a.det}</span></p><time class="t-cap">${relTime(a.min)}</time></div></div>`).join('')}
    </div></div></div>`;
}
function wsTab(v){S.tabs.ws=v;render();}
function projDrawer(id){projInfo(id);}
VIEWS['mytasks']={title:'کارهای من',vw:myTasksView};
VIEWS['tasks']={title:'مدیریت تسک‌ها',vw:tasksBoardView};
VIEWS['workspaces']={title:'فضاهای کاری',vw:wsView};
