/* ============================================================
   EFFECT ERP · Sample data (realistic Persian, consistent)
   dates stored as 'YYYY/MM/DD' (Jalali, en digits) — render via dFa/dFaL
   ============================================================ */
const dFa=s=>s?s.split('/').map((p,i)=>fa(i?pad2(+p):p)).join('/'):'—';
const dFaL=s=>{if(!s)return'—';const[y,m,d]=s.split('/').map(Number);return fa(d)+' '+FA_MONTHS[m-1]+' '+fa(y);};
const dFaM=s=>{if(!s)return'—';const[y,m,d]=s.split('/').map(Number);return fa(d)+' '+FA_MONTHS[m-1];};
const toJ=s=>{const[y,m,d]=s.split('/').map(Number);return{jy:y,jm:m,jd:d};};

/* ---------- people ---------- */
const EMP=[
 {id:'e1',name:'رضا قایمی',role:'مدیرعامل',dept:'مدیریت',email:'reza@effectstudio.ir',phone:'۰۹۱۲۱۲۳۴۵۶۷',start:'1401/03/15',status:'in',skills:['استراتژی','مدیریت محصول','مذاکره'],load:72,score:94},
 {id:'e2',name:'سارا احمدی',role:'مدیر طراحی',dept:'طراحی',email:'sara@effectstudio.ir',phone:'۰۹۱۲۳۳۴۴۵۶۷',start:'1401/06/01',status:'in',skills:['UI/UX','فیگما','دیزاین سیستم','برندینگ'],load:88,score:96},
 {id:'e3',name:'محمد رضایی',role:'توسعه‌دهنده ارشد',dept:'فنی',email:'mohammad@effectstudio.ir',phone:'۰۹۱۳۴۴۵۵۶۷۸',start:'1400/09/10',status:'remote',skills:['Next.js','Node.js','PostgreSQL'],load:64,score:91},
 {id:'e4',name:'نگار محمدی',role:'کارشناس تولید محتوا',dept:'محتوا',email:'negar@effectstudio.ir',phone:'۰۹۱۴۵۵۶۶۷۸۹',start:'1402/02/20',status:'in',skills:['کپی‌رایتینگ','استوری‌تلینگ','سئو'],load:76,score:88},
 {id:'e5',name:'علی کریمی',role:'مدیر فروش',dept:'فروش',email:'ali@effectstudio.ir',phone:'۰۹۱۵۶۶۷۷۸۹۰',start:'1401/10/05',status:'in',skills:['CRM','مذاکره فروش','پایپ‌لاین'],load:58,score:90},
 {id:'e6',name:'مریم حسینی',role:'مدیر مالی',dept:'مالی',email:'maryam@effectstudio.ir',phone:'۰۹۱۷۸۸۹۹۰۱۲',start:'1400/04/12',status:'in',skills:['حسابداری','فاکتور','گزارش مالی'],load:70,score:93},
 {id:'e7',name:'امیر تهرانی',role:'طراح UI/UX',dept:'طراحی',email:'amir@effectstudio.ir',phone:'۰۹۱۸۹۹۰۰۱۲۳',start:'1402/07/01',status:'in',skills:['UI','پروتوتایپ','دیزاین سیستم'],load:82,score:87},
 {id:'e8',name:'زهرا نوری',role:'کارشناس دیجیتال مارکتینگ',dept:'مارکتینگ',email:'zahra@effectstudio.ir',phone:'۰۹۱۹۰۱۱۲۲۳۴',start:'1402/05/08',status:'in',skills:['پرفورمنس','اینستاگرام','تحلیل داده'],load:79,score:89},
 {id:'e9',name:'حسین شریفی',role:'توسعه‌دهنده فرانت‌اند',dept:'فنی',email:'hossein@effectstudio.ir',phone:'۰۹۱۲۱۲۳۴۵۶۰',start:'1403/01/25',status:'leave',skills:['React','Tailwind','انیمیشن'],load:45,score:85},
 {id:'e10',name:'الهام رستمی',role:'مدیر پروژه',dept:'مدیریت',email:'elham@effectstudio.ir',phone:'۰۹۱۲۱۲۳۴۵۶۱',start:'1401/12/03',status:'in',skills:['اسکرام','مدیریت پروژه','جیرا'],load:91,score:92},
 {id:'e11',name:'بهرام کاویانی',role:'کارگردان تیزر و موشن',dept:'محتوا',email:'bahram@effectstudio.ir',phone:'۰۹۱۲۱۲۳۴۵۶۲',start:'1402/10/18',status:'in',skills:['پریمیر','افترافکت','استوری‌بورد'],load:68,score:90},
 {id:'e12',name:'نیلوفر آرام',role:'کارشناس CRM',dept:'فروش',email:'niloofar@effectstudio.ir',phone:'۰۹۱۲۱۲۳۴۵۶۳',start:'1403/04/09',status:'in',skills:['پیگیری','دیتا','ارتباط با مشتری'],load:62,score:86},
 {id:'e13',name:'کاوه دهقان',role:'مدیر سیستم',dept:'فنی',email:'kaveh@effectstudio.ir',phone:'۰۹۱۲۱۲۳۴۵۶۴',start:'1403/08/02',status:'remote',skills:['DevOps','امنیت','ERP'],load:50,score:88},
];
const emp=id=>EMP.find(e=>e.id===id)||{name:'—'};

/* ---------- workspaces ---------- */
const WS=[
 {id:'w1',name:'استودیو اثر',desc:'دپارتمان مرکزی و پروژه‌های استراتژیک',members:['e1','e2','e7','e10'],projects:['p1','p2','p3'],color:'#6f6aeb',act:24},
 {id:'w2',name:'تولید محتوا',desc:'تیم محتوا، ویدیو و موشن گرافیک',members:['e4','e11'],projects:['p5','p6'],color:'#0ea5e9',act:31},
 {id:'w3',name:'طراحی محصول',desc:'طراحی رابط و تجربه کاربری محصولات',members:['e2','e7'],projects:['p3','p8'],color:'#f59e0b',act:18},
 {id:'w4',name:'توسعه',desc:'تیم مهندسی و توسعه نرم‌افزار',members:['e3','e9','e13'],projects:['p3','p4'],color:'#10b981',act:27},
 {id:'w5',name:'فروش',desc:'سرنخ‌ها، مشتریان و قراردادها',members:['e5','e12'],projects:['p7'],color:'#ef4444',act:15},
 {id:'w6',name:'مارکتینگ',desc:'کمپین‌ها و شبکه‌های اجتماعی',members:['e8','e4'],projects:['p1','p9'],color:'#8b5cf6',act:22},
];

/* ---------- projects ---------- */
const PRJ=[
 {id:'p1',name:'کمپین تبلیغاتی تاج محل — تابستان ۱۴۰۵',cust:'c1',lead:'e10',status:'فعال',progress:68,due:'1405/06/28',budget:420000000,ws:'w1'},
 {id:'p2',name:'هویت بصری پوشاک درسا',cust:'c3',lead:'e2',status:'فعال',progress:42,due:'1405/07/10',budget:280000000,ws:'w3'},
 {id:'p3',name:'وب‌سایت و پنل مشتریان داده‌پردازان',cust:'c5',lead:'e3',status:'فعال',progress:55,due:'1405/07/02',budget:650000000,ws:'w4'},
 {id:'p4',name:'اپلیکیشن موبایل کافه میدان',cust:'c6',lead:'e3',status:'بررسی',progress:20,due:'1405/08/15',budget:380000000,ws:'w4'},
 {id:'p5',name:'تولید محتوای ویدیویی پخش یگانه',cust:'c2',lead:'e11',status:'فعال',progress:74,due:'1405/06/20',budget:190000000,ws:'w2'},
 {id:'p6',name:'بسته‌بندی محصولات جدید پخش یگانه',cust:'c2',lead:'e2',status:'فعال',progress:35,due:'1405/07/25',budget:150000000,ws:'w2'},
 {id:'p7',name:'کمپین فروش دوره‌های آکادمی پیشگامان',cust:'c7',lead:'e8',status:'فعال',progress:81,due:'1405/06/15',budget:240000000,ws:'w5'},
 {id:'p8',name:'ری‌دیزاین داشبورد کلینیک روژان',cust:'c4',lead:'e2',status:'فعال',progress:47,due:'1405/07/05',budget:210000000,ws:'w3'},
 {id:'p9',name:'سئو و رشد ارگانیک کافه میدان',cust:'c6',lead:'e4',status:'فعال',progress:60,due:'1405/09/01',budget:120000000,ws:'w6'},
 {id:'p10',name:'گزارش‌ساز شبکه‌های اجتماعی — فاز ۱',cust:null,lead:'e3',status:'پایان‌یافته',progress:100,due:'1405/04/30',budget:95000000,ws:'w4'},
];
const prj=id=>PRJ.find(p=>p.id===id)||{name:'—'};

