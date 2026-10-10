import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Boxes, LayoutDashboard, LogOut, Pill, ReceiptText, Truck, Users, Wifi } from "lucide-react";
import type { HealthResponse } from "@pharmacy/contracts";
import type { User, UserRole } from "@pharmacy/contracts";
import { DashboardPage } from "./features/dashboard/components/DashboardPage";
import { LoginPage } from "./features/auth/components/LoginPage";
import { useLogout, useSessionBootstrap } from "./features/auth/hooks/useSession";
import { MedicinesPage } from "./features/medicines/components/MedicinesPage";
import { SalesPage } from "./features/sales/components/SalesPage";
import { SuppliersPage } from "./features/suppliers/components/SuppliersPage";
import { UsersPage } from "./features/users/components/UsersPage";
import { api } from "./shared/api/client";
import { useAuthStore } from "./shared/store/useAuthStore";
import { useAppStore, type AppView } from "./shared/store/useAppStore";

export default function App() {
  useSessionBootstrap();
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);

  if (status === "booting") {
    return <main className="auth-loading"><span className="brand-mark"><Pill size={20} /></span><p>Restoring secure session...</p></main>;
  }
  if (status !== "authenticated" || !user) return <LoginPage />;
  return <AuthenticatedApp user={user} />;
}

function AuthenticatedApp({ user }: { user: User }) {
  const activeView = useAppStore((state) => state.activeView);
  const setActiveView = useAppStore((state) => state.setActiveView);
  const logout = useLogout();
  const {
    data: health,
    isError,
    isPending,
  } = useQuery({
    queryKey: ["health"],
    queryFn: () => api.get<HealthResponse>("/health/ready"),
    refetchInterval: 30_000,
  });
  const apiStatus = health ? "online" : isError ? "offline" : "checking";
  const pages: Record<AppView, { label: string; icon: typeof ReceiptText; roles: UserRole[] }> = {
    dashboard: { label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "manager", "cashier"] },
    sales: { label: "Point of sale", icon: ReceiptText, roles: ["admin", "manager", "cashier"] },
    medicines: { label: "Medicines", icon: Pill, roles: ["admin", "manager"] },
    suppliers: { label: "Suppliers", icon: Truck, roles: ["admin", "manager"] },
    users: { label: "Staff accounts", icon: Users, roles: ["admin"] },
  };
  const availableViews = (Object.keys(pages) as AppView[]).filter((view) => pages[view].roles.includes(user.role));
  const hasViewAccess = pages[activeView].roles.includes(user.role);
  const currentView = hasViewAccess ? activeView : "dashboard";
  const pageTitle = pages[currentView].label;

  useEffect(() => {
    if (!hasViewAccess) setActiveView("dashboard");
  }, [hasViewAccess, setActiveView]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#dashboard"
          onClick={(event) => {
            event.preventDefault();
            setActiveView("dashboard");
          }}
          aria-label="Pharmacy Desk home"
        >
          <span className="brand-mark">
            <Pill size={20} strokeWidth={2.2} />
          </span>
          <span>
            pharmacy<span className="brand-light">desk</span>
          </span>
        </a>
        <div className="nav-label">PHARMACY DESK</div>
        <nav aria-label="Main navigation">
          {availableViews.map((view) => {
            const Icon = pages[view].icon;
            return (
              <button
                key={view}
                className={`nav-link ${currentView === view ? "active" : ""}`}
                aria-label={pages[view].label}
                onClick={() => setActiveView(view)}
              >
                <Icon size={18} />
                <span>{pages[view].label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <span className={`connection-dot ${apiStatus}`} />
          <span>{isPending ? "Checking API" : apiStatus === "online" ? "API connected" : "API unavailable"}</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            Pharmacy desk <span>/</span> {pageTitle}
          </div>
          <div className={`api-pill ${apiStatus}`}>
            <Wifi size={15} />
            {apiStatus === "online"
              ? "Connected"
              : apiStatus === "checking"
                ? "Connecting"
                : "Disconnected"}
          </div>
          <div className="topbar-user"><span className="user-avatar">{user.full_name.slice(0, 1).toUpperCase()}</span><span className="topbar-user-name">{user.full_name}</span><span className={`role-chip role-${user.role}`}>{user.role}</span><button className="icon-button signout-button" title="Sign out" aria-label="Sign out" disabled={logout.isPending} onClick={() => logout.mutate()}><LogOut size={16} /></button></div>
        </header>
        <div className="page-content">
          {currentView === "dashboard" ? (
            <DashboardPage />
          ) : currentView === "sales" ? (
            <SalesPage />
          ) : currentView === "medicines" ? (
            <MedicinesPage />
          ) : (
            currentView === "suppliers" ? <SuppliersPage /> : <UsersPage />
          )}
          <footer className="page-footer">
            <span>PHARMACY DESK</span>
            <span>PKR · Asia/Karachi</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
