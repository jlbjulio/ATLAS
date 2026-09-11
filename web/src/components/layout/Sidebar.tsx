import { Link, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  Search,
  Mic,
  Settings,
  HelpCircle,
  Database as DatabaseIcon,
  ShieldCheck,
  User,
  type LucideIcon,
} from "lucide-react"

interface NavItem {
  name: string
  href: string
  icon: LucideIcon
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Vista general",
    items: [{ name: "Inicio", href: "/", icon: LayoutDashboard }],
  },
  {
    label: "Trabajo de campo",
    items: [{ name: "Capturar", href: "/capture", icon: Mic }],
  },
  {
    label: "Base instalada",
    items: [
      { name: "Explorar base", href: "/installed-base", icon: DatabaseIcon },
      { name: "Consultar", href: "/queries", icon: Search },
    ],
  },
]

const FOOTER_ITEMS: NavItem[] = [
  { name: "Configuración", href: "/settings", icon: Settings },
  { name: "Ayuda", href: "/help", icon: HelpCircle },
]

function isActivePath(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(href))
}

export function Sidebar() {
  const location = useLocation()

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col bg-sidebar border-r border-sidebar-border">
      <div className="flex flex-col flex-1 overflow-y-auto scrollbar-thin">
        <div className="flex h-16 items-center border-b border-sidebar-border px-6">
          <Link to="/" className="flex items-center gap-2" aria-label="ATLAS Inicio">
            <img
              src="/atlas.svg"
              alt="ATLAS"
              className="h-auto w-28 brightness-0 invert"
            />
          </Link>
        </div>

        <div className="px-6 pt-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-sidebar-muted">
            Installed Base Intelligence
          </p>
        </div>

        <nav className="flex-1 space-y-5 px-4 py-4" aria-label="Navegación principal">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = isActivePath(location.pathname, item.href)
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                      }`}
                      aria-current={active ? "page" : undefined}
                    >
                      <item.icon
                        className={`h-5 w-5 ${
                          active ? "text-sidebar-primary" : "text-sidebar-muted"
                        }`}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-3">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              <div>
                <p className="text-sm font-medium text-emerald-300">
                  Operación local
                </p>
                <p className="mt-1 text-xs leading-5 text-emerald-200/80">
                  La evidencia permanece en el dispositivo. Incluso sin conexión.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-sidebar-border p-4">
          {FOOTER_ITEMS.map((item) => {
            const active = isActivePath(location.pathname, item.href)
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <item.icon className="h-5 w-5 text-sidebar-muted" />
                {item.name}
              </Link>
            )
          })}
        </div>
      </div>

      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent">
            <User className="h-4 w-4 text-sidebar-accent-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              Usuario Demo
            </p>
            <p className="truncate text-xs text-sidebar-muted">
              demo@philips.com
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