/* ---------- tasks ---------- */
const ST_COLS=[{id:'ideas',t:'ایده‌ها'},{id:'todo',t:'برای انجام'},{id:'doing',t:'در حال انجام'},{id:'review',t:'در انتظار بررسی'},{id:'done',t:'انجام شده'}];
const PRIOS=[{id:'urgent',t:'فوری',cls:'urgent'},{id:'high',t:'بالا',cls:'high'},{id:'mid',t:'متوسط',cls:'mid'},{id:'low',t:'پایین',cls:'low'}];
const TASKS=[
 {id:'t1',title:'بازبینی سناریوی تیزر تلویزیونی تاج محل',desc:'سناریوی نهایی تیزر ۳۰ ثانیه‌ای با تیم محتوا بازبینی و فیدبک دقیق ثبت شود.',status:'doing',prio:'urgent',assignee:'e1',project:'p1',start:'1405/06/01',due:'1405/06/06',est:6,tags:['تبلیغات','بازبینی'],ck:[1,4],cm:5,att:2},
 {id:'t2',title:'جلسه راه‌اندازی فاز ۲ داشبورد داده‌پردازان',desc:'هم‌راستاسازی نیازمندی‌های فاز ۲ با تیم فنی مشتری.',status:'doing',prio:'high',assignee:'e10',project:'p3',start:'1405/06/02',due:'1405/06/05',est:4,tags:['جلسه'],ck:[3,6],cm:2,att:1},
 {id:'t3',title:'طراحی لوگوتایپ ثانویه برند درسا',desc:'دو مسیر پیشنهادی برای لوگوتایپ ثانویه + تست روی بسته‌بندی.',status:'review',prio:'high',assignee:'e2',project:'p2',start:'1405/05/28',due:'1405/06/04',est:12,tags:['برندینگ'],ck:[5,7],cm:8,att:4},
 {id:'t4',title:'تایید نهایی متن‌های لندینگ کمپین پیشگامان',desc:'کپی‌های نهایی لندینگ پس از اصلاحات تیم محتوا.',status:'todo',prio:'mid',assignee:'e1',project:'p7',start:'1405/06/05',due:'1405/06/09',est:3,tags:['محتوا','تایید'],ck:[0,3],cm:1,att:0},
 {id:'t5',title:'بازبینی قرارداد تمدید همکاری پخش یگانه',desc:'بازبینی بندهای مالی و زمان‌بندی قرارداد سالانه.',status:'todo',prio:'urgent',assignee:'e1',project:'p5',start:'1405/06/03',due:'1405/06/03',est:2,tags:['قرارداد'],ck:[0,2],cm:3,att:1},
 {id:'t6',title:'تحلیل سوماهه عملکرد اینستاگرام روژان',desc:'گزارش تحلیلی مرداد + پیشنهاد استراتژی شهریور.',status:'doing',prio:'mid',assignee:'e8',project:'p8',start:'1405/06/01',due:'1405/06/08',est:5,tags:['آنالیتیکس'],ck:[2,5],cm:4,att:3},
 {id:'t7',title:'تحویل نسخه بتای پنل مشتریان',desc:'استقرار بتا روی سرور مشتری + مستندات فنی.',status:'doing',prio:'high',assignee:'e3',project:'p3',start:'1405/05/25',due:'1405/06/04',est:16,tags:['توسعه','تحویل'],ck:[9,12],cm:6,att:5},
 {id:'t8',title:'استوری‌بورد ویدیوی معرفی اپ کافه میدان',desc:'استوری‌بورد ۶ فریمی مطابق برندبوک مشتری.',status:'todo',prio:'mid',assignee:'e11',project:'p4',start:'1405/06/10',due:'1405/06/18',est:10,tags:['ویدیو'],ck:[0,6],cm:0,att:0},
 {id:'t9',title:'بازبینی دیزاین سیستم ۲.۰ استودیو',desc:'یکسان‌سازی توکن‌های رنگ و تایپوگرافی در فیگما.',status:'ideas',prio:'low',assignee:'e7',project:null,start:null,due:'1405/07/01',est:20,tags:['دیزاین سیستم'],ck:[1,9],cm:2,att:1},
 {id:'t10',title:'آماده‌سازی گزارش ماهانه مشتریان — مرداد',desc:'گزارش‌های مرداد برای ۶ مشتری فعال شبکه‌های اجتماعی.',status:'done',prio:'high',assignee:'e8',project:null,start:'1405/05/30',due:'1405/06/02',est:8,tags:['گزارش'],ck:[6,6],cm:3,att:2},
 {id:'t11',title:'تولید ۴ ریلز آموزشی کلینیک روژان',desc:'ریلزهای آموزشی مراقبت پوست با رویکرد طنز ملایم.',status:'doing',prio:'high',assignee:'e4',project:'p8',start:'1405/06/02',due:'1405/06/07',est:9,tags:['ریلز','محتوا'],ck:[2,4],cm:1,att:0},
 {id:'t12',title:'بازبینی فاکتورهای سررسیدشده مرداد',desc:'پیگیری تلفنی ۴ فاکتور سررسیدشده و هماهنگی پرداخت.',status:'todo',prio:'urgent',assignee:'e6',project:null,start:'1405/06/05',due:'1405/06/05',est:3,tags:['مالی','پیگیری'],ck:[0,4],cm:0,att:0},
 {id:'t13',title:'کدنویسی API تقویم شمسی پنل مشتریان',desc:'سرویس Jalali برای تقویم رویدادها + تست پوششی.',status:'review',prio:'mid',assignee:'e9',project:'p3',start:'1405/05/26',due:'1405/06/03',est:14,tags:['API','تقویم'],ck:[7,8],cm:4,att:2},
 {id:'t14',title:'به‌روزرسانی قرارداد سطح خدمات (SLA) مشتریان',desc:'بازنگری SLA با تمرکز بر زمان پاسخ‌گویی شبکه‌های اجتماعی.',status:'ideas',prio:'mid',assignee:'e5',project:null,start:null,due:'1405/07/15',est:6,tags:['فرآیند'],ck:[0,5],cm:1,att:0},
 {id:'t15',title:'مصاحبه با ۲ نامزد طراح محصول',desc:'ارزیابی پورتفولیو و مصاحبه فنی مرحله دوم.',status:'todo',prio:'high',assignee:'e1',project:null,start:'1405/06/06',due:'1405/06/11',est:4,tags:['استخدام'],ck:[1,3],cm:2,att:3},
 {id:'t16',title:'تدوین فایل نهایی موشن‌گرافیک پخش یگانه',desc:'رندر نهایی + اصلاحات رنگ مرتبط با برند.',status:'doing',prio:'mid',assignee:'e11',project:'p5',start:'1405/06/01',due:'1405/06/09',est:12,tags:['موشن'],ck:[4,8],cm:2,att:6},
 {id:'t17',title:'تحقیق کلمات کلیدی فصل پاییز کافه میدان',desc:'خوشه‌های کلیدی منو و قهوه تخصصی + تحلیل رقبا.',status:'todo',prio:'low',assignee:'e4',project:'p9',start:'1405/06/08',due:'1405/06/22',est:7,tags:['سئو'],ck:[0,5],cm:0,att:1},
 {id:'t18',title:'راه‌اندازی اتوماسیون گزارش‌های هفتگی',desc:'ارسال خودکار خلاصه متریک‌ها به ایمیل مشتریان.',status:'review',prio:'mid',assignee:'e13',project:null,start:'1405/05/29',due:'1405/06/06',est:5,tags:['اتوماسیون'],ck:[4,5],cm:3,att:0},
 {id:'t19',title:'بسته‌بندی نسخه ۱.۲ اپلیکیشن داخلی',desc:'ریلیز داخلی + به‌روزرسانی تغییرات.',status:'done',prio:'mid',assignee:'e3',project:null,start:'1405/05/20',due:'1405/05/30',est:4,tags:['ریلیز'],ck:[3,3],cm:1,att:1},
 {id:'t20',title:'آماده‌سازی پیشنهاد همکاری برای ۳ سرنخ جدید',desc:'پروپوزال اختصاصی بر اساس نیازسنجی اولیه.',status:'doing',prio:'high',assignee:'e5',project:'p7',start:'1405/06/04',due:'1405/06/10',est:8,tags:['فروش','پروپوزال'],ck:[2,4],cm:0,att:2},
 {id:'t21',title:'بررسی خروجی‌های کمپین بنری پیشگامان',desc:'تحلیل CTR و هزینه جذب هر سرنخ.',status:'done',prio:'mid',assignee:'e8',project:'p7',start:'1405/05/28',due:'1405/06/01',est:4,tags:['پرفورمنس'],ck:[4,4],cm:2,att:3},
 {id:'t22',title:'بازطراحی صفحه پرداخت درگاه داده‌پردازان',desc:'بهبود نرخ تبدیل صفحه پرداخت بر اساس تست کاربر.',status:'todo',prio:'high',assignee:'e7',project:'p3',start:'1405/06/07',due:'1405/06/16',est:10,tags:['UI','تبدیل'],ck:[0,5],cm:1,att:0},
 {id:'t23',title:'برنامه‌ریزی محتوایی شهریور — ۵ مشتری',desc:'تقویم محتوای یک‌ماهه بر اساس تقویم مناسبت‌ها.',status:'todo',prio:'high',assignee:'e4',project:null,start:'1405/06/06',due:'1405/06/12',est:6,tags:['تقویم محتوا'],ck:[1,6],cm:0,att:1},
 {id:'t24',title:'مستندسازی فرآیند آنبردینگ مشتری جدید',desc:'چک‌لیست ۳۰ روزه ورود مشتری + نقش‌ها.',status:'ideas',prio:'mid',assignee:'e10',project:null,start:null,due:'1405/06/30',est:5,tags:['فرآیند','مستندسازی'],ck:[0,4],cm:1,att:0},
 {id:'t25',title:'اصلاح باگ نمایش گزارش ارز در پنل مشتریان',desc:'باگ گرد کردن مبالغ در گزارش‌های چندارزی.',status:'done',prio:'urgent',assignee:'e9',project:'p3',start:'1405/05/24',due:'1405/05/27',est:3,tags:['باگ'],ck:[3,3],cm:5,att:0},
 {id:'t26',title:'بازبینی دسترسی‌ها و نقش‌های کاربران فعال',desc:'ممیزی دسترسی‌های بیش از حد نیاز + اصلاح.',status:'todo',prio:'mid',assignee:'e13',project:null,start:'1405/06/09',due:'1405/06/19',est:4,tags:['امنیت','RBAC'],ck:[0,3],cm:0,att:0},
];
const task=id=>TASKS.find(t=>t.id===id);

