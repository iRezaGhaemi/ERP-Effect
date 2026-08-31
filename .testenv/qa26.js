/* qa26 — Task Management UX Update (drawer + checklist + assignee dropdown) */
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
  await pg.evaluate(()=>{S.authed=true;S.missionSeen=true;location.hash='#/tasks';S.taskScope='all';render();});
  await pg.waitForTimeout(500);
  let v;

  // ===== A) ایجاد تسک — drawer از چپ =====
  await pg.click('text=تسک جدید');
  await pg.waitForTimeout(350);
  v=await pg.evaluate(()=>{
    const dw=document.querySelector('.dw-tf');
    if(!dw)return{ok:false};
    const r=dw.getBoundingClientRect();
    const f=document.querySelector('.dw-tf .drawer-f');
    return {ok:true,left:Math.round(r.left),top:Math.round(r.top),h:Math.round(r.height),
      noModal:!document.querySelector('.modal'),
      body:!!document.querySelector('.dw-tf .drawer-b'),
      scroll:getComputedStyle(document.querySelector('.dw-tf .drawer-b')).overflowY,
      footer:!!f,footerVis:Math.round(f.getBoundingClientRect().bottom)<=innerHeight,
      hdr:document.body.innerText.includes('ایجاد تسک'),
      sub:document.body.innerText.includes('تسک جدید برای پروژه یا فضای کاری ایجاد کنید.'),
      cancel:document.body.innerText.includes('لغو'),save:document.body.innerText.includes('ایجاد تسک'),
      width:Math.round(r.width),behind:!!document.querySelector('.pg')};
  });
  ck('create opens LEFT drawer (left=0, full height)',v.ok&&v.left===0&&v.h>=898,'left '+v.left+', h '+v.h+'px');
  ck('NO centered modal for create',v.noModal);
  ck('app visible behind drawer (overlay)',v.behind);
  ck('drawer structure (header/sub/body/footer)',v.hdr&&v.sub&&v.body&&v.footer);
  ck('drawer body scrollable',v.scroll==='auto');
  ck('footer visible + within viewport',v.footerVis);
  ck('desktop width 420-600',v.width>=420&&v.width<=600,v.width+'px');

  // sections present
  v=await pg.evaluate(()=>({t:!!document.getElementById('tk-t'),d:!!document.getElementById('tk-d'),
    ws:!!document.getElementById('tk-ws'),p:!!document.getElementById('tk-p'),asg:!!document.getElementById('asg-box'),
    st:!!document.getElementById('tk-st'),pr:!!document.getElementById('tk-pr'),
    start:!!document.getElementById('tk-start'),due:!!document.getElementById('tk-due'),
    ck:!!document.getElementById('tf-ck'),lbs:!!document.getElementById('tf-lbs'),
    stOpts:document.getElementById('tk-st')?document.getElementById('tk-st').options.length:0}));
  ck('form sections: basic/ws/project/dates/checklist/tags',v.t&&v.d&&v.ws&&v.p&&v.start&&v.due&&v.ck&&v.lbs);
  ck('status select with existing statuses',v.st&&v.stOpts>=4,v.stOpts+' statuses');

  // workspace → project filtering
  const prjAll=await pg.evaluate(()=>document.getElementById('tk-p').options.length);
  await pg.evaluate(()=>{document.getElementById('tk-ws').value='w2';tfWs('w2');});
  await pg.waitForTimeout(100);
  const prjW2=await pg.evaluate(()=>document.getElementById('tk-p').options.length);
  ck('workspace filters projects',prjW2<prjAll&&prjW2>=2,'all '+prjAll+' → w2 '+prjW2);

  // ===== B) چک‌لیست هنگام ایجاد =====
  await pg.evaluate(()=>tfCkAdd());
  await pg.evaluate(()=>tfCkAdd());
  await pg.waitForTimeout(120);
  v=await pg.evaluate(()=>({rows:document.querySelectorAll('#tf-ck-list .ck-item').length,
    boxes:document.querySelectorAll('#tf-ck-list input[type=checkbox]').length,
    inputs:document.querySelectorAll('#tf-ck-list input.ck-inp').length,
    dels:document.querySelectorAll('#tf-ck-list .ibtn-err').length}));
  ck('checklist creatable in form (+افزودن مورد)',v.rows===2&&v.boxes===2&&v.inputs===2&&v.dels===2);
  await pg.evaluate(()=>{document.getElementById('cki-0').value='آماده‌سازی سناریو';S._tf.ck[0].title='آماده‌سازی سناریو';});
  await pg.evaluate(()=>{document.getElementById('cki-1').value='ضبط ویدیو';S._tf.ck[1].title='ضبط ویدیو';});
  await pg.evaluate(()=>tfCkAdd());
  await pg.waitForTimeout(100);
  await pg.evaluate(()=>{document.getElementById('cki-2').value='تدوین';S._tf.ck[2].title='تدوین';});
  // checkbox → progress
  await pg.evaluate(()=>tfCkTgl(0));
  await pg.waitForTimeout(100);
  v=await pg.evaluate(()=>({txt:document.getElementById('tf-ck').innerText,
    pct:document.querySelector('#tf-ck .prog i').style.width}));
  ck('checkbox marks completed',v.txt.includes('۱ / ۳'));
  ck('progress auto-calculated (33%)',v.pct==='33%',v.pct);
  // edit item + reorder + delete
  await pg.evaluate(()=>{S._tf.ck[1].title='ضبط ویدیو در استودیو';tfCkRer();});
  await pg.evaluate(()=>tfCkMove(2,-1));
  await pg.waitForTimeout(80);
  v=await pg.evaluate(()=>({order:S._tf.ck.map(c=>c.title).join('|')}));
  ck('item editable + reorder works',v.order==='آماده‌سازی سناریو|تدوین|ضبط ویدیو در استودیو',v.order);
  await pg.evaluate(()=>tfCkDel(2));
  const afterDel=await pg.evaluate(()=>S._tf.ck.length);
  ck('item deletable',afterDel===2);

  // ===== C) دراپ‌داون مسئولین =====
  await pg.evaluate(()=>asgDdOpen());
  await pg.waitForTimeout(200);
  v=await pg.evaluate(()=>{
    const dd=document.getElementById('asg-dd');if(!dd)return{ok:false};
    const r=dd.getBoundingClientRect();
    return {ok:true,opts:dd.querySelectorAll('.asg-opt').length,avs:dd.querySelectorAll('.asg-opt .av').length,
      q:!!document.getElementById('asg-q'),inVp:r.top>=0&&r.left>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,
      sel:dd.querySelectorAll('.asg-opt.sel').length,clr:dd.innerText.includes('پاک کردن انتخاب‌ها')};});
  ck('dropdown: search + avatars + options',v.ok&&v.q&&v.opts>=10&&v.avs>=10,v.opts+' options');
  ck('dropdown within viewport',v.inVp);
  ck('selected indicator (checkbox) + clear action',v.sel===1&&v.clr);
  // search narrows
  await pg.fill('#asg-q','سارا');
  await pg.waitForTimeout(120);
  const hits=await pg.evaluate(()=>document.querySelectorAll('#asg-dd-list .asg-opt').length);
  ck('dropdown search narrows list',hits===1,hits+' hit');
  // multi-select via UI toggle
  await pg.evaluate(()=>asgDdSearch(''));
  await pg.evaluate(()=>asgToggle('e2'));
  await pg.evaluate(()=>asgToggle('e3'));
  await pg.waitForTimeout(100);
  v=await pg.evaluate(()=>({n:ASG_NEW.length,chips:document.querySelectorAll('#tf-asg-chips .chip').length,inBox:!!document.querySelector('.asg-box #tf-asg-chips')}));
  ck('multi-select (3 assignees)',v.n===3);
  ck('selected appear as compact chips in field',v.chips===3&&v.inBox);
  // keyboard: ArrowDown + Enter + Escape
  await pg.evaluate(()=>{asgDdSearch('');S._asgHl=1;});
  const beforeKb=await pg.evaluate(()=>ASG_NEW.length);
  await pg.focus('#asg-q');
  await pg.keyboard.press('Enter');
  await pg.waitForTimeout(80);
  const afterKb=await pg.evaluate(()=>ASG_NEW.length);
  ck('keyboard nav (Enter toggles highlighted)',afterKb===beforeKb+1||afterKb===beforeKb-1,beforeKb+' → '+afterKb);
  await pg.keyboard.press('Escape');
  await pg.waitForTimeout(80);
  const ddClosed=await pg.evaluate(()=>!document.getElementById('asg-dd'));
  const formStillOpen=await pg.evaluate(()=>!!document.getElementById('tk-t'));
  ck('Escape closes dropdown, form stays open',ddClosed&&formStillOpen);
  // clear selection
  await pg.evaluate(()=>asgClear());
  await pg.waitForTimeout(80);
  v=await pg.evaluate(()=>({n:ASG_NEW.length,ph:!!document.querySelector('.asg-ph')}));
  ck('clear selection works (placeholder back)',v.n===0&&v.ph);
  await pg.evaluate(()=>asgToggle('e1'));

  // ===== D) ثبت با چک‌لیست + چند مسئول =====
  await pg.fill('#tk-t','تست UX تسک v2.6');
  await pg.evaluate(()=>taskSave());
  await pg.waitForTimeout(350);
  v=await pg.evaluate(()=>{
    const t=TASKS.find(x=>x.title==='تست UX تسک v2.6');
    if(!t)return{found:false};
    const card=[...document.querySelectorAll('.kb-card')].find(c=>c.textContent.includes('تست UX تسک v2.6'));
    return {found:true,n:t.assignees.length,ckN:t.checklist.length,
      shape:t.checklist.every(c=>c.id&&c.taskId===t.id&&typeof c.title==='string'&&typeof c.completed==='boolean'&&typeof c.order==='number'&&c.createdAt&&c.updatedAt),
      done:t.checklist.filter(c=>c.completed).length,
      cardCk:card?card.innerText.includes('۱/۲'):false,dup:TASKS.filter(x=>x.title==='تست UX تسک v2.6').length};
  });
  ck('task created with checklist (2 items)',v.found&&v.ckN===2);
  ck('checklist data model (id/taskId/title/completed/order/createdAt/updatedAt)',v.shape);
  ck('checklist progress on kanban card',v.cardCk);
  ck('single task — no duplicates',v.dup===1);
  await pg.evaluate(()=>{location.hash='#/mytasks';render();});
  await pg.waitForTimeout(300);
  const inMy=await pg.evaluate(()=>TASKS.find(x=>x.title==='تست UX تسک v2.6').assignees.includes('e1'));
  ck('appears in کارهای من (assignee e1)',inMy);

  // ===== E) detail: checklist editable =====
  await pg.evaluate(()=>{const t=TASKS.find(x=>x.title==='تست UX تسک v2.6');location.hash='#/tasks';taskDrawer(t.id);});
  await pg.waitForTimeout(300);
  v=await pg.evaluate(()=>({ck:document.querySelectorAll('#ovl .ck-item').length,
    prog:document.getElementById('ovl').innerText.includes('۱ / ۲ انجام شده'),
    add:!!document.getElementById('ck-new'),editBtns:document.querySelectorAll('#ovl .ck-item .ibtn').length>0,
    edit:document.getElementById('ovl').innerText.includes('ویرایش تسک')}));
  ck('checklist available in task detail',v.ck===2);
  ck('detail progress (۱ / ۲ انجام شده)',v.prog);
  ck('detail: add/edit/delete controls',v.add&&v.editBtns);
  ck('detail footer has ویرایش تسک',v.edit);
  // check/uncheck from detail
  await pg.evaluate(()=>{const t=TASKS.find(x=>x.title==='تست UX تسک v2.6');ckTgl(t.id,1);});
  await pg.waitForTimeout(200);
  const done2=await pg.evaluate(()=>{const t=TASKS.find(x=>x.title==='تست UX تسک v2.6');return ckDone(t);});
  ck('check/uncheck from detail',done2===2);
  // add from detail
  await pg.evaluate(()=>{const t=TASKS.find(x=>x.title==='تست UX تسک v2.6');document.getElementById('ck-new').value='انتشار';ckAdd(t.id);});
  await pg.waitForTimeout(200);
  const ck3=await pg.evaluate(()=>TASKS.find(x=>x.title==='تست UX تسک v2.6').checklist.length);
  ck('add item from detail',ck3===3);

  // ===== F) ویرایش با همان drawer از چپ =====
  await pg.evaluate(()=>{const t=TASKS.find(x=>x.title==='تست UX تسک v2.6');taskEdit(t.id);});
  await pg.waitForTimeout(300);
  v=await pg.evaluate(()=>{
    const t=TASKS.find(x=>x.title==='تست UX تسک v2.6');
    const dw=document.querySelector('.dw-tf');
    return {left:dw?Math.round(dw.getBoundingClientRect().left):null,noModal:!document.querySelector('.modal'),
      title:document.getElementById('tk-t').value===t.title,
      ckRows:document.querySelectorAll('#tf-ck-list .ck-item').length,
      chips:document.querySelectorAll('#tf-asg-chips .chip').length,
      ws:(function(){const p=PRJ.find(x=>x.id===t.project);return p?document.getElementById('tk-ws').value===p.ws:true;})(),
      save:document.body.innerText.includes('ذخیره تغییرات')};});
  ck('edit uses SAME left drawer (no modal)',v.left===0&&v.noModal);
  ck('edit pre-populates (title/ws/assignees/checklist)',v.title&&v.ws&&v.chips===1&&v.ckRows===3);
  ck('edit footer = ذخیره تغییرات',v.save);
  await pg.fill('#tk-t','تست UX تسک v2.6 ویرایش‌شده');
  await pg.evaluate(()=>{S._tf.ck[0].title='آماده‌سازی سناریوی نهایی';tfCkRer();});
  await pg.evaluate(()=>taskSave());
  await pg.waitForTimeout(300);
  v=await pg.evaluate(()=>{const t=TASKS.find(x=>x.title==='تست UX تسک v2.6 ویرایش‌شده');
    return t&&t.checklist[0].title==='آماده‌سازی سناریوی نهایی'&&t.checklist.length===3;});
  ck('edit saves title + checklist',v);

  // ===== G) solar hijri picker still works in drawer =====
  await pg.evaluate(()=>taskModal(null));
  await pg.waitForTimeout(250);
  await pg.click('#tk-due');
  await pg.waitForTimeout(250);
  v=await pg.evaluate(()=>{const dp=document.querySelector('.dp');
    if(!dp)return{ok:false};const d=dp.querySelector('[data-d="15"]');if(d)d.click();return {ok:true};});
  await pg.waitForTimeout(200);
  const dueVal=await pg.evaluate(()=>document.getElementById('tk-due').value);
  ck('solar hijri date picker functional',v.ok&&/^[۰-۹]{4}\/[۰-۹]{2}\/[۰-۹]{2}$/.test(dueVal),dueVal);
  await pg.evaluate(()=>closeDrawer());

  // ===== H) permissions =====
  await pg.evaluate(()=>{USER_OVERRIDES['e9']={tasks:{e:0,d:0}};S.uid='e9';S.role='r5';const t=TASKS.find(x=>x.title.includes('v2.6'));taskDrawer(t.id);});
  await pg.waitForTimeout(300);
  v=await pg.evaluate(()=>({edit:![...document.querySelectorAll('#ovl button')].some(b=>b.textContent.trim()==='ویرایش تسک'),
    ro:!!document.querySelector('#ovl .ck-item input[disabled]'),
    noAdd:!document.getElementById('ck-new'),
    lock:document.getElementById('ovl').innerText.includes('مجوز ویرایش تسک')}));
  ck('unauthorized: NO edit button (hidden not disabled)',v.edit);
  ck('unauthorized: checklist read-only (view only)',v.ro&&v.noAdd&&v.lock);
  await pg.evaluate(()=>{USER_OVERRIDES['e9']={reports:{v:1}};S.uid='e1';S.role='r1';closeDrawer();render();});
  await pg.waitForTimeout(200);

  // ===== I) style invariants on new UI =====
  await pg.evaluate(()=>taskModal(null));
  await pg.waitForTimeout(250);
  await pg.evaluate(()=>asgDdOpen());
  await pg.waitForTimeout(150);
  v=await pg.evaluate(()=>{
    const els=[document.querySelector('.dw-tf'),document.querySelector('.asg-dd'),document.querySelector('.drawer-f')];
    return {sh:els.every(el=>!el||getComputedStyle(el).boxShadow==='none'),
      grad:!document.body.innerHTML.includes('linear-gradient')&&!document.body.innerHTML.includes('gradient('),
      font:getComputedStyle(document.querySelector('.dw-tf')).fontFamily.includes('IRANSansX'),
      pr:getComputedStyle(document.querySelector('.dw-tf .btn-pr')).backgroundColor,
      dir:getComputedStyle(document.querySelector('.dw-tf')).direction,
      emoji:!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(document.getElementById('ovl').innerText)};});
  ck('zero shadows on drawer/dropdown/footer',v.sh);
  ck('zero gradients',v.grad);
  ck('IRANSansX font on drawer',v.font);
  ck('primary #6F6AEB on create button',v.pr==='rgb(111, 106, 235)',v.pr);
  ck('RTL direction',v.dir==='rtl');
  ck('zero emojis',v.emoji);
  // no overflow of drawer content
  const ovf=await pg.evaluate(()=>{const dw=document.querySelector('.dw-tf');const r=dw.getBoundingClientRect();
    return [...dw.querySelectorAll('*')].filter(el=>{const b=el.getBoundingClientRect();return b.width>0&&(b.right>innerWidth+1||b.left<-1);}).length;});
  ck('no element overflows viewport (drawer)',ovf===0,ovf+' offenders');
  // footer never overlaps body
  v=await pg.evaluate(()=>{const b=document.querySelector('.dw-tf .drawer-b').getBoundingClientRect();
    const f=document.querySelector('.dw-tf .drawer-f').getBoundingClientRect();return f.top>=b.top&&f.top>=b.bottom-2;});
  ck('footer does not overlap form content',v);
  await pg.evaluate(()=>closeDrawer());

  // ===== J) mobile: full-screen drawer + dropdown fits =====
  await pg.setViewportSize({width:375,height:720});
  await pg.waitForTimeout(250);
  await pg.evaluate(()=>taskModal(null));
  await pg.waitForTimeout(300);
  v=await pg.evaluate(()=>{
    const dw=document.querySelector('.dw-tf');const r=dw.getBoundingClientRect();
    return {w:Math.round(r.width),fit:r.left>=0&&r.right<=innerWidth+1,
      fIn:document.querySelector('.dw-tf .drawer-f').getBoundingClientRect().bottom<=innerHeight,
      frow:getComputedStyle(document.querySelector('.dw-tf .frow')).gridTemplateColumns.split(' ').length};});
  ck('mobile: drawer near full-screen + fits',v.w>=360&&v.fit,v.w+'px');
  ck('mobile: footer accessible + stacked fields',v.fIn&&v.frow===1);
  await pg.evaluate(()=>asgDdOpen());
  await pg.waitForTimeout(150);
  const ddM=await pg.evaluate(()=>{const r=document.getElementById('asg-dd').getBoundingClientRect();
    return r.left>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;});
  ck('mobile: dropdown within viewport',ddM);
  await pg.evaluate(()=>closeDrawer());

  // ===== K) existing functionality preserved =====
  await pg.setViewportSize({width:1440,height:900});
  await pg.evaluate(()=>{location.hash='#/tasks';render();});
  await pg.waitForTimeout(400);
  v=await pg.evaluate(()=>({cols:document.querySelectorAll('.kb-col').length,cards:document.querySelectorAll('.kb-card').length,
    ckList:(function(){setTaskView('list');render();return document.querySelectorAll('.pg .tbl-wrap tbody tr').length;})(),
    ckCol:document.body.innerText.includes('چک‌لیست')}));
  ck('kanban board + drag columns intact',v.cols>=4&&v.cards>5,v.cards+' cards');
  ck('list view + checklist column intact',v.ckList>=5&&v.ckCol);
  await pg.evaluate(()=>{setTaskView('cal');render();});
  await pg.waitForTimeout(200);
  const calOk=await pg.evaluate(()=>document.querySelectorAll('.cal-d').length>20);
  await pg.evaluate(()=>{setTaskView('tl');render();});
  await pg.waitForTimeout(200);
  const tlOk=await pg.evaluate(()=>document.querySelectorAll('.tl-row').length>3);
  ck('calendar + timeline views intact',calOk&&tlOk);
  const multiSeed=await pg.evaluate(()=>TASKS.find(t=>t.id==='t1').assignees.length>=2&&TASKS.every(t=>Array.isArray(t.checklist)));
  ck('existing data: multi-assignee seeds + checklists migrated',multiSeed);
  const T_key=await pg.evaluate(()=>{document.dispatchEvent(new KeyboardEvent('keydown',{key:'t',bubbles:true}));return !!document.querySelector('.dw-tf');});
  ck('keyboard shortcut T opens task drawer',T_key);

  console.log(OK.join('\n'));
  console.log('——————');
  if(P.length){console.log(P.join('\n'));process.exit(1);}else{console.log('✅ v2.6 Task UX QA passed — '+OK.length+' checks');}
  await b.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
