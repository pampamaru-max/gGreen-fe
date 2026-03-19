import { useState } from "react";
import {
  ClipboardCheck, Settings, FileBarChart, MoreHorizontal,
  FolderKanban, FolderTree, ListChecks, Award, FileText,
  FileArchive, Shield, LogOut, ChevronRight, User,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
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

export function MobileBottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const { signOut, user } = useAuth();
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
      {/* Bottom nav bar — minimal */}
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

      {/* Drawer — หน้าตาเหมือน sidebar */}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[80vh]">
          <div className="px-4 pt-4 pb-2">
            <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
              G-Green
            </p>
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

                {/* การตั้งค่า collapsible */}
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
