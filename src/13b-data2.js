/* ============================================================
   EFFECT ERP · Feature data — labels, customer projects, assets,
   brand kits, content framework, banking (13b)
   ============================================================ */

/* ---------- task labels (workspace-level) ---------- */
const LB_COLORS={purple:'#6F6AEB',blue:'#1D6FD0',green:'#0F7A55',yellow:'#9A6207',orange:'#C0560B',red:'#C22532',pink:'#B0357F',cyan:'#0E7C93',gray:'#585763'};
const LB_SOFT={purple:'rgba(111,106,235,.08)',blue:'rgba(29,111,208,.09)',green:'rgba(15,122,85,.09)',yellow:'rgba(154,98,7,.1)',orange:'rgba(192,86,11,.1)',red:'rgba(194,37,50,.09)',pink:'rgba(176,53,127,.09)',cyan:'rgba(14,124,147,.1)',gray:'rgba(88,87,99,.09)'};
const LABELS=[
 {id:'lb1',n:'فوری',c:'red',d:'نیازمند اقدام در همان روز'},
 {id:'lb2',n:'طراحی',c:'purple',d:'خروجی‌های طراحی و هویت بصری'},
 {id:'lb3',n:'تدوین',c:'cyan',d:'پس‌تولید و تدوین ویدیو'},
 {id:'lb4',n:'سناریو',c:'pink',d:'نگارش سناریو و کپی'},
 {id:'lb5',n:'محتوا',c:'blue',d:'تولید محتوای متنی و تصویری'},
 {id:'lb6',n:'مشتری',c:'orange',d:'نیازمند هماهنگی یا تایید مشتری'},
 {id:'lb7',n:'تایید',c:'green',d:'در انتظار تایید داخلی'},
 {id:'lb8',n:'تبلیغات',c:'yellow',d:'کمپین و پرفورمنس'},
 {id:'lb9',n:'جلسه',c:'gray',d:'جلسات و هم‌راستاسازی'},
 {id:'lb10',n:'توسعه',c:'blue',d:'کارهای مهندسی'},
];
const lb=id=>LABELS.find(l=>l.id===id);
/* اختصاص برچسب به تسک‌های نمونه */
const TASK_LABELS={t1:['lb4','lb6'],t2:['lb9'],t3:['lb2','lb7'],t5:['lb6','lb1'],t7:['lb10','lb6'],t8:['lb4','lb3'],t11:['lb5','lb3'],t13:['lb10'],t16:['lb3'],t20:['lb8','lb4'],t22:['lb2','lb6'],t23:['lb5']};

/* ---------- checklists (subtasks) ---------- */
const CK_POOL=['جمع‌آوری اطلاعات اولیه','بازبینی با تیم','اعمال اصلاحات','آماده‌سازی خروجی نهایی','تایید نهایی مدیر','بایگانی فایل‌ها','ارسال برای مشتری','پیگیری بازخورد'];
const CK_NAMED={
 t11:[['نوشتن سناریوی ریلز',1],['فیلمبرداری در کلینیک',1],['تدوین نسخه اول',1],['طراحی کاور',0],['زیرنویس و متریک',0],['تایید مشتری',0],['انتشار و پین',0]],
 t8:[['انتخاب سناریو',0],['فیلمبرداری',0],['تدوین',0],['طراحی کاور',0],['زیرنویس',0],['تایید مشتری',0],['انتشار',0]],
 t3:[['اسکچ اولیه لوگوتایپ',1],['دیجیتال‌سازی مسیرها',1],['تست روی بسته‌بندی',1],['آماده‌سازی فایل‌های تحویل',0],['ارائه به مشتری',0]],
};
/* مدل داده ساخت‌یافته چک‌لیست (v2.6): id/taskId/title/completed/order/createdAt/updatedAt */
const ckItem=(taskId,title,order,done)=>({id:uid('ck'),taskId,title,completed:!!done,order:order||0,createdAt:Date.now(),updatedAt:Date.now()});
function ckInit(){
 TASKS.forEach(t=>{
  if(t.checklist){ /* نرمال‌سازی شکل قدیمی {t,done} به شکل جدید */
    t.checklist=t.checklist.map((c,i)=>({id:c.id||uid('ck'),taskId:t.id,title:c.title||c.t||'',completed:c.completed!==undefined?!!c.completed:!!c.done,order:c.order!=null?c.order:i,createdAt:c.createdAt||Date.now(),updatedAt:c.updatedAt||Date.now()}));
    return;}
  if(CK_NAMED[t.id]){ t.checklist=CK_NAMED[t.id].map((x,i)=>ckItem(t.id,x[0],i,!!x[1])); return; }
  const done=t.ck?t.ck[0]:0, total=Math.max(t.ck?t.ck[1]:0,0);
  t.checklist=CK_POOL.slice(0,total).map((x,i)=>ckItem(t.id,x,i,i<done));
 });
 TASKS.forEach(t=>{ t.labels=TASK_LABELS[t.id]?TASK_LABELS[t.id].slice():[]; });
}
const ckDone=t=>t.checklist.filter(c=>c.completed!==undefined?c.completed:!!c.done).length;
function ckNew(n){return CK_POOL.slice(0,n||3).map((x,i)=>ckItem('',x,i,false));}

