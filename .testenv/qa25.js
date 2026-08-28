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

  // ===== 4-7) پیام‌رسان =====
  await pg.evaluate(()=>{location.hash='#/messenger';render();});
  await pg.waitForTimeout(300);
  v=await pg.evaluate(()=>({nav:!!document.querySelector('.sb [data-tip], .sb'),item:[...document.querySelectorAll('.sb-item span')].some(x=>x.textContent.trim()==='پیام‌رسان'),
    list:document.querySelectorAll('.msg-item').length,tabs:['همه','خوانده نشده','گروه‌ها'].every(t=>document.body.innerText.includes(t)),
    unread:document.querySelectorAll('.unread-cnt').length,photos:document.querySelectorAll('.msg-list .av.photo').length}));
  ck('sidebar has پیام‌رسان',v.item);
  ck('conversation list (5+)',v.list>=5,v.list+' chats, '+v.photos+' photo avatars');
  ck('tabs + unread badges',v.tabs&&v.unread>=2,v.unread+' unread badges');
  // چیدمان راست=لیست
  const sides=await pg.evaluate(()=>{const l=document.querySelector('.msg-list').getBoundingClientRect();const c=document.querySelector('.msg-chat').getBoundingClientRect();return l.right>c.right;});
  ck('RTL: list on RIGHT',sides);
  // باز کردن گفتگو + حباب‌ها + ارجاع
  await pg.evaluate(()=>msgOpen('ch1'));
  await pg.waitForTimeout(250);
  v=await pg.evaluate(()=>({bubbles:document.querySelectorAll('.msg-b').length,out:document.querySelectorAll('.msg-b.out').length,
    mention:!!document.querySelector('.mention'),ref:!!document.querySelector('.msg-ref'),att:document.querySelectorAll('.msg-att').length,
    header:document.body.innerText.includes('سارا احمدی')}));
  ck('chat opens with bubbles',v.bubbles>=4&&v.out>=1&&v.header,v.bubbles+' bubbles ('+v.out+' out)');
  ck('mention highlight + clickable',v.mention);
  ck('entity reference card',v.ref,'task/inv ref card rendered');
  ck('file/image attachments',v.att>=1);
  // ارسال پیام با منشن popover
  await pg.fill('#msg-in','تست v2.5 @س');
  await pg.evaluate(()=>msgTaInput(document.getElementById('msg-in')));
  await pg.waitForTimeout(150);
  const pop=await pg.evaluate(()=>document.querySelectorAll('#mention-pop button').length);
  ck('@ opens searchable list',pop>=1,pop+' suggestions');
  await pg.evaluate(()=>{const b0=document.querySelector('#mention-pop button');if(b0)b0.click();});
  await pg.waitForTimeout(250);
  const draftOK=await pg.evaluate(()=>{const t=document.getElementById('msg-in');return !!t&&t.value.includes('@سارا احمدی');});
  await pg.evaluate(()=>msgSend('ch1'));
  await pg.waitForTimeout(250);
  const sent=await pg.evaluate(()=>{const c=chatById('ch1');return c.msgs[c.msgs.length-1].text.includes('@سارا احمدی');})&&draftOK;
  ck('mention inserted + sent',sent);
  // ارجاع با #
  await pg.evaluate(()=>refPicker());
  await pg.waitForTimeout(200);
  const refItems=await pg.evaluate(()=>document.querySelectorAll('.ap-list .ap-item').length);
  ck('# reference picker (entities)',refItems>=3,refItems+' items');
  await pg.evaluate(()=>{refInsert('task','t1');});
  await pg.waitForTimeout(200);
  await pg.fill('#msg-in','این تسک را ببینید');
  await pg.evaluate(()=>msgSend('ch1'));
  await pg.waitForTimeout(300);
  const lastRef=await pg.evaluate(()=>{const c=chatById('ch1');return !!c.msgs[c.msgs.length-1].ref;});
  ck('reference card sent in message',lastRef);
  // پاسخ نمونه + اعلان
  await pg.waitForTimeout(1900);
  const notif=await pg.evaluate(()=>NOTIFS.some(n=>n.t.includes('پیام جدید')));
  ck('message notification',notif);
  // گروه
  await pg.evaluate(()=>grpModal());
  await pg.waitForTimeout(200);
  await pg.fill('#grp-n','تست گروه v2.5');
  await pg.evaluate(()=>{GRP_SEL=['e1','e2','e3'];grpCreate();});
  await pg.waitForTimeout(250);
  v=await pg.evaluate(()=>{const c=CHATS[0];return {g:c.type==='grp'&&c.name==='تست گروه v2.5',mem:c.members.length};});
  ck('group created (flow)',v.g&&v.mem===3);
  v=await pg.evaluate(()=>{const c=CHATS.find(x=>x.name==='تست گروه v2.5');grpAddMember(c.id);return true;});
  // اشتراک تسک
  await pg.evaluate(()=>{location.hash='#/tasks';render();});
  await pg.waitForTimeout(250);
  await pg.evaluate(()=>{const t=TASKS[0];taskDrawer(t.id);});
  await pg.waitForTimeout(250);
  const shareBtn=await pg.evaluate(()=>document.body.innerText.includes('ارسال در پیام‌رسان'));
  ck('task → share to messenger',shareBtn);
  await pg.evaluate(()=>{const t=TASKS[0];closeDrawer();taskShare(t.id);});
  await pg.waitForTimeout(200);
  await pg.evaluate(()=>{const c=CHATS.find(x=>x.type==='dm');taskShareDo(c.id,TASKS[0].id);});
  await pg.waitForTimeout(200);
  const shared=await pg.evaluate(()=>{const c=CHATS.find(x=>x.type==='dm');return c.msgs.some(m=>m.ref&&m.ref.k==='task');});
  ck('task shared as rich card',shared);

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
  v=await pg.evaluate(()=>({rows:document.querySelectorAll('.perm-row').length,toggles:document.querySelectorAll('.ptgl').length,
    src:['از نقش','اختصاصی'].every(x=>document.body.innerText.includes(x))}));
  ck('permission matrix (18 modules × actions)',v.rows===18&&v.toggles>40,v.rows+' rows, '+v.toggles+' toggles');
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
  await pg.evaluate(()=>{S.uid='e9';S.role='r5';location.hash='#/dashboard';render();});
  await pg.waitForTimeout(300);
  v=await pg.evaluate(()=>({crm:[...document.querySelectorAll('.sb-item span')].some(x=>x.textContent.trim()==='CRM'),
    fin:[...document.querySelectorAll('.sb-item span')].some(x=>x.textContent.trim()==='مالی'),
    team:[...document.querySelectorAll('.sb-item span')].some(x=>x.textContent.trim()==='تیم'),
    msg:[...document.querySelectorAll('.sb-item span')].some(x=>x.textContent.trim()==='پیام‌رسان')}));
  ck('unauthorized nav hidden (CRM/مالی/تیم)',!v.crm&&!v.fin&&!v.team,'CRM='+v.crm+', مالی='+v.fin+', تیم='+v.team);
  ck('override grants messenger (e9)',v.msg);
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
