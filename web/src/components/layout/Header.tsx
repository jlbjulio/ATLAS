import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  Database,
  Search,
  Mic,
  ChevronDown,
  User,
  Menu,
  X,
} from "lucide-react"
import { Button } from "@/components/common"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Base Instalada", href: "/installed-base", icon: Database },
  { name: "Consultas NL", href: "/queries", icon: Search },
  { name: "Captura", href: "/capture", icon: Mic },
]

export function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link
              to="/"
              className="flex items-center gap-2 lg:hidden"
              aria-label="ATLAS Home"
            >
              <img src="/atlas.svg" alt="ATLAS" className="h-auto w-28 brightness-0 invert" />
            </Link>

            <nav
              className="hidden items-center gap-1"
              aria-label="Navegación principal"
            >
              {navigation.map((item) => {
                const isActive =
                  location.pathname === item.href ||
                  (item.href !== "/" &&
                    location.pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>

          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring lg:hidden"
            aria-label={isMobileNavOpen ? "Cerrar navegación" : "Abrir navegación"}
            aria-expanded={isMobileNavOpen}
            onClick={() => setIsMobileNavOpen((open) => !open)}
          >
            {isMobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-3 sm:flex">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/capture")}
              >
                <Mic className="w-4 h-4 mr-1" />
                Nueva Captura
              </Button>
            </div>

            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                aria-expanded="false"
                aria-haspopup="true"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <span className="hidden md:block text-sm font-medium text-foreground">
                  Usuario Demo
                </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </div>
        {isMobileNavOpen && (
          <nav className="border-t border-border py-3 lg:hidden" aria-label="Navegación móvil">
            <div className="grid gap-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href || (item.href !== "/" && location.pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileNavOpen(false)}
                    className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
