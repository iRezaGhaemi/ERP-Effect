/* ============================================================
   EFFECT ERP · RBAC+ — نقش‌محور + دسترسی فردی (v2.5)
   can(mod,act) · وراثت نقش + Override فردی · ماتریس · لاگ
   ============================================================ */
const MODS=[
 {id:'dashboard',t:'داشبورد',acts:['v']},
 {id:'mytasks',t:'کارهای من',acts:['v','c','e']},
 {id:'tasks',t:'تسک‌ها',acts:['v','c','e','d','ok','m']},
 {id:'workspaces',t:'فضاهای کاری',acts:['v','c','e','m']},
 {id:'cpro',t:'پروژه‌های مشتریان',acts:['v','c','e','m']},
 {id:'calendar',t:'تقویم',acts:['v','c','e','d']},
 {id:'crm',t:'CRM',acts:['v','c','e','d']},
 {id:'customers',t:'مشتریان',acts:['v','c','e','d']},
 {id:'leaves',t:'مرخصی',acts:['v','c','ok']},
 {id:'finance',t:'مالی',acts:['v','c','e','d','ok','m','x']},
 {id:'invoices',t:'فاکتورها و پیش‌فاکتورها',acts:['v','c','e','d','x']},
 {id:'reports',t:'گزارش‌ها',acts:['v','c','e','m','x']},
 {id:'social',t:'شبکه‌های اجتماعی',acts:['v','c','e','m','x']},
 {id:'team',t:'تیم',acts:['v','e','m']},
 {id:'integrations',t:'اتصالات و API',acts:['v','m']},
 {id:'settings',t:'تنظیمات',acts:['v','e','m']},
 {id:'users',t:'مدیریت کاربران',acts:['v','c','e','m']},
];
const ACT_FA={v:'مشاهده',c:'ایجاد',e:'ویرایش',d:'حذف',ok:'تأیید',m:'مدیریت',x:'خروجی'};
const isSuperAdmin=uid=>uid==='e1';
/* دسترسی پیش‌فرض نقش‌ها (۱=فعال). '*' = همه */
const ROLE_PERMS={
 r1:'*',
 r2:'*',
 r3:{dashboard:1,mytasks:1,tasks:1,workspaces:1,cpro:1,calendar:1,crm:1,customers:1,reports:1,social:1,team:1,leaves:1,invoices:1},
 r4:{dashboard:1,mytasks:1,tasks:1,workspaces:1,cpro:1,calendar:1,crm:1,customers:1,reports:1,social:1,leaves:1},
 r5:{dashboard:1,mytasks:1,tasks:1,calendar:1,leaves:1},
 r6:{dashboard:1,mytasks:1,crm:1,customers:1,reports:1,calendar:1},
 r7:{dashboard:1,mytasks:1,finance:1,invoices:1,reports:1,leaves:1,team:1},
 r8:{dashboard:1,mytasks:1,tasks:1,cpro:1,calendar:1,social:1,leaves:1},
 r9:{dashboard:1,mytasks:1,tasks:1,cpro:1,calendar:1,social:1,leaves:1},
};
/* Override فردی — فقط تفاوت با نقش ذخیره می‌شود (src=اختصاصی) */
let USER_OVERRIDES={
 e5:{reports:{v:1},customers:{v:1}},          /* علی: گزارش‌ها و مشتریان — اختصاصی */
 e8:{team:{v:0}},                             /* نگار: تیم غیرفعال (محدودیت اختصاصی) */
};
/* وضعیت حساب پنل + آخرین ورود */
const USER_ACC={
 e1:{st:'فعال',last:'امروز — ۰۹:۱۲'},e2:{st:'فعال',last:'امروز — ۰۸:۴۴'},e3:{st:'فعال',last:'دیروز — ۱۸:۰۲'},
 e4:{st:'فعال',last:'امروز — ۰۹:۳۱'},e5:{st:'فعال',last:'دیروز — ۱۶:۲۰'},e6:{st:'فعال',last:'امروز — ۱۰:۰۵'},
 e7:{st:'فعال',last:'۲ روز پیش'},e8:{st:'فعال',last:'امروز — ۱۱:۱۴'},e9:{st:'فعال',last:'دیروز — ۱۴:۴۸'},
 e10:{st:'فعال',last:'امروز — ۰۹:۵۸'},e11:{st:'فعال',last:'۳ روز پیش'},e12:{st:'در انتظار فعال‌سازی',last:'—'},
 e13:{st:'غیرفعال',last:'۱۴۰۵/۰۴/۱۸ — ۱۳:۲۶'},
};
/* لاگ حسابرسی دسترسی */
let PERM_AUDIT=[
 {who:'رضا قایمی',for:'سارا احمدی',what:'دسترسی «گزارش‌ها»',chg:'فعال شد (اختصاصی)',when:'۵ شهریور ۱۴۰۵ — ۱۴:۳۵'},
 {who:'رضا قایمی',for:'بهرام کاویانی',chg:'غیرفعال شدن حساب',what:'وضعیت حساب',when:'۴ شهریور ۱۴۰۵ — ۱۰:۱۲'},
 {who:'سارا احمدی',for:'نگار محمدی',what:'دسترسی «تیم»',chg:'غیرفعال شد (اختصاصی)',when:'۲ شهریور ۱۴۰۵ — ۱۶:۰۴'},
];
const S_UID=()=>S.uid||'e1';
function roleDef(uid,role){return ROLE_PERMS[role!=null?role:S.role];}
function permSrc(mod,uid,role){ /* 'اختصاصی' | 'از نقش' | null */
  uid=uid||S_UID();role=role!=null?role:S.role;
  if(isSuperAdmin(uid))return'اختصاصی';
  const o=(USER_OVERRIDES[uid]||{})[mod];
  return o?'اختصاصی':'از نقش';
}
function can(mod,act='v',uid,role){
  uid=uid||S_UID();role=role!=null?role:S.role;
  let o=(USER_OVERRIDES[uid]||{})[mod];
  if(isSuperAdmin(uid))return true;
  if(mod==='users')return role==='r2'||!!(o&&o[act]); /* مدیر سیستم یا override */
  if(o&&o[act]!==undefined)return !!o[act];
  const rp=ROLE_PERMS[role];
  if(rp==='*')return true;
  return !!rp[mod];
}
const EMP_ROLE_ID={e1:'r1',e2:'r9',e3:'r5',e4:'r8',e5:'r6',e6:'r7',e7:'r9',e8:'r8',e9:'r5',e10:'r3',e11:'r8',e12:'r6',e13:'r2'};
const empRid=e=>EMP_ROLE_ID[e.id]||((ROLES.find(r=>r.t===e.role)||{}).id)||'r5';
function canAs(uid,mod,act){ /* برای کاربر دیگر (نقش خودش) */
  return can(mod,act,uid,empRid(emp(uid)));
}
const modOfRoute=r=>({dashboard:'dashboard',mytasks:'mytasks',tasks:'tasks',workspaces:'workspaces',calendar:'calendar',
 crm:'crm',customers:'customers',cpro:'cpro',leaves:'leaves',finance:'finance',invoices:'finance',proforma:'invoices',
 reports:'reports',social:'social',team:'team',integrations:'integrations',settings:'settings',
 permissions:'settings',activity:'settings',notifications:'settings',users:'users'})[r]||r;
function routeAllowed(route){const m=modOfRoute((route||'').split('/')[0]);return can(m,'v');}
function permAuditAdd(forName,what,chg){PERM_AUDIT.unshift({who:'رضا قایمی',for:forName,what,chg,when:'۵ شهریور ۱۴۰۵ — '+fa(new Date().getHours())+':'+pad2(new Date().getMinutes())});}
