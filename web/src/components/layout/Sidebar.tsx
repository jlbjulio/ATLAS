import { useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import {
  ClipboardList,
  Database,
  HelpCircle,
  Home,
  Map,
  Mic,
  Monitor,
  Search,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react"
import { api } from "@/services/api"

interface NavItem {
  name: string
  href: string
  icon: LucideIcon
  badge?: number
}

interface NavGroup {
  label: string
  items: NavItem[]
}

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(href))
}

export function Sidebar() {
  const location = useLocation()
  const [pendingCount, setPendingCount] = useState<number | null>(null)

  useEffect(() => {
    let mounted = true
    api
      .dashboard()
      .then((stats) => {
        if (mounted) setPendingCount(stats.pending_confirmations)
      })
      .catch(() => {
        if (mounted) setPendingCount(null)
      })
    return () => {
      mounted = false
    }
  }, [])

  const groups: NavGroup[] = [
    {
      label: "Trabajo de campo",
      items: [
        { name: "Capturar", href: "/capture", icon: Mic },
        {
          name: "Pendientes",
          href: "/pending",
          icon: ClipboardList,
          badge: pendingCount ?? undefined,
        },
      ],
    },
    {
      label: "Base instalada",
      items: [
        { name: "Explorar base", href: "/installed-base", icon: Database },
        { name: "Clientes", href: "/customers", icon: Users },
        { name: "Equipos", href: "/equipment", icon: Monitor },
        { name: "Consultar", href: "/queries", icon: Search },
      ],
    },
    {
      label: "Inteligencia",
      items: [
        { name: "Oportunidades", href: "/opportunities", icon: TrendingUp },
        { name: "Territorios", href: "/territories", icon: Map },
        { name: "Calidad de datos", href: "/data-quality", icon: ShieldCheck },
      ],
    },
  ]

  const footerItems: NavItem[] = [
    { name: "Configuración", href: "/settings", icon: Settings },
    { name: "Ayuda", href: "/help", icon: HelpCircle },
  ]

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex flex-1 flex-col overflow-y-auto scrollbar-thin">
        <div className="flex h-16 items-center border-b border-sidebar-border px-6">
          <Link to="/" className="flex flex-col" aria-label="ATLAS Inicio">
            <img
              src="/atlas.svg"
              alt="ATLAS"
              className="h-auto w-28 dark:brightness-0 dark:invert"
            />
            <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-sidebar-muted">
              Installed Base Intelligence
            </span>
          </Link>
        </div>

        <nav className="flex-1 space-y-5 px-3 py-4" aria-label="Navegación principal">
          <div>
            <Link
              to="/"
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive(location.pathname, "/")
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              }`}
              aria-current={isActive(location.pathname, "/") ? "page" : undefined}
            >
              <Home className="h-5 w-5" />
              Inicio
            </Link>
          </div>

          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = isActive(location.pathname, item.href)
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
                      {typeof item.badge === "number" && item.badge > 0 && (
                        <span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary-readable">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}

          <div>
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted">
              Sistema
            </p>
            <div className="space-y-1">
              {footerItems.map((item) => {
                const active = isActive(location.pathname, item.href)
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
                    <item.icon className="h-5 w-5 text-sidebar-muted" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="rounded-lg border border-success-soft-foreground/25 bg-success-soft p-3">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success-soft-foreground" />
              <div>
                <p className="text-sm font-medium text-success-soft-foreground">
                  Operación local
                </p>
                <p className="mt-1 text-xs leading-5 text-success-soft-foreground/80">
                  La evidencia permanece en el dispositivo. Incluso sin
                  conexión.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-1 border-t border-sidebar-border px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-muted">
            Local AI
          </p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-sidebar-muted">
            Real-world assets
          </p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-sidebar-muted">
            {"Tomorrow's decisions"}
          </p>
          <p className="pt-1 text-[10px] font-mono text-sidebar-muted/70">
            v0.1.0
          </p>
        </div>
      </div>
    </aside>
  )
}