/* ---------- customers ---------- */
const CUST=[
 {id:'c1',name:'تاج محل',ind:'رستوران‌های زنجیره‌ای',owner:'e5',status:'فعال',since:'1402/04/10',projects:['p1'],value:420000000,pay:'به‌روز',last:'1405/06/05',city:'تهران',contacts:[{n:'مهدی شاه‌مرادی',r:'مدیر بازاریابی',p:'۰۹۱۲۳۴۵۶۷۸۱',e:'mehdi@tajmahal.ir'},{n:'شیما راد',r:'سرپرست برند',p:'۰۹۱۲۳۴۵۶۷۸۲'}]},
 {id:'c2',name:'پخش یگانه',ind:'توزیع و پخش مواد غذایی',owner:'e5',status:'فعال',since:'1401/09/02',projects:['p5','p6'],value:340000000,pay:'معوق',last:'1405/06/04',city:'تهران',contacts:[{n:'اکبر یگانه',r:'مدیرعامل',p:'۰۹۱۲۳۴۵۶۷۸۳',e:'akbar@yeganeh.com'}]},
 {id:'c3',name:'پوشاک درسا',ind:'مد و پوشاک',owner:'e12',status:'فعال',since:'1403/02/18',projects:['p2'],value:280000000,pay:'بخشی پرداخت شده',last:'1405/06/03',city:'اصفهان',contacts:[{n:'درسا کیانی',r:'بنیان‌گذار',p:'۰۹۱۲۳۴۵۶۷۸۴',e:'dorsa@dorsawear.ir'}]},
 {id:'c4',name:'کلینیک زیبایی روژان',ind:'سلامت و زیبایی',owner:'e8',status:'فعال',since:'1402/11/05',projects:['p8'],value:210000000,pay:'به‌روز',last:'1405/06/05',city:'تهران',contacts:[{n:'دکتر لیلا فرهادی',r:'مدیر کلینیک',p:'۰۹۱۲۳۴۵۶۷۸۵',e:'info@rojan.clinic'}]},
 {id:'c5',name:'داده‌پردازان هوشمند',ind:'نرم‌افزار SaaS',owner:'e5',status:'فعال',since:'1402/06/23',projects:['p3'],value:650000000,pay:'بخشی پرداخت شده',last:'1405/06/05',city:'تهران',contacts:[{n:'سامان رهنما',r:'مدیر محصول',p:'۰۹۱۲۳۴۵۶۷۸۶',e:'saman@dp-smart.io'}]},
 {id:'c6',name:'کافه میدان',ind:'کافه و رستوران',owner:'e12',status:'فعال',since:'1403/05/30',projects:['p4','p9'],value:500000000,pay:'به‌روز',last:'1405/06/02',city:'شیراز',contacts:[{n:'آرش ملکی',r:'هم‌بنیان‌گذار',p:'۰۹۱۲۳۴۵۶۷۸۷',e:'arash@cafemeydan.ir'}]},
 {id:'c7',name:'آکادمی پیشگامان',ind:'آموزش آنلاین',owner:'e8',status:'فعال',since:'1403/03/12',projects:['p7'],value:240000000,pay:'به‌روز',last:'1405/06/04',city:'مشهد',contacts:[{n:'فرزاد آذری',r:'مدیر توسعه',p:'۰۹۱۲۳۴۵۶۷۸۸',e:'farzad@pishgaran.ac'}]},
 {id:'c8',name:'کلینیک دندانپزشکی لبخند',ind:'سلامت',owner:'e12',status:'مکث',since:'1404/08/01',projects:[],value:0,pay:'معوق',last:'1405/05/20',city:'تهران',contacts:[{n:'دکتر نازنین اوجی',r:'مدیر',p:'۰۹۱۲۳۴۵۶۷۸۹'}]},
];
const cust=id=>CUST.find(c=>c.id===id)||{name:'—'};

