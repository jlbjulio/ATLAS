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
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, badge: null },
  {
    name: "Base Instalada",
    href: "/installed-base",
    icon: DatabaseIcon,
    badge: null,
  },
  { name: "Consultas NL", href: "/queries", icon: Search, badge: null },
  { name: "Captura", href: "/capture", icon: Mic, badge: null },
]

export function Sidebar() {
  const location = useLocation()

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col bg-sidebar border-r border-sidebar-border">
      <div className="flex flex-col flex-1 overflow-y-auto">
        <div className="flex h-16 items-center border-b border-sidebar-border px-6">
          <Link
            to="/"
            className="flex items-center gap-2"
            aria-label="ATLAS Home"
          >
            <img
              src="/atlas.svg"
              alt="ATLAS"
              className="h-auto w-32 brightness-0 invert"
            />
          </Link>
        </div>

        <nav
          className="flex-1 px-4 py-4 space-y-1"
          aria-label="Navegación principal"
        >
          {navigation.map((item) => {
            const isActive =
              location.pathname === item.href ||
              (item.href !== "/" && location.pathname.startsWith(item.href))
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <item.icon
                  className={`w-5 h-5 ${isActive ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/50"}`}
                  aria-hidden="true"
                />
                {item.name}
                {item.badge && (
                  <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-sidebar-accent text-sidebar-accent-foreground rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/30 p-3">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              <div>
                <p className="text-sm font-medium text-emerald-400">Operación local</p>
                <p className="mt-1 text-xs leading-5 text-emerald-500/70">
                  La evidencia permanece en el dispositivo.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-sidebar-border p-4">
          <Link
            to="/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
          >
            <Settings className="w-5 h-5 text-sidebar-foreground/50" />
            Configuración
          </Link>
          <Link
            to="/help"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors mt-1"
          >
            <HelpCircle className="w-5 h-5 text-sidebar-foreground/50" />
            Ayuda y Docs
          </Link>
        </div>
      </div>

      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
            <User className="w-4 h-4 text-sidebar-accent-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              Usuario Demo
            </p>
            <p className="text-xs text-sidebar-foreground/50 truncate">
              demo@philips.com
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
