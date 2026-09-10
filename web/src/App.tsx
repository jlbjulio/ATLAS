import { Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { InstalledBasePage } from "@/pages/InstalledBasePage";
import { QueriesPage } from "@/pages/QueriesPage";
import { CapturePage } from "@/pages/CapturePage";
import { SettingsPage } from "@/pages/SettingsPage";
import { HelpPage } from "@/pages/HelpPage";

function App() {
  return (
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
  );
}

export default App;