/* ---------- CRM leads ---------- */
const PIPE=[{id:'new',t:'سرنخ جدید'},{id:'called',t:'تماس گرفته شد'},{id:'qualified',t:'واجد شرایط'},{id:'proposal',t:'پیشنهاد ارسال شد'},{id:'negotiation',t:'مذاکره'},{id:'won',t:'برنده'},{id:'lost',t:'از دست رفته'}];
const LEADS=[
 {id:'l1',co:'رستوران زعفران',contact:'نعمت صادقی',phone:'۰۹۱۲۱۱۱۲۲۰۱',email:'info@zafran.ir',ig:'@zafran.rest',web:'zafran.ir',src:'اینستاگرام',owner:'e5',value:180000000,prob:30,stage:'new',next:'1405/06/08',note:'درخواست معرفی خدمات مدیریت شبکه‌های اجتماعی.'},
 {id:'l2',co:'فروشگاه آنلاین مدینو',contact:'پریسا فتاحی',phone:'۰۹۱۲۱۱۱۲۲۰۲',email:'parisa@medino.ir',ig:'@medino.shop',web:'medino.ir',src:'معرفی مشتری',owner:'e12',value:320000000,prob:55,stage:'called',next:'1405/06/07',note:'تماس اول انجام شد؛ نیاز به لندینگ و کمپین.'},
 {id:'l3',co:'کلینیک فیزیوتراپی گام',contact:'دکتر آرمان نجفی',phone:'۰۹۱۲۱۱۱۲۲۰۳',email:'arman@gamclinic.ir',ig:'@gam.clinic',web:'gamclinic.ir',src:'وب‌سایت',owner:'e5',value:140000000,prob:40,stage:'qualified',next:'1405/06/09',note:'بودجه تاییدشده؛ منتظر پیشنهاد رسمی.'},
 {id:'l4',co:'هلدینگ ساختمانی آرکان',contact:'بهزاد مهرابی',phone:'۰۹۱۲۱۱۱۲۲۰۴',email:'behzad@arkan.co',ig:'—',web:'arkan.co',src:'نمایشگاه',owner:'e5',value:560000000,prob:70,stage:'proposal',next:'1405/06/06',note:'پروپوزال هویت بصری + وب‌سایت ارسال شد.'},
 {id:'l5',co:'استارتاپ فین‌تک رسا',contact:'کیانا مرادی',phone:'۰۹۱۲۱۱۱۲۲۰۵',email:'kiana@resa.app',ig:'@resa.app',web:'resa.app',src:'لینکدین',owner:'e12',value:740000000,prob:60,stage:'negotiation',next:'1405/06/10',note:'در حال مذاکره بر سر فاز اول و مدل پرداخت.'},
 {id:'l6',co:'آژانس مسافرتی کویر',contact:'سهیل بانکی',phone:'۰۹۱۲۱۱۱۲۲۰۶',email:'soheil@kavir.travel',ig:'@kavir.travel',web:'kavir.travel',src:'اینستاگرام',owner:'e12',value:110000000,prob:25,stage:'new',next:'1405/06/12',note:'پیگیری برای جلسه نیازسنجی.'},
 {id:'l7',co:'برند لوازم ورزشی آتل',contact:'رامین هفت‌لق',phone:'۰۹۱۲۱۱۱۲۲۰۷',email:'ramin@atlasport.ir',ig:'@atla.sport',web:'atlasport.ir',src:'معرفی مشتری',owner:'e5',value:260000000,prob:45,stage:'called',next:'1405/06/08',note:'علاقه‌مند به کمپین فصل پاییز.'},
 {id:'l8',co:'نشر کتاب لاله‌زار',contact:'مینا بهرامی',phone:'۰۹۱۲۱۱۱۲۲۰۸',email:'mina@lalehar.com',ig:'@lalehar.pub',web:'lalehar.com',src:'وب‌سایت',owner:'e12',value:85000000,prob:50,stage:'qualified',next:'1405/06/09',note:'درخواست تولید محتوای ویدیویی معرفی کتاب.'},
 {id:'l9',co:'کارخانه شیرینی نیایش',contact:'حامد طباطبایی',phone:'۰۹۱۲۱۱۱۲۲۰۹',email:'hamed@niayesh.co',ig:'@niayesh.sweets',web:'niayesh.co',src:'نمایشگاه',owner:'e5',value:390000000,prob:80,stage:'negotiation',next:'1405/06/06',note:'جلسه نهایی قیمت‌گذاری — پنجشنبه.'},
 {id:'l10',co:'اپلیکیشن سلامت هُما',contact:'ترانه صدر',phone:'۰۹۱۲۱۱۱۲۲۱۰',email:'taraneh@homa.health',ig:'@homa.health',web:'homa.health',src:'لینکدین',owner:'e12',value:450000000,prob:90,stage:'won',next:'—',note:'قرارداد امضا شد؛ آنبردینگ از هفته آینده.'},
 {id:'l11',co:'مدرسه زبان اسپارک',contact:'ولی رستگار',phone:'۰۹۱۲۱۱۱۲۲۱۱',email:'vali@spark.ir',ig:'@spark.lang',web:'spark.ir',src:'اینستاگرام',owner:'e5',value:95000000,prob:0,stage:'lost',next:'—',note:'بودجه امسال تخصیص نیافت.'},
 {id:'l12',co:'بورس طلا و جواهر ستاره',contact:'ناصر فرد',phone:'۰۹۱۲۱۱۱۲۲۱۲',email:'naser@setareh.gold',ig:'@setareh.gold',web:'setareh.gold',src:'معرفی مشتری',owner:'e12',value:220000000,prob:35,stage:'called',next:'1405/06/11',note:'تماس مجدد بعد از تعطیلات.'},
 {id:'l13',co:'دامداری سبزدشت',contact:'یاسر کمالی',phone:'۰۹۱۲۱۱۱۲۲۱۳',email:'yaser@sabzdasht.ir',ig:'—',web:'sabzdasht.ir',src:'وب‌سایت',owner:'e5',value:60000000,prob:20,stage:'new',next:'1405/06/14',note:'درخواست وب‌سایت معرفی.'},
 {id:'l14',co:'مجله گردشگری راه‌جان',contact:'هستی موسوی',phone:'۰۹۱۲۱۱۲۲۲۱۴',email:'hesti@rahjan.com',ig:'@rahjan.mag',web:'rahjan.com',src:'لینکدین',owner:'e12',value:130000000,prob:65,stage:'proposal',next:'1405/06/07',note:'پیشنهاد محتوای سفر + سئو ارسال شد.'},
];
const CRM_ACT=[
 {t:'تماس',who:'e5', subj:'تماس با نعمت صادقی از رستوران زعفران',time:95,rel:'l1',type:'call'},
 {t:'یادداشت',who:'e12',subj:'بودجه رسا برای فاز اول تایید شد',time:180,rel:'l5',type:'note'},
 {t:'جلسه',who:'e5', subj:'جلسه نیازسنجی کارخانه نیایش',time:1320,rel:'l9',type:'meet'},
 {t:'ایمیل',who:'e12',subj:'ارسال پیشنهادی به مجله راه‌جان',time:1580,rel:'l14',type:'mail'},
 {t:'تماس',who:'e5', subj:'پیگیری پروپوزال هلدینگ آرکان',time:1720,rel:'l4',type:'call'},
 {t:'یادداشت',who:'e5',subj:'سرنخ اسپارک — از دست رفته',time:4300,rel:'l11',type:'note'},
];

