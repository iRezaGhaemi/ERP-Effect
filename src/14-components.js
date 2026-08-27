/* ============================================================
   EFFECT ERP · Global state + reusable components
   ============================================================ */
const S={
  authed:false,route:'dashboard',sub:'',theme:'light',sbMini:false,ws:'w1',
  tabs:{},tbls:{},taskView:'board',taskFilters:{proj:'',asgn:'',prio:'',st:'',q:''},
  crmTab:'pipeline',custTab:'info',finTab:'dash',calView:'month',calM:6,calY:1405,calSel:null,
  socTab:'overview',socAcct:'all',setTab:'general',role:'r1',notifFilter:'all',
  searchOpen:false,notifsOpen:false,menuEl:null,missionSeen:false,loaded:{},
};
function saveTheme(){try{if(window.localStorage)localStorage.setItem('fx-theme',S.theme);}catch(e){}}
function loadTheme(){try{const t=window.localStorage&&localStorage.getItem('fx-theme');if(t)S.theme=t;}catch(e){}}
function applyTheme(){document.documentElement.setAttribute('data-theme',S.theme);}

/* ---------- toast ---------- */
const TOASTS=[];
function toast(type,title,sub,action){
  const id=uid('ts');TOASTS.push({id,type,title,sub,action});
  renderToasts();
  setTimeout(()=>{const el=document.getElementById(id);if(el){el.classList.add('out');setTimeout(()=>{const i=TOASTS.findIndex(t=>t.id===id);if(i>-1)TOASTS.splice(i,1);renderToasts();},260);}},action?6000:3600);
}
function dismissToast(id){const i=TOASTS.findIndex(t=>t.id===id);if(i>-1)TOASTS.splice(i,1);renderToasts();}
function renderToasts(){
  let host=$('.toasts');if(!host){host=document.createElement('div');host.className='toasts';document.body.appendChild(host);}
  host.innerHTML=TOASTS.map(t=>{
    const icn=t.type==='ok'?'check':t.type==='err'?'alert':t.type==='warn'?'alert':'info';
    return `<div class="toast ${t.type==='ok'?'ok':t.type==='err'?'err':t.type==='warn'?'warn':'info'}" id="${t.id}" role="status">
      <span class="ti">${ic(icn,16)}</span>
      <div class="grow"><b>${t.title}</b>${t.sub?`<span>${t.sub}</span>`:''}</div>
      ${t.action?`<button class="act" onclick="(${t.action.fn})();dismissToast('${t.id}')">${t.action.t}</button>`:''}
      <button class="act" aria-label="بستن" onclick="dismissToast('${t.id}')">${ic('x',13)}</button>
    </div>`;}).join('');
}

/* ---------- dropdown menu ---------- */
function menu(anchor,items,header){
  closeMenu();
  const r=anchor.getBoundingClientRect();
  const m=document.createElement('div');m.className='menu';m.style.zIndex=zTop();
  m.innerHTML=(header?`<div class="m-hd">${header}</div>`:'')+items.map((it,i)=>
    it==='-'?'<div class="m-sep"></div>':
    `<button class="mi ${it.danger?'danger':''}" ${it.fn?`onclick="closeMenu();(${it.fn})()"`:'onclick="closeMenu()"'}>${it.ic?ic(it.ic,15):''}<span>${it.t}</span>${it.k?`<span class="k">${it.k}</span>`:''}</button>`).join('');
  document.body.appendChild(m);S.menuEl=m;
  const mw=m.offsetWidth,mh=m.offsetHeight;
  let top=Math.min(r.bottom+6,innerHeight-mh-8);let right=Math.max(8,innerWidth-r.right+ (r.width) - mw); // align right edge to anchor right
  if(right+mw>innerWidth-8)right=innerWidth-mw-8;
  m.style.top=top+'px';m.style.left='auto';m.style.right=(innerWidth-r.right)+'px';
  if(r.right<innerWidth-600){m.style.right='auto';m.style.left=Math.min(r.left,innerWidth-mw-8)+'px';}
  setTimeout(()=>document.addEventListener('click',closeMenu,{once:true}),0);
}
function closeMenu(){if(S.menuEl){S.menuEl.remove();S.menuEl=null;}}

