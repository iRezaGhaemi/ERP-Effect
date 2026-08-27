/* ============================================================
   EFFECT ERP · Core — Jalali calendar engine, formatters, utils
   ============================================================ */
'use strict';

/* ---- Gregorian ⇄ JDN (Calendrical Calculations, exact) ---- */
function g2jdn(y,m,d){const a=Math.floor((14-m)/12),Y=y+4800-a,M=m+12*a-3;
  return d+Math.floor((153*M+2)/5)+365*Y+Math.floor(Y/4)-Math.floor(Y/100)+Math.floor(Y/400)-32045;}
function jdn2g(j){const a=j+32044,b=Math.floor((4*a+3)/146097),c=a-Math.floor(146097*b/4),
  d=Math.floor((4*c+3)/1461),e=c-Math.floor(1461*d/4),m=Math.floor((5*e+2)/153);
  return{D:e-Math.floor((153*m+2)/5)+1,M:m+3-12*Math.floor(m/10),Y:100*b+d-4800+Math.floor(m/10)};}

/* ---- Jalali ⇄ JDN via verified Nowruz epochs (astronomical, 1398–1410) ---- */
const NOWRUZ={1398:g2jdn(2019,3,21),1399:g2jdn(2020,3,20),1400:g2jdn(2021,3,21),1401:g2jdn(2022,3,21),
  1402:g2jdn(2023,3,21),1403:g2jdn(2024,3,20),1404:g2jdn(2025,3,21),1405:g2jdn(2026,3,21),
  1406:g2jdn(2027,3,21),1407:g2jdn(2028,3,20),1408:g2jdn(2029,3,20),1409:g2jdn(2030,3,21),1410:g2jdn(2031,3,21)};
const JY_MIN=1398,JY_MAX=1409;
function jLeap(jy){const a=NOWRUZ[jy],b=NOWRUZ[Math.min(jy+1,JY_MAX)];return b-a===366;}
function j2jdn(jy,jm,jd){const base=NOWRUZ[jy];if(base==null)return NOWRUZ[1405]+155;
  let off=jd-1;
  for(let m=1;m<jm;m++)off+=jMonthLen(jy,m);
  return base+off;}
function jMonthLen(jy,jm){if(jm<=6)return 31;if(jm<=11)return 30;return jLeap(jy)?30:29;}
function jdn2j(jdn){
  let jy=JY_MIN;const keys=Object.keys(NOWRUZ).map(Number).sort((a,b)=>a-b);
  for(let i=0;i<keys.length-1;i++){if(jdn>=NOWRUZ[keys[i+1]])jy=keys[i+1];}
  let rem=jdn-NOWRUZ[jy],jm=1,jd=1;
  while(rem>=jMonthLen(jy,jm)&&jm<12){rem-=jMonthLen(jy,jm);jm++;}
  jd=rem+1;return{jy,jm,jd};}

/* ---- constants & formatting ---- */
const FA_WD=['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه'];
const FA_WD_S=['ش','ی','د','س','چ','پ','ج'];
const FA_MONTHS=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
const FA_DIGITS='۰۱۲۳۴۵۶۷۸۹';
const fa=s=>String(s).replace(/\d/g,d=>FA_DIGITS[d]);
const enDigits=s=>String(s).replace(/[۰-۹]/g,d=>FA_DIGITS.indexOf(d));
const pad2=n=>(n<10?'0':'')+n;
function faMoney(n,unit){let s=Math.round(n).toString();let out='',c=0;for(let i=s.length-1;i>=0;i--){out=s[i]+out;c++;if(c%3===0&&i>0)out='٬'+out;}return fa(out)+(unit===false?'':' تومان');}
function faCompact(n){ if(n>=1e9)return fa((n/1e9).toFixed(1).replace(/\.0$/,''))+' میلیارد'; if(n>=1e6)return fa((n/1e6).toFixed(1).replace(/\.0$/,''))+' میلیون'; if(n>=1e3)return fa(Math.round(n/1e3))+' هزار'; return fa(n);}
const jStr=j=>fa(j.jy)+'/'+fa(pad2(j.jm))+'/'+fa(pad2(j.jd));                       // ۱۴۰۵/۰۶/۰۵
const jStrL=j=>fa(j.jd)+' '+FA_MONTHS[j.jm-1]+' '+fa(j.jy);                          // ۵ شهریور ۱۴۰۵
const jStrM=j=>fa(j.jd)+' '+FA_MONTHS[j.jm-1];                                       // ۵ شهریور
function jDow(j){return (j2jdn(j.jy,j.jm,j.jd)+1)%7;}                                // 0=یکشنبه..6=شنبه
const jDowFa=j=>FA_WD[(j2jdn(j.jy,j.jm,j.jd)+2)%7];                                  // نام روز
function jAdd(j,days){return jdn2j(j2jdn(j.jy,j.jm,j.jd)+days);}
function jDiff(a,b){return j2jdn(b.jy,b.jm,b.jd)-j2jdn(a.jy,a.jm,a.jd);}
const TODAY=jdn2j(g2jdn(2026,8,27));                                                  // ۱۴۰۵/۰۶/۰۵ پنجشنبه
const TODAY_JDN=j2jdn(TODAY.jy,TODAY.jm,TODAY.jd);
function relTime(mins){ if(mins<1)return'همین حالا'; if(mins<60)return fa(mins)+' دقیقه پیش';
  if(mins<1440)return fa(Math.floor(mins/60))+' ساعت پیش';
  const d=Math.floor(mins/1440); if(d===1)return'دیروز'; if(d<7)return fa(d)+' روز پیش';
  if(d<30)return fa(Math.floor(d/7))+' هفته پیش'; return fa(Math.floor(d/30))+' ماه پیش';}
