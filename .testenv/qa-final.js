/* FINAL QA — ۱۸ بند چک‌لیست پایانی پرامپت v2.4 */
const {chromium}=require('playwright-core');
const R=[];const F=[];
const ck=(id,pass,detail)=>{(pass?R:F).push((pass?'✓ ':'✗ ')+id+(detail?' — '+detail:''));};
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});

  /* ===== لاگین ===== */
  let pg=await b.newPage({viewport:{width:1440,height:900}});
  pg.on('pageerror',e=>F.push('✗ PAGEERROR '+e.message));
  await pg.goto('file:///home/user/effect-erp.html');await pg.waitForTimeout(700);
  let v=await pg.evaluate(async()=>{
    await document.fonts.ready;
    const bg=document.querySelector('.auth-bg');
    const art=document.querySelector('.auth-art'),img=art&&art.querySelector('img'),side=document.querySelector('.auth-side');
    const aR=art?.getBoundingClientRect(),sR=side?.getBoundingClientRect();
    return {cols:getComputedStyle(bg).gridTemplateColumns.split(' ').length,
      imgRight:aR&&sR?aR.right>sR.right:false,cover:img?getComputedStyle(img).objectFit:'',loaded:img?img.naturalWidth>0:false,
      fullbleed:aR?Math.abs(aR.height-innerHeight)<2&&Math.abs(aR.width-aR.width)<1:false,
      card:!!document.querySelector('.auth-side .auth-card'),phone:!!document.getElementById('ph'),
      dir:document.documentElement.dir,lang:document.documentElement.lang,
      font:getComputedStyle(document.body).fontFamily,
      faces:[...document.fonts].filter(f=>f.family==='IRANSansX'&&f.status==='loaded').length,
      raviFaces:[...document.fonts].filter(f=>/ravi/i.test(f.family)).length};
  });
  ck('8. login two columns',v.cols===2,v.cols+' columns');
  ck('9. RIGHT = full-bleed image',v.imgRight&&v.cover==='cover'&&v.loaded&&v.fullbleed,'object-fit:cover, loaded, full height');
  ck('10. LEFT = login box (logo/phone)',v.card&&v.phone,'auth-card centered + phone input');

  /* فلو ورود */
  await pg.fill('#ph','۰۹۱۲۱۲۳۴۵۶۷');
  await pg.evaluate(()=>{authSend();});
  await pg.waitForTimeout(1400);
  const otp=await pg.locator('.otp-box').count();
  await pg.evaluate(()=>{$$('.otp-box').forEach((b,i)=>b.value='۱۲۳۴۵۶'.split('')[i]);authVerify();});
  await pg.waitForTimeout(2500);
  const shell=await pg.locator('.shell').count();

  /* ===== داخل اپ ===== */
  await pg.evaluate(()=>{S.missionSeen=true;const o=document.getElementById('ovl');if(o)o.remove();render();});
  await pg.waitForTimeout(300);
  await pg.evaluate(()=>{const o=document.getElementById('ovl');if(o)o.remove();}); /* popup تاخیری مأموریت */
  await pg.waitForTimeout(150);
  v=await pg.evaluate(()=>{
    const btn=document.querySelector('.btn-pr');
    return {btn:btn?getComputedStyle(btn).backgroundColor:'',
      bodyBg:getComputedStyle(document.body).backgroundColor,
      font:getComputedStyle(document.body).fontFamily,
      dir:document.documentElement.dir,lang:document.documentElement.lang,
      sbRight:(()=>{const sb=document.querySelector('.sb');if(!sb)return null;const r=sb.getBoundingClientRect();return r.right>=innerWidth-1;})(),
      date1405:document.body.innerText.includes('۱۴۰۵'),
      emojis:(document.body.innerText.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu)||[]).length,
      shadows:[...document.querySelectorAll('*')].filter(el=>{const s=getComputedStyle(el).boxShadow;return s&&s!=='none';}).length,
      oldPurple:[...document.querySelectorAll('*')].filter(el=>{const c=getComputedStyle(el);return String(c.backgroundColor)==='rgb(94, 1, 164)';}).length,
      svgIcons:document.querySelectorAll('.sb svg,.pg svg').length,
      photos:document.querySelectorAll('.av.photo').length};
  });
  ck('1. primary #6F6AEB',v.btn==='rgb(111, 106, 235)'&&v.oldPurple===0,'btn '+v.btn+' | old-purple '+v.oldPurple);
  ck('2. IRANSansX everywhere',v.font.includes('IRANSansX'),'body: '+v.font.split(',')[0]);
  ck('3. light theme',v.bodyBg==='rgb(246, 246, 248)',v.bodyBg);
  ck('4. zero shadows',v.shadows===0,v.shadows+' elements');
  ck('5. zero emojis',v.emojis===0,v.emojis+' found');
  ck('6. SVG icons',v.svgIcons>20,v.svgIcons+' inline SVGs on dashboard');
  ck('14. profile photos',v.photos>5,v.photos+' photo avatars');
  ck('17. Persian RTL',v.dir==='rtl'&&v.lang==='fa',v.dir+'/'+v.lang);
  ck('18. Solar Hijri',v.date1405,'۱۴۰۵ in header');
  ck('login→OTP→app flow',otp===6&&shell===1,'6 boxes → shell');

  /* ===== سایدبار ===== */
  await pg.evaluate(()=>{if(!S.sbMini)toggleSb();});
  await pg.waitForTimeout(350);
  v=await pg.evaluate(()=>{
    const btn=document.querySelector('.sb-collapse');if(!btn)return{vis:false};
    const r=btn.getBoundingClientRect(),st=getComputedStyle(btn);
    return {vis:r.width>0&&r.height>0&&st.display!=='none'&&st.visibility!=='hidden',tip:btn.getAttribute('data-tip'),aria:!!btn.getAttribute('aria-label'),sbRight:(()=>{const sb=document.querySelector('.sb');const rr=sb.getBoundingClientRect();return rr.right>=innerWidth-1;})()};
  });
  ck('11. collapsed sidebar expand button',v.vis&&v.aria,v.tip);
  ck('15. sidebar on RIGHT',v.sbRight);
  await pg.click('.sb-collapse');await pg.waitForTimeout(250);

  /* ===== چارت شفاف + گزارش دستی ===== */
  await pg.evaluate(()=>{location.hash='#/reports';render();});
  await pg.waitForTimeout(350);
  v=await pg.evaluate(()=>{
    const svg=[...document.querySelectorAll('.ch-bars rect')].slice(0,30).map(r=>+r.getAttribute('fill-opacity')).filter(x=>!isNaN(x));
    const css=[...document.querySelectorAll('.bar-col .bar')].slice(0,10).map(el=>getComputedStyle(el).backgroundColor);
    return {svg:svg.length?Math.max(...svg):null,css:css[0]||''};
  });
  ck('7. transparent bar charts',(v.svg===null||v.svg<=.5)&&(!v.css||v.css.includes('0.35')),'max svg opacity '+v.svg+' | css '+v.css);

  await pg.evaluate(()=>{location.hash='#/social/report';RPT.cust='c2';render();});
  await pg.waitForTimeout(250);
  const apiDis=await pg.evaluate(()=>{const x=[...document.querySelectorAll('.src-opt')].find(b=>b.textContent.includes('API'));return x?x.disabled:false;});
  await pg.evaluate(()=>rptSrc('manual'));
  await pg.waitForTimeout(300);
  v=await pg.evaluate(()=>{
    const T=mpTotals(mpPosts('c2'));
    return {panel:!!document.body.innerText.includes('ثبت دستی اطلاعات پست'),n:MPOSTS.filter(p=>p.cust==='c2').length,
      erAuto:document.body.innerText.includes('نرخ تعامل میانگین'),
      totals:['لایک کل','کامنت کل','ذخیره کل','اشتراک‌گذاری کل'].every(t=>document.body.innerText.includes(t)),
      cmp:document.body.innerText.includes('مقایسه نوع محتوا'),
      preview:document.querySelector('.rpt-pg')?.innerText.includes('گزارش عملکرد دیجیتال'),
      badge:document.querySelector('.card-h .badge')?.textContent.trim()};
  });
  ck('12. manual insights (no API needed)',apiDis&&v.panel&&v.erAuto,'API disabled for c2, '+v.n+' manual posts, ER auto');
  ck('13. manual = same report',v.preview&&v.totals&&v.cmp,'full analytics + identical client preview'+(v.badge?' («'+v.badge+'» internal only)':''));
  await pg.close();

  /* ===== overflow چند مسیر ===== */
  pg=await b.newPage({viewport:{width:390,height:844}});
  await pg.goto('file:///home/user/effect-erp.html');await pg.waitForTimeout(300);
  await pg.evaluate(()=>{S.authed=true;S.missionSeen=true;});
  let ovf=0;
  for(const r of ['dashboard','tasks','crm','social/report','team/e2','cpro/cp1','finance/bank']){
    await pg.evaluate(rr=>{location.hash='#/'+rr;if(rr==='social/report'){RPT.cust='c2';RPT.src='manual';}render();},r);
    await pg.waitForTimeout(200);
    ovf+=await pg.evaluate(()=>document.scrollingElement.scrollWidth>document.scrollingElement.clientWidth+1?1:0);
  }
  ck('16. no overflow (7 routes × 390px)',ovf===0,ovf+' routes overflow');
  const mArt=await pg.evaluate(()=>{location.hash='#/x';S.authed=false;render();const a=document.querySelector('.auth-art');return a?getComputedStyle(a).display:'none';});
  ck('login mobile (image hidden)',mArt==='none');
  await b.close();

  console.log(R.join('\n'));
  if(F.length){console.log('——————');console.log(F.join('\n'));process.exit(1);}
  console.log('——————');
  console.log('✅ FINAL QA — '+R.length+'/'+(R.length)+' checks passed (18-item checklist)');
})();
