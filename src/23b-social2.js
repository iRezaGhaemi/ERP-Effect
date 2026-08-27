/* ============================================================
   EFFECT ERP · Report Builder v2 — API + ثبت دستی (v2.4)
   گزارش‌ساز مشتری بدون نیاز به اکانت متصل
   ============================================================ */
let RPT_TPLS=[];
let MP_F={type:'',q:'',sort:'date',dir:-1};
const MP_TYPES=[['post','پست','image'],['reel','ریلز','film'],['carousel','کاروسل','book'],['story','استوری','zap']];
const MP_TYPE_FA={post:'پست',reel:'ریلز',carousel:'کاروسل',story:'استوری'};
const MP_TYPE_IC={post:'image',reel:'film',carousel:'book',story:'zap'};

/* ----- پست‌های ثبت‌شده دستی (نمونه: مشتریان بدون اکانت متصل + تک‌محتواها) ----- */
const MPOSTS=[
 {id:'m1',cust:'c2',plat:'instagram',type:'reel',title:'آماده‌سازی قفسه فروش — پشت صحنه',desc:'ویدیو کوتاه از خط تولید بسته‌بندی جدید',date:'1405/06/02',reach:48000,imp:130000,likes:5200,cm:140,sv:980,sh:610,visits:2100,clicks:340,fol:180,vv:61000,wt:9200,awt:4.2,by:'e8',at:'۲ روز پیش'},
 {id:'m2',cust:'c2',plat:'instagram',type:'post',title:'معرفی محصول جدید — ماست پروبیوتیک',desc:'تصویر استودیویی محصول با کپشن معرفی',date:'1405/06/05',reach:26000,imp:74000,likes:3100,cm:82,sv:420,sh:190,visits:1200,clicks:260,fol:64,vv:0,wt:0,awt:0,by:'e8',at:'۳ روز پیش'},
 {id:'m3',cust:'c2',plat:'instagram',type:'carousel',title:'راهنمای انتخاب لبنیات سالم',desc:'کاروسل آموزشی ۶ اسلایدی',date:'1405/05/28',reach:33000,imp:91000,likes:3900,cm:118,sv:1400,sh:520,visits:1600,clicks:410,fol:95,vv:0,wt:0,awt:0,by:'e4',at:'۱ هفته پیش'},
 {id:'m4',cust:'c2',plat:'instagram',type:'story',title:'استوری نظرسنجی طعم جدید',desc:'نظرسنجی ۴ گزینه‌ای با استیکر لینک',date:'1405/06/07',reach:18500,imp:39000,likes:0,cm:46,sv:210,sh:95,visits:1900,clicks:720,fol:38,vv:21000,wt:3100,awt:2.8,by:'e8',at:'دیروز'},
 {id:'m5',cust:'c8',plat:'instagram',type:'reel',title:'نکات مراقبت از گوشدندان',desc:'ویدیو آموزشی ۴۵ ثانیه‌ای دکتر ناظر',date:'1405/06/03',reach:61000,imp:175000,likes:7400,cm:220,sv:1800,sh:890,visits:2900,clicks:530,fol:310,vv:88000,wt:14200,awt:5.1,by:'e11',at:'۴ روز پیش'},
 {id:'m6',cust:'c8',plat:'instagram',type:'carousel',title:'قبل و بعد — بلیچینگ دندان',desc:'کاروسل نتایج درمان با رضایت بیمار',date:'1405/05/30',reach:44000,imp:126000,likes:5900,cm:310,sv:2600,sh:1100,visits:3400,clicks:610,fol:420,vv:0,wt:0,awt:0,by:'e11',at:'۱ هفته پیش'},
 {id:'m7',cust:'c8',plat:'instagram',type:'post',title:'معرفی تیم متخصص کلینیک لبخند',desc:'پست معرفی ۵ دمتخصص',date:'1405/05/26',reach:21000,imp:58000,likes:2400,cm:75,sv:310,sh:140,visits:900,clicks:180,fol:52,vv:0,wt:0,awt:0,by:'e4',at:'۲ هفته پیش'},
 {id:'m8',cust:'c1',plat:'instagram',type:'story',title:'استوری رزرو آنلاین شام',desc:'سه فریم با استیکر رزرو',date:'1405/06/06',reach:39000,imp:84000,likes:0,cm:58,sv:460,sh:210,visits:3600,clicks:940,fol:120,vv:44000,wt:6300,awt:3.4,by:'e8',at:'دیروز'},
];
const mpER=p=>p.reach?((p.likes+p.cm+p.sv+p.sh)/p.reach*100):0;
const mpPosts=cid=>MPOSTS.filter(p=>p.cust===cid&&p.plat==='instagram');
const apiPosts=cid=>POSTS.filter(p=>{const s=SOC.find(x=>x.id===p.acct);return s&&s.cust===cid&&s.plat==='instagram';});
const custConnected=cid=>SOC.some(s=>s.cust===cid);
function rptPosts(){ /* پست‌های منبع فعال گزارش */
  return RPT.src==='manual'?mpPosts(RPT.cust):apiPosts(RPT.cust);
}
function rptSelPosts(){ const all=rptPosts();const sel=all.filter(p=>RPT.sel.includes(p.id));return sel.length?sel:all; }

