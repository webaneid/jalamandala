"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

type Tab = {
  href: string
  label: string
  icon: (active: boolean) => React.ReactNode
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg className="size-6" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.8} viewBox="0 0 24 24">
      <path d="M3 12L12 3l9 9M4.5 10.5V20a.5.5 0 00.5.5h4.5v-5h5v5H19a.5.5 0 00.5-.5v-9.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function UsahaIcon({ active }: { active: boolean }) {
  return (
    <svg className="size-6" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.8} viewBox="0 0 24 24">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 21V12h6v9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function InvoiceIcon({ active }: { active: boolean }) {
  return (
    <svg className="size-6" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.8} viewBox="0 0 24 24">
      <path d="M9 12h6M9 16h4M5 3h14a1 1 0 011 1v16l-2-1.5L16 20l-2 1.5L12 20l-2 1.5L8 20l-2 1.5V4a1 1 0 011-1z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function ProfilIcon({ active }: { active: boolean }) {
  return (
    <svg className="size-6" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.8} viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="4" strokeLinecap="round" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function DashboardBottomNav({ eventSlug }: { eventSlug: string }) {
  const pathname = usePathname()

  const tabs: Tab[] = [
    {
      href: `/${eventSlug}/dashboard`,
      label: "Beranda",
      icon: (a) => <HomeIcon active={a} />,
    },
    {
      href: `/${eventSlug}/dashboard/usaha`,
      label: "Usaha",
      icon: (a) => <UsahaIcon active={a} />,
    },
    {
      href: `/${eventSlug}/dashboard/invoice`,
      label: "Invoice",
      icon: (a) => <InvoiceIcon active={a} />,
    },
    {
      href: `/${eventSlug}/dashboard/profil`,
      label: "Profil",
      icon: (a) => <ProfilIcon active={a} />,
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-md safe-bottom">
      <div className="mx-auto flex max-w-lg items-stretch">
        {tabs.map((tab) => {
          const isActive = tab.href === `/${eventSlug}/dashboard`
            ? pathname === tab.href
            : pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={[
                "flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
                isActive ? "text-primary" : "text-slate-400 hover:text-slate-600",
              ].join(" ")}
            >
              {tab.icon(isActive)}
              <span>{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 h-0.5 w-8 rounded-full bg-primary" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
