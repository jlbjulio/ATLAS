import { useState, type FormEvent } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  Bell,
  ChevronDown,
  Home,
  LayoutDashboard,
  Map,
  Menu,
  Mic,
  Monitor,
  Moon,
  Search,
  Settings,
  Sun,
  TrendingUp,
  Users,
  X,
  ClipboardList,
  Database,
  ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/common"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/lib/theme"

const mobileNav = [
  { name: "Inicio", href: "/", icon: Home },
  { name: "Capturar", href: "/capture", icon: Mic },
  { name: "Pendientes", href: "/pending", icon: ClipboardList },
  { name: "Explorar base", href: "/installed-base", icon: Database },
  { name: "Clientes", href: "/customers", icon: Users },
  { name: "Equipos", href: "/equipment", icon: Monitor },
  { name: "Consultar", href: "/queries", icon: Search },
  { name: "Oportunidades", href: "/opportunities", icon: TrendingUp },
  { name: "Territorios", href: "/territories", icon: Map },
  { name: "Calidad de datos", href: "/data-quality", icon: ShieldCheck },
  { name: "Configuración", href: "/settings", icon: Settings },
]

export function TopBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { resolvedTheme, toggleTheme } = useTheme()
  const [query, setQuery] = useState("")
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    navigate(`/queries?q=${encodeURIComponent(trimmed)}`)
    setQuery("")
  }

  const isActive = (href: string) =>
    location.pathname === href ||
    (href !== "/" && location.pathname.startsWith(href))

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link to="/" className="lg:hidden" aria-label="ATLAS Inicio">
            <img
              src="/atlas.svg"
              alt="ATLAS"
              className="h-auto w-24 dark:brightness-0 dark:invert"
            />
          </Link>

          <form onSubmit={handleSearch} className="hidden lg:block">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar en ATLAS..."
                aria-label="Buscar en ATLAS"
                className="h-10 w-80 rounded-lg border border-input bg-background pl-10 pr-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </form>

          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring lg:hidden"
            aria-label={isMobileNavOpen ? "Cerrar navegación" : "Abrir navegación"}
            aria-expanded={isMobileNavOpen}
            onClick={() => setIsMobileNavOpen((open) => !open)}
          >
            {isMobileNavOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={
              resolvedTheme === "dark"
                ? "Cambiar a tema claro"
                : "Cambiar a tema oscuro"
            }
          >
            {resolvedTheme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Notificaciones"
                className="relative"
              >
                <Bell className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                Sin notificaciones por ahora.
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-auto gap-2 px-2 py-1.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary-readable">
                  UD
                </span>
                <span className="hidden text-left md:block">
                  <span className="block text-sm font-medium leading-tight text-foreground">
                    Usuario Demo
                  </span>
                  <span className="block text-xs leading-tight text-muted-foreground">
                    Administrador
                  </span>
                </span>
                <ChevronDown className="hidden h-4 w-4 text-muted-foreground md:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Usuario Demo</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                Configuración
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/help")}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Ayuda
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isMobileNavOpen && (
        <nav
          className="border-t border-border px-4 py-3 lg:hidden"
          aria-label="Navegación móvil"
        >
          <div className="grid gap-1 sm:grid-cols-2">
            {mobileNav.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileNavOpen(false)}
                  className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium ${
                    active
                      ? "bg-primary/15 text-primary-readable"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              )
            })}
          </div>
        </nav>
      )}
    </header>
  )
}