/* ============================================================
   گزارش‌ساز v2
   ============================================================ */
function socReport(){
  const c=cust(RPT.cust);
  const connected=custConnected(RPT.cust);
  const steps=['مشتری','بازه زمانی','شبکه اجتماعی','منبع داده','انتخاب محتوا','انتخاب شاخص‌ها','طراحی گزارش','پیش‌نمایش','خروجی'];
  return `<div class="col g16" id="soc-wrap">
   <div class="card"><div class="card-b" style="padding:12px 16px">
    <div class="row g4 wrap rpt-steps">${steps.map((st,i)=>`<span class="chip">${fa(i+1)}. ${st}</span>${i<steps.length-1?'<span class="t-cap">←</span>':''}`).join('')}</div></div></div>
   <div class="grid grid-split-b">
   <div class="col g16">
    <div class="card"><div class="card-h">${ic('sliders',16)}<span class="t-h3 grow">تنظیمات گزارش</span>
      ${RPT.src==='manual'?'<span class="badge bd-warn">دستی</span>':'<span class="badge bd-ok">API</span>'}</div>
     <div class="card-b col g12">
      ${fld('۱. مشتری',selWrap('rb-c',CUST.map(cu=>({v:cu.id,t:cu.name+(custConnected(cu.id)?'':' — بدون اکانت متصل')})),RPT.cust))}
      <div class="frow">
        <div>۲. ${dpField('rb-f','از تاریخ',RPT.from)}</div>
        <div>۲. ${dpField('rb-t','تا تاریخ',RPT.to)}</div></div>
      ${fld('۳. شبکه اجتماعی',`<div class="row g6 wrap">${['instagram','tiktok','linkedin','youtube'].map(p=>`
        <button class="chip ${RPT.plats.includes(p)?'chip-sel on':''}" onclick="rptToggle('plats','${p}')">${plat(p,13)} ${p==='instagram'?'اینستاگرام':p==='tiktok'?'تیک‌تاک':p==='linkedin'?'لینکدین':'یوتیوب'}</button>`).join('')}</div>`)}
      ${fld('۴. منبع داده',`<div class="row g8 wrap">
        <button class="src-opt ${RPT.src==='api'?'on':''}" onclick="rptSrc('api')" ${connected?'':'disabled'}>
         <span class="ic">${ic('plug',15)}</span><span class="tx"><b>دریافت خودکار از API</b><span>${connected?'اکانت این مشتری متصل است':'اکانت متصل نیست — ثبت دستی را انتخاب کنید'}</span></span></button>
        <button class="src-opt ${RPT.src==='manual'?'on':''}" onclick="rptSrc('manual')">
         <span class="ic">${ic('edit',15)}</span><span class="tx"><b>ثبت دستی اطلاعات پست</b><span>بدون نیاز به اتصال؛ ورود متریک‌ها به‌صورت دستی</span></span></button></div>`)}
      ${fld('۶. شاخص‌ها',`<div class="row g6 wrap">${[['followers','فالوور'],['reach','ریچ'],['er','نرخ تعامل'],['eng','تعامل'],['saves','ذخیره'],['visits','بازدید پروفایل'],['shares','اشتراک‌گذاری'],['clicks','کلیک وب‌سایت']].map(m=>`
        <button class="chip ${RPT.metrics.includes(m[0])?'chip-sel on':''}" onclick="rptToggle('metrics','${m[0]}')">${m[1]}</button>`).join('')}</div>`)}
      ${fld('۷. بخش‌های گزارش',`<div class="row g6 wrap">${[['charts','نمودارها'],['posts','برترین پست‌ها'],['table','جدول محتوا'],['text','متن آزاد'],['recs','توصیه‌ها']].map(m=>`
        <button class="chip ${RPT.sections.includes(m[0])?'chip-sel on':''}" onclick="rptToggle('sections','${m[0]}')">${m[1]}</button>`).join('')}</div>`)}
     </div>
     <div class="card-f">
      <button class="btn btn-sec btn-sm grow" onclick="rptSaveTpl()">${ic('bookmark',13)} ذخیره قالب</button>
      <button class="btn btn-pr btn-sm grow" onclick="toast('ok','PDF آماده شد','گزارش برای اشتراک‌گذاری با مشتری آماده است.')">${ic('filetext',13)} خروجی PDF</button>
      <button class="ibtn" data-tip="اشتراک با مشتری" onclick="toast('ok','لینک اشتراک ساخته شد','مشتری دسترسی فقط-خواندنی دارد.')">${ic('link',15)}</button></div></div>
    ${RPT.src==='manual'?mpPanel(c):''}
    ${RPT_TPLS.length?`<div class="card"><div class="card-h">${ic('bookmark',15)}<span class="t-h3 grow">قالب‌های ذخیره‌شده</span></div>
     <div class="card-b" style="padding-top:2px">${RPT_TPLS.map((t,i)=>`<div class="appr"><span class="act-ic">${ic('bookmark',13)}</span>
      <div class="bd grow"><b>${t.name}</b><span>${cust(t.cfg.cust).name} · ${t.cfg.src==='manual'?'ثبت دستی':'API'}</span></div>
      <button class="btn btn-sec btn-sm" onclick="rptUseTpl(${i})">اعمال</button></div>`).join('')}</div></div>`:''}
    <div class="card"><div class="card-h">${ic('history',15)}<span class="t-h3 grow">گزارش‌های قبلی</span></div>
     <div class="card-b" style="padding-top:2px">${RPT_HIST.map(r=>`<div class="appr"><span class="act-ic">${ic('filetext',13)}</span>
       <div class="bd grow"><b>${r.t}</b><span>${r.range} · ${emp(r.by).name}</span></div>
       <button class="ibtn" data-tip="مشاهده" onclick="toast('info','گزارش قبلی','پیش‌نمایش در نسخه متصل فعال است.')">${ic('eye',14)}</button></div>`).join('')}</div></div>
   </div>
   <div class="card" style="overflow:hidden"><div class="card-h">${ic('eye',16)}<span class="t-h3 grow">پیش‌نمایش زنده</span><span class="badge bd-pr">Effect Studio</span></div>
    <div style="padding:16px;overflow-y:auto">
     <div class="rpt-pg">
      <div class="rpt-cover">
       <div class="row" style="justify-content:space-between;align-items:flex-start">
        <div><div style="font-size:11px;opacity:.8;letter-spacing:2px">EFFECT STUDIO · PERFORMANCE REPORT</div>
         <h2 style="font-size:26px;margin-top:8px;font-weight:600">گزارش عملکرد دیجیتال</h2>
         <div style="margin-top:8px;opacity:.85;font-size:13px">${c.name} · ${dFaL(RPT.from)} تا ${dFaL(RPT.to)}</div></div>
        <span class="logo-mark" style="background:rgba(255,255,255,.18)">${ic('dotlogo',22)}</span></div>
       <div class="row g12 mt16" style="flex-wrap:wrap">
        ${RPT.plats.map(p=>`<span style="background:rgba(255,255,255,.14);border-radius:99px;padding:4px 16px;font-size:12px;font-weight:600">${plat(p,13)} ${p}</span>`).join('')}</div>
      </div>
      ${rptSummary2(rptSelPosts())}
      ${RPT.sections.includes('charts')?rptCharts(rptSelPosts()):''}
      ${RPT.sections.includes('posts')?rptBest(rptSelPosts()):''}
      ${RPT.sections.includes('table')?rptTable(rptSelPosts()):''}
      ${RPT.sections.includes('recs')?`<h3 style="font-size:15px;font-weight:600;margin:24px 0 12px">توصیه‌های ماه آینده</h3>
       <ul style="padding-right:16px;font-size:12.5px;line-height:2.2;color:#33302c">
        <li>افزایش سهم <b>ریلز</b> — بالاترین ریچ را دارد.</li>
        <li>انتشار بین ساعت <b>۱۸ تا ۲۱</b> بیشترین تعامل را ثبت کرده است.</li>
        <li>تکرار فرمت‌های پربازدید این دوره در برنامه ماه آینده.</li></ul>`:''}
      ${RPT.sections.includes('text')?`<h3 style="font-size:15px;font-weight:600;margin:24px 0 12px">خلاصه اجرایی</h3>
       <p style="font-size:12.5px;line-height:2;color:#33302c">این دوره با مجموع ریچ <b>${faCompact(rptSelPosts().reduce((a,p)=>a+p.reach,0))}</b> و مجموع تعامل <b>${faCompact(rptSelPosts().reduce((a,p)=>a+p.likes+p.cm+p.sv+p.sh,0))}</b> همراه بود. میانگین نرخ تعامل <b>${fa((rptSelPosts().reduce((a,p)=>a+mpER(p),0)/Math.max(1,rptSelPosts().length)).toFixed(1))}٪</b> ثبت شد.</p>`:''}
      <div style="border-top:1px solid #eee;margin-top:24px;padding-top:12px;display:flex;justify-content:space-between;font-size:10.5px;color:#8a837c">
       <span>تهیه‌شده توسط Effect Studio · data@effectstudio.ir</span><span>effectstudio.ir</span></div>
     </div></div></div>
   </div></div></div>`;
}
function rptSrc(v){
  if(v==='api'&&!custConnected(RPT.cust)){toast('info','اکانت متصل نیست','برای این مشتری اکانت متصل وجود ندارد؛ «ثبت دستی اطلاعات» را انتخاب کنید.');return;}
  RPT.src=v;RPT.sel=[];render();
}
function rptSaveTpl(){
  RPT_TPLS.push({name:'قالب '+(RPT_TPLS.length+1)+' — '+cust(RPT.cust).name,cfg:JSON.parse(JSON.stringify({cust:RPT.cust,from:RPT.from,to:RPT.to,plats:RPT.plats,metrics:RPT.metrics,sections:RPT.sections,src:RPT.src}))});
  render();toast('ok','قالب ذخیره شد','برای گزارش‌های بعدی این مشتری قابل استفاده است.');
}
function rptUseTpl(i){Object.assign(RPT,RPT_TPLS[i].cfg);RPT.sel=[];render();toast('ok','قالب اعمال شد',RPT_TPLS[i].name);}
function rptSummary2(posts){
  const tot=posts.reduce((a,p)=>a+p.reach,0)||1;
  const met={followers:['فالوور',faCompact(posts.reduce((a,p)=>a+(p.fol||0),0))],reach:['ریچ کل',faCompact(posts.reduce((a,p)=>a+p.reach,0))],
   er:['نرخ تعامل میانگین',fa((posts.reduce((a,p)=>a+mpER(p),0)/Math.max(1,posts.length)).toFixed(1))+'٪'],
   eng:['تعامل کل',faCompact(posts.reduce((a,p)=>a+p.likes+p.cm+p.sv+p.sh,0))],saves:['ذخیره',faCompact(posts.reduce((a,p)=>a+(p.sv||0),0))],
   visits:['بازدید پروفایل',faCompact(posts.reduce((a,p)=>a+(p.visits||0),0))],shares:['اشتراک‌گذاری',faCompact(posts.reduce((a,p)=>a+(p.sh||0),0))],
   clicks:['کلیک وب‌سایت',faCompact(posts.reduce((a,p)=>a+(p.clicks||0),0))]};
  return `<div class="webkit" style="margin-top:16px">${RPT.metrics.map(k=>`
   <div class="wk" style="background:#fff;border:1px solid #eee"><b>${met[k][0]}</b><span style="font-size:18px;font-weight:600;color:#1c1917">${met[k][1]}</span></div>`).join('')||'<div class="wk"><b>متریک</b><span>یک متریک انتخاب کنید</span></div>'}</div>`;
}
function rptCharts(posts){
  const list=[...posts].sort((a,b)=>b.reach-a.reach).slice(0,8);
  return `<h3 style="font-size:15px;font-weight:600;margin:24px 0 12px">ریچ به تفکیک پست</h3>
   <div style="background:#fff;border:1px solid #eee;border-radius:10px;padding:16px">${chBars(list.map(p=>({v:p.reach,l:faCompact(p.reach)})),{h:150})}${chartLbls(list.map(p=>dFaM(p.date)))}</div>
   <h3 style="font-size:15px;font-weight:600;margin:24px 0 12px">تعامل به تفکیک پست</h3>
   <div style="background:#fff;border:1px solid #eee;border-radius:10px;padding:16px">${chBars(list.map(p=>({v:p.likes+p.cm+p.sv+p.sh,l:faCompact(p.likes+p.cm+p.sv+p.sh)})),{h:130})}${chartLbls(list.map(p=>dFaM(p.date)))}</div>`;
}
function rptBest(posts){
  const best=[...posts].sort((a,b)=>mpER(b)-mpER(a)).slice(0,3);
  return `<h3 style="font-size:15px;font-weight:600;margin:24px 0 12px">برترین محتواها</h3>
   ${best.map(p=>`
    <div class="row" style="background:#fff;border:1px solid #eee;border-radius:10px;padding:12px;margin-bottom:8px;gap:12px">
     <span class="post-thumb ${p.type==='story'?'reel':p.type}" style="color:#fff">${ic(p.type==='reel'||p.type==='story'?'play':'image',15)}</span>
     <div class="grow" style="min-width:0"><b style="font-size:13px">${p.title}</b><div style="font-size:11px;color:#8a837c">${MP_TYPE_FA[p.type]||TYPE_FA[p.type]||'پست'} · ${dFaM(p.date)} · ریچ ${faCompact(p.reach)}</div></div>
     <b style="font-size:12px;color:#6f6aeb">${fa(mpER(p).toFixed(1))}٪ ER</b></div>`).join('')||'<p style="font-size:12px;color:#8a837c">محتوایی انتخاب نشده است.</p>'}`;
}
function rptTable(posts){
  return `<h3 style="font-size:15px;font-weight:600;margin:24px 0 12px">جدول محتوا</h3>
   <div style="background:#fff;border:1px solid #eee;border-radius:10px;padding:8px 12px;overflow-x:auto">
    <table class="tb" style="width:100%"><thead><tr><th>عنوان</th><th>نوع</th><th>تاریخ</th><th>ریچ</th><th>تعامل</th><th>ER</th></tr></thead>
     <tbody>${posts.map(p=>`<tr><td style="font-size:12px">${p.title}</td><td style="font-size:12px">${MP_TYPE_FA[p.type]||TYPE_FA[p.type]||'پست'}</td><td style="font-size:12px" class="num">${dFaM(p.date)}</td>
      <td style="font-size:12px" class="num">${faCompact(p.reach)}</td><td style="font-size:12px" class="num">${faCompact(p.likes+p.cm+p.sv+p.sh)}</td><td style="font-size:12px" class="num" dir="ltr">${fa(mpER(p).toFixed(1))}٪</td></tr>`).join('')}</tbody></table></div>`;
}

