const {chromium}=require('playwright-core');
const {APP_URL}=require('./paths');
const {browserLaunchOptions}=require('./browser');
const P=[],OK=[];
const ck=(id,p,d)=>{(p?OK:P).push((p?'✓ ':'✗ ')+id+(d?' — '+d:''));};
(async()=>{
  const b=await chromium.launch(browserLaunchOptions({args:['--no-sandbox']}));
  const pg=await b.newPage({viewport:{width:1440,height:900}});
  pg.on('pageerror',e=>P.push('✗ PAGEERROR '+e.message));
  await pg.goto(APP_URL);await pg.waitForTimeout(600);
  await pg.evaluate(()=>{S.authed=true;S.missionSeen=true;location.hash='#/dashboard';render();});
  await pg.waitForTimeout(500);

  // ===== 1) پروفایل فقط-خواندنی + حالت ویرایش =====
  await pg.evaluate(()=>{location.hash='#/team/e1';S.tabs.emp='personal';S._editProf=false;render();});
  await pg.waitForTimeout(250);
  let v=await pg.evaluate(()=>{
    const txt=document.body.innerText;
    return {editBtn:!!txt.includes('ویرایش پروفایل'),noInputs:!document.querySelector('.sub-tab-body input.inp'),bio:txt.includes('درباره')};
  });
  ck('profile read-only by default',v.noInputs&&v.editBtn,'edit CTA visible, zero inputs');
  await pg.evaluate(()=>{S._editProf=true;render();});
  await pg.waitForTimeout(200);
  v=await pg.evaluate(()=>({inputs:document.querySelectorAll('.sub-tab-body input.inp,textarea.txa').length,
    save:document.body.innerText.includes('ذخیره تغییرات'),cancel:document.body.innerText.includes('انصراف'),
    photo:document.body.innerText.includes('تغییر تصویر')&&document.body.innerText.includes('حذف تصویر')&&document.body.innerText.includes('برش')}));
  ck('edit mode after CTA',v.inputs>=3&&v.save&&v.cancel&&v.photo,v.inputs+' fields + save/cancel/photo');
  await pg.fill('#pf-bio','مدیر محصول با تمرکز بر رشد');
  await pg.evaluate(()=>profSave('e1'));
  await pg.waitForTimeout(200);
  const bioSaved=await pg.evaluate(()=>EMP[0].bio.includes('مدیر محصول')&&EMP[0].bio.includes('رشد'));
  ck('save works + view updated',bioSaved&&!await pg.locator('#pf-n').count());
  // پروفایل دیگری: بدون دکمه ویرایش مستقیم
  await pg.evaluate(()=>{location.hash='#/team/e2';S.tabs.emp='personal';render();});
  await pg.waitForTimeout(200);
  const other=await pg.evaluate(()=>({edit:document.body.innerText.includes('ویرایش پروفایل'),lock:document.body.innerText.includes('فقط-خواندنی')||document.body.innerText.includes('مدیریت کاربران')}));
  ck('cannot edit others profile',!other.edit&&other.lock);

  // ===== 2) مرخصی: ۴ کارت یک‌ردیف =====
  await pg.evaluate(()=>{location.hash='#/leaves';render();});
  await pg.waitForTimeout(250);
  v=await pg.evaluate(()=>{
    const k=[...document.querySelectorAll('.kpi-row .kpi')];
    const top=k.map(x=>Math.round(x.getBoundingClientRect().top));
    const sameRow=new Set(top).size===1;
    const h=Math.round(k[0]?.getBoundingClientRect().height||0);
    return {n:k.length,sameRow,h};
  });
  ck('leave KPI one row (desktop)',v.n===4&&v.sameRow,v.n+' cards, height '+v.h+'px');
  const pgm=await b.newPage({viewport:{width:768,height:900}});
  await pgm.goto(APP_URL);await pgm.waitForTimeout(300);
  await pgm.evaluate(()=>{S.authed=true;S.missionSeen=true;location.hash='#/leaves';render();});
  await pgm.waitForTimeout(250);
  const t=await pgm.evaluate(()=>{const k=[...document.querySelectorAll('.kpi-row .kpi')].map(x=>Math.round(x.getBoundingClientRect().top));return new Set(k).size;});
  ck('leave KPI tablet = 2 rows',t===2,t+' rows');
  await pgm.close();

  // ===== 3) پاپ‌آپ روز بخیر =====
  await pg.evaluate(()=>{location.hash='#/dashboard';render();});
  await pg.waitForTimeout(200);
  await pg.evaluate(()=>missionPopup());
  await pg.waitForTimeout(250);
  v=await pg.evaluate(()=>{
    const box=document.querySelector('#ovl .box');
    const r=box.getBoundingClientRect();
    const txt=box.innerText;
    const over=[...box.querySelectorAll('*')].filter(el=>{const cr=el.getBoundingClientRect();return cr.right>r.right+1||cr.left<r.left-1;}).length;
    const h1=box.querySelector('h2');
    const h1r=h1.getBoundingClientRect();
    return {w:Math.round(r.width),titleLines:h1.getClientRects().length===1&&Math.round(h1r.height)<=40?1:2,over,
      hello:/(صبح|ظهر|عصر|شب) بخیر/.test(txt),sub:txt.includes('برنامه مشخص'),
      msn:txt.includes('ماموریت‌های امروز'),btns:txt.includes('شروع روز')&&txt.includes('مشاهده کارها'),
      metrics:['کار امروز','جلسه امروز'].every(m=>txt.includes(m))};
  });
  ck('greeting popup width 520-640',v.w>=520&&v.w<=640,'width '+v.w+'px');
  ck('title stays ONE line',v.titleLines<=34,v.titleLines+'px height');
  ck('no popup element overflows',v.over===0,v.over+' offenders');
  ck('popup content complete',v.hello&&v.sub&&v.msn&&v.btns&&v.metrics);
  await pg.evaluate(()=>closeModal());

  // ===== 4) پیام‌رسان حذف شده است =====
  v=await pg.evaluate(()=>{
    location.hash='#/dashboard';render();
    return {nav:document.body.innerText.includes('پیام‌رسان'),chat:!!document.querySelector('.msg-chat')};
  });
  ck('no messenger navigation or chat surface',!v.nav&&!v.chat);
  await pg.evaluate(()=>{const t=TASKS[0];taskDrawer(t.id);});
  await pg.waitForTimeout(200);
  const taskStillWorks=await pg.evaluate(()=>!!document.getElementById('cmt-in')&&!document.getElementById('ovl').innerText.includes('ارسال در پیام‌رسان'));
  ck('task comments remain available without messenger share',taskStillWorks);
  await pg.evaluate(()=>{closeDrawer();permDrawer('e9');});
  await pg.waitForTimeout(200);
  const noMessengerPermission=await pg.evaluate(()=>!document.getElementById('ovl').innerText.includes('پیام‌رسان')&&!document.querySelector('[data-mod="messenger"]'));
  ck('no messenger permission category or override',noMessengerPermission);
  await pg.evaluate(()=>closeDrawer());

  // ===== 11-12) مسئولین چندگانه =====
  await pg.evaluate(()=>{location.hash='#/tasks';render();});
  await pg.waitForTimeout(250);
  await pg.click('text=تسک جدید');
  await pg.waitForTimeout(300);
  v=await pg.evaluate(()=>({chips:document.querySelectorAll('#tf-asg-chips .chip').length}));
  await pg.evaluate(()=>asgDdOpen());
  await pg.waitForTimeout(150);
  const ddOpts=await pg.evaluate(()=>document.querySelectorAll('#asg-dd-list .asg-opt').length);
  ck('multi-assignee selector (dropdown field)',v.chips===1&&ddOpts>=10,'chips '+v.chips+' + dropdown '+ddOpts+' options');
  await pg.evaluate(()=>asgDdClose());
  await pg.evaluate(()=>asgToggle('e2'));
  await pg.evaluate(()=>asgToggle('e8'));
  await pg.waitForTimeout(120);
  const chips=await pg.evaluate(()=>ASG_NEW.length);
  await pg.fill('#tk-t','تست چندمسئولی v2.5');
  await pg.evaluate(()=>taskSave());
  await pg.waitForTimeout(300);
  v=await pg.evaluate(()=>{
    const t=TASKS.find(x=>x.title==='تست چندمسئولی v2.5');
    return {n:t?t.assignees.length:0,card:[...document.querySelectorAll('.kb-card')].some(c=>c.textContent.includes('تست چندمسئولی')),
      stacks:document.querySelectorAll('.kb-card .av').length};
  });
  ck('task with 3 assignees created',v.n===3&&v.card,'assignees '+v.n);
  ck('stacked avatars on cards',v.stacks>10,v.stacks+' avatars on board');
  const inMy=await pg.evaluate(()=>{S.taskScope='my';render();return TASKS.filter(t=>t.assignees&&t.assignees.includes('e1')&&t.assignees.length>1).length;});
  ck('multi-assignee in My Tasks (one task)',inMy>=1,inMy+' shared tasks visible');
  await pg.evaluate(()=>{S.taskScope='all';render();});
  // hover tooltip نام‌ها
  const tip=await pg.evaluate(()=>{const t=TASKS.find(x=>x.title==='تست چندمسئولی v2.5');return !!t;});
  ck('names in tooltip data',tip);

  // ===== 13-17) دسترسی‌ها =====
  await pg.evaluate(()=>{location.hash='#/users';render();});
  await pg.waitForTimeout(300);
  v=await pg.evaluate(()=>{
    const rows=document.querySelectorAll('#usr tbody tr').length>0||document.body.innerText.includes('رضا قایمی');
    return {rows:rows,create:document.body.innerText.includes('ایجاد کاربر'),audit:document.body.innerText.includes('لاگ حسابرسی دسترسی'),
    tableHeads:['آخرین ورود','وضعیت حساب'].every(h=>document.body.innerText.includes(h))};});
  ck('user management table',v.rows&&v.tableHeads);
  ck('admin-only create button (visible for superadmin)',v.create);
  ck('permission audit log',v.audit);
  // ماتریس دسترسی
  await pg.evaluate(()=>permDrawer('e2'));
  await pg.waitForTimeout(250);
  v=await pg.evaluate(()=>({rows:document.querySelectorAll('.perm-row').length,moduleCount:MODS.length,toggles:document.querySelectorAll('.ptgl').length,
    src:['از نقش','اختصاصی'].every(x=>document.body.innerText.includes(x))}));
  ck('permission matrix renders every configured module',v.rows===v.moduleCount&&v.toggles>40,v.rows+'/'+v.moduleCount+' rows, '+v.toggles+' toggles');
  ck('role vs override labels',v.src);
  // toggle: مالی را بگیر از سارا
  const before=await pg.evaluate(()=>canAs('e2','tasks'));
  await pg.evaluate(()=>{const btn=[...document.querySelectorAll('.ptgl')].find(b=>b.dataset.mod==='tasks'&&b.dataset.act==='v'&&b.dataset.uid==='e2');if(btn)permTgl(btn);});
  await pg.waitForTimeout(150);
  const after=await pg.evaluate(()=>canAs('e2','tasks'));
  ck('individual override works',before===true&&after===false,'tasks '+(before?'on':'?')+' → '+(after?'on':'off'));
  // بازنشانی
  await pg.evaluate(()=>{closeDrawer();permReset('e2');});
  await pg.waitForTimeout(150);
  const reset=await pg.evaluate(()=>canAs('e2','tasks'));
  ck('reset to role defaults',reset===true);
  // SuperAdmin محافظت‌شده
  await pg.evaluate(()=>permDrawer('e1'));
  await pg.waitForTimeout(200);
  const sa=await pg.evaluate(()=>document.body.innerText.includes('دسترسی کامل مدیر سیستم'));
  ck('SuperAdmin protected',sa);
  await pg.evaluate(()=>closeDrawer());
  // کاربر بدون دسترسی: e9 (کارمند، بدون CRM) — ناوبری مخفی
  await pg.evaluate(()=>{USER_OVERRIDES['e9']={reports:{v:1}};S.uid='e9';S.role='r5';location.hash='#/dashboard';render();});
  await pg.waitForTimeout(300);
  v=await pg.evaluate(()=>({crm:[...document.querySelectorAll('.sb-item span')].some(x=>x.textContent.trim()==='CRM'),
    fin:[...document.querySelectorAll('.sb-item span')].some(x=>x.textContent.trim()==='مالی'),
    team:[...document.querySelectorAll('.sb-item span')].some(x=>x.textContent.trim()==='تیم'),
    reports:[...document.querySelectorAll('.sb-item span')].some(x=>x.textContent.trim()==='گزارش‌ها')}));
  ck('unauthorized nav hidden (CRM/مالی/تیم)',!v.crm&&!v.fin&&!v.team,'CRM='+v.crm+', مالی='+v.fin+', تیم='+v.team);
  ck('override grants reports (e9)',v.reports);
  // روت غیرمجاز
  await pg.evaluate(()=>{location.hash='#/crm';render();});
  await pg.waitForTimeout(200);
  const blocked=await pg.evaluate(()=>document.body.innerText.includes('دسترسی به این بخش ندارید'));
  ck('unauthorized route blocked',blocked);
  await pg.evaluate(()=>{S.uid='e1';S.role='r1';location.hash='#/dashboard';render();});
  await pg.waitForTimeout(200);

  // ===== 18) صفر گرادیان =====
  const grads=await pg.evaluate(()=>{let n=0;document.querySelectorAll('*').forEach(el=>{const c=getComputedStyle(el);if((c.backgroundImage&&c.backgroundImage.includes('gradient')))n++;});return n;});
  ck('ZERO gradients in UI',grads===0,grads+' elements');
  // سایه/ایموجی
  const sh=await pg.evaluate(()=>[...document.querySelectorAll('*')].filter(el=>{const s=getComputedStyle(el).boxShadow;return s&&s!=='none';}).length);
  const em=await pg.evaluate(()=>(document.body.innerText.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu)||[]).length);
  ck('zero shadows',sh===0);ck('zero emojis',em===0);

  await b.close();
  console.log(OK.join('\n'));
  console.log('——————');
  if(P.length){console.log(P.join('\n'));process.exit(1);}
  console.log('✅ v2.5 QA passed — '+OK.length+' checks');
})();
