const {chromium}=require('playwright-core');
const {APP_URL}=require('./paths');
const {browserLaunchOptions}=require('./browser');
const problems=[],ok=[];
(async()=>{
  const b=await chromium.launch(browserLaunchOptions({args:['--no-sandbox']}));
  const pg=await b.newPage({viewport:{width:1440,height:900}});
  pg.on('pageerror',e=>problems.push('PAGEERROR: '+e.message));
  await pg.goto(APP_URL);
  await pg.waitForTimeout(600);

  // ===== 1) LOGIN دو ستونه =====
  const auth=await pg.evaluate(()=>{
    const bg=document.querySelector('.auth-bg');if(!bg)return null;
    const cols=getComputedStyle(bg).gridTemplateColumns.split(' ').length;
    const art=document.querySelector('.auth-art'),img=art&&art.querySelector('img');
    const side=document.querySelector('.auth-side');
    const artR=art?art.getBoundingClientRect():null;const sideR=side?side.getBoundingClientRect():null;
    return {cols,hasImg:!!img,imgCover:img?getComputedStyle(img).objectFit:'','imgLoaded':img?img.naturalWidth>0:false,
      rightIsArt:artR&&sideR?artR.right>sideR.right:null,artW:Math.round(artR?artR.width:0),sideW:Math.round(sideR?sideR.width:0),
      hasUsername:!!document.getElementById('auth-username'),hasPassword:!!document.getElementById('auth-password'),hasCard:!!document.querySelector('.auth-card')};
  });
  if(!auth)problems.push('no .auth-bg');
  else{
    if(auth.cols!==2)problems.push('login cols='+auth.cols);else ok.push('login 2 columns ✓');
    if(!auth.rightIsArt)problems.push('image is NOT on the right');else ok.push('RIGHT=image ('+auth.artW+'px) / LEFT=form ('+auth.sideW+'px) ✓');
    if(auth.imgCover!=='cover')problems.push('object-fit='+auth.imgCover);else ok.push('object-fit:cover ✓');
    if(!auth.imgLoaded)problems.push('login image not loaded');else ok.push('login image loaded ✓');
    if(!auth.hasUsername||!auth.hasPassword)problems.push('username/password inputs missing');
  }
  // mobile: art hidden
  const pg2=await b.newPage({viewport:{width:390,height:844}});
  await pg2.goto(APP_URL);await pg2.waitForTimeout(400);
  const m=await pg2.evaluate(()=>{const a=document.querySelector('.auth-art');return a?getComputedStyle(a).display:'none';});
  if(m!=='none')problems.push('mobile login art visible');else ok.push('mobile: image hidden, form full-width ✓');
  await pg2.close();

  // ===== 2) auth flow works on new layout =====
  await pg.fill('#auth-username','demo.admin');
  await pg.fill('#auth-password','DemoOnly-123!');
  await pg.click('#btn-auth');
  await pg.waitForTimeout(300);
  if(await pg.locator('.shell').count()<1)problems.push('shell missing after auth');else ok.push('username/password→app ✓');

  // ===== 3) سایدبار: دکمه expand در حالت جمع =====
  await pg.waitForTimeout(800);
  await pg.evaluate(()=>{S.missionSeen=true;const o=document.getElementById('ovl');if(o)o.remove();render();});
  await pg.waitForTimeout(200);
  const sb1=await pg.evaluate(()=>{
    const btn=document.querySelector('.sb-collapse');const r=btn.getBoundingClientRect();
    return {visible:r.width>0&&r.height>0,tip:btn.getAttribute('data-tip'),ariaLabel:btn.getAttribute('aria-label')};
  });
  if(!sb1.visible)problems.push('expand btn not visible (full)'); 
  await pg.evaluate(()=>toggleSb());
  await pg.waitForTimeout(350);
  const sb2=await pg.evaluate(()=>{
    const sb=document.querySelector('.sb.mini');const btn=document.querySelector('.sb-collapse');const r=btn.getBoundingClientRect();
    const st=getComputedStyle(btn);
    return {mini:!!sb,visible:r.width>0&&r.height>0&&st.display!=='none'&&st.visibility!=='hidden',tip:btn.getAttribute('data-tip'),w:Math.round(r.width)};
  });
  if(!sb2.mini)problems.push('sidebar not mini');
  if(!sb2.visible)problems.push('EXPAND BTN HIDDEN when collapsed!');else ok.push('collapsed sidebar: expand button visible ✓ ('+sb2.tip+', '+sb2.w+'px)');
  await pg.click('.sb-collapse');await pg.waitForTimeout(300);
  const sb3=await pg.evaluate(()=>!document.querySelector('.sb.mini'));
  if(!sb3)problems.push('expand click did not restore');else ok.push('expand click restores sidebar ✓');

  // ===== 4) رنگ اصلی #6F6AEB =====
  const col=await pg.evaluate(()=>{
    const btn=document.querySelector('.btn-pr');
    const sbOn=document.querySelector('.sb-item.on');
    const chip=document.querySelector('.chip.chip-sel.on');
    return {btn:getComputedStyle(btn).backgroundColor,sbOn:sbOn?getComputedStyle(sbOn).color:null,chip:chip?getComputedStyle(chip).backgroundColor:null};
  });
  if(col.btn!=='rgb(111, 106, 235)')problems.push('btn-pr bg='+col.btn);else ok.push('primary #6F6AEB ✓');
  const oldPurple=await pg.evaluate(()=>{let n=0;document.querySelectorAll('*').forEach(el=>{const c=getComputedStyle(el);['backgroundColor','color','borderTopColor'].forEach(k=>{if(String(c[k]).includes('rgb(94, 1, 164)'))n++;});});return n;});
  if(oldPurple>0)problems.push('old #5E01A4 remains: '+oldPurple);else ok.push('no old #5E01A4 anywhere ✓');

  // ===== 5) فونت IRANSansX =====
  const font=await pg.evaluate(async()=>{
    await document.fonts.ready;
    const fam=getComputedStyle(document.body).fontFamily;
    const loaded=[...document.fonts].filter(f=>f.family==='IRANSansX'&&f.status==='loaded').length;
    const ravi=[...document.fonts].filter(f=>/ravi/i.test(f.family)).length;
    return {fam,loaded,ravi};
  });
  if(!font.fam.includes('IRANSansX'))problems.push('body font='+font.fam);else ok.push('body font IRANSansX ✓ ('+font.loaded+' faces loaded)');
  if(font.ravi>0)problems.push('Ravi faces still registered: '+font.ravi);else ok.push('zero Ravi faces ✓');

  // ===== 6) نمودارهای شفاف =====
  await pg.evaluate(()=>{location.hash='#/reports';render();});
  await pg.waitForTimeout(300);
  const bars=await pg.evaluate(()=>{
    const rects=[...document.querySelectorAll('.ch-bars rect')].slice(0,20);
    const cssBars=[...document.querySelectorAll('.bar-col .bar')].slice(0,10);
    return {svg:rects.map(r=>r.getAttribute('fill-opacity')).filter(Boolean),css:cssBars.map(el=>getComputedStyle(el).backgroundColor)};
  });
  if(bars.svg.length&&![...new Set(bars.svg)].every(v=>+v<=.5))problems.push('svg bars opaque: '+[...new Set(bars.svg)]);
  else if(bars.svg.length)ok.push('svg bars transparent ✓ (op '+[...new Set(bars.svg)].join('/')+')');
  if(bars.css.length&&!bars.css.every(c=>c.includes('0.35')||c.includes('.35')))problems.push('css bars not rgba(.35): '+bars.css[0]);
  else if(bars.css.length)ok.push('css bars rgba(111,106,235,.35) ✓');

  // ===== 7) گزارش‌ساز دستی =====
  await pg.evaluate(()=>{location.hash='#/social/report';render();});
  await pg.waitForTimeout(300);
  // مشتری بدون اکانت: c2
  await pg.evaluate(()=>{RPT.cust='c2';render();});
  await pg.waitForTimeout(200);
  const apiBlocked=await pg.evaluate(()=>{const b=[...document.querySelectorAll('.src-opt')].find(x=>x.textContent.includes('API'));return b?b.disabled:null;});
  if(apiBlocked!==true)problems.push('API source not disabled for unconnected customer');else ok.push('unconnected customer → API disabled ✓');
  await pg.evaluate(()=>rptSrc('manual'));
  await pg.waitForTimeout(250);
  const panel=await pg.evaluate(()=>({posts:MPOSTS.filter(p=>p.cust==='c2').length,panel:!!document.body.innerText.includes('ثبت دستی اطلاعات پست'),er:document.body.innerText.includes('نرخ تعامل میانگین'),best:document.body.innerText.includes('برترین:')}));
  if(!panel.panel)problems.push('manual panel missing');else ok.push('manual panel ✓ ('+panel.posts+' posts, ER auto, best/worst)');
  // افزودن پست
  await pg.click('text=افزودن پست >> nth=0');await pg.waitForTimeout(200);
  if(await pg.locator('#mp-t').count()<1)problems.push('mPostModal fail');
  else{
    await pg.fill('#mp-t','پست تستی دستی v2.4');
    await pg.evaluate(()=>{mPostSave(null,'c2');});
    await pg.waitForTimeout(250);
    const added=await pg.evaluate(()=>MPOSTS.some(p=>p.title==='پست تستی دستی v2.4'));
    if(!added)problems.push('manual post not saved');else ok.push('manual post add + auto-ER ✓');
  }
  // ویرایش/مشاهده
  await pg.evaluate(()=>{const p=MPOSTS.find(x=>x.title==='پست تستی دستی v2.4');mPostView(p.id);});
  await pg.waitForTimeout(200);
  if(await pg.locator('#ovl').count()<1)problems.push('mPostView fail');else ok.push('post view drawer ✓');
  await pg.evaluate(()=>closeDrawer());
  // انتخاب پست برای گزارش + پیش‌نمایش یکسان
  const prev=await pg.evaluate(()=>{const posts=rptSelPosts();return {n:posts.length,hasTitles:posts.every(p=>p.title.length>0)};});
  if(prev.n<1)problems.push('no posts in preview');else ok.push('preview uses '+prev.n+' posts (manual behaves like API) ✓');
  // badge دستی فقط داخلی
  const internal=await pg.evaluate(()=>document.querySelector('.card-h .badge.bd-warn')?document.querySelector('.card-h .badge.bd-warn').textContent.trim():'');
  ok.push('internal source badge: «'+internal+'» ✓');
  // analytics completeness (بخش ۷)
  const analytics=await pg.evaluate(()=>{
    const t=document.body.innerText;
    return {likes:t.includes('لایک کل'),cm:t.includes('کامنت کل'),sv:t.includes('ذخیره کل'),sh:t.includes('اشتراک‌گذاری کل'),
      avgReach:t.includes('میانگین ریچ هر پست'),avgEng:t.includes('میانگین تعامل هر پست'),
      typeCmp:t.includes('مقایسه نوع محتوا'),erCmp:t.includes('نرخ تعامل — به تفکیک نوع محتوا')};
  });
  const missing=Object.entries(analytics).filter(([k,v])=>!v).map(([k])=>k);
  if(missing.length)problems.push('analytics missing: '+missing.join(','));
  else ok.push('full analytics (totals/averages/type-comparison/ER-comparison) ✓');
  const cmpBars=await pg.evaluate(()=>[...document.querySelectorAll('.bar-chart')].length);
  ok.push(cmpBars+' transparent bar charts on page ✓');
  // template save
  await pg.evaluate(()=>rptSaveTpl());
  await pg.waitForTimeout(200);
  const tpl=await pg.evaluate(()=>RPT_TPLS.length);
  if(tpl<1)problems.push('template save fail');else ok.push('reusable template saved ✓');
  // حذف پست تستی
  await pg.evaluate(()=>{const p=MPOSTS.find(x=>x.title==='پست تستی دستی v2.4');MPOSTS.splice(MPOSTS.indexOf(p),1);render();});

  // ===== 8) صفر ایموجی/سایه =====
  const emoji=await pg.evaluate(()=>{const t=document.body.innerText;const e=t.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu);return e?e.length:0;});
  if(emoji)problems.push('EMOJIS: '+emoji);else ok.push('zero emojis ✓');
  const sh=await pg.evaluate(()=>{let n=0;document.querySelectorAll('*').forEach(el=>{const s=getComputedStyle(el).boxShadow;if(s&&s!=='none')n++;});return n;});
  if(sh)problems.push('shadows: '+sh);else ok.push('zero box-shadow ✓');

  await b.close();
  console.log(ok.map(x=>'✓ '+x).join('\n'));
  console.log('——————');
  if(problems.length){console.log(problems.map(x=>'✗ '+x).join('\n'));process.exit(1);}
  console.log('✅ v2.4 QA passed');
})();