/* ============================================================
   پنل ثبت دستی — پست‌های مشتری
   ============================================================ */
function mpPanel(c){
  const all=mpPosts(c.id);
  const list=all.filter(p=>(!MP_F.type||p.type===MP_F.type)&&(!MP_F.q||p.title.includes(MP_F.q)))
    .sort((a,b)=>{const k=MP_F.sort;const va=k==='er'?mpER(a):k==='reach'?a.reach:a[k];const vb=k==='er'?mpER(b):k==='reach'?b.reach:b[k];return (va>vb?1:va<vb?-1:0)*MP_F.dir*-1;});
  const T=mpTotals(all);
  return `<div class="card"><div class="card-h">${ic('edit',16)}<span class="t-h3 grow">ثبت دستی اطلاعات پست</span>
    <span class="badge bd-warn">${ic('lock',11)} ${fa(all.length)} پست ثبت‌شده</span></div>
   <div class="card-b col g12">
    <div class="grid grid-4">
     <div class="kpi"><div class="k-l">${ic('target',13)}ریچ کل</div><div class="k-v num">${faCompact(T.reach)}</div><div class="k-d">میانگین ${faCompact(T.avgReach)} در پست</div></div>
     <div class="kpi"><div class="k-l">${ic('eye',13)}ایمپرشن کل</div><div class="k-v num">${faCompact(T.imp)}</div><div class="k-d">—</div></div>
     <div class="kpi"><div class="k-l">${ic('heart',13)}نرخ تعامل میانگین</div><div class="k-v num">${fa(T.er.toFixed(1))}٪</div><div class="k-d up">محاسبه خودکار</div></div>
     <div class="kpi"><div class="k-l">${ic('zap',13)}تعامل کل</div><div class="k-v num">${faCompact(T.eng)}</div><div class="k-d">لایک+کامنت+ذخیره+اشتراک</div></div></div>
    <div class="grid grid-4">
     <div class="kpi"><div class="k-l">${ic('heart',13)}لایک کل</div><div class="k-v num">${fa(T.likes)}</div><div class="k-d">—</div></div>
     <div class="kpi"><div class="k-l">${ic('msg',13)}کامنت کل</div><div class="k-v num">${fa(T.cm)}</div><div class="k-d">—</div></div>
     <div class="kpi"><div class="k-l">${ic('bookmark',13)}ذخیره کل</div><div class="k-v num">${fa(T.sv)}</div><div class="k-d">—</div></div>
     <div class="kpi"><div class="k-l">${ic('share',13)}اشتراک‌گذاری کل</div><div class="k-v num">${fa(T.sh)}</div><div class="k-d">—</div></div></div>
    <div class="row g8 wrap">
     <span class="chip">${ic('target',12)} میانگین ریچ هر پست: <b class="num">${faCompact(T.avgReach)}</b></span>
     <span class="chip">${ic('zap',12)} میانگین تعامل هر پست: <b class="num">${fa(T.avgEng)}</b></span></div>
    ${all.length?`<div class="row g8 wrap"><span class="t-lbl" style="flex:none">برترین:</span>
       <span class="chip">${ic('trendup',12)} ${T.best.title} · ${fa(mpER(T.best).toFixed(1))}٪</span>
       <span class="t-lbl" style="flex:none">ضعیف‌ترین:</span>
       <span class="chip">${ic('trenddown',12)} ${T.worst.title} · ${fa(mpER(T.worst).toFixed(1))}٪</span></div>
      <div class="bar-chart" style="min-height:120px">${all.map(p=>`<div class="bar-col" title="${esc(p.title)}"><div class="bar-val num">${faCompact(p.reach)}</div><div class="bar" style="height:${Math.round(p.reach/T.maxReach*90)}px"></div><span class="bar-lb">${MP_TYPE_FA[p.type]}</span></div>`).join('')}</div>`:''}
    ${T.types.length>1?`<div class="grid grid-2" style="gap:12px">
      <div class="panel" style="padding:12px"><span class="t-lbl">مقایسه نوع محتوا — میانگین ریچ</span>
       <div class="bar-chart" style="min-height:96px">${T.types.map(ty=>`<div class="bar-col"><div class="bar-val num">${faCompact(ty.avgReach)}</div><div class="bar" style="height:${Math.round(ty.avgReach/T.maxAvgReach*70)}px"></div><span class="bar-lb">${ty.t}</span></div>`).join('')}</div></div>
      <div class="panel" style="padding:12px"><span class="t-lbl">نرخ تعامل — به تفکیک نوع محتوا</span>
       <div class="bar-chart" style="min-height:96px">${T.types.map(ty=>`<div class="bar-col"><div class="bar-val num">${fa(ty.er.toFixed(1))}٪</div><div class="bar" style="height:${Math.round(ty.er/T.maxEr*70)}px"></div><span class="bar-lb">${ty.t}</span></div>`).join('')}</div></div></div>`:''}
    <div class="row g8 wrap">
     <button class="btn btn-pr btn-sm" onclick="mPostModal(null,'${c.id}')">${ic('plus',13)} افزودن پست</button>
     <button class="chip ${!MP_F.type?'chip-sel on':''}" onclick="MP_F.type='';render()">همه (${fa(all.length)})</button>
     ${MP_TYPES.map(([k,t])=>all.some(p=>p.type===k)?`<button class="chip ${MP_F.type===k?'chip-sel on':''}" onclick="MP_F.type='${k}';render()">${t} (${fa(all.filter(p=>p.type===k).length)})</button>`:'').join('')}
     <div class="inp-ic mr-auto" style="width:180px"><input class="inp" style="height:32px;padding-left:32px" placeholder="جستجوی عنوان…" value="${MP_F.q}" oninput="MP_F.q=this.value;debRender()">${ic('search',13)}</div></div>
    ${list.length?tblInit('mp',[
      {k:'img',l:'تصویر',r:p=>`<span class="asset-ic" style="width:32px;height:32px;background:var(--pr-soft);color:var(--pr)">${ic(MP_TYPE_IC[p.type],14)}</span>`},
      {k:'title',l:'عنوان',mobFull:true,r:p=>`<b>${p.title}</b><span class="t-cap">${p.desc}</span>`},
      {k:'type',l:'نوع محتوا',r:p=>`<span class="badge bd-pr">${MP_TYPE_FA[p.type]}</span>`,hideMob:true},
      {k:'date',l:'تاریخ انتشار',r:p=>`<span class="num t2c">${dFaM(p.date)}</span>`,hideMob:true},
      {k:'reach',l:'Reach',num:true,r:p=>`<span class="num t2c">${faCompact(p.reach)}</span>`,sv:p=>p.reach},
      {k:'imp',l:'Impr.',num:true,r:p=>`<span class="num t2c">${faCompact(p.imp)}</span>`,sv:p=>p.imp,hideMob:true},
      {k:'likes',l:'Likes',num:true,r:p=>`<span class="num t2c">${fa(p.likes)}</span>`,sv:p=>p.likes,hideMob:true},
      {k:'cm',l:'Comm.',num:true,r:p=>`<span class="num t2c">${fa(p.cm)}</span>`,sv:p=>p.cm,hideMob:true},
      {k:'sv',l:'Saves',num:true,r:p=>`<span class="num t2c">${fa(p.sv)}</span>`,sv:p=>p.sv,hideMob:true},
      {k:'sh',l:'Shares',num:true,r:p=>`<span class="num t2c">${fa(p.sh)}</span>`,sv:p=>p.sh,hideMob:true},
      {k:'er',l:'ER',num:true,r:p=>`<b class="num" style="color:var(--pr)">${fa(mpER(p).toFixed(1))}٪</b>`,sv:mpER},
      {k:'sel',l:'',r:p=>`<span class="row g4" style="flex-wrap:nowrap">
        <button class="ibtn" data-tip="مشاهده" onclick="event.stopPropagation();mPostView('${p.id}')">${ic('eye',13)}</button>
        <button class="ibtn" data-tip="ویرایش" onclick="event.stopPropagation();mPostModal('${p.id}')">${ic('edit',13)}</button>
        <button class="ibtn ibtn-err" data-tip="حذف" onclick="event.stopPropagation();mPostDel('${p.id}')">${ic('trash',13)}</button>
        <button class="ibtn ${RPT.sel.includes(p.id)?'on':''}" data-tip="انتخاب برای گزارش" onclick="event.stopPropagation();rptToggle('sel','${p.id}')" style="${RPT.sel.includes(p.id)?'color:var(--pr);border-color:var(--pr)':''}">${ic('check',13)}</button></span>`},
     ],list,{per:6,onRow:'mPostView',empty:'پستی ثبت نشده است',emptyCta:`<button class="btn btn-pr btn-sm" onclick="mPostModal(null,'${c.id}')">${ic('plus',12)} افزودن پست</button>`})
    :`<div class="empty-mini">پستی با این فیلتر یافت نشد</div>`}
    <p class="t-cap">${ic('info',12)} پست‌های ثبت‌شده دستی در گزارش نهایی مشتری، دقیقاً مانند داده API رفتار می‌کنند؛ نشان «دستی» فقط در محیط داخلی گزارش‌ساز دیده می‌شود.</p>
   </div></div>`;
}
function mpTotals(list){
  const n=list.length||1;
  const T={reach:list.reduce((a,p)=>a+p.reach,0),imp:list.reduce((a,p)=>a+p.imp,0),
    likes:list.reduce((a,p)=>a+p.likes,0),cm:list.reduce((a,p)=>a+p.cm,0),
    sv:list.reduce((a,p)=>a+p.sv,0),sh:list.reduce((a,p)=>a+p.sh,0),
    eng:list.reduce((a,p)=>a+p.likes+p.cm+p.sv+p.sh,0),
    avgReach:Math.round(list.reduce((a,p)=>a+p.reach,0)/n),
    avgEng:Math.round(list.reduce((a,p)=>a+p.likes+p.cm+p.sv+p.sh,0)/n),
    er:list.reduce((a,p)=>a+mpER(p),0)/n};
  T.maxReach=Math.max(...list.map(p=>p.reach),1);
  T.best=[...list].sort((a,b)=>mpER(b)-mpER(a))[0]||null;
  T.worst=[...list].sort((a,b)=>mpER(a)-mpER(b))[0]||null;
  T.types=MP_TYPES.map(([k,t])=>{const ps=list.filter(p=>p.type===k);if(!ps.length)return null;
    return {t,n:ps.length,reach:ps.reduce((a,p)=>a+p.reach,0),avgReach:Math.round(ps.reduce((a,p)=>a+p.reach,0)/ps.length),
      er:ps.reduce((a,p)=>a+mpER(p),0)/ps.length};}).filter(Boolean);
  T.maxAvgReach=Math.max(...T.types.map(x=>x.avgReach),1);
  T.maxEr=Math.max(...T.types.map(x=>x.er),.1);
  return T;
}
function mpLiveER(){
  const g=id=>+enDigits(($('#'+id)||{}).value||'0');
  const er=(g('mp-likes')+g('mp-cm')+g('mp-sv')+g('mp-sh'))/Math.max(1,g('mp-reach'))*100;
  const el=$('#mp-er');if(el)el.textContent=fa(er.toFixed(1))+'٪';
}
function mPostModal(id,cid){
  const p=id?MPOSTS.find(x=>x.id===id):null;
  openModal({title:p?'ویرایش پست دستی':'افزودن پست دستی',body:`
   <div class="frow">
    ${fld('عنوان / توضیح کوتاه',`<input class="inp" id="mp-t" value="${p?esc(p.title):''}" placeholder="مثلاً: ریلز معرفی محصول جدید">`)}
    ${fld('تاریخ انتشار',`<input class="inp num" id="mp-d" value="${p?p.date:'1405/06/10'}">`)}</div>
   <div class="frow mt8">
    ${fld('نوع محتوا',selWrap('mp-ty',MP_TYPES.map(([k,t])=>({v:k,t})),p?p.type:'reel'))}
    ${fld('تصویر',`<div class="row g6 wrap" id="mp-img">${MP_TYPES.map(([k,t,icn],i)=>`<button type="button" class="asset-ic ${(p?p.type:'reel')===k?'on':''}" data-t="${k}" onclick="$$('#mp-img .asset-ic').forEach(x=>x.classList.remove('on'));this.classList.add('on')" style="width:40px;height:40px;background:var(--s2);color:var(--t2);border:1px solid var(--bd)">${ic(icn,16)}</button>`).join('')}</div>`)}</div>
   <div class="divider mt12 mb12"></div>
   <span class="t-lbl">متریک‌ها</span>
   <div class="mp-grid mt8">
    ${[['mp-reach','Reach',p?p.reach:12000],['mp-imp','Impressions',p?p.imp:36000],['mp-likes','Likes',p?p.likes:1500],['mp-cm','Comments',p?p.cm:40],
       ['mp-sv','Saves',p?p.sv:220],['mp-sh','Shares',p?p.sh:90],['mp-visits','Profile Visits',p?p.visits:800],['mp-clicks','Website Clicks',p?p.clicks:150],
       ['mp-fol','Followers',p?p.fol:35],['mp-vv','Video Views (ریلز)',p?p.vv:0],['mp-wt','Watch Time ثانیه (ریلز)',p?p.wt:0],['mp-awt','Avg Watch ثانیه (ریلز)',p?p.awt:0]]
     .map(([idv,l,v])=>`<div class="fld"><label class="lbl">${l}</label><input class="inp num" id="${idv}" inputmode="numeric" value="${fa(v)}" oninput="this.value=fa(this.value.replace(/[^0-9]/g,''));mpLiveER()"></div>`).join('')}
   </div>
   <div class="panel mt12" style="padding:12px;display:flex;align-items:center;gap:12px">
    ${ic('zap',15)}<span class="t-bs">نرخ تعامل (محاسبه خودکار):</span><b class="num" id="mp-er" style="color:var(--pr);font-size:16px">${fa((p?mpER(p):0).toFixed(1))}٪</b>
    <span class="t-cap">(لایک+کامنت+ذخیره+اشتراک) ÷ ریچ</span></div>`,
  footer:`<button class="btn btn-pr" onclick="mPostSave('${id||''}','${cid||''}')">${p?'ذخیره تغییرات':'افزودن پست'}</button>
   <button class="btn btn-ghost" onclick="closeModal()">انصراف</button>`});
}
function mPostSave(id,cid){
  const t=$('#mp-t').value.trim();if(!t){$('#mp-t').classList.add('err');return;}
  const g=k=>+enDigits($('#'+k).value||'0');
  const ty=$('#mp-ty').value;
  const img=$('#mp-img .asset-ic.on');
  const data={title:t,date:$('#mp-d').value||'1405/06/10',type:ty,desc:ty==='reel'?'ویدیو کوتاه':ty==='story'?'استوری با استیکر':'محتوای ثبت‌شده دستی',
    reach:g('mp-reach'),imp:g('mp-imp'),likes:g('mp-likes'),cm:g('mp-cm'),sv:g('mp-sv'),sh:g('mp-sh'),
    visits:g('mp-visits'),clicks:g('mp-clicks'),fol:g('mp-fol'),vv:g('mp-vv'),wt:g('mp-wt'),awt:g('mp-awt')};
  if(id){Object.assign(MPOSTS.find(x=>x.id===id),data);}
  else{MPOSTS.unshift(Object.assign({id:uid('m'),cust:cid||RPT.cust,plat:'instagram',by:'e1',at:'لحظه پیش'},data));}
  closeModal();render();toast('ok',id?'پست به‌روزرسانی شد':'پست افزوده شد','نرخ تعامل به‌صورت خودکار محاسبه شد: '+fa(mpER(id?MPOSTS.find(x=>x.id===id):MPOSTS[0]).toFixed(1))+'٪');
}
function mPostDel(id){const p=MPOSTS.find(x=>x.id===id);
  confirmDlg('حذف پست','«'+p.title+'» از داده‌های دستی حذف می‌شود.',()=>{MPOSTS.splice(MPOSTS.findIndex(x=>x.id===id),1);render();toast('ok','پست حذف شد',p.title);},'حذف',true);}
