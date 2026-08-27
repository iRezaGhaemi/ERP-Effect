/* ============================================================
   EFFECT ERP · پیام‌رسان داخلی (v2.5)
   گفتگو مستقیم + گروهی + منشن + ارجاع موجودیت + فایل
   ============================================================ */
const ONLINE={e1:'on',e2:'on',e3:'busy',e4:'on',e5:'off',e6:'busy',e7:'on',e8:'on',e9:'off',e10:'on',e11:'off',e12:'off',e13:'off'};
const ST_FA={on:'آنلاین',busy:'مشغول',off:'غیرفعال'};
let CHATS=[
 {id:'ch1',type:'dm',with:'e2',unread:2,msgs:[
   {id:'m1',from:'e2',t:'۱۴:۲۰',text:'سلام رضا، فایل‌های برند تاج محل رو نهایی کردم؛ لطفاً قبل از جلسه بعدی چک کن.'},
   {id:'m2',from:'e2',t:'۱۴:۲۲',att:{kind:'image',name:'taj-brand-cover.jpg',size:'۲.۴ MB'}},
   {id:'m3',from:'e1',t:'۱۴:۲۵',text:'عالیه سارا جان. @نگار محمدی لطفاً نسخه وکتور رو هم داخل کتابخانه دارایی‌ها بگذار.'},
   {id:'m4',from:'e2',t:'۱۴:۲۸',text:'حتماً. یادت باشه جلسه امروز ساعت ۱۶ هست.',ref:{k:'meet',id:'mt2'}}]},
 {id:'ch2',type:'dm',with:'e3',unread:0,msgs:[
   {id:'m5',from:'e3',t:'۱۳:۴۵',text:'فایل طراحی رو دیدی؟ داشبورد رو با پالت جدید #6F6AEB می‌سازم.',ref:{k:'task',id:'t4'}},
   {id:'m6',from:'e1',t:'۱۳:۵۲',text:'آره خوب پیش می‌ره؛ فونت‌ها هم IRANSansX شد؟'},
   {id:'m7',from:'e3',t:'۱۴:۰۱',att:{kind:'file',name:'erp-dashboard-v3.fig',size:'۱۸.۲ MB'}}]},
 {id:'ch3',type:'grp',name:'تیم تولید محتوا',members:['e1','e2','e4','e8','e11'],admin:'e2',unread:1,msgs:[
   {id:'m8',from:'e2',t:'۱۱:۱۰',text:'برنامه این هفته: دو ریلز برای تاج محل و یک کاروسل آموزشی برای روژان.'},
   {id:'m9',from:'e4',t:'۱۱:۱۴',text:'سناریوی ریلز اول آماده شد.',ref:{k:'task',id:'t2'}},
   {id:'m10',from:'e8',t:'۱۱:۲۰',text:'من فیلمبرداری رو فردا شروع می‌کنم. @بهرام کاویانی تدوین تا چهارشنبه آماده می‌شه؟'},
   {id:'m11',from:'e11',t:'۱۱:۲۶',text:'چشم، تقویم تدوین رو تنظیم کردم.'}]},
 {id:'ch4',type:'dm',with:'e10',unread:0,msgs:[
   {id:'m12',from:'e10',t:'دیروز',text:'فاکتور شماره INV-1042 برای تاج محل صادر شد؛ کپی برات فرستادم.',ref:{k:'inv',id:'INV-1042'}},
   {id:'m13',from:'e1',t:'دیروز',text:'مرسی الهام؛ پرداختش رو پیگیری کن لطفاً.'}]},
 {id:'ch5',type:'grp',name:'مدیریت استودیو',members:['e1','e2','e6','e10'],admin:'e1',unread:0,msgs:[
   {id:'m14',from:'e6',t:'۱۰:۰۵',text:'گزارش مالی مرداد آپلود شد. درآمد ۱۸٪ رشد داشت.',ref:{k:'cust',id:'c1'}},
   {id:'m15',from:'e1',t:'۱۰:۱۲',text:'عالی. برای پاییز بودجه کمپین جدید رو بررسی کنیم.'}]},
];
let MSG_F={tab:'all',q:''};
const chatById=id=>CHATS.find(c=>c.id===id);
const chatTitle=c=>c.type==='dm'?emp(c.with).name:c.name;
const chatAvs=c=>c.type==='dm'?[emp(c.with).name]:c.members.filter(m=>m!=='e1').map(m=>emp(m).name);
const chatAvatar=c=>c.type==='dm'?av(emp(c.with).name,'md','avwrap st-'+(ONLINE[c.with]||'off'))
  :`<span class="av md grp-av">${ic('users',16)}</span>`;