/* ---------- finance ---------- */
const INV=[
 {id:'EF-1405-0142',cust:'c1',date:'1405/05/28',due:'1405/06/12',status:'ارسال شده',total:84500000,items:[{d:'مدیریت شبکه‌های اجتماعی — مرداد ۱۴۰۵',q:1,u:42000000},{d:'تولید محتوای تصویری (پکیج ۱۲ پست)',q:12,u:2500000},{d:'ریلز تبلیغاتی کمپین تابستان',q:4,u:8000000}],disc:5000000,pay:null,terms:'پرداخت در ۱۴ روز'},
 {id:'EF-1405-0141',cust:'c5',date:'1405/05/25',due:'1405/06/09',status:'بخشی پرداخت شده',total:162500000,items:[{d:'توسعه فاز ۲ پنل مشتریان — پیش‌پرداخت',q:1,u:120000000},{d:'آموزش و مستندسازی',q:8,u:3200000}],disc:0,pay:80000000,terms:'سه قسط (۴۰٪ - ۳۰٪ - ۳۰٪)'},
 {id:'EF-1405-0138',cust:'c2',date:'1405/04/30',due:'1405/05/14',status:'سررسید گذشته',total:96000000,items:[{d:'تولید ۸ ویدیوی تبلیغاتی',q:8,u:9500000},{d:'موشن‌گرافیک معرفی محصولات جدید',q:2,u:10000000}],disc:0,pay:0,terms:'پرداخت در ۱۴ روز'},
 {id:'EF-1405-0136',cust:'c7',date:'1405/04/22',due:'1405/05/06',status:'پرداخت شده',total:58000000,items:[{d:'کمپین فروش دوره‌ها — تیر',q:1,u:38000000},{d:'طراحی خلاقه بنرها',q:10,u:2000000}],disc:0,pay:58000000,terms:'پیش‌پرداخت'},
 {id:'EF-1405-0135',cust:'c4',date:'1405/04/18',due:'1405/05/02',status:'پرداخت شده',total:46500000,items:[{d:'ری‌دیزاین داشبورد — فاز تحقیق',q:1,u:28500000},{d:'تست کاربری',q:5,u:3600000}],disc:1500000,pay:46500000,terms:'پرداخت در ۱۴ روز'},
 {id:'EF-1405-0133',cust:'c6',date:'1405/04/10',due:'1405/05/24',status:'بخشی پرداخت شده',total:120000000,items:[{d:'طراحی UX اپلیکیشن موبایل',q:1,u:75000000},{d:'تولید پرده‌بعدی (Wireframe)',q:14,u:3200000}],disc:0,pay:60000000,terms:'دو قسط'},
 {id:'EF-1405-0131',cust:'c3',date:'1405/04/02',due:'1405/04/16',status:'سررسید گذشته',total:70000000,items:[{d:'هویت بصری — فاز تحقیق و استراتژی',q:1,u:45000000},{d:'طراحی لوگوتایپ — مسیر اول',q:2,u:12500000}],disc:0,pay:0,terms:'پرداخت در ۱۴ روز'},
 {id:'EF-1405-0128',cust:'c1',date:'1405/03/20',due:'1405/04/03',status:'پرداخت شده',total:52000000,items:[{d:'مدیریت شبکه‌های اجتماعی — اردیبهشت',q:1,u:42000000},{d:'استوری تعاملی',q:8,u:1250000}],disc:0,pay:52000000,terms:'پرداخت در ۱۴ روز'},
 {id:'EF-1405-0126',cust:'c8',date:'1405/03/08',due:'1405/03/22',status:'سررسید گذشته',total:36000000,items:[{d:'محتوای درمانی — پکیج ۳ ماهه',q:3,u:12000000}],disc:0,pay:0,terms:'پرداخت در ۱۴ روز'},
 {id:'EF-1405-0125',cust:'c5',date:'1405/03/01',due:'1405/03/15',status:'پرداخت شده',total:240000000,items:[{d:'توسعه پنل مشتریان — فاز ۱',q:1,u:240000000}],disc:0,pay:240000000,terms:'پیش‌پرداخت'},
 {id:'EF-1405-0143',cust:'c4',date:'1405/06/05',due:'1405/06/19',status:'پیش‌نویس',total:38750000,items:[{d:'مدیریت شبکه‌های اجتماعی — شهریور',q:1,u:35000000},{d:'ریلز آموزشی',q:2,u:8000000}],disc:2500000,pay:null,terms:'پرداخت در ۱۴ روز'},
 {id:'EF-1405-0140',cust:'c7',date:'1405/05/20',due:'1405/06/03',status:'سررسید گذشته',total:42000000,items:[{d:'کمپین فروش — مرداد',q:1,u:38000000},{d:'ریپورتینگ اختصاصی',q:1,u:4000000}],disc:0,pay:0,terms:'پرداخت در ۱۴ روز'},
];
const PROFORMA=[
 {id:'PF-1405-031',cust:'c2',date:'1405/06/04',due:'1405/06/18',status:'ارسال شده',total:145000000,items:[{d:'موشن‌گرافیک معرفی برند — نسخه کامل',q:1,u:65000000},{d:'تولید ۶ ویدیو برای یلتی‌وی',q:6,u:14000000}],disc:5000000,terms:'اعتبار ۳۰ روز'},
 {id:'PF-1405-030',cust:'c3',date:'1405/06/02',due:'1405/06/16',status:'ارسال شده',total:92000000,items:[{d:'طراحی بسته‌بندی تابستانه',q:3,u:28000000}],disc:0,terms:'اعتبار ۳۰ روز'},
 {id:'PF-1405-029',cust:'c6',date:'1405/05/30',due:'1405/06/13',status:'پیش‌نویس',total:68000000,items:[{d:'فاز توسعه اپلیکیشن — اسپرینت ۱',q:1,u:68000000}],disc:0,terms:'اعتبار ۲۱ روز'},
 {id:'PF-1405-028',cust:'c1',date:'1405/05/26',due:'1405/06/09',status:'تایید شده',total:56000000,items:[{d:'کمپین پاییزه — برنامه‌ریزی و اجرا',q:1,u:56000000}],disc:0,terms:'اعتبار ۳۰ روز'},
 {id:'PF-1405-027',cust:'c7',date:'1405/05/18',due:'1405/06/01',status:'منقضی',total:38000000,items:[{d:'دوره‌های ضبط‌شده — تدوین',q:10,u:3800000}],disc:0,terms:'اعتبار ۱۴ روز'},
];
const TX=[
 {id:'TR-8412',t:'in',cust:'c7',amt:42000000,date:'1405/06/04',meth:'انتقال بانکی',acc:'بانک ملت',desc:'پرداخت فاکتور EF-1405-0126'},
 {id:'TR-8411',t:'in',cust:'c4',amt:46500000,date:'1405/06/03',meth:'انتقال بانکی',acc:'سامان',desc:'تسویه فاکتور EF-1405-0135'},
 {id:'TR-8410',t:'out',who:'e6',amt:1850000,date:'1405/06/03',meth:'انتقال بانکی',acc:'سامان',desc:'خرید نرم‌افزار حسابداری — لایسنس سالانه'},
 {id:'TR-8409',t:'in',cust:'c5',amt:80000000,date:'1405/06/02',meth:'انتقال بانکی',acc:'ملت',desc:'قسط اول EF-1405-0141'},
 {id:'TR-8408',t:'out',v:'اجاره دفتر — مرداد',amt:95000000,date:'1405/06/01',meth:'چک',acc:'ملت',desc:'چک ۲۰۶۵۴۳'},
 {id:'TR-8407',t:'out',v:'تبلیغات دیجیتال — کمپین پیشگامان',amt:24000000,date:'1405/05/30',meth:'کارت بانکی',acc:'سامان',desc:'گزارش مستقیم کمپین'},
 {id:'TR-8406',t:'in',cust:'c1',amt:84500000,date:'1405/05/29',meth:'انتقال بانکی',acc:'ملت',desc:'پیش‌پرداخت کمپین تابستان'},
 {id:'TR-8405',t:'out',v:'تهیه تجهیزات استودیو (دوربین + نور)',amt:132000000,date:'1405/05/27',meth:'انتقال بانکی',acc:'سامان',desc:'سرمایه‌گذاری تجهیزات'},
 {id:'TR-8404',t:'in',cust:'c6',amt:60000000,date:'1405/05/25',meth:'انتقال بانکی',acc:'سامان',desc:'قسط اول EF-1405-0133'},
 {id:'TR-8403',t:'out',v:'پرداخت پرسنل — مرداد ۱۴۰۵',amt:534000000,date:'1405/05/30',meth:'پرداخت گروهی',acc:'ملت',desc:'لیست حقوق ۱۳ نفر'},
 {id:'TR-8402',t:'out',v:'سرور و زیرساخت ابری',amt:18600000,date:'1405/05/22',meth:'کارت بانکی',acc:'سامان',desc:'تمدید سرورهای تولید'},
 {id:'TR-8401',t:'in',cust:'c5',amt:240000000,date:'1405/05/15',meth:'انتقال بانکی',acc:'ملت',desc:'تسویه فاکتور EF-1405-0125'},
];
const ACCOUNTS=[
 {id:'a1',name:'بانک ملت — جاری ۸۸۴۵',type:'حساب جاری',balance:412500000,iban:'IR•• •••• •••• •••• 8845'},
 {id:'a2',name:'بانک سامان — جاری ۲۲۱۰',type:'حساب جاری',balance:168200000,iban:'IR•• •••• •••• •••• 2210'},
 {id:'a3',name:'صندوق نقدی دفتر',type:'صندوق',balance:18500000,iban:'—'},
];
const PAYROLL={
 month:'مرداد ۱۴۰۵', payDate:'1405/05/30', total:534000000,
 rows:EMP.map((e,i)=>({emp:e.id,base:[128,92,105,68,88,96,74,72,80,84,90,62,85][i]*1000000,
   bonus:[0,12000000,8000000,6000000,10000000,0,5000000,7000000,0,9000000,6000000,4000000,0][i],
   ded:[0,3200000,2800000,1900000,2400000,2600000,2100000,2000000,2200000,2300000,2500000,1700000,2300000][i],
   paid:i<9?true:false}))};
const PAYROLL_HIST=(empId)=>[
 {m:'مرداد ۱۴۰۵',amt:'—',status:empId&&PAYROLL.rows.find(r=>r.emp===empId).paid?'پرداخت شده':'در انتظار پرداخت',date:'۱۴۰۵/۰۵/۳۰'},
 {m:'تیر ۱۴۰۵',amt:'پرداخت شده',status:'پرداخت شده',date:'۱۴۰۵/۰۴/۳۰'},
 {m:'خرداد ۱۴۰۵',amt:'پرداخت شده',status:'پرداخت شده',date:'۱۴۰۵/۰۳/۳۰'},
 {m:'اردیبهشت ۱۴۰۵',amt:'پرداخت شده',status:'پرداخت شده',date:'۱۴۰۵/۰۲/۳۰'},
];
const REV_6M=[ {m:'فروردین',r:142,e:98},{m:'اردیبهشت',r:168,e:112},{m:'خرداد',r:151,e:120},{m:'تیر',r:196,e:131},{m:'مرداد',r:224,e:150},{m:'شهریور',r:285,e:163} ];
const EXP_CATS=[{t:'حقوق و دستمزد',v:534,pct:57,c:'#6f6aeb'},{t:'اجاره و تجهیزات',v:227,pct:24,c:'#0ea5e9'},{t:'تبلیغات و کمپین',v:86,pct:9,c:'#f59e0b'},{t:'زیرساخت و نرم‌افزار',v:42,pct:5,c:'#10b981'},{t:'سایر هزینه‌ها',v:54,pct:5,c:'#737373'}];