/* ---------- customer projects (operational hub) ---------- */
const CPRO=[
 {id:'cp1',cust:'c1',prj:'p1',name:'مدیریت شبکه‌های اجتماعی تاج محل',status:'فعال',progress:68,
  members:['e8','e4','e11','e10'],
  fw:{post:12,reel:8,story:30,video:4,image:6,ad:4,edu:0,event:2,custom:[{t:'همکاری با اینفلوئنسر',n:1}]},
  done:{post:12,reel:6,story:24,video:3,image:5,ad:2,edu:0,event:1,custom:[{t:'همکاری با اینفلوئنسر',n:0}]},
  brief:{goals:'افزشایش آگاهی برند و ترافیک شعب در فصل تابستان؛ رشد ۱۵٪ فالوور اینستاگرام.',audience:'خانواده‌های جوان ۲۵ تا ۴۰ ساله تهران، علاقه‌مند به غذای خانگی',tone:'صمیمی، پرانرژی، با لهجه محلی ملایم',guide:'ترکیب نزدیک از غذای واقعی؛ بدون فیلتر سنگین؛ امضای بصری زرد-طوسی برند',banned:'تصاویر گوشت خام، مباحث سیاسی، تخفیف‌های گمراکننده',topics:['غذای خانگی','پشت‌صحنه آشپزخانه','معرفی منوی فصل','روایت مشتریان'],competitors:'رستوران نارنج، زیتون، خانه سبز',cta:'رزرو میز • سفارش آنلاین • مشاهده منو',platforms:'Instagram، TikTok',notes:'تایید نهایی محتواها توسط سرپرست برند مشتری (شیما راد) الزامی است.'},
 },
 {id:'cp2',cust:'c4',prj:'p8',name:'ری‌دیزاین و محتوای کلینیک روژان',status:'فعال',progress:47,
  members:['e2','e7','e4'],
  fw:{post:8,reel:6,story:20,video:2,image:4,ad:2,edu:6,event:0,custom:[]},
  done:{post:5,reel:4,story:16,video:1,image:3,ad:1,edu:4,event:0,custom:[]},
  brief:{goals:'بهبود نرخ تبدیل نوبت‌دهی آنلاین و تبدیل کلینیک به مرجع آموزشی پوست',audience:'زنان ۲۰ تا ۴۵ سال، طبقه متوسط رو به بالا تهران',tone:'علمی، آرام، اعتمادساز؛ پرهیز از ادعای درمان قطعی',guide:'پالت رنگ آرام (سبز سفید)؛ فونت فارسی خوانا؛ ویدیوهای کوتاه ۴۵ ثانیه‌ای',banned:'قبل/بعد اغراق‌آمیز، وعده درمان، تصاویر جراحی',topics:['آموزش مراقبت پوست','معرفی خدمات','سوالات متداول','روایت بیماران'],competitors:'کلینیک‌های زنجیره‌ای پوست',cta:'دریافت نوبت • مشاوره رایگان',platforms:'Instagram، YouTube',notes:'هماهنگی محتوای پزشکی با دکتر فرهادی قبل از انتشار.'},
 },
 {id:'cp3',cust:'c3',prj:'p2',name:'هویت بصری و محتوای پوشاک درسا',status:'فعال',progress:42,
  members:['e2','e7'],
  fw:{post:10,reel:6,story:16,video:2,image:8,ad:2,edu:0,event:2,custom:[]},
  done:{post:4,reel:2,story:8,video:0,image:3,ad:0,edu:0,event:0,custom:[]},
  brief:{goals:'تثبیت برند درسا به‌عنوان برند پوشاک پایدار فارسی',audience:'زنان و مردان ۲۰ تا ۳۵ سال، علاقه‌مند به مد پایدار',tone:'مینیمال، شاعرانه، آرت‌دایرکشن سینمایی',guide:'پالت خاکی-شنی؛ نور طبیعی؛ کنتراست کم',banned:'کپی‌برداری از برندهای خارجی، تصاویر مضجر',topics:['پارچه‌های پایدار','استایل‌بوک فصل','پشت صحنه تولید'],competitors:'برندهای فست‌فشن ایرانی',cta:'خرید از سایت • ورود به کلاب',platforms:'Instagram',notes:'فصل‌نامه بصری هر ۳ ماه با مشتری بازبینی شود.'},
 },
 {id:'cp4',cust:'c6',prj:'p9',name:'رشد ارگانیک و محتوای کافه میدان',status:'فعال',progress:60,
  members:['e4','e8'],
  fw:{post:8,reel:8,story:24,video:2,image:4,ad:1,edu:4,event:1,custom:[{t:'معرفی دانه قهوه',n:2}]},
  done:{post:6,reel:5,story:18,video:1,image:3,ad:0,edu:2,event:0,custom:[{t:'معرفی دانه قهوه',n:1}]},
  brief:{goals:'رشد سئوی محلی و تبدیل فالوور به مشتری حضوری',audience:'علاقه‌مندان قهوه تخصصی شیراز ۲۲ تا ۴۰ سال',tone:'صمیمی، آموزشی، بارِستا-محور',guide:'نور گرم کافه؛ تیک‌تاک به‌عنوان کانال آزمایش',banned:'محتوای الکلی، تخفیف مداوم',topics:['آموزش دم‌آوری','معرفی منو','رویدادهای کافه'],competitors:'کافه‌های زنجیره‌ای شیراز',cta:'رزرو محل • سفارش دمی',platforms:'Instagram، TikTok',notes:'رویدادهای ماهانه در تقویم محتوا لحاظ شود.'},
 },
];
const cpro=id=>CPRO.find(c=>c.id===id);
const cproByCust=cid=>CPRO.find(c=>c.cust===cid);
const cproByPrj=pid=>CPRO.find(c=>c.prj===pid);