function mPostView(id){const p=MPOSTS.find(x=>x.id===id);
  openDrawer({title:p.title,sub:MP_TYPE_FA[p.type]+' · '+dFaL(p.date),icon:MP_TYPE_IC[p.type],body:`
   <div class="grid grid-4 mb16">
    <div class="kpi"><div class="k-l">${ic('target',13)}Reach</div><div class="k-v num">${faCompact(p.reach)}</div></div>
    <div class="kpi"><div class="k-l">${ic('eye',13)}Impressions</div><div class="k-v num">${faCompact(p.imp)}</div></div>
    <div class="kpi"><div class="k-l">${ic('heart',13)}Likes</div><div class="k-v num">${fa(p.likes)}</div></div>
    <div class="kpi"><div class="k-l">${ic('zap',13)}ER</div><div class="k-v num">${fa(mpER(p).toFixed(1))}٪</div></div></div>
   ${[['کامنت‌ها',fa(p.cm)],['ذخیره‌ها',fa(p.sv)],['اشتراک‌گذاری',fa(p.sh)],['بازدید پروفایل',fa(p.visits)],['کلیک وب‌سایت',fa(p.clicks)],['فالوور جذب‌شده',fa(p.fol)],
     ['Video Views',faCompact(p.vv)],['Watch Time',fa(Math.round(p.wt/60))+' دقیقه'],['Avg Watch',fa(p.awt)+' ثانیه'],['ثبت توسط',emp(p.by).name]]
    .map(([k,v])=>`<div class="bank-row"><span class="t-lbl">${k}</span><span class="t-bs num grow min0">${v}</span></div>`).join('')}`,
  footer:`<button class="btn btn-pr" onclick="closeDrawer();mPostModal('${p.id}')">${ic('edit',14)} ویرایش</button>
   <button class="btn btn-ghost mr-auto" onclick="closeDrawer()">بستن</button>`});
}
