import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import natureBg from "@/assets/login2.jpg";
import nightBg from "@/assets/night-bg.jpg";
import { AppSidebar } from "@/components/AppSidebar";
import { useTheme } from "@/contexts/ThemeContext";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import apiClient from "@/lib/axios";
import { User, Mail, MapPin, ShieldCheck, Building2, KeyRound } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

import { FONT_SIZE_KEY, applyFontSize } from "@/lib/fontsize";
import { FirefliesLayer } from "@/components/FirefliesLayer";

const ROLE_LABEL: Record<string, { label: string; color: string }> = {
  ADMIN:     { label: "ผู้ดูแลระบบ",   color: "bg-red-100 text-red-700 border-red-200" },
  EVALUATOR: { label: "กรรมการ",        color: "bg-blue-100 text-blue-700 border-blue-200" },
  USER:      { label: "ผู้ถูกประเมิน", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

interface MeUser {
  id: string;
  name: string;
  email: string;
  role: string;
  taxId?: string | null;
  province?: string | null;
  programAccess?: string[];
}

export function AppLayout() {
  const { user } = useAuth();
  const [me, setMe] = useState<MeUser | null>(null);
  const location = useLocation();
  const sidebarDefaultOpen = !location.pathname.startsWith("/evaluation") && !location.pathname.startsWith("/register");

  const [fontSize, setFontSize] = useState<number>(() => {
    const saved = localStorage.getItem(FONT_SIZE_KEY);
    return saved ? parseInt(saved, 10) : 16;
  });

  useEffect(() => {
    applyFontSize(fontSize);
    localStorage.setItem(FONT_SIZE_KEY, String(fontSize));
  }, [fontSize]);

  useEffect(() => {
    if (!user) return;
    apiClient.get("/auth/me")
      .then(({ data }) => setMe(data?.user ?? null));
  }, [user]);

  const roleConfig = me?.role ? (ROLE_LABEL[me.role] ?? { label: me.role, color: "bg-gray-100 text-gray-700 border-gray-200" }) : null;
  const { isDark } = useTheme();

  const headerBg = "var(--glass-bg-soft)";
  const headerBorder = "1px solid var(--glass-border)";

  return (
    <SidebarProvider defaultOpen={sidebarDefaultOpen}>
      {/* Global background */}
      <img
        src={isDark ? nightBg : natureBg}
        alt=""
        className="fixed inset-0 w-full object-cover pointer-events-none select-none transition-opacity duration-500"
        style={{
          zIndex: 0,
          height: "100%",
          minHeight: "100dvh",
          filter: isDark ? "brightness(0.6) saturate(0.8)" : "brightness(1.05) saturate(1.3)",
        }}
      />
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0, minHeight: "100dvh", background: isDark ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.1)" }} />
      <FirefliesLayer />

      <div className="relative flex w-full overflow-hidden" style={{ zIndex: 2, height: "100dvh" }}>
        <AppSidebar fontSize={fontSize} setFontSize={setFontSize} />
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Header */}
          <header className="flex items-center justify-between px-3 sm:px-4 sticky top-2 z-50 mx-4 rounded-2xl shadow-sm" style={{ height: "48px", background: headerBg, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: headerBorder }}>
            <div className="flex items-center gap-2 sm:gap-3">
              <SidebarTrigger className="hidden md:flex" />
              <h1 className="text-sm font-bold text-foreground tracking-tight">
                <span className="text-primary">G</span>-Green
                <span className="hidden sm:inline text-muted-foreground font-normal"> · ระบบประเมินผล</span>
              </h1>
            </div>

            <HoverCard openDelay={150} closeDelay={100}>
              <HoverCardTrigger asChild>
                <div className="flex items-center gap-2 cursor-default select-none">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center ring-1 ring-primary/20 hover:ring-primary/50 hover:bg-primary/15 transition-all">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground max-w-[120px] sm:max-w-[200px] truncate hidden xs:block">
                    {me?.name || user?.email || ""}
                  </span>
                </div>
              </HoverCardTrigger>

              <HoverCardContent side="bottom" align="end" className="w-72 p-0 overflow-hidden">
                {/* Header gradient */}
                <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center shrink-0 ring-2 ring-white/30">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white leading-tight truncate">
                        {me?.name || "-"}
                      </p>
                      {roleConfig && (
                        <span className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${roleConfig.color}`}>
                          <ShieldCheck className="h-2.5 w-2.5" />
                          {roleConfig.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Info rows */}
                <div className="px-4 py-3 space-y-2.5">
                  {me?.email && (
                    <div className="flex items-center gap-2.5">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <p className="text-xs text-foreground truncate">{me.email}</p>
                    </div>
                  )}
                  {me?.province && (
                    <div className="flex items-center gap-2.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <p className="text-xs text-foreground">{me.province}</p>
                    </div>
                  )}
                  {me?.taxId && (
                    <div className="flex items-center gap-2.5">
                      <KeyRound className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <p className="text-xs text-foreground font-mono">{me.taxId}</p>
                    </div>
                  )}
                  {me?.programAccess && me.programAccess.length > 0 && (
                    <div className="flex items-start gap-2.5">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="flex flex-wrap gap-1">
                        {me.programAccess.map((p) => (
                          <span key={p} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer: ID */}
                <div className="border-t px-4 py-2 bg-muted/30">
                  <p className="text-[10px] text-muted-foreground font-mono truncate">ID: {me?.id || "-"}</p>
                </div>
              </HoverCardContent>
            </HoverCard>
          </header>

          {/* Main content — เพิ่ม padding bottom บน mobile ให้ไม่ถูก bottom nav บัง */}
          <main className="flex-1 overflow-hidden pb-16 md:pb-0">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Bottom nav สำหรับ mobile */}
      <MobileBottomNav fontSize={fontSize} setFontSize={setFontSize} />
    </SidebarProvider>
  );
}