/* ---------- leave ---------- */
const LEAVE_TYPES=[{id:'casual',t:'استحقاقی'},{id:'sick',t:'استعلاجی'},{id:'unpaid',t:'بدون حقوق'},{id:'bonus',t:'تشویقی'}];
const LEAVES=[
 {id:'lv1',emp:'e4',type:'استحقاقی',from:'1405/06/10',to:'1405/06/12',days:3,reason:'سفر خانوادگی برنامه‌ریزی‌شده',status:'در انتظار تایید',at:190},
 {id:'lv2',emp:'e11',type:'استعلاجی',from:'1405/06/08',to:'1405/06/08',days:1,reason:'ویزیت پزشک',status:'در انتظار تایید',at:340},
 {id:'lv3',emp:'e9',type:'استحقاقی',from:'1405/06/05',to:'1405/06/05',days:1,reason:'امور اداری',status:'تایید شده',at:520},
 {id:'lv4',emp:'e7',type:'تشویقی',from:'1405/05/28',to:'1405/05/28',days:1,reason:'پاداش عملکرد پروژه روژان',status:'تایید شده',at:2600},
 {id:'lv5',emp:'e8',type:'استحقاقی',from:'1405/05/20',to:'1405/05/22',days:3,reason:'مراسم خانوادگی',status:'تایید شده',at:4200},
 {id:'lv6',emp:'e12',type:'استعلاجی',from:'1405/05/12',to:'1405/05/13',days:2,reason:'بیماری',status:'تایید شده',at:6800},
 {id:'lv7',emp:'e3',type:'بدون حقوق',from:'1405/04/18',to:'1405/04/25',days:8,reason:'سفر بلندمدت',status:'تایید شده',at:11200},
 {id:'lv8',emp:'e4',type:'استحقاقی',from:'1405/04/02',to:'1405/04/03',days:2,reason:'امور شخصی',status:'رد شده',at:13000},
];
const LEAVE_BAL=EMP.map((e,i)=>({emp:e.id,total:26+i%5,used:[4,7,3,9,2,5,6,4,3,8,5,2,1][i]}));

/* ---------- calendar ---------- */
const MEETS=[
 {id:'m1',t:'جلسه هفتگی تیم طراحی',date:'1405/06/05',from:'11:00',dur:60,who:['e2','e7','e10','e1'],link:'meet.effectstudio.ir/design-weekly',agenda:'بازبینی پروژه درسا و روژان + برنامه‌ریزی هفته',note:'',status:'pre'},
 {id:'m2',t:'جلسه با مشتری — تاج محل (کمپین تابستان)',date:'1405/06/05',from:'16:00',dur:90,who:['e1','e10','e5'],link:'meet.effectstudio.ir/tajmahal',agenda:'ارائه سناریوی نهایی تیزر و تایید برنامه انتشار',note:'مدیر بازاریابی و سرپرست برند مشتری حضور دارند.',status:'pre'},
 {id:'m3',t:'استندآپ روزانه — توسعه',date:'1405/06/06',from:'10:00',dur:15,who:['e3','e9','e13'],link:'meet.effectstudio.ir/dev-standup',agenda:'بررسی پیشرفت اسپرینت',status:'pre'},
 {id:'m4',t:'جلسه قیمت‌گذاری نهایی — شیرینی نیایش',date:'1405/06/06',from:'14:30',dur:60,who:['e5','e1'],link:'meet.effectstudio.ir/niayesh',agenda:'جلسه نهایی مذاکره قرارداد',status:'pre'},
 {id:'m5',t:'آنبردینگ مشتری جدید — هما',date:'1405/06/07',from:'12:00',dur:60,who:['e12','e8','e10'],link:'meet.effectstudio.ir/homa-onb',agenda:'شروع همکاری، معرفی تیم و فرآیندها',status:'pre'},
 {id:'m6',t:'بازبینی مالی فصل — جلسه مدیریت',date:'1405/06/09',from:'17:00',dur:90,who:['e1','e6'],link:'meet.effectstudio.ir/fin-q2',agenda:'بررسی سود و زیان فصل و بودجه پاییز',status:'pre'},
 {id:'m7',t:'جلسه هفتگی تیم طراحی',date:'1405/06/12',from:'11:00',dur:60,who:['e2','e7','e10'],link:'meet.effectstudio.ir/design-weekly',agenda:'—',status:'pre'},
 {id:'m8',t:'ارائه فاز تحقیق — روژان',date:'1405/06/04',from:'15:00',dur:60,who:['e2','e10'],link:'meet.effectstudio.ir/rojan-review',agenda:'ارائه یافته‌های تحقیق کاربر',note:'فایل ارائه در پیوست تسک مرتبط ثبت شد.',status:'done'},
];

/* ---------- social ---------- */
const SOC=[
 {id:'s1',cust:'c4',plat:'instagram',handle:'rojan.clinic',followers:48200,g7:4.2,reach:312000,imp:1140000,eng:48200,er:4.2,visits:18400,clicks:3120,grow:[41,42,43,44,44.4,45.3,46.1,46.6,47.2,47.5,48,48.2]},
 {id:'s2',cust:'c1',plat:'instagram',handle:'tajmahal.food',followers:124600,g7:2.8,reach:842000,imp:3100000,eng:93000,er:3.0,visits:41200,clicks:8600,grow:[112,113.4,115,116.2,118,119.5,120.4,121.2,122.3,123.2,124,124.6]},
 {id:'s3',cust:'c3',plat:'instagram',handle:'dorsa.wear',followers:56400,g7:6.1,reach:388000,imp:1420000,eng:67800,er:4.8,visits:22600,clicks:5400,grow:[47,48.2,49.5,50.6,51.8,52.7,53.6,54.4,55.2,55.7,56.1,56.4]},
 {id:'s4',cust:'c6',plat:'instagram',handle:'cafe.meydan',followers:21300,g7:3.4,reach:121000,imp:442000,eng:14900,er:3.4,visits:7800,clicks:2100,grow:[18.4,18.9,19.3,19.7,20.1,20.4,20.7,20.9,21,21.2,21.2,21.3]},
 {id:'s5',cust:'c7',plat:'linkedin',handle:'Pishgaran Academy',followers:11800,g7:8.9,reach:96000,imp:288000,eng:9100,er:3.2,visits:5200,clicks:1900,grow:[8.6,8.9,9.2,9.8,10.2,10.7,11,11.3,11.4,11.6,11.7,11.8]},
 {id:'s6',cust:'c1',plat:'tiktok',handle:'tajmahal.food',followers:38700,g7:12.4,reach:1240000,imp:4600000,eng:187000,er:4.1,visits:28400,clicks:3800,grow:[24,26.5,28.4,30.2,32,33.8,35,36.2,37,37.6,38.2,38.7]},
];
const POSTS=[
 {id:'po1',acct:'s2',type:'reel',title:'پشت صحنه آشپزخانه — ته‌دیگ طلایی',date:'1405/06/03',reach:214000,imp:685000,likes:24300,cm:412,sv:3800,sh:1900},
 {id:'po2',acct:'s2',type:'carousel',title:'منوی جدید شام — ۵ پیشنهاب ویژه',date:'1405/06/01',reach:96000,imp:287000,likes:9800,cm:164,sv:1240,sh:620},
 {id:'po3',acct:'s1',type:'reel',title:'روتین شب پوست با دکتر فرهادی',date:'1405/06/04',reach:168000,imp:498000,likes:18600,cm:538,sv:5900,sh:2400},
 {id:'po4',acct:'s1',type:'post',title:'معرفی خدمات جدید کلینیک',date:'1405/05/30',reach:34000,imp:96000,likes:2900,cm:88,sv:410,sh:150},
 {id:'po5',acct:'s3',type:'reel',title:'استایل پاییزه با کالکشن جدید',date:'1405/06/02',reach:142000,imp:431000,likes:15900,cm:396,sv:4200,sh:2100},
 {id:'po6',acct:'s3',type:'carousel',title:'راهنمای سایز — انتخاب درست',date:'1405/05/29',reach:52000,imp:158000,likes:5600,cm:142,sv:1900,sh:730},
 {id:'po7',acct:'s6',type:'reel',title:'چالش طعم جدید تاج محل',date:'1405/06/04',reach:486000,imp:1420000,likes:42800,cm:1200,sv:9800,sh:6400},
 {id:'po8',acct:'s4',type:'reel',title:'لاته‌آرت توسط باریستای ما',date:'1405/06/03',reach:68000,imp:214000,likes:7400,cm:180,sv:980,sh:540},
 {id:'po9',acct:'s5',type:'post',title:'افتتاحیه ثبت‌نام پاییز — پست لینکدین',date:'1405/06/01',reach:28000,imp:74000,likes:1900,cm:96,sv:340,sh:210},
 {id:'po10',acct:'s2',type:'reel',title:'دستور آشپزی خانگی — قیمه سنتی',date:'1405/05/27',reach:178000,imp:556000,likes:19800,cm:502,sv:4600,sh:2200},
 {id:'po11',acct:'s1',type:'carousel',title:'قبل و بعد — نتایج واقعی مشتریان',date:'1405/05/26',reach:88000,imp:262000,likes:8900,cm:231,sv:2600,sh:890},
 {id:'po12',acct:'s3',type:'post',title:'معرفی پارچه‌های پایدار',date:'1405/05/24',reach:41000,imp:118000,likes:4300,cm:97,sv:1200,sh:460},
 {id:'po13',acct:'s6',type:'post',title:'کلیپ معرفی شعبه دوم',date:'1405/05/28',reach:210000,imp:660000,likes:18200,cm:640,sv:5100,sh:3300},
 {id:'po14',acct:'s4',type:'carousel',title:'قهوه تخصصی چیست؟ — آموزش',date:'1405/05/25',reach:39000,imp:124000,likes:3600,cm:112,sv:1400,sh:520},
];
const TYPE_COLORS={reel:'#6f6aeb',carousel:'#0d9488',post:'#d97706'};
const TYPE_FA={reel:'ریلز',carousel:'کاروسل',post:'پست تک'};

