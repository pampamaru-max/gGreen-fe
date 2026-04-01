import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import apiClient from "@/lib/axios";
import { User } from "lucide-react";

export function AppLayout() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const location = useLocation();
  const sidebarDefaultOpen = !location.pathname.startsWith("/evaluation") && !location.pathname.startsWith("/register");

  useEffect(() => {
    if (!user) return;
    apiClient.get("/auth/me")
      .then(({ data }) => setDisplayName(data?.user?.name || user.email || ""));
  }, [user]);

  return (
    <SidebarProvider defaultOpen={sidebarDefaultOpen}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="h-12 md:h-12 flex items-center justify-between border-b bg-card/90 backdrop-blur-md px-3 sm:px-4 sticky top-0 z-50 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3">
              <SidebarTrigger className="hidden md:flex" />
              <h1 className="text-sm font-bold text-foreground tracking-tight">
                <span className="text-primary">G</span>-Green
                <span className="hidden sm:inline text-muted-foreground font-normal"> · ระบบประเมินผล</span>
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground max-w-[120px] sm:max-w-[200px] truncate hidden xs:block">
                {displayName}
              </span>
            </div>
          </header>

          {/* Main content — เพิ่ม padding bottom บน mobile ให้ไม่ถูก bottom nav บัง */}
          <main className="flex-1 pb-16 md:pb-0">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Bottom nav สำหรับ mobile */}
      <MobileBottomNav />
    </SidebarProvider>
  );
}
