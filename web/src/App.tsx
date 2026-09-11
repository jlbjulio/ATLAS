import { lazy, Suspense } from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { MainLayout } from "@/components/layout/MainLayout"

const DashboardPage = lazy(() =>
  import("@/pages/DashboardPage").then((m) => ({ default: m.DashboardPage })),
)
const InstalledBasePage = lazy(() =>
  import("@/pages/InstalledBasePage").then((m) => ({
    default: m.InstalledBasePage,
  })),
)
const QueriesPage = lazy(() =>
  import("@/pages/QueriesPage").then((m) => ({ default: m.QueriesPage })),
)
const CapturePage = lazy(() =>
  import("@/pages/CapturePage").then((m) => ({ default: m.CapturePage })),
)
const SettingsPage = lazy(() =>
  import("@/pages/SettingsPage").then((m) => ({ default: m.SettingsPage })),
)
const HelpPage = lazy(() =>
  import("@/pages/HelpPage").then((m) => ({ default: m.HelpPage })),
)

function RouteFallback() {
  return (
    <div
      className="flex items-center justify-center py-24"
      role="status"
      aria-label="Cargando"
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary-readable" />
    </div>
  )
}

function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/installed-base" element={<InstalledBasePage />} />
          <Route
            path="/installed-base/:clientName"
            element={<InstalledBasePage />}
          />
          <Route path="/queries" element={<QueriesPage />} />
          <Route path="/capture" element={<CapturePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/help" element={<HelpPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App
