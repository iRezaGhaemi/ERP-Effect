/* ============================================================
   EFFECT ERP · Social media — accounts/posts/report builder
   ============================================================ */
function socView(){
  const route=parseRoute();const tab=route.split('/')[1]||'overview';
  return `<div class="pg">${pgHead('شبکه‌های اجتماعی','مدیریت و تحلیل حساب‌های مشتریان — متصل به API پلتفرم‌ها',
   `<span class="badge bd-ok"><span class="dot"></span>۶ اکانت متصل</span>
    <button class="btn btn-sec" onclick="go('#/social/report')">${ic('chart',14)} گزارش مشتری</button>
    <button class="btn btn-pr" onclick="toast('info','اتصال اکانت جدید','از ماژول اتصالات، حساب جدید متصل کنید.')">${ic('plus',15)} اتصال اکانت</button>`,
   [{t:'داشبورد'},{t:'شبکه‌های اجتماعی'}])}
  ${tabsBar('soc',[{v:'overview',t:'نمای کلی',cnt:SOC.length},{v:'posts',t:'پست‌ها و تحلیل',cnt:POSTS.length},{v:'report',t:'گزارش‌ساز مشتری'}],tab,'socGo')}
  <div class="mt16">${tab==='overview'?socOverview():tab==='posts'?socPosts():socReport()}</div></div>`;
}
function socGo(v){go('#/social/'+v);}
function socOverview(){
  return `<div class="grid grid-3 mb16">${SOC.map(s=>`
   <div class="card soc-acct hoverable" onclick="S.socAcct='${s.id}';go('#/social/posts')" style="cursor:pointer">
    <span class="plat-ic ${s.plat}">${plat(s.plat,19)}</span>
    <div class="grow"><div class="row g6"><b dir="ltr">@${s.handle}</b><span class="badge bd-ok" style="font-size:10px"><span class="dot"></span>متصل</span></div>
     <p class="t-cap">${cust(s.cust).name}</p></div>
    <div class="mr-auto tc" style="flex:none">${spark(s.grow,{w:64,h:26,color:'var(--ok)'})}<div class="t-cap" style="color:var(--ok);font-weight:600">+${fa(s.g7)}٪</div></div>
   </div>`).join('')}
   <div class="card" style="display:flex;align-items:center;justify-content:center;border-style:dashed">
     <button class="btn btn-ghost" onclick="go('#/integrations')">${ic('plus',14)} اتصال اکانت جدید</button></div></div>
  <div class="grid grid-4 mb16">
   ${[['فالوور کل','۳۰۱٬۲۰۰','+۴.۱٪ هفته','users'],['ریچ ۳۰ روز','۳٬۰۱۷٬۰۰۰','+۱۲٪','target'],['ایمپرشن','۱۱٬۰۲۴٬۰۰۰','+۹.۸٪','eye'],['نرخ تعامل','۳.۶٪','+۰.۳pt','heart']].map(k=>`
   <div class="kpi"><div class="k-l">${ic(k[3],15)}${k[0]}</div><div class="k-v num">${k[1]}</div><div class="k-d up">${ic('trendup',12)}${k[2]}</div></div>`).join('')}</div>
  <div class="grid grid-2">
   <div class="card"><div class="card-h">${ic('trendup',16)}<span class="t-h3 grow">رشد فالوور — تاج محل</span><span class="t-cap">۱۲ هفته</span></div>
    <div class="card-b">${chLine(SOC[1].grow,{h:150})}${chartLbls(['فروردین','','','','اردیبهشت','','','','خرداد','','',''])}</div></div>
   <div class="card"><div class="card-h">${ic('zap',16)}<span class="t-h3 grow">عملکرد بر اساس نوع محتوا</span></div>
    <div class="card-b" style="display:flex;flex-direction:column;gap:12px">
    ${[['ریلز','64%',842000,'#6f6aeb'],['کاروسل','23%',296000,'#0d9488'],['پست تک','13%',168000,'#d97706']].map(t=>`
     <div><div class="row" style="justify-content:space-between"><b class="t-bs" style="color:var(--t1)">${t[0]}</b><span class="t-cap num">ریچ ${faCompact(t[2])}</span></div>
     <div class="prog mt4"><i style="width:${t[1]};background:${t[3]}"></i></div></div>`).join('')}
    <p class="t-cap">سهم ریچ — ریلز بهترین عملکرد را دارد.</p></div></div>
  </div>`;
}
function socPosts(){
  const acct=S.socAcct==='all'?null:S.socAcct;
  const posts=POSTS.filter(p=>!acct||p.acct===acct);
  const best=[...POSTS].sort((a,b)=>b.reach-a.reach).slice(0,3);
  return `<div class="row mb12 wrap g8">
   <button class="chip ${!acct?'chip-sel on':''}" onclick="S.socAcct='all';render()">همه اکانت‌ها</button>
   ${SOC.map(s=>`<button class="chip ${acct===s.id?'chip-sel on':''}" onclick="S.socAcct='${s.id}';render()">${plat(s.plat,13)} ${cust(s.cust).name}</button>`).join('')}
   <div class="mr-auto">${seg('pr',['۷ روز','۳۰ روز','۳ ماه'].map((t,i)=>({v:['7','30','90'][i],t})).map(x=>({v:x.v,t:x.t})),'30','dummySeg')}</div></div>
  <div class="grid grid-4 mb16">
   <div class="kpi accent"><div class="k-l">${ic('eye',14)}ریچ کل</div><div class="k-v num">${faCompact(posts.reduce((s,p)=>s+p.reach,0))}</div><div class="k-d up">میانگین ${faCompact(posts.reduce((s,p)=>s+p.reach,0)/(posts.length||1))} هر پست</div></div>
   <div class="kpi"><div class="k-l">${ic('heart',14)}تعامل</div><div class="k-v num">${faCompact(posts.reduce((s,p)=>s+p.likes+p.cm+p.sv+p.sh,0))}</div><div class="k-d up">Likes + Comments + Saves</div></div>
   <div class="kpi"><div class="k-l">${ic('trendup',14)}میانگین ER</div><div class="k-v num">${fa((posts.reduce((s,p)=>s+((p.likes+p.cm+p.sv+p.sh)/p.reach*100),0)/(posts.length||1)).toFixed(1))}٪</div><div class="k-d up">استاندارد صنعت: ۲٪</div></div>
   <div class="kpi"><div class="k-l">${ic('sparkles',14)}بهترین پست</div><div class="k-v num">${faCompact(best[0].reach)}</div><div class="k-d">${best[0].title.slice(0,24)}…</div></div></div>
  <div class="grid grid-3 mb16">${best.map((p,i)=>`
   <div class="card hoverable" style="padding:16px" onclick="postDrawer('${p.id}')">
    <div class="row g10"><span class="post-thumb ${p.type}">${ic(p.type==='reel'?'play':'grid',16)}</span>
     <div class="grow"><b class="t-bs ellip" style="color:var(--t1);display:block">${p.title}</b>
      <span class="t-cap">${cust(SOC.find(s=>s.id===p.acct).cust).name} · ${dFaM(p.date)}</span></div>
     <span class="badge bd-${i===0?'pr':'mut'}">${fa(i+1)}</span></div>
    <div class="row g16 mt12">${[['ریچ',faCompact(p.reach)],['لایک',faCompact(p.likes)],['ذخیره',faCompact(p.sv)]].map(m=>`<div class="metric-mini"><b class="num">${m[1]}</b><span>${m[0]}</span></div>`).join('')}</div></div>`).join('')}</div>
  <div class="grid grid-2 mb16">
   <div class="card"><div class="card-h">${ic('chart',16)}<span class="t-h3 grow">روند ریچ</span></div>
    <div class="card-b">${chLine(POSTS.slice().reverse().map(p=>p.reach),{h:140})}${chartLbls(['۴ خرداد','','','','۲۰ خرداد','','','','۵ شهریور'])}</div></div>
   <div class="card"><div class="card-h">${ic('cal',16)}<span class="t-h3 grow">فرکانس انتشار</span><span class="t-cap">پست در هفته</span></div>
    <div class="card-b">${chBars([{v:3},{v:4},{v:2},{v:5},{v:4},{v:6}],{h:140})}${chartLbls(['هفته ۱','۲','۳','۴','۵','۶'])}</div></div></div>
  ${tblInit('sp',[
   {k:'title',l:'پست',mobFull:true,r:p=>`<span class="row g10"><span class="post-thumb ${p.type}" data-tip="${TYPE_FA[p.type]}">${ic(p.type==='reel'?'play':p.type==='carousel'?'grid':'filetext',15)}</span>
     <div><b>${p.title}</b><div class="sub">${cust(SOC.find(s=>s.id===p.acct).cust).name} · @${SOC.find(s=>s.id===p.acct).handle}</div></div></span>`},
   {k:'date',l:'تاریخ انتشار',r:p=>dFa(p.date),sv:p=>p.date},
   {k:'reach',l:'Reach',num:true,r:p=>`<b class="num">${faCompact(p.reach)}</b>`,sv:p=>p.reach},
   {k:'imp',l:'Impressions',num:true,r:p=>`<span class="num t2c">${faCompact(p.imp)}</span>`,sv:p=>p.imp,hideMob:true},
   {k:'likes',l:'Likes',num:true,r:p=>`<span class="num">${fa(p.likes.toLocaleString('en-US'))}</span>`,sv:p=>p.likes},
   {k:'cm',l:'Comments',num:true,r:p=>`<span class="num t2c">${fa(p.cm)}</span>`,sv:p=>p.cm,hideMob:true},
   {k:'sv',l:'Saves',num:true,r:p=>`<span class="num t2c">${fa(p.sv)}</span>`,sv:p=>p.sv,hideMob:true},
   {k:'er',l:'ER',num:true,r:p=>`<span class="badge bd-${((p.likes+p.cm+p.sv+p.sh)/p.reach*100)>4?'ok':'mut'}">${fa(((p.likes+p.cm+p.sv+p.sh)/p.reach*100).toFixed(1))}٪</span>`,sv:p=>(p.likes+p.cm+p.sv+p.sh)/p.reach},
  ],posts,{per:8,onRow:'postDrawer',empty:'پستی یافت نشد',emptySub:'اکانت دیگری را انتخاب کنید.'})}`;
}
function dummySeg(){}/* noop */
function postDrawer(id){
  const p=POSTS.find(x=>x.id===id);const s=SOC.find(x=>x.id===p.acct);
  openDrawer({title:p.title,sub:cust(s.cust).name+' · @'+s.handle+' · '+dFaL(p.date),icon:'share',body:`
   <div class="row g8 wrap mb16"><span class="tag pr">${TYPE_FA[p.type]}</span><span class="chip">${plat(s.plat,13)} ${s.plat==='instagram'?'Instagram':s.plat}</span></div>
   <div style="aspect-ratio:4/3;border-radius:12px;background:var(--pr-soft)>
     <div class="tc"><div style="font-size:34px">${p.type==='reel'?ic('play',28):p.type==='carousel'?ic('grid',28):ic('filetext',28)}</div><span style="font-size:11px;opacity:.75">پیش‌نمایش محتوا (API)</span></div></div>
   <div class="grid grid-2" style="gap:12px">
    ${[['Reach',faCompact(p.reach)],['Impressions',faCompact(p.imp)],['Likes',fa(p.likes)],['Comments',fa(p.cm)],['Saves',fa(p.sv)],['Shares',fa(p.sh)]].map(m=>`
     <div class="panel" style="padding:12px 16px"><span class="t-cap" style="display:block">${m[0]}</span><b class="t-h4 num">${m[1]}</b></div>`).join('')}
   </div>
   <h4 class="t-h4 mt16 mb8">نرخ تعامل</h4>
   <div class="row g12">${ringPct(Math.round(((p.likes+p.cm+p.sv+p.sh)/p.reach*100)*10)/10,{size:64,color:'var(--pr3)'})}
     <p class="t-bs t2c grow">این پست <b style="color:var(--t1)">${fa(((p.likes+p.cm+p.sv+p.sh)/p.reach*100).toFixed(1))}٪</b> نرخ تعامل دارد — ${((p.likes+p.cm+p.sv+p.sh)/p.reach*100)>4?'بالاتر از میانگین صنعت':'نزدیک میانگین صنعت'}</p></div>`,
  footer:`<button class="btn btn-pr" onclick="go('#/social/report');closeDrawer()">افزودن به گزارش مشتری</button>
   <button class="btn btn-sec" onclick="toast('info','تقویم انتشار','زمان‌بندی مجدد انتشار در نسخه متصل فعال است.')">زمان‌بندی مجدد</button>`});
}
/* ---------- report builder ---------- */
let RPT={cust:'c4',from:'1405/05/01',to:'1405/05/31',plats:['instagram'],metrics:['followers','reach','er','eng'],sections:['charts','posts','text','recs'],src:'api',sel:[]};
function socReport(){
  const c=cust(RPT.cust);
  return `<div class="grid grid-split-b" id="soc-wrap">
   <div class="col g16">
    <div class="card"><div class="card-h">${ic('sliders',16)}<span class="t-h3 grow">تنظیمات گزارش</span></div>
     <div class="card-b col g12">
      ${fld('مشتری',selWrap('rb-c',CUST.filter(cu=>SOC.some(s=>s.cust===cu.id)).map(cu=>({v:cu.id,t:cu.name})),RPT.cust))}
      <div class="frow">
        <div>${dpField('rb-f','از تاریخ',RPT.from)}</div>
        <div>${dpField('rb-t','تا تاریخ',RPT.to)}</div></div>
      ${fld('پلتفرم‌ها',`<div class="row g6 wrap">${['instagram','tiktok','linkedin','youtube'].map(p=>`
        <button class="chip ${RPT.plats.includes(p)?'chip-sel on':''}" onclick="rptToggle('plats','${p}')">${plat(p,13)} ${p==='instagram'?'اینستاگرام':p==='tiktok'?'تیک‌تاک':p==='linkedin'?'لینکدین':'یوتیوب'}</button>`).join('')}</div>`)}
      ${fld('متریک‌ها',`<div class="row g6 wrap">${[['followers','فالوور'],['reach','ریچ'],['er','نرخ تعامل'],['eng','تعامل'],['saves','ذخیره'],['visits','بازدید پروفایل']].map(m=>`
        <button class="chip ${RPT.metrics.includes(m[0])?'chip-sel on':''}" onclick="rptToggle('metrics','${m[0]}')">${m[1]}</button>`).join('')}</div>`)}
      ${fld('بخش‌های گزارش',`<div class="row g6 wrap">${[['charts','نمودارها'],['posts','برترین پست‌ها'],['text','متن آزاد'],['recs','توصیه‌ها']].map(m=>`
        <button class="chip ${RPT.sections.includes(m[0])?'chip-sel on':''}" onclick="rptToggle('sections','${m[0]}')">${m[1]}</button>`).join('')}</div>`)}
     </div>
     <div class="card-f">
      <button class="btn btn-sec btn-sm grow" onclick="toast('info','ذخیره گزارش','گزارش در کتابخانه ذخیره شد.')">${ic('download',13)} ذخیره</button>
      <button class="btn btn-pr btn-sm grow" onclick="toast('ok','PDF آماده شد','گزارش برای اشتراک‌گذاری با مشتری آماده است.')">${ic('filetext',13)} خروجی PDF</button>
      <button class="ibtn" data-tip="اشتراک با مشتری" onclick="toast('ok','لینک اشتراک ساخته شد','مشتری دسترسی فقط-خواندنی دارد.')">${ic('link',15)}</button></div></div>
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
      ${rptSummary(c)}
      ${RPT.sections.includes('charts')?`<h3 style="font-size:15px;font-weight:600;margin:24px 0 12px">روند رشد</h3>
       <div style="background:#fff;border:1px solid #eee;border-radius:10px;padding:16px">${chLine(SOC[0].grow,{h:150,color:'#6f6aeb'})}${chartLbls(SOC[0].grow.map((_,i)=>i%3===0?fa(i+1):''))}</div>`:''}
      ${RPT.sections.includes('posts')?`<h3 style="font-size:15px;font-weight:600;margin:24px 0 12px">برترین محتواها</h3>
       ${POSTS.filter(p=>SOC.find(s=>s.id===p.acct).cust===RPT.cust).slice(0,3).map(p=>`
        <div class="row" style="background:#fff;border:1px solid #eee;border-radius:10px;padding:12px;margin-bottom:8px;gap:12px">
         <span class="post-thumb ${p.type}" style="color:#fff">${ic('play',15)}</span>
         <div class="grow"><b style="font-size:13px">${p.title}</b><div style="font-size:11px;color:#8a837c">${dFaM(p.date)} · ریچ ${faCompact(p.reach)}</div></div>
         <b style="font-size:12px;color:#6f6aeb">${fa(((p.likes+p.cm+p.sv+p.sh)/p.reach*100).toFixed(1))}٪ ER</b></div>`).join('')}`:''}
      ${RPT.sections.includes('recs')?`<h3 style="font-size:15px;font-weight:600;margin:24px 0 12px">توصیه‌های ماه آینده</h3>
       <ul style="padding-right:16px;font-size:12.5px;line-height:2.2;color:#33302c">
        <li>افزایش سهم ریلز به <b>۶۰٪</b> — بالاترین ریچ را دارد.</li>
        <li>انتشار بین ساعت <b>۱۸ تا ۲۱</b> بیشترین تعامل را ثبت کرده است.</li>
        <li>تکرار فرمت «قبل/بعد» — بالاترین ذخیره‌شدن در این ماه.</li></ul>`:''}
      ${RPT.sections.includes('text')?`<h3 style="font-size:15px;font-weight:600;margin:24px 0 12px">خلاصه اجرایی</h3>
       <p style="font-size:12.5px;line-height:2;color:#33302c">این دوره با رشد پیوسته فالوور و بهبود نرخ تعامل همراه بود. مجموع ریچ <b>${faCompact(1140000)}</b> و مجموع تعامل <b>${faCompact(96000)}</b> ثبت شد که نسبت به دوره قبل به‌ترتیب <b style="color:#1d7a53">+۱۲٪</b> و <b style="color:#1d7a53">+۹٪</b> رشد نشان می‌دهد.</p>`:''}
      <div style="border-top:1px solid #eee;margin-top:24px;padding-top:12px;display:flex;justify-content:space-between;font-size:10.5px;color:#8a837c">
       <span>تهیه‌شده توسط Effect Studio · data@effectstudio.ir</span><span>effectstudio.ir</span></div>
     </div></div></div>
   </div></div>`;
}
function rptSummary(c){
  const s=SOC.find(x=>x.cust===RPT.cust);
  const met=[['followers','فالوور',s?faCompact(s.followers):'—','+۴.۲٪'],['reach','ریچ کل',faCompact(1140000),'+۱۲٪'],['er','نرخ تعامل',s?fa(s.er)+'٪':'—','+۰.۳pt'],['eng','تعامل',faCompact(96000),'+۹٪'],['saves','ذخیره',faCompact(18200),'+۲۱٪'],['visits','بازدید پروفایل',s?faCompact(s.visits):'—','+۶٪']];
  return `<div class="webkit" style="margin-top:16px">${met.filter(m=>RPT.metrics.includes(m[0])).map(m=>`
   <div class="wk" style="background:#fff;border:1px solid #eee"><b>${m[1]}</b><span style="font-size:18px;font-weight:600;color:#1c1917">${m[2]}</span>
    <span style="color:#1d7a53;font-weight:600">${m[3]} نسبت به دوره قبل</span></div>`).join('')||'<div class="wk"><b>متریک</b><span>یک متریک انتخاب کنید</span></div>'}</div>`;
}
function rptToggle(list,v){const a=RPT[list];const i=a.indexOf(v);i>-1?a.splice(i,1):a.push(v);render();}
VIEWS['social']={title:'شبکه‌های اجتماعی',vw:socView};