/* ---------- integrations ---------- */
const INT_CATS=['هوش مصنوعی','شبکه‌های اجتماعی','ارتباطات','تقویم','اتوماسیون','ذخیره‌سازی','مالی'];
const INTS=[
 {id:'i1',name:'OpenAI',cat:'هوش مصنوعی',desc:'تولید محتوا، خلاصه‌سازی و دستیار هوشمند',status:'متصل',color:'#10a37f',letter:'AI',plan:'استاندارد',calls:12840,key:'sk-proj-••••••••••••••••••••'},
 {id:'i2',name:'Claude',cat:'هوش مصنوعی',desc:'تحلیل متن بلند و بازبینی مستندات',status:'متصل',color:'#d97757',letter:'Cl',plan:'Pro',calls:6420,key:'sk-ant-••••••••••••••••••••'},
 {id:'i3',name:'Instagram Graph API',cat:'شبکه‌های اجتماعی',desc:'دریافت Insights و مدیریت حساب‌های مشتریان',status:'متصل',color:'#d6249f',letter:'Ig',plan:'Business',calls:48200,key:'igq-••••••••••••••••••••'},
 {id:'i4',name:'TikTok for Business',cat:'شبکه‌های اجتماعی',desc:'آنالیتیکس ویدیو و رشد فالوور',status:'متصل',color:'#171717',letter:'Tt',plan:'Basic',calls:9400,key:'tt-••••••••••••••••••••'},
 {id:'i5',name:'WhatsApp Business',cat:'ارتباطات',desc:'ارسال پیام خودکار و پیگیری مشتریان',status:'خطا',color:'#25d366',letter:'Wa',plan:'Cloud API',calls:2100,key:'wab-••••••••••••••••••••'},
 {id:'i6',name:'Telegram Bot',cat:'ارتباطات',desc:'اطلاع‌رسانی تیم و ربات دستیار داخلی',status:'متصل',color:'#229ed9',letter:'Tg',plan:'رایگان',calls:33100,key:'tg-••••••••••••••••••••'},
 {id:'i7',name:'Google Calendar',cat:'تقویم',desc:'همگام‌سازی جلسات و رویدادها',status:'متصل',color:'#4285f4',letter:'GC',plan:'Workspace',calls:5600,key:'—'},
 {id:'i8',name:'Slack',cat:'ارتباطات',desc:'اعلان‌های تیمی و اتصال گردش کار',status:'غیرفعال',color:'#611f69',letter:'Sl',plan:'—',calls:0,key:'—'},
 {id:'i9',name:'Zapier',cat:'اتوماسیون',desc:'اتصال Effect ERP به ۶۰۰۰+ سرویس',status:'غیرفعال',color:'#ff4f00',letter:'Za',plan:'—',calls:0,key:'—'},
 {id:'i10',name:'Make',cat:'اتوماسیون',desc:'سناریوهای خودکاری پیشرفته',status:'غیرفعال',color:'#6d00cc',letter:'Mk',plan:'—',calls:0,key:'—'},
 {id:'i11',name:'Google Drive',cat:'ذخیره‌سازی',desc:'فایل پروژه‌ها و خروجی مشتریان',status:'متصل',color:'#1a73e8',letter:'GD',plan:'Workspace',calls:12100,key:'—'},
 {id:'i12',name:'زرین‌پال',cat:'مالی',desc:'دریافت آنلاین پرداخت مشتریان',status:'متصل',color:'#f6b21b',letter:'Zp',plan:'درگاه',calls:340,key:'zp-••••••••••••••••••••'},
 {id:'i13',name:'هلو — حسابداری',cat:'مالی',desc:'همگام‌سازی فاکتورها و اسناد حسابداری',status:'غیرفعال',color:'#e11d48',letter:'Ha',plan:'—',calls:0,key:'—'},
 {id:'i14',name:'Google Gemini',cat:'هوش مصنوعی',desc:'تحلیل تصویر کمپین‌ها',status:'غیرفعال',color:'#886fea',letter:'Gm',plan:'—',calls:0,key:'—'},
];
const INT_LOG=[
 {t:'1405/06/05 09:42',api:'Instagram Graph /insights',code:200,ms:412},
 {t:'1405/06/05 09:40',api:'OpenAI /completions',code:200,ms:1830},
 {t:'1405/06/05 09:31',api:'WhatsApp /messages',code:503,ms:8420},
 {t:'1405/06/05 09:15',api:'TikTok /video/list',code:200,ms:690},
 {t:'1405/06/05 08:58',api:'Claude /messages',code:200,ms:2210},
 {t:'1405/06/05 08:44',api:'Instagram Graph /media',code:429,ms:210},
 {t:'1405/06/04 18:12',api:'OpenAI /embeddings',code:200,ms:940},
];
const WEBHOOKS=[
 {url:'https://erp.effectstudio.ir/hooks/instagram/insights',ev:'insights.updated',status:'فعال'},
 {url:'https://erp.effectstudio.ir/hooks/invoices/paid',ev:'invoice.paid',status:'فعال'},
 {url:'https://erp.effectstudio.ir/hooks/tasks/changed',ev:'task.status_changed',status:'فعال'},
];