/* ---------- brand kits ---------- */
const BRAND={
 c1:{name:'تاج محل',company:'گروه رستوران‌های تاج محل',desc:'رستوران زنجیره‌ای غذای خانگی ایرانی با ۹ شعبه در تهران',slogan:'طعم خانه، حال شعبه',web:'tajmahal.ir',ig:'@tajmahal.food',social:'TikTok: @tajmahal.food · Telegram: tajmahal_food',
     colors:{primary:'#C0560B',secondary:'#FFFFFF',bg:'#FFF8F0',text:'#2A1E12',accent:'#6F6AEB'},
     fonts:{heading:'برند فونت تاج (سفارشی)',body:'IRANSansX'},guideFile:'TajMahal_BrandBook_v3.pdf'},
 c4:{name:'کلینیک روژان',company:'کلینیک زیبایی و سلامت روژان',desc:'کلینیک تخصصی پوست، زیبایی و لیزر',slogan:'زیبایی علمی است',web:'rojan.clinic',ig:'@rojan.clinic',social:'YouTube: کلینیک روژان',
     colors:{primary:'#0F7A55',secondary:'#FFFFFF',bg:'#F2FBF7',text:'#12291F',accent:'#B0357F'},
     fonts:{heading:'IRANSansX',body:'IRANSansX'},guideFile:'Rojan_Guidelines_2025.pdf'},
 c3:{name:'پوشاک درسا',company:'برند پوشاک پایدار درسا',desc:'تولید و فروش پوشاک پایدار از الیاف طبیعی',slogan:'مد، مسئولیت‌پذیر',web:'dorsawear.ir',ig:'@dorsa.wear',social:'—',
     colors:{primary:'#7A5542',secondary:'#F5EFE8',bg:'#FBF8F4',text:'#2B211B',accent:'#6F6AEB'},
     fonts:{heading:'Dorsa Serif (سفارشی)',body:'IRANSansX'},guideFile:'Dorsa_Brand_v1.pdf'},
 c6:{name:'کافه میدان',company:'کافه میدان',desc:'کافه قهوه تخصصی با برشت‌خانه اختصاصی',slogan:'هر فنجان، یک میدان',web:'cafemeydan.ir',ig:'@cafe.meydan',social:'TikTok: @cafe.meydan',
     colors:{primary:'#0E7C93',secondary:'#FFFFFF',bg:'#F4FAFB',text:'#132A30',accent:'#C0560B'},
     fonts:{heading:'IRANSansX',body:'IRANSansX'},guideFile:'Meydan_Kit_1404.pdf'},
};