/* ---------- modal / drawer ---------- */
function openModal(o){
  closeModal();
  const ov=document.createElement('div');ov.className='ovl';ov.id=document.getElementById('ovl')?'ovl-m':'ovl';
  ov.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(o.title||'')}"><div class="box ${o.wide?'w-lg':''}">
    <div class="m-h"><span class="grow t-h3">${o.title||''}</span><button class="ibtn" aria-label="بستن" onclick="closeModal()">${ic('x',17)}</button></div>
    <div class="m-b">${o.body||''}</div>
    ${o.footer?`<div class="m-f">${o.footer}</div>`:''}
  </div></div>`;
  ov.addEventListener('click',e=>{if(e.target===ov)closeModal();});
  document.body.appendChild(ov);
  setTimeout(()=>{const f=ov.querySelector('input,textarea,select');if(f)f.focus();},60);
}
function closeModal(){const m=$('#ovl-m');if(m){m.remove();return;}const o=$('#ovl');if(o&&o.querySelector('.modal'))o.remove();}
function openDrawer(o){
  closeDrawer();
  const ov=document.createElement('div');ov.className='ovl';ov.id='ovl';
  ov.innerHTML=`<div class="drawer ${o.wide?'w-lg':''}${o.cls?' '+o.cls:''}" role="dialog" aria-modal="true" aria-label="${esc(o.title||'')}">
    <div class="drawer-h">${o.icon?`<span style="color:var(--pr3)">${ic(o.icon,20)}</span>`:''}
      <div class="grow"><div class="t-h3 ellip">${o.title||''}</div>${o.sub?`<div class="t-cap">${o.sub}</div>`:''}</div>
      <button class="ibtn" aria-label="بستن" onclick="closeDrawer()">${ic('x',17)}</button></div>
    <div class="drawer-b" id="drw-body">${o.body||''}</div>
    ${o.footer?`<div class="drawer-f">${o.footer}</div>`:''}
  </div>`;
  ov.addEventListener('click',e=>{if(e.target===ov)closeDrawer();});
  document.body.appendChild(ov);
  document.addEventListener('keydown',escClose);
}
function escClose(e){if(e.key==='Escape'){closeDrawer();closeModal();closeMenu();if(S.searchOpen)togglePalette(false);}}
function closeDrawer(){const o=$('#ovl');if(o)o.remove();document.removeEventListener('keydown',escClose);if(typeof asgDdClose==='function')asgDdClose();}
function confirmDlg(title,msg,onOk,okTxt,danger){
  openModal({title,body:`<p class="t-bs" style="line-height:1.9">${msg}</p>`,
    footer:`<button class="btn ${danger?'btn-err':'btn-pr'}" onclick="closeModal();(${onOk})()">${okTxt||'تایید'}</button>
    <button class="btn btn-ghost" onclick="closeModal()">انصراف</button>`});
}

/* ---------- generic field inputs ---------- */
const fld=(label,inner,hint,err)=>`<div class="fld"><label class="lbl">${label}</label>${inner}${hint?`<span class="hint">${hint}</span>`:''}${err?`<span class="ferr">${ic('alert',12)}${err}</span>`:''}</div>`;
const selWrap=(name,opts,val,attrs)=>`<div class="sel-wrap"><select class="sel" id="${name}" name="${name}" ${attrs||''}>${opts.map(o=>`<option value="${o.v}" ${o.v===val?'selected':''}>${o.t}</option>`).join('')}</select>${ic('chevdown',14)}</div>`;

/* ---------- Jalali datepicker ---------- */
let DP=null;
function dpOpen(anchor,val,onPickId){
  dpClose();
  const r=anchor.getBoundingClientRect();
  const el=document.createElement('div');el.className='dp';
  let j=val?toJ(val):{...TODAY};let sel=val?toJ(val):null;
  const draw=()=>{
    const first=jDow({jy:j.jy,jm:j.jm,jd:1});// 0=یکشنبه
    const startCol=(first+1)%7;// شنبه=0
    const len=jMonthLen(j.jy,j.jm);
    const prevLen=jMonthLen(j.jm===1?j.jy-1:j.jy, j.jm===1?12:j.jm-1);
    let cells='';
    for(let i=0;i<startCol;i++)cells+=`<button class="oth" tabindex="-1">${fa(prevLen-startCol+1+i)}</button>`;
    for(let d=1;d<=len;d++){
      const isT=TODAY.jy===j.jy&&TODAY.jm===j.jm&&TODAY.jd===d;
      const dow=(startCol+d-1)%7;
      const isSel=sel&&sel.jy===j.jy&&sel.jm===j.jm&&sel.jd===d;
      cells+=`<button class="${isSel?'sel':''} ${isT?'today':''} ${dow===6?'hol':''}" data-d="${d}">${fa(d)}</button>`;
    }
    const rest=(7-(startCol+len)%7)%7;for(let d=1;d<=rest;d++)cells+=`<button class="oth" tabindex="-1">${fa(d)}</button>`;
    el.innerHTML=`<div class="dp-h">
        <button class="ibtn" data-nav="-1" aria-label="ماه قبل">${ic('chevright',16)}</button>
        <div class="t">${FA_MONTHS[j.jm-1]} ${fa(j.jy)}</div>
        <button class="ibtn" data-nav="1" aria-label="ماه بعد">${ic('chevleft',16)}</button></div>
      <div class="dp-g">${FA_WD_S.map((w,i)=>`<span class="wh ${i===6?'j':''}">${w}</span>`).join('')}${cells}</div>
      <div class="dp-f"><button class="btn btn-sm btn-sec grow" data-today>امروز</button><button class="btn btn-sm btn-ghost" data-clear>پاک کردن</button></div>`;
  };
  draw();
  el.addEventListener('click',e=>{
    const nav=e.target.closest('[data-nav]');const d=e.target.closest('[data-d]');const t=e.target.closest('[data-today]');const c=e.target.closest('[data-clear]');
    if(nav){const n=+nav.dataset.nav;j.jm+=n;if(j.jm>12){j.jm=1;j.jy++;}if(j.jm<1){j.jm=12;j.jy--;}draw();}
    else if(t){sel={...TODAY};j={...TODAY};finish();}
    else if(c){sel=null;finish('');}
    else if(d){sel={jy:j.jy,jm:j.jm,jd:+d.dataset.d};finish();}
  });
  function finish(clear){const v=clear!==undefined?clear:(sel?sel.jy+'/'+pad2(sel.jm)+'/'+pad2(sel.jd):'');
    dpClose();const inp=document.getElementById(onPickId);if(inp){inp.value=v===''?'':dFa(v);inp.dataset.val=v;}
    if(window[onPickId+'_cb'])window[onPickId+'_cb'](v);}
  el.style.top=Math.min(r.bottom+8,innerHeight-360)+'px';
  el.style.left=Math.min(r.left,innerWidth-290)+'px';
  document.body.appendChild(el);DP=el;
  setTimeout(()=>document.addEventListener('click',dpDocClick,{once:true}),0);
}
function dpDocClick(e){if(DP&&!DP.contains(e.target))dpClose();}
function dpClose(){if(DP){DP.remove();DP=null;}}
function dpField(id,label,val){
  return `<div class="fld"><label class="lbl">${label}</label>
   <div class="inp-ic" style="position:relative"><input id="${id}" class="inp" readonly value="${val?dFa(val):''}" placeholder="انتخاب تاریخ" data-val="${val||''}"
    onclick="dpOpen(this,this.dataset.val,'${id}')" style="cursor:pointer"><span style="position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--t3);pointer-events:none">${ic('cal',15)}</span></div></div>`;
}

/* ---------- data table ---------- */
function tblInit(id,cols,rows,opts){
  opts=opts||{};
  if(!S.tbls[id])S.tbls[id]={sort:opts.sort||null,dir:opts.dir||1,pg:1,sel:[]};
  const st=S.tbls[id];
  let data=rows.slice();
  if(st.sort){const col=cols.find(c=>c.k===st.sort);
    data.sort((a,b)=>{let va=col.sv?col.sv(a):(a[st.sort]||''),vb=col.sv?col.sv(b):(b[st.sort]||'');
      if(typeof va==='number'&&typeof vb==='number')return (va-vb)*st.dir;
      return String(va).localeCompare(String(vb),'fa')*st.dir;});}
  const per=opts.per||8;const pages=Math.max(1,Math.ceil(data.length/per));
  if(st.pg>pages)st.pg=pages;
  const pageData=data.slice((st.pg-1)*per,st.pg*per);
  st.pageIds=pageData.map(r=>r.id);
  const colSel=cols.filter(c=>!c.hideMob);
  const html=`<div class="tbl-wrap">
    ${st.sel.length?`<div class="bulkbar" style="margin:0;border:0;border-bottom:1px solid var(--bd);border-radius:0">${ic('check',15)} ${fa(st.sel.length)} مورد انتخاب شد
      <button class="btn btn-sm btn-ghost" onclick="tblBulk('${id}','done')">انجام شد</button>
      <button class="btn btn-sm btn-ghost" onclick="tblBulk('${id}','export')">خروجی</button>
      <button class="ibtn mr-auto" onclick="tblClearSel('${id}')" aria-label="لغو انتخاب">${ic('x',14)}</button></div>`:''}
    <div class="tbl-scroll"><table class="tbl ${opts.mob!==false?'mobilize':''}" id="tbl-${id}">
    <thead><tr>
      ${opts.sel?`<th style="width:34px"><span class="ckb"><input type="checkbox" ${pageData.length&&pageData.every(r=>st.sel.includes(r.id))?'checked':''} onchange="tblSelAll('${id}')"><span class="bx">${ic('check',11)}</span></span></th>`:''}
      ${cols.map(c=>`<th class="${c.num?'num':''} ${c.k?'srt':''} ${c.hideMob?'hide-lg':''}" style="${c.w?'width:'+c.w:''}" ${c.k?`onclick="tblSort('${id}','${c.k}')"`:''} ${c.hideMob?'data-l="'+c.l+'"':''}>
        ${c.l}${st.sort===c.k?` <span style="color:var(--pr3)">${ic('chevdown',11)}</span>`:''}</th>`).join('')}
      ${opts.rowAct?`<th style="width:44px"></th>`:''}
    </tr></thead>
    <tbody>
    ${pageData.length?pageData.map(r=>`<tr class="${opts.onRow?'clk':''} ${st.sel.includes(r.id)?'row-sel':''}" ${opts.onRow?`onclick="(${opts.onRow})('${r.id}')"`:''} data-id="${r.id}">
      ${opts.sel?`<td data-l="انتخاب" onclick="event.stopPropagation()"><span class="ckb"><input type="checkbox" ${st.sel.includes(r.id)?'checked':''} onchange="tblSel('${id}','${r.id}')"><span class="bx">${ic('check',11)}</span></span></td>`:''}
      ${cols.map(c=>`<td class="${c.num?'num':''} ${c.cls||''} ${c.mobFull?'full':''} ${c.hideMob?'hide-lg':''}" data-l="${c.l}">${c.r?c.r(r):(r[c.k]==null?'—':r[c.k])}</td>`).join('')}
      ${opts.rowAct?`<td data-l="عملیات" onclick="event.stopPropagation()">${opts.rowAct(r)}</td>`:''}
    </tr>`).join(''):(`<tr><td colspan="${cols.length+2}"><div class="state"><div class="ic">${ic(opts.emptyIc||'search',24)}</div><h4>${opts.empty||'موردی یافت نشد'}</h4><p>${opts.emptySub||'عبارت جستجو یا فیلترها را تغییر دهید.'}</p>${opts.emptyCta?`<div class="row">${opts.emptyCta}</div>`:''}</div></td></tr>`)}
    </tbody></table></div>
    ${pages>1?`<div class="card-f" style="justify-content:space-between">
      <span class="ts">نمایش ${fa((st.pg-1)*per+1)}–${fa(Math.min(st.pg*per,data.length))} از ${fa(data.length)} مورد</span>
      <div class="row g6"><button class="btn btn-sm btn-sec" ${st.pg===1?'disabled':''} onclick="tblPg('${id}',-1)">${ic('chevright',14)} قبلی</button>
      ${Array.from({length:pages},(_,i)=>i+1).slice(Math.max(0,st.pg-3),Math.max(0,st.pg-3)+5).map(p=>`<button class="btn btn-sm ${p===st.pg?'btn-pr':'btn-ghost'}" style="min-width:30px;padding:0" onclick="tblPgTo('${id}',${p})">${fa(p)}</button>`).join('')}
      <button class="btn btn-sm btn-sec" ${st.pg===pages?'disabled':''} onclick="tblPg('${id}',1)">بعدی ${ic('chevleft',14)}</button></div></div>`:(data.length?`<div class="card-f ts">مجموع ${fa(data.length)} مورد</div>`:'')}
  </div>`;
  return html;
}
function tblSort(id,k){const st=S.tbls[id];if(st.sort===k)st.dir*=-1;else{st.sort=k;st.dir=1;}render();}
function tblPg(id,d){S.tbls[id].pg+=d;render();}
function tblPgTo(id,p){S.tbls[id].pg=p;render();}
function tblSel(id,rid){const st=S.tbls[id];const i=st.sel.indexOf(rid);if(i>-1)st.sel.splice(i,1);else st.sel.push(rid);render();}
function tblSelAll(id){const st=S.tbls[id];st.sel=st.sel.length?[]:(st.pageIds||[]).slice();render();}
function tblClearSel(id){S.tbls[id].sel=[];render();}
function tblBulk(id,act){const st=S.tbls[id];
  if(act==='done'){toast('ok','انجام شد',fa(st.sel.length)+' مورد به «انجام شده» منتقل شد');}
  else{toast('info','خروجی در حال آماده‌سازی است','فایل CSV در نسخه متصل به بک‌اند قابل دانلود است.');}
  st.sel=[];render();}

/* ---------- charts (RTL-aware SVG) ---------- */
function chLine(data,{h=150,max,fmt,color='var(--pr)',fill=true,id=uid('ch')}={}){
  const W=560,H=h,p=14;const n=data.length;
  const mx=max||Math.max(...data)*1.15;const mn=0;
  const X=i=>W-p-(i/(n-1))*(W-2*p);
  const Y=v=>H-p-((v-mn)/(mx-mn))*(H-2*p);
  const pts=data.map((v,i)=>[X(i),Y(v)]);
  const line=pts.map((pt,i)=>(i?'L':'M')+pt[0].toFixed(1)+' '+pt[1].toFixed(1)).join(' ');
  const area=line+` L ${(W-p).toFixed(1)} ${H-p} L ${p} ${H-p} Z`;
  let grid='';for(let g=1;g<=3;g++){const gy=p+(g/4)*(H-2*p);grid+=`<line x1="${p}" x2="${W-p}" y1="${gy}" y2="${gy}" stroke="var(--bd)" stroke-dasharray="3 5" stroke-width="1"/>`;}
  const dots=pts.map((pt,i)=>i===n-1?`<circle cx="${pt[0]}" cy="${pt[1]}" r="4" fill="${color}" stroke="var(--s1)" stroke-width="2"/>`:`<circle cx="${pt[0]}" cy="${pt[1]}" r="2.5" fill="${color}"/>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none" role="img">${grid}
    ${fill?`<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".22"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><path d="${area}" fill="url(#${id})"/>`:''}
    <path d="${line}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>${dots}</svg>`;
}
function chBars(data,{h=150,color='var(--pr)',color2='var(--bd2)',fmt}={}){
  const W=560,H=h,p=14;const n=data.length;
  const mx=Math.max(...data.map(d=>Math.max(d.v,d.v2||0)))*1.15;
  const bw=(W-2*p)/n;const gw=Math.min(10,bw*.22);
  let out='';
  data.forEach((d,i)=>{
    const x=W-p-(i+1)*bw+gw/2;
    const w=bw-gw;
    if(d.v2!=null){const h2=(d.v2/mx)*(H-2*p);const h1=(d.v/mx)*(H-2*p);
      out+=`<g class="cbar-g"><rect x="${x}" y="${H-p-h2}" width="${w}" height="${h2}" rx="3" fill="${color2}" fill-opacity=".28"/>
            <rect x="${x}" y="${H-p-h1}" width="${w}" height="${h1}" rx="3" fill="${color}" fill-opacity=".42"/></g>`;}
    else{const h1=(d.v/mx)*(H-2*p);
      out+=`<g class="cbar-g"><rect x="${x}" y="${H-p-h1}" width="${w}" height="${Math.max(2,h1)}" rx="3" fill="${color}" fill-opacity="${d.dim?.3:.35}"/></g>`;}
  });
  return `<svg class="ch-bars" viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none" role="img">${out}</svg>`;
}
function chDonut(items,{size=128,sw=13,center}={}){
  const r=(size-sw)/2,c=2*Math.PI*r;const tot=items.reduce((s,i)=>s+i.v,0)||1;
  let off=c*0.25;// شروع از بالا
  let segs='';
  items.forEach(it=>{const len=(it.v/tot)*c;
    segs+=`<circle r="${r}" cx="${size/2}" cy="${size/2}" fill="none" stroke="${it.c}" stroke-width="${sw}" stroke-dasharray="${len-2.5} ${c-len+2.5}" stroke-dashoffset="${off}" stroke-linecap="round"/>`;
    off-=len;});
  return `<div style="position:relative;width:${size}px;height:${size}px;flex:none">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:scaleX(-1)">${segs}</svg>
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
      <b style="font-size:19px;font-weight:600">${center?center.v:''}</b><span class="t-cap">${center?center.l:''}</span></div></div>`;
}
function spark(data,{w=90,h=30,color='var(--pr)'}={}){
  const mx=Math.max(...data),mn=Math.min(...data);
  const pts=data.map((v,i)=>[(i/(data.length-1))*w,h-3-((v-mn)/((mx-mn)||1))*(h-6)]);
  const d=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><path d="${d}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/></svg>`;
}
function ringPct(pct,{size=64,sw=6,color='var(--pr)',label}={}){
  const r=(size-sw)/2,c=2*Math.PI*r;
  return `<div style="position:relative;width:${size}px;height:${size}px;flex:none">
   <svg width="${size}" height="${size}" style="transform:scaleX(-1)">
    <circle r="${r}" cx="${size/2}" cy="${size/2}" fill="none" stroke="var(--s4)" stroke-width="${sw}"/>
    <circle r="${r}" cx="${size/2}" cy="${size/2}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${(c*pct/100).toFixed(1)} ${c.toFixed(1)}" stroke-dashoffset="${(c*0.25).toFixed(1)}"/></svg>
   <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:${size/4}px">${label||fa(pct)+'٪'}</div></div>`;
}
const chartLbls=arr=>`<div class="chart-lbls">${arr.map(a=>`<span>${a}</span>`).join('')}</div>`;