/* ---------- notifications & activity ---------- */
const NOTIFS=[
 {id:'n1',type:'task',ic:'tasks',cls:'pr',t:'<b>الهام رستمی</b> شما را در تسک «جلسه راه‌اندازی فاز ۲» منشن کرد',time:8,unread:true},
 {id:'n2',type:'leave',ic:'leave',cls:'warn',t:'درخواست مرخصی <b>نگار محمدی</b> در انتظار تایید شماست',time:42,unread:true},
 {id:'n3',type:'finance',ic:'wallet',cls:'ok',t:'پرداخت <b>۴۲٬۰۰۰٬۰۰۰ تومان</b> از آکادمی پیشگامان دریافت شد',time:95,unread:true},
 {id:'n4',type:'task',ic:'alert',cls:'err',t:'تسک «بازبینی قرارداد پخش یگانه» <b>۲ روز از سررسید گذشته</b>',time:180,unread:true},
 {id:'n5',type:'meet',ic:'cal',cls:'pr',t:'جلسه با مشتری تاج محل امروز ساعت <b>۱۶:۰۰</b> برگزار می‌شود',time:240,unread:false},
 {id:'n6',type:'crm',ic:'crm',cls:'info',t:'سرنخ <b>کارخانه شیرینی نیایش</b> به مرحله مذاکره منتقل شد',time:320,unread:false},
 {id:'n7',type:'leave',ic:'leave',cls:'ok',t:'درخواست مرخصی <b>حسین شریفی</b> تایید شد',time:520,unread:false},
 {id:'n8',type:'task',ic:'check',cls:'ok',t:'<b>زهرا نوری</b> تسک «گزارش ماهانه مرداد» را انجام شد',time:640,unread:false},
 {id:'n9',type:'finance',ic:'receipt',cls:'err',t:'فاکتور <b>EF-1405-0138</b> پخش یگانه سررسید گذشته است',time:1300,unread:false},
 {id:'n10',type:'crm',ic:'phone',cls:'info',t:'یادآوری: پیگیری سرنخ <b>هلدینگ آرکان</b> امروز',time:1580,unread:false},
 {id:'n11',type:'system',ic:'bot',cls:'mut',t:'گزارش هفتگی عملکرد شبکه‌های اجتماعی آماده شد',time:2900,unread:false},
 {id:'n12',type:'system',ic:'shield',cls:'mut',t:'ورود جدید به حساب شما از دستگاه iPhone — تهران',time:4400,unread:false},
];
const ACTIVITY=[
 {who:'e1',act:'ورود به سیستم',mod:'احراز هویت',det:'ورود با شماره موبایل — تهران',min:8},
 {who:'e10',act:'ایجاد تسک',mod:'تسک‌ها',det:'«جلسه راه‌اندازی فاز ۲ داشبورد داده‌پردازان»',min:52},
 {who:'e6',act:'ثبت فاکتور',mod:'مالی',det:'فاکتور EF-1405-0143 برای کلینیک روژان صادر شد',min:120},
 {who:'e8',act:'تغییر وضعیت تسک',mod:'تسک‌ها',det:'«گزارش ماهانه مرداد» ← انجام شده',min:190},
 {who:'e13',act:'تغییر دسترسی',mod:'تنظیمات',det:'نقش «کارمند» برای ۲ کاربر به‌روزرسانی شد',min:340},
 {who:'e5',act:'به‌روزرسانی مشتری',mod:'CRM',det:'مرحله سرنخ «شیرینی نیایش» ← مذاکره',min:430},
 {who:'e6',act:'ثبت پرداخت',mod:'مالی',det:'دریافت ۴۲٬۰۰۰٬۰۰۰ تومان از آکادمی پیشگامان',min:560},
 {who:'e1',act:'تایید مرخصی',mod:'مرخصی',det:'درخواست حسین شریفی (۱ روز) تایید شد',min:820},
 {who:'e4',act:'ارسال درخواست مرخصی',mod:'مرخصی',det:'۳ روز استحقاقی — ۱۰ تا ۱۲ شهریور',min:1600},
 {who:'e3',act:'تغییر وضعیت تسک',mod:'تسک‌ها',det:'«تحویل نسخه بتا» ← در حال انجام (۹۰٪)',min:1900},
 {who:'e12',act:'ایجاد سرنخ',mod:'CRM',det:'«مجله گردشگری راه‌جان» ثبت شد',min:2600},
 {who:'e13',act:'تغییر اتصال',mod:'اتصالات',det:'اتصال WhatsApp Business با خطا مواجه شد',min:3400},
 {who:'e2',act:'بارگذاری فایل',mod:'تسک‌ها',det:'۴ فایل به «لوگوتایپ ثانویه درسا» افزوده شد',min:4200},
 {who:'e6',act:'ثبت هزینه',mod:'مالی',det:'لایسنس سالانه نرم‌افزار حسابداری — ۱٬۸۵۰٬۰۰۰',min:5100},
 {who:'e10',act:'ایجاد جلسه',mod:'تقویم',det:'«جلسه با مشتری تاج محل» — ۵ شهریور ۱۶:۰۰',min:6800},
 {who:'e5',act:'ثبت پیش‌فاکتور',mod:'مالی',det:'PF-1405-031 برای پخش یگانه صادر شد',min:8400},
 {who:'e1',act:'ورود به سیستم',mod:'احراز هویت',det:'ورود با شماره موبایل — تهران (دستگاه جدید)',min:9800},
 {who:'e13',act:'به‌روزرسانی وب‌هوک',mod:'اتصالات',det:'وب‌هوک insights.updated بازتنظیم شد',min:12400},
];

/* ---------- RBAC ---------- */
const PERM_CATS=['داشبورد','تسک‌ها','فضاهای کاری','CRM','مشتریان','مالی','فاکتورها','گزارش‌ها','شبکه‌های اجتماعی','تیم','مرخصی','تقویم','اتصالات','تنظیمات'];
const PERM_LVLS=['مشاهده','ایجاد','ویرایش','حذف','تأیید','خروجی گرفتن','مدیریت'];
const ROLES=[
 {id:'r1',t:'مدیر کل',n:2,mx:PERM_CATS.map(()=>[1,1,1,1,1,1,1])},
 {id:'r2',t:'مدیر سیستم',n:1,mx:PERM_CATS.map((c,i)=>c==='تنظیمات'||c==='اتصالات'?[1,1,1,1,1,1,1]:c==='مالی'||c==='فاکتورها'?[1,0,0,0,0,1,0]:[1,1,1,1,1,1,0])},
 {id:'r3',t:'مدیر پروژه',n:2,mx:PERM_CATS.map((c,i)=>['داشبورد','تسک‌ها','فضاهای کاری','تقویم'].includes(c)?[1,1,1,1,1,1,0]:['CRM','مشتریان','گزارش‌ها'].includes(c)?[1,1,1,0,1,1,0]:c==='مرخصی'?[1,0,0,0,1,0,0]:[1,0,0,0,0,0,0])},
 {id:'r4',t:'سرپرست تیم',n:3,mx:PERM_CATS.map(c=>['داشبورد','تسک‌ها','تقویم'].includes(c)?[1,1,1,0,1,1,0]:c==='مرخصی'?[1,0,0,0,1,0,0]:c==='گزارش‌ها'?[1,0,0,0,0,1,0]:[1,0,0,0,0,0,0])},
 {id:'r5',t:'کارمند',n:6,mx:PERM_CATS.map(c=>['داشبورد','تسک‌ها','تقویم'].includes(c)?[1,1,1,0,0,0,0]:c==='مرخصی'?[1,0,0,0,0,0,0]:[1,0,0,0,0,0,0])},
 {id:'r6',t:'فروش',n:2,mx:PERM_CATS.map(c=>['CRM','مشتریان'].includes(c)?[1,1,1,0,1,1,0]:c==='فاکتورها'?[1,1,0,0,0,1,0]:['داشبورد','گزارش‌ها'].includes(c)?[1,0,0,0,0,1,0]:[1,0,0,0,0,0,0])},
 {id:'r7',t:'مالی',n:1,mx:PERM_CATS.map(c=>['مالی','فاکتورها'].includes(c)?[1,1,1,1,1,1,0]:c==='گزارش‌ها'?[1,0,0,0,0,1,0]:[1,0,0,0,0,0,0])},
 {id:'r8',t:'محتوا',n:2,mx:PERM_CATS.map(c=>['تسک‌ها','فضاهای کاری'].includes(c)?[1,1,1,0,0,0,0]:c==='شبکه‌های اجتماعی'?[1,1,1,0,0,1,0]:[1,0,0,0,0,0,0])},
 {id:'r9',t:'طراحی',n:2,mx:PERM_CATS.map(c=>['تسک‌ها','فضاهای کاری'].includes(c)?[1,1,1,0,0,0,0]:[1,0,0,0,0,0,0])},
];

/* ---------- saved reports ---------- */
const REPORTS=[
 {id:'rp1',t:'عملکرد تیم — شهریور ۱۴۰۵',type:'عملکرد',range:'۰۵/۰۶ تا ۰۵/۰۷',by:'e1',at:120,charts:3},
 {id:'rp2',t:'درآمد و مطالبات — فصل تابستان',type:'مالی',range:'۰۱/۰۴ تا ۳۱/۰۶',by:'e6',at:640,charts:4},
 {id:'rp3',t:'قیف فروش — سه‌ماهه دوم',type:'فروش',range:'۰۱/۰۴ تا ۳۱/۰۶',by:'e5',at:1300,charts:2},
 {id:'rp4',t:'رشد فالوور مشتریان — مرداد',type:'شبکه‌های اجتماعی',range:'۰۱/۰۵ تا ۳۱/۰۵',by:'e8',at:2600,charts:5},
 {id:'rp5',t:'مرخصی و حضور — نیمه اول ۱۴۰۵',type:'منابع انسانی',range:'۰۱/۰۱ تا ۳۱/۰۶',by:'e1',at:5100,charts:2},
];
const RPT_HIST=[
 {t:'گزارش مرداد — کلینیک روژان',range:'۰۱/۰۵ تا ۳۱/۰۵',by:'e8',at:2650,plat:['instagram']},
 {t:'گزارش مرداد — تاج محل',range:'۰۱/۰۵ تا ۳۱/۰۵',by:'e8',at:2700,plat:['instagram','tiktok']},
 {t:'گزارش دوماهه — پوشاک درسا',range:'۰۱/۰۴ تا ۳۱/۰۵',by:'e4',at:5400,plat:['instagram']},
 {t:'گزارش تیر — آکادمی پیشگامان',range:'۰۱/۰۴ تا ۳۱/۰۴',by:'e8',at:9800,plat:['linkedin']},
];