/* ---------- customer asset libraries ---------- */
const ASSET_FOLDERS=[['brand','برند'],['logos','لوگوها'],['fonts','فونت‌ها'],['photos','عکس‌ها'],['videos','ویدیوها'],['templates','قالب‌ها'],['guides','راهنمای برند'],['docs','اسناد'],['contracts','قراردادها'],['other','سایر']];
const ASSETS=[
 {id:'a1',cust:'c1',folder:'logos',name:'logo-primary.svg',type:'SVG',size:'۴۲ KB',by:'e2',date:'1404/11/12'},
 {id:'a2',cust:'c1',folder:'logos',name:'logo-secondary-white.svg',type:'SVG',size:'۳۸ KB',by:'e2',date:'1404/11/12'},
 {id:'a3',cust:'c1',folder:'logos',name:'favicon-32.png',type:'PNG',size:'۶ KB',by:'e7',date:'1404/11/18'},
 {id:'a4',cust:'c1',folder:'fonts',name:'TajBrand-Bold.woff2',type:'WOFF2',size:'۴۸ KB',by:'e2',date:'1404/11/12'},
 {id:'a5',cust:'c1',folder:'fonts',name:'IRANSansX-Regular.woff2',type:'WOFF2',size:'۱۲۸ KB',by:'e13',date:'1405/01/20'},
 {id:'a6',cust:'c1',folder:'guides',name:'TajMahal_BrandBook_v3.pdf',type:'PDF',size:'۸.۲ MB',by:'e2',date:'1405/02/05'},
 {id:'a7',cust:'c1',folder:'photos',name:'food-photography-pack-01.zip',type:'ZIP',size:'۲۴۰ MB',by:'e11',date:'1405/03/14'},
 {id:'a8',cust:'c1',folder:'templates',name:'story-template.psd',type:'PSD',size:'۸۶ MB',by:'e7',date:'1405/04/02'},
 {id:'a9',cust:'c1',folder:'contracts',name:'contract-1405-signed.pdf',type:'PDF',size:'۱.۱ MB',by:'e6',date:'1405/04/10'},
 {id:'a10',cust:'c1',folder:'brand',name:'visual-identity-files.zip',type:'ZIP',size:'۳۲ MB',by:'e2',date:'1404/11/12'},
 {id:'a11',cust:'c4',folder:'logos',name:'rojan-logo.svg',type:'SVG',size:'۳۶ KB',by:'e2',date:'1405/01/08'},
 {id:'a12',cust:'c4',folder:'guides',name:'Rojan_Guidelines_2025.pdf',type:'PDF',size:'۶.۴ MB',by:'e2',date:'1405/01/08'},
 {id:'a13',cust:'c4',folder:'photos',name:'clinic-interior.zip',type:'ZIP',size:'۱۸۰ MB',by:'e11',date:'1405/03/22'},
 {id:'a14',cust:'c4',folder:'videos',name:'brand-teaser-final.mp4',type:'MP4',size:'۹۴ MB',by:'e11',date:'1405/05/02'},
 {id:'a15',cust:'c3',folder:'logos',name:'dorsa-logotype.svg',type:'SVG',size:'۴۰ KB',by:'e2',date:'1405/02/18'},
 {id:'a16',cust:'c3',folder:'guides',name:'Dorsa_Brand_v1.pdf',type:'PDF',size:'۵.۱ MB',by:'e2',date:'1405/03/01'},
 {id:'a17',cust:'c6',folder:'logos',name:'meydan-mark.svg',type:'SVG',size:'۳۱ KB',by:'e7',date:'1405/04/25'},
 {id:'a18',cust:'c6',folder:'photos',name:'coffee-shots.zip',type:'ZIP',size:'۱۴۲ MB',by:'e11',date:'1405/05/11'},
];
const assetsOf=cid=>ASSETS.filter(a=>a.cust===cid);

