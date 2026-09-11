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
  { name: "Inicio", href: "/", icon: LayoutDashboard },
  { name: "Capturar", href: "/capture", icon: Mic },
  { name: "Explorar base", href: "/installed-base", icon: Database },
  { name: "Consultar", href: "/queries", icon: Search },
]

export function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)

  const isActive = (href: string) =>
    location.pathname === href ||
    (href !== "/" && location.pathname.startsWith(href))

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-2 lg:hidden"
              aria-label="ATLAS Inicio"
            >
              <img
                src="/atlas.svg"
                alt="ATLAS"
                className="h-auto w-24 brightness-0 invert"
              />
            </Link>
            <p className="hidden text-sm font-medium text-muted-foreground lg:block">
              ATLAS ·{" "}
              <span className="text-foreground">Installed Base Intelligence</span>
            </p>
          </div>

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

          <div className="flex items-center gap-3">
            <Button size="sm" onClick={() => navigate("/capture")}>
              <Mic className="h-4 w-4" />
              <span className="hidden sm:inline">Nueva captura</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              aria-haspopup="true"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15">
                <User className="h-4 w-4 text-primary-readable" />
              </div>
              <span className="hidden text-sm font-medium text-foreground md:block">
                Usuario Demo
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {isMobileNavOpen && (
          <nav
            className="border-t border-border py-3 lg:hidden"
            aria-label="Navegación móvil"
          >
            <div className="grid gap-1">
              {navigation.map((item) => {
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
      </div>
    </header>
  )
}