/* ---------- small shared renderers ---------- */
const prioBadge=p=>{const x=PRIOS.find(q=>q.id===p)||PRIOS[2];return `<span class="prio ${x.cls}">${ic('flag',10)}${x.t}</span>`;};
const stBadge=st=>{const map={'فعال':'ok','پایان‌یافته':'mut','بررسی':'warn','متوقف':'err'};return `<span class="badge bd-${map[st]||'mut'}"><span class="dot"></span>${st}</span>`;};
const payBadge=p=>({ 'به‌روز':'bd-ok','معوق':'bd-err','بخشی پرداخت شده':'bd-warn' }[p]?`<span class="badge ${({'به‌روز':'bd-ok','معوق':'bd-err','بخشی پرداخت شده':'bd-warn'})[p]}">${p}</span>`:`<span class="badge bd-mut">${p}</span>`);
const invBadge=st=>{const m={'پیش‌نویس':'mut','ارسال شده':'info','بخشی پرداخت شده':'warn','پرداخت شده':'ok','سررسید گذشته':'err','تایید شده':'ok','منقضی':'err'};return `<span class="badge bd-${m[st]||'mut'}"><span class="dot"></span>${st}</span>`;};
const leaveBadge=st=>{const m={'در انتظار تایید':'warn','تایید شده':'ok','رد شده':'err'};return `<span class="badge bd-${m[st]||'mut'}">${st}</span>`;};
const dueBadge=due=>{if(!due)return'';const cls=dueCls(due);return `<span class="due ${cls==='nrm'?'nrm':cls}">${ic('cal',11)}${dueTxt(due)}</span>`;};
const statusSel=st=>`<span class="badge bd-mut">${st}</span>`;