/* ---------- employee banking (masked by default) ---------- */
const EMP_BANK={
 e1:{bank:'ملت',owner:'رضا قایمی',acc:'1234567890',card:'6037991212341234',iban:'IR820120010000001234567890',note:'حساب حقوق اصلی'},
 e2:{bank:'سامان',owner:'سارا احمدی',acc:'2233445566',card:'6219861034561034',iban:'IR50056000000002233445566',note:'—'},
 e3:{bank:'پاسارگاد',owner:'محمد رضایی',acc:'3344556677',card:'5022293344556677',iban:'IR140570028000033445566',note:'—'},
 e4:{bank:'ملت',owner:'نگار محمدی',acc:'4455667788',card:'6104337811223344',iban:'IR620120010000004455667788',note:'—'},
 e5:{bank:'زرین‌پال (واریز سریع)',owner:'علی کریمی',acc:'—',card:'—',iban:'IR730570000000005566778899',note:'تسویه پورسانت'},
 e6:{bank:'سامان',owner:'مریم حسینی',acc:'5566778899',card:'6219861055667788',iban:'IR50056000000005566778899',note:'—'},
 e9:{bank:'ملی',owner:'حسین شریفی',acc:'6677889900',card:'6037998877665544',iban:'IR17017000000006677889900',note:'—'},
 e10:{bank:'پاسارگاد',owner:'الهام رستمی',acc:'7788990011',card:'5022297788990011',iban:'IR14057002800007788990011',note:'—'},
 e11:{bank:'سامان',owner:'بهرام کاویانی',acc:'8899001122',card:'6219861088990011',iban:'IR50056000000008899001122',note:'—'},
};
const maskCard=c=>c&&c!=='—'?c.slice(0,4)+' •••• •••• '+c.slice(-4):'—';
const maskIban=i=>i&&i!=='—'?'IR'+'•'.repeat(20)+i.slice(-4):'—';
const maskAcc=a=>a&&a!=='—'?'••••••'+a.slice(-4):'—';
/* permission: مشاهده اطلاعات بانکی پرسنل */
const CAN_BANK=['مدیر کل','مدیر سیستم','مالی'];
const canSeeBank=()=>CAN_BANK.includes((ROLES.find(r=>r.id===S.role)||{t:'مدیر کل'}).t);

/* ---------- leave approvers & routing ---------- */
const APPROVERS=['e2','e10','e5','e6'];
/* ---------- bank audit log ---------- */
const BANK_AUDIT=[
 {emp:'e4',act:'ویرایش شماره شبا',by:'مریم حسینی (مالی)',when:'۲ روز پیش · ۱۴۰۵/۰۶/۲۶'},
 {emp:'e4',act:'مشاهده کامل اطلاعات بانکی',by:'سارا احمدی (مدیر کل)',when:'۳ روز پیش · ۱۴۰۵/۰۶/۲۵'},
 {emp:'e11',act:'ثبت اولیه اطلاعات بانکی',by:'مریم حسینی (مالی)',when:'۲ هفته پیش · ۱۴۰۵/۰۶/۱۲'},
];
LEAVES.forEach(l=>{ if(!l.to) l.to=l.emp==='e4'?'e2':'e10'; if(!l.mgrNote) l.mgrNote=l.status==='تایید شده'?'با هماهنگی تیم محتوا تایید شد.':''; if(l.status==='رد شده'&&!l.reason) l.reason='تداخل با برنامه انتشار مرداد؛ بازطراحی برای هفته بعد توصیه می‌شود.'; });
