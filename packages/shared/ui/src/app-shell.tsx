import type { ReactNode } from "react";

export type AppShellProps = {
  children: ReactNode;
  title: string;
};

const navigation = [
  { href: "/dashboard", label: "داشبورد" },
  { href: "/settings/sessions", label: "تنظیمات و نشست‌ها" },
  { href: "/change-password", label: "تغییر گذرواژه" },
];

export function AppShell({ children, title }: AppShellProps) {
  return (
    <div className="effect-shell">
      <aside className="effect-sidebar" aria-label="ناوبری اصلی">
        <a className="effect-brand" href="/dashboard" aria-label="Effect ERP">
          <span className="effect-brand__mark">E</span>
          <span>Effect ERP</span>
        </a>
        <nav>
          <p className="effect-sidebar__label">فضای کاری</p>
          {navigation.map((item) => (
            <a className="effect-sidebar__link" href={item.href} key={item.href}>{item.label}</a>
          ))}
        </nav>
      </aside>
      <main className="effect-app-main">
        <header className="effect-topbar"><h1>{title}</h1></header>
        <div className="effect-app-content">{children}</div>
      </main>
    </div>
  );
}