const lastMsg=c=>c.msgs[c.msgs.length-1];
const msgPreview=m=>m?((m.att?(m.att.kind==='image'?'[تصویر] ':'[فایل] '):'')+(m.ref?'[ارجاع] ':'')+(m.text||(m.att?m.att.name:''))).slice(0,42):'';
const totalUnread=()=>CHATS.reduce((a,c)=>a+(c.unread||0),0);

/* ---------------- view ---------------- */
function msgView(){
  const q=MSG_F.q.trim();
  let list=CHATS.filter(c=>{
    if(MSG_F.tab==='unread'&&!c.unread)return false;
    if(MSG_F.tab==='grp'&&c.type!=='grp')return false;
    if(q&&!chatTitle(c).includes(q)&&!c.msgs.some(m=>(m.text||'').includes(q)))return false;
    return true;});
  list=[...list].sort((a,b)=>(b.unread?1:0)-(a.unread?1:0));
  const cur=S.msgChat?chatById(S.msgChat):null;
  return `<div class="pg pg-msg">${pgHead('پیام‌رسان','ارتباط داخلی تیم استودیو اثر — گفتگو، اشتراک تسک و فایل',
   `<button class="btn btn-sec" onclick="grpModal()">${ic('users',14)} ایجاد گروه</button>
    <button class="btn btn-pr" onclick="dmModal()">${ic('plus',14)} پیام جدید</button>`,[{t:'داشبورد'},{t:'پیام‌رسان'}])}
  <div class="msg-wrap ${S.msgOpen&&cur?'chat-open':''}">
   <aside class="msg-list" aria-label="فهرست گفتگوها">
    <div class="inp-ic mb8" style="width:100%"><input class="inp" style="height:36px;padding-left:32px" placeholder="جستجو در پیام‌ها…" value="${MSG_F.q}" oninput="MSG_F.q=this.value;debRender()">${ic('search',13)}</div>
    <div class="row g4 mb8">
     ${[['all','همه'],['unread','خوانده نشده'],['grp','گروه‌ها']].map(([v,t])=>`<button class="chip ${MSG_F.tab===v?'chip-sel on':''}" onclick="MSG_F.tab='${v}';render()">${t}${v==='unread'&&totalUnread()?` (${fa(totalUnread())})`:''}</button>`).join('')}
    </div>
    <div class="msg-list-scroll">
    ${list.map(c=>{const lm=lastMsg(c);return `
     <button class="msg-item ${cur&&cur.id===c.id?'on':''}" onclick="msgOpen('${c.id}')">
      ${c.type==='dm'?av(emp(c.with).name,'md','avwrap st-'+(ONLINE[c.with]||'off')):`<span class="av md grp-av">${initials(c.name)}</span>`}
      <span class="who"><span class="nm-row"><b class="ellip">${chatTitle(c)}</b><time>${lm?lm.t:''}</time></span>
       <span class="pv-row"><span class="pv ellip">${lm?(lm.from==='e1'?'شما: ':'')+msgPreview(lm):''}</span>${c.unread?`<span class="unread-cnt">${fa(c.unread)}</span>`:''}</span></span>
     </button>`}).join('')||'<div class="empty-mini">گفتگویی یافت نشد</div>'}
    </div></aside>
   <section class="msg-chat" aria-label="گفتگو">
    ${cur?msgChatHtml(cur):`<div class="msg-empty">${ic('msg',36)}<b class="t-h4">گفتگویی انتخاب نشده است</b><span class="t-cap">یک گفتگو را از فهرست باز کنید یا پیام جدیدی بسازید.</span></div>`}
   </section>
  </div></div>`;
}
function msgChatHtml(c){
  const other=c.type==='dm'?emp(c.with):null;
  const q=(S._msgFind||'').trim();
  const msgs=q?c.msgs.filter(m=>(m.text||'').includes(q)):c.msgs;
  return `
   <header class="msg-hd">
    <button class="ibtn msg-back" onclick="S.msgOpen=false;render()" aria-label="بازگشت">${ic('arrowright',16)}</button>
    ${other?av(other.name,'lg','avwrap st-'+(ONLINE[other.id]||'off')):`<span class="av lg grp-av">${initials(c.name)}</span>`}
    <div class="grow min0"><b class="t-h4 ellip" style="display:block">${chatTitle(c)}</b>
     <span class="t-cap">${other?ST_FA[ONLINE[other.id]||'off']+' · '+other.role+' · '+otherdept(other):fa(c.members.length)+' عضو · '+emp(c.admin).name+' مدیر گروه'}</span></div>
    <button class="ibtn" data-tip="جستجو در گفتگو" onclick="msgFindToggle()">${ic('search',15)}</button>
    <button class="ibtn" data-tip="جزئیات" onclick="msgInfo('${c.id}')">${ic('info',15)}</button>
    <button class="ibtn" data-tip="گزینه‌های بیشتر" onclick="msgMore(event,'${c.id}')">${ic('more',15)}</button>
   </header>
   ${S._msgFind!=null?`<div class="msg-find inp-ic" style="width:auto"><input class="inp" style="height:32px" placeholder="جستجو در این گفتگو…" value="${S._msgFind||''}" oninput="S._msgFind=this.value;debRender()">${ic('search',12)}${msgs.length?`<span class="t-cap">${fa(msgs.length)} نتیجه</span>`:'<span class="t-cap">بدون نتیجه</span>'}</div>`:''}
   <div class="msg-scroll" id="msg-scroll">
    ${msgs.map(m=>msgBubble(c,m)).join('')||'<div class="empty-mini">پیامی مطابق جستجو نیست</div>'}
   </div>
   ${msgComposer(c)}`;
}
const otherdept=e=>e.dept;
function msgBubble(c,m){
  const mine=m.from==='e1';
  const u=emp(m.from);
  return `<div class="msg-b ${mine?'out':'in'}">
   ${mine?'':av(u.name,'sm')}
   <div class="bubble">
    ${!mine?`<b class="who">${u.name}</b>`:''}
    ${m.text?`<p class="txt">${msgMentions(m.text)}</p>`:''}
    ${m.ref?refCard(m.ref):''}
    ${m.att?attHtml(m.att):''}
    <time>${m.t}</time>
   </div></div>`;
}
function msgMentions(text){
  let out=esc(text);
  EMP.forEach(e=>{if(e.id!=='e1')
    out=out.replaceAll('@'+e.name,`<span class="mention" onclick="go('#/team/${e.id}')">@${e.name}</span>`);});
  return out;
}
/* ---------------- ارجاع موجودیت‌ها ---------------- */
const REF_KINDS={task:'تسک',prj:'پروژه',cust:'مشتری',lead:'سرنخ',inv:'فاکتور',meet:'جلسه'};
function refData(r){
  if(r.k==='task'){const t=task(r.id)||TASKS.find(x=>x.id===r.id);if(!t)return null;
    return {t:t.title,s1:'پروژه: '+prj(t.project).name,s2:'مسئول: '+t.assignees.map(a=>emp(a).name).join('، '),s3:ST_COLS.find(c=>c.id===t.status).t,ic:'mytask',fn:`taskDrawer('${t.id}')`};}
  if(r.k==='prj'){const p=prj(r.id);return {t:p.name,s1:'مشتری: '+cust(p.cust).name,s2:'مدیر: '+emp(p.lead).name,s3:p.status,ic:'briefcase',fn:`projInfo('${p.id}')`};}
  if(r.k==='cust'){const c=cust(r.id);return {t:c.name,s1:c.ind,s2:c.city,s3:c.status,ic:'building',fn:`go('#/customers/${c.id}')`};}
  if(r.k==='lead'){const l=LEADS.find(x=>x.id===r.id)||LEADS[0];return {t:l.name||l.co||'سرنخ',s1:l.co||'—',s2:faMoney(l.value||0),s3:l.stage,ic:'target',fn:`leadDrawer('${l.id}')`};}
  if(r.k==='inv'){const i=INV.find(x=>x.id===r.id)||INV[0];return {t:i.id,s1:cust(i.cust).name,s2:faMoney(i.total||i.amt||0),s3:i.status,ic:'filetext',fn:`invPreview('${i.id}')`};}
  if(r.k==='meet'){const m=MEETS.find(x=>x.id===r.id)||MEETS[0];return {t:m.t,s1:dFaL(m.date)+' ساعت '+fa(m.from),s2:m.who.map(w=>emp(w).name).join('، '),s3:'جلسه',ic:'cal',fn:`meetInfo('${m.id}')`};}
  return null;
}
function refCard(r){
  const d=refData(r);if(!d)return'';
  return `<div class="msg-ref" onclick="${d.fn}">
   <span class="k"><span class="badge bd-pr">${REF_KINDS[r.k]}</span>${ic(d.ic,14)}</span>
   <span class="t"><b class="ellip">${esc(d.t)}</b><span class="ellip">${d.s1} · ${d.s2}</span></span>
   <span class="st">${d.s3}</span></div>`;
}
function attHtml(a){
  if(a.kind==='image')return `<div class="msg-att img" onclick="toast('info','پیش‌نمایش تصویر','${a.name}')"><span class="thumb">${ic('image',18)}</span><span class="meta"><b>${a.name}</b><span>${a.size}</span></span><button class="ibtn" data-tip="دانلود" onclick="event.stopPropagation();toast('ok','دانلود شروع شد','${a.name}')">${ic('download',13)}</button></div>`;
  const icn=a.name.match(/\.(mp4|mov)$/i)?'film':a.name.match(/\.pdf$/i)?'book':a.name.match(/\.(fig|psd|ai)$/i)?'palette':'file';
  return `<div class="msg-att"><span class="thumb">${ic(icn,18)}</span><span class="meta"><b>${a.name}</b><span>${a.size}</span></span><button class="ibtn" data-tip="دانلود" onclick="event.stopPropagation();toast('ok','دانلود شروع شد','${a.name}')">${ic('download',13)}</button></div>`;
}
/* ---------------- کامپوزر + منشن + ارجاع ---------------- */
function msgComposer(c){
  S._msgMents=S._msgMents||[];S._msgRefs=S._msgRefs||[];
  return `<footer class="msg-comp">
   ${S._msgRefs.length?`<div class="row g6 mb8 wrap">${S._msgRefs.map((r,i)=>`<span class="chip chip-sel on">${ic('link',11)} ${REF_KINDS[r.k]}: ${(refData(r)||{}).t||''}<button class="ibtn" style="width:20px;height:20px" onclick="S._msgRefs.splice(${i},1);render()">${ic('x',10)}</button></span>`).join('')}</div>`:''}
   ${S._msgMents.length?`<div class="row g6 mb8 wrap">${S._msgMents.map((id,i)=>`<span class="chip chip-sel on">${ic('user',11)} ${emp(id).name}<button class="ibtn" style="width:20px;height:20px" onclick="S._msgMents.splice(${i},1);render()">${ic('x',10)}</button></span>`).join('')}</div>`:''}
   <div class="row g8" style="align-items:flex-end">
    <button class="ibtn" data-tip="پیوست فایل" onclick="msgAttachMenu(event)">${ic('paperclip',16)}</button>
    <button class="ibtn" data-tip="منشن همکار (@)" onclick="mentionPicker()">${ic('userplus',16)}</button>
    <button class="ibtn" data-tip="ارجاع آیتم (#)" onclick="refPicker()">${ic('link',16)}</button>
    <div class="grow" style="position:relative">
     <textarea class="inp msg-ta" id="msg-in" rows="1" placeholder="پیامتان را بنویسید…" oninput="msgTaInput(this)" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();msgSend('${c.id}')}">${esc(S._msgDraft||'')}</textarea>
     <div class="mention-pop" id="mention-pop"></div>
    </div>
    <button class="btn btn-pr" style="height:38px" onclick="msgSend('${c.id}')" aria-label="ارسال">${ic('send',15)}</button>
   </div>
   <span class="t-cap mt4" style="display:block">Enter ارسال · Shift+Enter خط جدید · @ منشن همکار · # ارجاع به تسک/پروژه/مشتری/فاکتور</span>
  </footer>`;
}
function msgTaInput(el){
  S._msgDraft=el.value;
  el.style.height='auto';el.style.height=Math.min(el.scrollHeight,120)+'px';
  const pop=$('#mention-pop');if(!pop)return;
  const m=el.value.match(/@([^\s@]*)$/);
  if(!m){pop.classList.remove('open');pop.innerHTML='';return;}
  const q=m[1];
  const hits=EMP.filter(e=>e.id!=='e1'&&(!q||e.name.includes(q))).slice(0,5);
  if(!hits.length){pop.classList.remove('open');return;}
  pop.innerHTML=hits.map(e=>`<button type="button" onclick="mentionInsert('${e.id}')">${av(e.name,'sm')}<span class="grow min0" style="text-align:right"><b>${e.name}</b><span class="t-cap">${e.role} · ${e.dept}</span></span></button>`).join('');
  pop.classList.add('open');
}
function mentionInsert(id){
  const ta=$('#msg-in');if(!ta)return;
  S._msgDraft=ta.value.replace(/@[^\s@]*$/,'@'+emp(id).name+' ');
  S._msgMents.push(id);
  $('#mention-pop').classList.remove('open');
  render();
  const t2=$('#msg-in');if(t2){t2.focus();t2.selectionStart=t2.selectionEnd=t2.value.length;}
}
function mentionPicker(){
  openModal({title:'منشن همکار (@)',body:`
   <div class="ap-list" style="max-height:280px">${EMP.filter(e=>e.id!=='e1').map(e=>`
    <button type="button" class="ap-item" onclick="S._msgMents.push('${e.id}');closeModal();render();const t=document.getElementById('msg-in');if(t)t.focus();">
     ${av(e.name,'md','avwrap st-'+(ONLINE[e.id]||'off'))}
     <span class="who"><b>${e.name}</b><span>${e.role} · ${e.dept}</span></span><span class="t-cap">${ST_FA[ONLINE[e.id]||'off']}</span></button>`).join('')}</div>`,
  footer:`<button class="btn btn-ghost" onclick="closeModal()">بستن</button>`});
}
function refPicker(){
  const items=k=>{
    if(k==='task')return TASKS.map(t=>({k,id:t.id,t:t.title,s:prj(t.project).name}));
    if(k==='prj')return PRJ.map(p=>({k,id:p.id,t:p.name,s:cust(p.cust).name}));
    if(k==='cust')return CUST.map(c=>({k,id:c.id,t:c.name,s:c.ind}));
    if(k==='lead')return LEADS.slice(0,8).map(l=>({k,id:l.id,t:l.co||l.name||'سرنخ',s:l.stage}));
    if(k==='inv')return INV.slice(0,8).map(i=>({k,id:i.id,t:i.id,s:cust(i.cust).name}));
    return MEETS.slice(0,6).map(m=>({k,id:m.id,t:m.t,s:dFaM(m.date)}));
  };
  S._refTab=S._refTab||'task';
  openModal({title:'ارجاع به آیتم Effect ERP',body:`
   <div class="row g6 wrap mb12">${Object.entries(REF_KINDS).map(([k,t])=>`<button class="chip ${S._refTab===k?'chip-sel on':''}" onclick="S._refTab='${k}';closeModal();refPicker()">${t}</button>`).join('')}</div>
   <div class="ap-list" style="max-height:280px">${items(S._refTab).map(x=>`
    <button type="button" class="ap-item" onclick="refInsert('${x.k}','${x.id}')">
     <span class="asset-ic" style="width:34px;height:34px;background:var(--pr-soft);color:var(--pr)">${ic(x.k==='task'?'mytask':x.k==='prj'?'briefcase':x.k==='cust'?'building':x.k==='lead'?'target':x.k==='inv'?'filetext':'cal',15)}</span>
     <span class="who"><b>${esc(x.t)}</b><span>${esc(x.s||'')}</span></span><span class="rad-bx"></span></button>`).join('')}</div>`,
  footer:`<button class="btn btn-ghost" onclick="closeModal()">بستن</button>`});
}
function refInsert(k,id){S._msgRefs.push({k,id});closeModal();render();const ta=$('#msg-in');if(ta)ta.focus();}
function msgAttachMenu(e){
  menu(e.currentTarget,[
    {t:'تصویر',ic:'image',fn:"msgAttach('image')"},
    {t:'فایل (PDF/سند/ویدیو/طراحی)',ic:'paperclip',fn:"msgAttach('file')"}]);
}
function msgAttach(kind){
  const cur=chatById(S.msgChat);if(!cur)return;
  cur.msgs.push({id:uid('m'),from:'e1',t:'الان',
    att:kind==='image'?{kind:'image',name:'design-preview-'+fa(cur.msgs.length)+'.jpg',size:'۱.۸ MB'}:{kind:'file',name:'brief-'+fa(cur.msgs.length)+'.pdf',size:'۶۴۰ KB'}});
  render();msgScroll();
}
/* ---------------- ارسال + پاسخ نمونه ---------------- */
function msgSend(cid){
  const c=chatById(cid);const ta=$('#msg-in');if(!c||!ta)return;
  const text=ta.value.trim();
  if(!text&&!S._msgRefs.length&&!S._msgMents.length)return;
  S._msgDraft='';
  c.msgs.push({id:uid('m'),from:'e1',t:'الان',text:text||null,ref:S._msgRefs[0]||null});
  ta.value='';ta.style.height='auto';
  S._msgRefs=[];S._msgMents=[];
  render();msgScroll();
  const other=c.type==='dm'?c.with:'e2';
  setTimeout(()=>{
    c.msgs.push({id:uid('m'),from:other,t:'الان',text:['چشم، بررسی می‌کنم.','باشه، ممنون از اطلاع‌رسانی.','تا آخر روز امروز نتیجه رو اعلام می‌کنم.'][Math.floor(Math.random()*3)]});
    if(S.msgChat===c.id){render();msgScroll();}
    else{c.unread=(c.unread||0)+1;}
    NOTIFS.unshift({t:'پیام جدید از '+emp(other).name,d:'پیام‌رسان · '+chatTitle(c),ic:'msg',min:0,unread:true});
    render();
    toast('info','پیام جدید',emp(other).name+' به «'+chatTitle(c)+'» پاسخ داد.');
  },1600);
}
function msgScroll(){const el=$('#msg-scroll');if(el)el.scrollTop=el.scrollHeight;}
function msgOpen(id){S.msgChat=id;S.msgOpen=true;S._msgFind=null;const c=chatById(id);if(c)c.unread=0;render();msgScroll();}
function msgFindToggle(){S._msgFind=S._msgFind==null?'':null;render();if(S._msgFind!=null){const el=document.querySelector('.msg-find input');if(el)el.focus();}}
function msgInfo(id){
  const c=chatById(id);
  const rows=c.type==='dm'
   ?[['نوع گفتگو','پیام مستقیم'],['همکار',emp(c.with).name],['سمت',emp(c.with).role],['دپارتمان',emp(c.with).dept],['وضعیت',ST_FA[ONLINE[c.with]||'off']],['تعداد پیام',fa(c.msgs.length)]]
   :[['نوع گفتگو','گروهی'],['نام گروه',c.name],['اعضا',fa(c.members.length)+' نفر'],['مدیر گروه',emp(c.admin).name],['تعداد پیام',fa(c.msgs.length)]];
  openDrawer({title:chatTitle(c),sub:c.type==='dm'?'گفتگو مستقیم':'گفتگو گروهی',icon:'msg',body:`
   <div class="row g12 mb16">${c.type==='dm'?av(emp(c.with).name,'xl'):`<span class="av xl grp-av">${initials(c.name)}</span>`}
    <div class="grow min0"><b class="t-h4" style="display:block">${chatTitle(c)}</b><span class="t-cap">${c.type==='dm'?emp(c.with).role:fa(c.members.length)+' عضو'}</span></div></div>
   ${rows.map(([k,v])=>`<div class="bank-row"><span class="t-lbl">${k}</span><span class="t-bs grow min0">${v}</span></div>`).join('')}
   ${c.type==='grp'?`<h4 class="t-h4 mt16 mb8">اعضا</h4>${c.members.map(m=>`
     <div class="appr" style="cursor:pointer" onclick="go('#/team/${m}')">${av(emp(m).name,'sm')}<div class="bd grow"><b>${emp(m).name}</b><span>${emp(m).role}${m===c.admin?' — مدیر گروه':''}</span></div>${m==='e1'?'':`<button class="ibtn ibtn-err" data-tip="حذف از گروه" onclick="event.stopPropagation();grpRemoveMember('${c.id}','${m}')">${ic('x',13)}</button>`}</div>`).join('')}
     <button class="btn btn-sec btn-sm mt8" onclick="closeDrawer();grpAddMember('${c.id}')">${ic('userplus',13)} افزودن عضو</button>`:''}`,
  footer:`<button class="btn btn-sec" onclick="closeDrawer();go('#/team/${c.type==='dm'?c.with:'e2'}')">${ic('user',14)} پروفایل</button>
   <button class="btn btn-ghost mr-auto" onclick="closeDrawer()">بستن</button>`});
}
function msgMore(e,id){
  const c=chatById(id);
  const items=[{t:'جزئیات گفتگو',ic:'info',fn:`msgInfo('${id}')`}];
  if(c.type==='grp'){
    items.push({t:'تغییر نام گروه',ic:'edit',fn:`grpRename('${id}'`});
    items.push({t:'افزودن عضو',ic:'userplus',fn:`grpAddMember('${id}')`});
    items.push({t:'خروج از گروه',ic:'logout',fn:`grpLeave('${id}')`});
  }else items.push({t:'پروفایل همکار',ic:'user',fn:`go('#/team/${c.with}')`});
  menu(e.currentTarget,items);
}
/* ---------------- پیام جدید / گروه ---------------- */
function dmModal(){
  openModal({title:'پیام جدید',body:`
   <div class="inp-ic mb8" style="width:100%"><input class="inp" style="height:36px;padding-left:32px" id="dm-q" placeholder="جستجوی همکار…" oninput="dmFilter(this.value)">${ic('search',13)}</div>
   <div class="ap-list" id="dm-list" style="max-height:300px">${EMP.filter(e=>e.id!=='e1').map(e=>`
    <button type="button" class="ap-item" data-emp="${e.id}" onclick="dmStart('${e.id}')">
     ${av(e.name,'md','avwrap st-'+(ONLINE[e.id]||'off'))}
     <span class="who"><b>${e.name}</b><span>${e.role} · ${e.dept}</span></span>
     <span class="t-cap">${ST_FA[ONLINE[e.id]||'off']}</span></button>`).join('')}</div>`,
  footer:`<button class="btn btn-ghost" onclick="closeModal()">انصراف</button>`});
}
function dmFilter(q){$$('#dm-list .ap-item').forEach(b=>{const e=emp(b.dataset.emp);b.style.display=(!q||e.name.includes(q)||e.role.includes(q))?'':'none';});}
function dmStart(id){
  let c=CHATS.find(x=>x.type==='dm'&&x.with===id);
  if(!c){c={id:uid('ch'),type:'dm',with:id,unread:0,msgs:[]};CHATS.unshift(c);toast('ok','گفتگو ساخته شد','گفتگو مستقیم با '+emp(id).name+' آغاز شد.');}
  closeModal();S.msgChat=c.id;S.msgOpen=true;render();
}
let GRP_SEL=[];
function grpModal(){
  GRP_SEL=['e1'];
  openModal({title:'ایجاد گروه',body:`
   ${fld('نام گروه','<input class="inp" id="grp-n" placeholder="مثلاً: تیم تولید محتوا">')}
   <div class="mt12">${fld('تصویر گروه',`<label class="photo-up" style="padding:8px;cursor:pointer"><input type="file" accept="image/*" class="hide" onchange="toast('ok','تصویر گروه','تصویر پس از ساخت گروه اعمال می‌شود.')"><span class="row g6">${ic('upload',13)}<span class="t-cap">بارگذاری تصویر گروه</span></span></label>`)}</div>
   <div class="mt12"><span class="t-lbl">انتخاب اعضا</span>
    <div class="ap-list mt8" id="grp-list">${EMP.map(e=>`
     <button type="button" class="ap-item ${e.id==='e1'?'on':''}" data-emp="${e.id}" onclick="grpToggle(this,'${e.id}')">
      ${av(e.name,'md')}<span class="who"><b>${e.name}</b><span>${e.role} · ${e.dept}</span></span><span class="rad-bx"></span></button>`).join('')}</div></div>`,
  footer:`<button class="btn btn-pr" onclick="grpCreate()">ایجاد گروه</button><button class="btn btn-ghost" onclick="closeModal()">انصراف</button>`});
}
function grpToggle(el,id){const i=GRP_SEL.indexOf(id);i>-1?GRP_SEL.splice(i,1):GRP_SEL.push(id);el.classList.toggle('on',GRP_SEL.includes(id));}
function grpCreate(){
  const n=$('#grp-n').value.trim();
  if(!n){$('#grp-n').classList.add('err');return;}
  if(GRP_SEL.length<2){toast('info','اعضا کافی نیست','حداقل دو عضو برای گروه انتخاب کنید (شامل خودتان).');return;}
  const c={id:uid('ch'),type:'grp',name:n,members:GRP_SEL.slice(),admin:'e1',unread:0,msgs:[{id:uid('m'),from:'e1',t:'الان',text:'گروه «'+n+'» ساخته شد.'}]};
  CHATS.unshift(c);closeModal();S.msgChat=c.id;S.msgOpen=true;render();
  toast('ok','گروه ساخته شد','«'+n+'» با '+fa(c.members.length)+' عضو ایجاد شد.');
}
function grpRename(id){const c=chatById(id);
  openModal({title:'تغییر نام گروه',body:fld('نام جدید',`<input class="inp" id="grp-rn" value="${c.name}">`),
  footer:`<button class="btn btn-pr" onclick="(function(){const v=document.getElementById('grp-rn').value.trim();if(!v)return;chatById('${id}').name=v;closeModal();render();toast('ok','نام گروه تغییر کرد',v);})()">ذخیره</button><button class="btn btn-ghost" onclick="closeModal()">انصراف</button>`});
}
function grpAddMember(id){const c=chatById(id);
  const cand=EMP.filter(e=>!c.members.includes(e.id));
  if(!cand.length){toast('info','همه اعضا هستند','تمام همکاران در این گروه عضوند.');return;}
  openModal({title:'افزودن عضو به گروه',body:`
   <div class="ap-list" id="ga-list">${cand.map(e=>`
    <button type="button" class="ap-item" onclick="(function(){chatById('${id}').members.push('${e.id}');closeModal();render();toast('ok','عضو افزوده شد','${e.name} به گروه پیوست.');})()">
     ${av(e.name,'md')}<span class="who"><b>${e.name}</b><span>${e.role} · ${e.dept}</span></span><span class="rad-bx"></span></button>`).join('')}</div>`,
  footer:`<button class="btn btn-ghost" onclick="closeModal()">بستن</button>`});
}
function grpRemoveMember(cid,mid){const c=chatById(cid);
  c.members.splice(c.members.indexOf(mid),1);closeDrawer();render();
  toast('ok','عضو حذف شد',emp(mid).name+' از گروه خارج شد.');
}
function grpLeave(id){
  confirmDlg('خروج از گروه','از «'+chatById(id).name+'» خارج می‌شوید. پیام‌های شما حفظ می‌شود.',()=>{
    const c=chatById(id);c.members.splice(c.members.indexOf('e1'),1);
    if(S.msgChat===id){S.msgChat=null;S.msgOpen=false;}
    render();toast('warn','از گروه خارج شدید',c.name);
  },'خروج',true);
}
/* ---------------- اشتراک تسک از drawer ---------------- */
function taskShare(id){
  openModal({title:'ارسال در پیام‌رسان',body:`
   <p class="t-bs mb12">اشتراک‌گذاری «<b>${(task(id)||{}).title||''}</b>» در گفتگو:</p>
   <div class="ap-list" id="ts-list">${CHATS.map(c=>`
    <button type="button" class="ap-item" onclick="taskShareDo('${c.id}','${id}')">
     ${c.type==='dm'?av(emp(c.with).name,'md'):`<span class="av md grp-av">${initials(c.name)}</span>`}
     <span class="who"><b>${chatTitle(c)}</b><span>${c.type==='grp'?fa(c.members.length)+' عضو':'پیام مستقیم'}</span></span><span class="rad-bx"></span></button>`).join('')}</div>`,
  footer:`<button class="btn btn-ghost" onclick="closeModal()">انصراف</button>`});
}
function taskShareDo(cid,tid){
  const c=chatById(cid);
  c.msgs.push({id:uid('m'),from:'e1',t:'الان',text:'این تسک را ببینید:',ref:{k:'task',id:tid}});
  closeModal();render();
  toast('ok','به اشتراک گذاشته شد','این تسک با «'+chatTitle(c)+'» به اشتراک گذاشته شد.');
}
VIEWS['messenger']={title:'پیام‌رسان',vw:msgView};