/* ---------- task labels ---------- */
function lbChip(id){const l=lb(id);if(!l)return'';const soft=LB_SOFT[l.c]||'var(--s2)';
  return `<span class="lb" style="background:${soft};color:${LB_COLORS[l.c]}" title="${esc(l.d||l.n)}"><i style="background:${LB_COLORS[l.c]}"></i>${esc(l.n)}</span>`;}
function lbPicker(selected,onchgId){
  return `<div class="row g6 wrap">${LABELS.map(l=>`<button type="button" class="lb" style="background:${selected.includes(l.id)?LB_SOFT[l.c]:'var(--s2)'};color:${LB_COLORS[l.c]};border:1px solid ${selected.includes(l.id)?'transparent':'var(--bd)'};cursor:pointer" onclick="tglTaskLbl('${onchgId}','${l.id}')"><i style="background:${LB_COLORS[l.c]}"></i>${esc(l.n)}</button>`).join('')}<button type="button" class="lb-add" onclick="lblModal()">${ic('plus',11)} برچسب جدید</button></div>`;}
/* tglTaskLbl → در 18-tasks.js (نسخه پذیرنده _new) */
function lblModal(editId){
  const l=editId?lb(editId):null;
  openModal({title:l?'ویرایش برچسب':'برچسب جدید',body:`
   ${fld('نام برچسب',`<input class="inp" id="lb-n" value="${l?esc(l.n):''}" placeholder="مثلاً: تدوین">`)}
   <div class="mt12">${fld('رنگ',`<div class="row g8 wrap" id="lb-c-wrap">${Object.entries(LB_COLORS).map(([k,v])=>`<button type="button" class="lb-swatch ${((l?l.c:'purple')===k)?'on':''}" data-c="${k}" style="background:${v}" aria-label="${k}"></button>`).join('')}</div>`)}</div>
   <div class="mt12">${fld('توضیح (اختیاری)',`<input class="inp" id="lb-d" value="${l?esc(l.d||''):''}" placeholder="کاربرد این برچسب…">`)}</div>
   <div class="mt16"><span class="t-lbl">پیش‌نمایش</span><div class="mt8" id="lb-prev"></div></div>`,
  footer:`<button class="btn btn-pr" onclick="lblSave('${editId||''}')">${l?'ذخیره':'ایجاد برچسب'}</button><button class="btn btn-ghost" onclick="closeModal()">انصراف</button>`});
  setTimeout(()=>{const n=$('#lb-n');if(n){n.focus();n.addEventListener('input',lblPrev);lblPrev();}},40);
  $$('#lb-c-wrap .lb-swatch').forEach(b=>b.addEventListener('click',()=>{$$('#lb-c-wrap .lb-swatch').forEach(x=>x.classList.remove('on'));b.classList.add('on');lblPrev();}));
  function lblPrev(){const c=$('#lb-c-wrap .lb-swatch.on');const col=c?c.dataset.c:'purple';const el=$('#lb-prev');if(el)el.innerHTML=`<span class="lb" style="background:${LB_SOFT[col]};color:${LB_COLORS[col]}"><i style="background:${LB_COLORS[col]}"></i>${esc(($('#lb-n').value||'برچسب'))}</span>`;}
}
function lblSave(editId){
  const n=$('#lb-n').value.trim();if(!n){$('#lb-n').classList.add('err');return;}
  const c=$('#lb-c-wrap .lb-swatch.on');const col=c?c.dataset.c:'purple';const d=$('#lb-d').value.trim();
  if(editId){const l=lb(editId);l.n=n;l.c=col;l.d=d;}else LABELS.push({id:uid('lb'),n,c:col,d});
  closeModal();render();
  const tfLbs=document.getElementById('tf-lbs');if(tfLbs&&typeof tfLbPicker==='function')tfLbs.innerHTML=tfLbPicker();
  toast('ok',editId?'برچسب به‌روزرسانی شد':'برچسب ایجاد شد','«'+n+'» در سراسر فضای کاری قابل استفاده است.');
}
/* ---------- checklist (detail drawer · v2.6 permission-aware) ---------- */
function ckBlock(t,ce){
  ce=ce!==false;
  const done=ckDone(t),total=t.checklist.length,pct=total?Math.round(done/total*100):0;
  return `<div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
    <h4 class="t-h4">چک‌لیست <span class="t-cap">(${fa(total)} مورد)</span></h4>
    <span class="t-cap num">${ic('check',12)} ${fa(done)} / ${fa(total)} انجام شده · ${fa(pct)}٪</span></div>
   <div class="prog mb12 mt8"><i style="width:${pct}%"></i></div>
   ${t.checklist.map((c,i)=>`<div class="ck-item ${c.completed?'done':''}">
     <label class="ckb"><input type="checkbox" ${c.completed?'checked':''} ${ce?'':'disabled'} onchange="ckTgl('${t.id}',${i})"><span class="bx">${ic('check',11)}</span></label>
     <span class="txt grow" title="${esc(c.title)}">${esc(c.title)}</span>
     ${ce?`<span class="ord"><button type="button" data-tip="جابه‌جایی به بالا" onclick="ckMove('${t.id}',${i},-1)" ${i===0?'disabled style="opacity:.3"':''} style="transform:rotate(180deg)">${ic('chevdown',11)}</button><button type="button" data-tip="جابه‌جایی به پایین" onclick="ckMove('${t.id}',${i},1)" ${i===total-1?'disabled style="opacity:.3"':''}>${ic('chevdown',11)}</button></span>
     <button type="button" class="ibtn" data-tip="ویرایش" onclick="ckEdit('${t.id}',${i})">${ic('edit',13)}</button>
     <button type="button" class="ibtn ibtn-err" data-tip="حذف" onclick="ckDel('${t.id}',${i})">${ic('trash',13)}</button>`:''}
   </div>`).join('')||`<div class="empty-mini">${ce?'هنوز موردی ثبت نشده است — اولین مورد را اضافه کنید.':'موردی ثبت نشده است.'}</div>`}
   ${ce?`<div class="ck-add"><input class="inp grow" id="ck-new" placeholder="افزودن مورد جدید… (Enter)" onkeydown="if(event.key==='Enter')ckAdd('${t.id}')"><button type="button" class="btn btn-sec btn-sm" onclick="ckAdd('${t.id}')">${ic('plus',13)} افزودن مورد</button></div>`:'<span class="hint">'+ic('lock',11)+' برای تغییر چک‌لیست به مجوز ویرایش تسک نیاز دارید.</span>'}`;
}
function ckTgl(tid,i){if(!can('tasks','e'))return;const t=task(tid);const c=t.checklist[i];c.completed=!c.completed;c.updatedAt=Date.now();render();if($('#ovl'))taskDrawer(tid);}
function ckAdd(tid){if(!can('tasks','e'))return;const t=task(tid);const v=$('#ck-new').value.trim();if(!v)return;t.checklist.push(ckItem(tid,v,t.checklist.length,false));render();if($('#ovl'))taskDrawer(tid);setTimeout(()=>{const el=$('#ck-new');if(el)el.focus();},30);}
function ckDel(tid,i){if(!can('tasks','e'))return;const t=task(tid);t.checklist.splice(i,1);t.checklist.forEach((c,x)=>c.order=x);render();if($('#ovl'))taskDrawer(tid);}
function ckMove(tid,i,d){if(!can('tasks','e'))return;const t=task(tid);const j=i+d;if(j<0||j>=t.checklist.length)return;const a=t.checklist;[a[i],a[j]]=[a[j],a[i]];a.forEach((c,x)=>{c.order=x;c.updatedAt=Date.now();});render();if($('#ovl'))taskDrawer(tid);}
function ckEdit(tid,i){if(!can('tasks','e'))return;const c=task(tid).checklist[i];
  openModal({title:'ویرایش مورد چک‌لیست',body:fld('عنوان',`<input class="inp" id="cke-t" value="${esc(c.title)}">`),
  footer:`<button class="btn btn-pr" onclick="ckEditSave('${tid}',${i})">ذخیره</button><button class="btn btn-ghost" onclick="closeModal()">انصراف</button>`});}
