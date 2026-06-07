'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ListTodo, CalendarDays, LayoutDashboard, Settings } from 'lucide-react'

const LINKS = [
  { href: '/tasks', label: 'Tasks', Icon: ListTodo },
  { href: '/calendar', label: 'Calendar', Icon: CalendarDays },
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/settings', label: 'Settings', Icon: Settings },
]

export function MainNav() {
  const pathname = usePathname()
  return (
    <nav className="flex items-center gap-1 text-sm">
      {LINKS.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname?.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors ${
              active ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
