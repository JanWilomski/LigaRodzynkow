import { NavLink, Outlet } from 'react-router-dom'
import { Trophy, Users, History } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/', label: 'Ranking', icon: Trophy, exact: true },
  { to: '/players', label: 'Gracze', icon: Users },
  { to: '/history', label: 'Historia', icon: History },
]

export function Layout() {
  return (
    <div className="min-h-screen relative">
      {/* Decorative volleyball net pattern at top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent opacity-40" />

      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 py-8">
        {/* Brand header */}
        <header className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandMark />
            <div>
              <h1 className="text-lg font-bold tracking-tight leading-none">
                Liga Rodzynków
              </h1>
              <p className="text-xs text-[var(--color-muted)] mt-1 font-mono">
                LATO · 2026
              </p>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <nav className="mb-8 border-b border-[var(--color-border)]">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.exact}
                className={({ isActive }) =>
                  cn(
                    'relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
                    'border-b-2 -mb-px',
                    isActive
                      ? 'text-[var(--color-foreground)] border-[var(--color-accent)]'
                      : 'text-[var(--color-muted)] border-transparent hover:text-[var(--color-foreground)] hover:border-[var(--color-border-strong)]',
                  )
                }
              >
                <tab.icon className="size-4" />
                {tab.label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Page content */}
        <main>
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="mt-16 pt-6 border-t border-[var(--color-border)] text-xs text-[var(--color-subtle)] text-center font-mono">
          v0.1.0 · mock data
        </footer>
      </div>
    </div>
  )
}

function BrandMark() {
  return (
    <div className="relative size-10 rounded-lg bg-[var(--color-accent)] flex items-center justify-center shrink-0">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-5 text-[var(--color-accent-foreground)]"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
      </svg>
    </div>
  )
}