function ckEditSave(tid,i){const c=task(tid).checklist[i];const v=($('#cke-t').value||'').trim();if(v)c.title=v;c.updatedAt=Date.now();closeModal();render();if($('#ovl'))taskDrawer(tid);}

/* empty / loading blocks */
const emptyState=(title,sub,cta,icon)=>`<div class="state"><div class="ic">${ic(icon||'folder',24)}</div><h4>${title}</h4><p>${sub||''}</p>${cta?`<div class="row">${cta}</div>`:''}</div>`;
const loadingBlock=h=>`<div class="card"><div style="padding:16px;display:flex;flex-direction:column;gap:16px">
  <div class="skel" style="height:${h||18}px;width:35%"></div>
  <div class="skel" style="height:12px;width:85%"></div>
  <div class="skel" style="height:12px;width:65%"></div>
  <div class="skel" style="height:${(h||18)*3}px;width:100%"></div></div></div>`;
function withLoading(key,htmlFn){
  if(S.loaded[key])return htmlFn();
  setTimeout(()=>{S.loaded[key]=true;render();},420);
  return `<div class="grid" style="gap:16px">${loadingBlock(16)}${loadingBlock(120)}</div>`;
}
/* page header helper */
function pgHead(title,sub,actions,crumb){
  return `<div class="pg-head"><div class="grow">
    ${crumb?`<div class="crumb">${crumb.map((c,i)=>i?`<span class="sep">${ic('chevleft',11)}</span>`+(c.h?`<a href="${c.h}">${c.t}</a>`:`<span>${c.t}</span>`):`<a href="#/dashboard">${c.t}</a>`).join('')}</div>`:''}
    <h1 class="t-h1">${title}</h1>${sub?`<p class="t-bs mt4">${sub}</p>`:''}</div>
    ${actions?`<div class="pg-actions">${actions}</div>`:''}</div>`;
}
/* segment + tabs helpers */
function seg(id,items,cur,onchg){
  return `<div class="seg">${items.map(i=>`<button class="${cur===i.v?'on':''}" onclick="${onchg}('${i.v}')">${i.ic?ic(i.ic,14):''}${i.t}</button>`).join('')}</div>`;
}
function tabsBar(id,items,cur,onchg){
  return `<div class="tabs">${items.map(i=>`<button class="tab ${cur===i.v?'on':''}" onclick="${onchg}('${i.v}')">${i.t}${i.cnt!=null?`<span class="cnt">${fa(i.cnt)}</span>`:''}</button>`).join('')}</div>`;
}
function filterbar(inner){
  return `<div class="filterbar" id="filterbar">${inner}</div>
  <button class="btn btn-sec btn-sm fbtn-mob mb12" style="width:100%" onclick="$('#filterbar').classList.toggle('open');">${ic('filter',14)} فیلترها</button>`;
}
