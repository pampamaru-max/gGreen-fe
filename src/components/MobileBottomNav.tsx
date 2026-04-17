import { useState } from "react";
import {
  ClipboardCheck, Settings, FileBarChart, MoreHorizontal,
  FolderKanban, FolderTree, ListChecks, Award, FileText,
  FileArchive, Shield, LogOut, ChevronRight, User,
  Sun, Moon, ALargeSmall,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { FONT_SIZE_MIN, FONT_SIZE_MAX } from "@/lib/fontsize";
import { cn } from "@/lib/utils";
import { Drawer, DrawerContent } from "@/components/ui/drawer";

const settingsSubItems = [
  { label: "จัดการโครงการ", icon: FolderKanban, path: "/settings/programs" },
  { label: "หมวด", icon: FolderTree, path: "/settings/categories" },
  { label: "ประเด็น/ตัวชี้วัด", icon: ListChecks, path: "/settings/indicators" },
  { label: "เกณฑ์คะแนน", icon: Award, path: "/settings/scoring-criteria" },
  { label: "ใบประกาศนียบัตร", icon: FileText, path: "/settings/certificate" },
  { label: "จัดการเอกสารการสมัคร", icon: FileArchive, path: "/settings/documents" },
  { label: "จัดการผู้ใช้", icon: Shield, path: "/settings/users" },
];

interface MobileBottomNavProps {
  fontSize: number;
  setFontSize: (size: number) => void;
}

export function MobileBottomNav({ fontSize, setFontSize }: MobileBottomNavProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const { signOut, user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(pathname.startsWith("/settings"));

  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path);

  const goTo = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <>
      {/* Bottom nav bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/60">
        <div className="flex items-stretch">
          <button
            onClick={() => navigate("/evaluation")}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors",
              isActive("/evaluation") ? "text-primary" : "text-muted-foreground"
            )}
          >
            <ClipboardCheck className={cn("h-5 w-5", isActive("/evaluation") && "stroke-[2.5]")} />
            <span className="text-[10px] font-medium leading-none">ประเมิน</span>
          </button>

          <button
            onClick={toggleTheme}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors text-muted-foreground"
          >
            {isDark
              ? <Moon className="h-5 w-5 text-amber-400" />
              : <Sun className="h-5 w-5 text-amber-500" />}
            <span className="text-[10px] font-medium leading-none">
              {isDark ? "กลางคืน" : "กลางวัน"}
            </span>
          </button>

          <button
            onClick={() => setOpen(true)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors",
              (isActive("/settings") || isActive("/registration-management"))
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-none">เพิ่มเติม</span>
          </button>
        </div>
      </nav>

      {/* Drawer */}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[85vh]">
          <div className="px-4 pt-4 pb-2">
            <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground">G-Green</p>
          </div>

          <div className="overflow-y-auto px-3 pb-4 space-y-0.5">
            {/* ประเมิน G-Green */}
            <button
              onClick={() => goTo("/evaluation")}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left text-sm",
                isActive("/evaluation") ? "bg-muted text-primary font-medium" : "hover:bg-muted/50"
              )}
            >
              <ClipboardCheck className="h-4 w-4 shrink-0" />
              ประเมิน G-Green
            </button>

            {/* admin only */}
            {isAdmin && (
              <>
                <button
                  onClick={() => goTo("/registration-management")}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left text-sm",
                    isActive("/registration-management") ? "bg-muted text-primary font-medium" : "hover:bg-muted/50"
                  )}
                >
                  <FileBarChart className="h-4 w-4 shrink-0" />
                  ข้อมูลการจัดการการสมัคร
                </button>

                <button
                  onClick={() => setSettingsOpen((v) => !v)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left text-sm",
                    isActive("/settings") ? "bg-muted text-primary font-medium" : "hover:bg-muted/50"
                  )}
                >
                  <Settings className="h-4 w-4 shrink-0" />
                  <span className="flex-1">การตั้งค่า</span>
                  <ChevronRight className={cn("h-4 w-4 text-muted-foreground/60 transition-transform duration-200", settingsOpen && "rotate-90")} />
                </button>

                {settingsOpen && (
                  <div className="ml-4 pl-3 border-l border-border space-y-0.5">
                    {settingsSubItems.map((item) => (
                      <button
                        key={item.path}
                        onClick={() => goTo(item.path)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left text-sm",
                          isActive(item.path) ? "bg-muted text-primary font-medium" : "hover:bg-muted/50"
                        )}
                      >
                        <item.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── การแสดงผล ── */}
            <div className="pt-2 pb-1">
              <p className="px-3 text-[10px] font-bold tracking-widest uppercase text-muted-foreground/60 mb-1">
                การแสดงผล
              </p>

              {/* Night mode toggle */}
              <button
                onClick={toggleTheme}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-sm",
                  isDark
                    ? "bg-slate-800/60 border-slate-600/50 hover:bg-slate-700/70"
                    : "bg-amber-50/80 border-amber-200/60 hover:bg-amber-100/80"
                )}
              >
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                  isDark ? "bg-slate-700 text-amber-400" : "bg-amber-100 text-amber-500"
                )}>
                  {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-xs font-semibold leading-none mb-0.5">
                    {isDark ? "กลางคืน" : "กลางวัน"}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-none">
                    {isDark ? "แตะเพื่อสลับเป็นกลางวัน" : "แตะเพื่อสลับเป็นกลางคืน"}
                  </p>
                </div>
                <div className={cn(
                  "w-10 h-5 rounded-full relative transition-colors duration-300",
                  isDark ? "bg-primary" : "bg-muted-foreground/30"
                )}>
                  <div className={cn(
                    "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-300",
                    isDark ? "translate-x-5" : "translate-x-0.5"
                  )} />
                </div>
              </button>

              {/* Font size */}
              <div className="px-3 py-2.5 mt-1 rounded-lg border border-border bg-muted/20">
                <div className="flex items-center gap-2 mb-2">
                  <ALargeSmall className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-xs font-semibold flex-1">ขนาดตัวอักษร</span>
                  <span className="text-xs font-bold text-primary">{fontSize}px</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFontSize(Math.max(fontSize - 1, FONT_SIZE_MIN))}
                    disabled={fontSize <= FONT_SIZE_MIN}
                    className="h-9 w-9 rounded-lg border border-border flex items-center justify-center text-base font-bold text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 transition-all shrink-0"
                  >‹</button>
                  <div className="flex-1 flex gap-0.5 justify-center">
                    {[14, 16, 18, 20, 24, 28, 32, 36].map((v) => (
                      <button
                        key={v}
                        onClick={() => setFontSize(v)}
                        title={`${v}px`}
                        className={cn(
                          "rounded-full transition-all",
                          fontSize === v
                            ? "w-3 h-2 bg-primary"
                            : fontSize > v
                            ? "w-2 h-2 bg-primary/30"
                            : "w-2 h-2 bg-muted-foreground/20"
                        )}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => setFontSize(Math.min(fontSize + 1, FONT_SIZE_MAX))}
                    disabled={fontSize >= FONT_SIZE_MAX}
                    className="h-9 w-9 rounded-lg border border-border flex items-center justify-center text-base font-bold text-primary hover:bg-primary/10 hover:border-primary disabled:opacity-30 transition-all shrink-0"
                  >›</button>
                </div>
                <button
                  onClick={() => setFontSize(16)}
                  className="mt-1.5 w-full text-[10px] text-muted-foreground hover:text-primary transition-colors text-center"
                >
                  รีเซ็ต (16px)
                </button>
              </div>
            </div>
          </div>

          {/* Footer — user + logout */}
          <div className="border-t border-border/60 px-3 py-3 space-y-0.5">
            <div className="flex items-center gap-2 px-3 py-1.5">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground truncate">{user?.email ?? ""}</span>
            </div>
            <button
              onClick={async () => { setOpen(false); await signOut(); navigate("/"); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors text-left text-sm"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              ออกจากระบบ
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