function dueCls(dueStr){ // 'YYYY/MM/DD' fa digits → badge class
  const g=v=>enDigits(v);const [y,m,d]=dueStr.split('/').map(g).map(Number);
  const diff=jDiff(TODAY,{jy:y,jm:m,jd:d});
  if(diff<0)return'over'; if(diff<=2)return'soon'; if(diff<=7)return'nrm'; return'nrm';}
function dueTxt(dueStr){const g=v=>enDigits(v);const [y,m,d]=dueStr.split('/').map(g).map(Number);
  const diff=jDiff(TODAY,{jy:y,jm:m,jd:d});
  if(diff===0)return'امروز'; if(diff===1)return'فردا'; if(diff===-1)return'دیروز';
  if(diff<0)return fa(Math.abs(diff))+' روز گذشته'; if(diff<7)return fa(diff)+' روز دیگر'; return dueStr;}

/* ---- tiny DOM & misc helpers ---- */
const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const uid=p=>p+'-'+Math.random().toString(36).slice(2,7);
let _z=200;const zTop=()=>++_z;
function hue(s){let h=0;for(let i=0;i<s.length;i++)h=(h*s.charCodeAt(i)+31)%360;return h;}
const AV_COLORS=['#6f6aeb','#0ea5e9','#f59e0b','#10b981','#ef4444','#8b5cf6','#06b6d4','#d946ef','#84cc16','#f97316'];
function avHue(name){return AV_COLORS[hue(name)%AV_COLORS.length];}
const initials=n=>n.split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join(' ');
/* ---------- avatar system (photo sprite + initials fallback) ---------- */
const AV_IMG='__AVATAR_IMG__'; /* 4x4 sprite: rows 0-1 men, rows 2-3 women */
const AV_SLOTS={ /* employee name → sprite cell index */
 'رضا قایمی':0,'محمد رضایی':1,'علی کریمی':2,'امیر تهرانی':3,'حسین شریفی':4,'بهرام کاویانی':5,'کاوه دهقان':6,
 'سارا احمدی':8,'نگار محمدی':9,'مریم حسینی':10,'زهرا نوری':11,'الهام رستمی':12,'نیلوفر آرام':13};
const AV_EXTRA={m:7,f:14}; /* سلول‌های آزاد برای مخاطبین مشتریان */
function avSlot(name){ if(AV_SLOTS[name]!=null && EMP_BY_NAME[name] && EMP_BY_NAME[name].img!==null) return AV_SLOTS[name]; return null; }
function avPos(idx){ const col=idx%4,row=Math.floor(idx/4); return `${(col/3*100).toFixed(0)}% ${(row/3*100).toFixed(0)}%`; }
function av(name,size,cls){
  if(typeof EMP!=='undefined'){EMP.forEach(e=>{if(!(e.name in EMP_BY_NAME))EMP_BY_NAME[e.name]=e;});}
  const sz=size||'md';
  const slot=avSlot(name);
  if(slot!=null){
    const e=EMP_BY_NAME[name]||{};
    return `<span class="av photo ${sz} ${cls||''}" role="img" aria-label="${esc(name)}" data-emp="${e.id||''}" style="background-image:url(${AV_IMG});background-position:${avPos(slot)}"></span>`;
  }
  return `<span class="av ${sz} ${cls||''}" style="background:${avHue(name)}" data-emp="${(EMP_BY_NAME[name]||{}).id||''}" aria-hidden="true">${initials(name)}</span>`;
}
const EMP_BY_NAME={};
function avStack(names,n){const shown=names.slice(0,n||3),rest=names.length-shown.length;
  let h='<span class="av-stack">'+shown.map(x=>typeof x==='string'?av(x,'xs'):x).join('');
  if(rest>0)h+=`<span class="av xs" style="background:var(--s4);color:var(--t2);border-color:var(--s1)">+${fa(rest)}</span>`;
  return h+'</span>';}
function go(hash){location.hash=hash;}
const monthName=m=>FA_MONTHS[m-1];
function greeting(){const h=new Date().getHours();return h<12?'صبح بخیر':h<17?'ظهر بخیر':h<20?'عصر بخیر':'شب بخیر';}
function debounce(fn,ms){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);};}
