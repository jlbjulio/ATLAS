import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function MainLayout() {
  return (
    <div className="min-h-screen bg-surface-50">
      <Sidebar />
      <Header />
      <div className="lg:pl-64">
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
