import { ClipboardCheck, Settings, FolderTree, ListChecks, FolderKanban, Award, FileText, LogOut, User, FileBarChart, Users, ShieldCheck, FileArchive, Shield, Clock, ALargeSmall, Sun, Moon } from "lucide-react";
import { FONT_SIZE_MIN, FONT_SIZE_MAX } from "@/lib/fontsize";
import { useTheme } from "@/contexts/ThemeContext";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar } from
"@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger } from
"@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";

const reportSubItems = [
  { title: "รายชื่อผู้เข้าร่วมโครงการ", url: "/reports/participants", icon: Users },
  { title: "รายชื่อผู้ได้รับสัญลักษณ์ All Green", url: "/reports/all-green", icon: ShieldCheck },
];

const settingsSubItems = [
  { title: "จัดการโครงการ", url: "/settings/programs", icon: FolderKanban },
  { title: "หมวด", url: "/settings/categories", icon: FolderTree },
  { title: "ประเด็น/ตัวชี้วัด", url: "/settings/indicators", icon: ListChecks },
  { title: "เกณฑ์คะแนน", url: "/settings/scoring-criteria", icon: Award },
  { title: "ใบประกาศนียบัตร", url: "/settings/certificate", icon: FileText },
  { title: "จัดการเอกสารการสมัคร", url: "/settings/documents", icon: FileArchive },
  { title: "จัดการระยะเวลาโครงการ", url: "/settings/project-duration", icon: Clock },
  { title: "จัดการผู้ใช้", url: "/settings/users", icon: Shield },
];

interface AppSidebarProps {
  fontSize: number;
  setFontSize: (size: number) => void;
}

export function AppSidebar({ fontSize, setFontSize }: AppSidebarProps) {
  const { state, setOpen } = useSidebar();
  const { isDark, toggleTheme } = useTheme();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { isAdmin, role, loading: roleLoading } = useUserRole();
  // evaluatee ใช้ /register เป็น home, role อื่นใช้ /evaluation
  const evaluationHome = role === "user" ? "/register" : "/evaluation";

  const isSettingsActive = currentPath.startsWith("/settings");
  const isReportsActive = currentPath.startsWith("/reports");

  const [settingsOpen, setSettingsOpen] = useState(isSettingsActive);
  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <span className="text-xs font-bold tracking-wider uppercase">G-Green</span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>

              {/* ประเมิน G-Green */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to={evaluationHome} className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                    <ClipboardCheck className="mr-2 h-4 w-4" />
                    {!collapsed && <span>ประเมิน G-Green</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* ข้อมูลการจัดการการสมัคร - admin only */}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/registration-management" className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                      <FileBarChart className="mr-2 h-4 w-4" />
                      {!collapsed && <span>ข้อมูลการจัดการการสมัคร</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* การตั้งค่า - admin only */}
              {isAdmin && (
                <Collapsible
                  open={!collapsed && settingsOpen}
                  onOpenChange={setSettingsOpen}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        onClick={() => {
                          if (collapsed) {
                            setOpen(true);
                            setSettingsOpen(true);
                          }
                        }}
                        className={`hover:bg-muted/50 ${isSettingsActive ? "bg-muted text-primary font-medium" : ""}`}>
                        <Settings className="mr-2 h-4 w-4" />
                        {!collapsed &&
                        <>
                            <span className="flex-1">การตั้งค่า</span>
                            <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                          </>
                        }
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {settingsSubItems.map((item) =>
                          <SidebarMenuSubItem key={item.url}>
                            <SidebarMenuSubButton asChild>
                              <NavLink to={item.url} className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                                <item.icon className="mr-2 h-3.5 w-3.5" />
                                <span>{item.title}</span>
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {/* Theme toggle section */}
        <SidebarGroup>
          <SidebarGroupLabel>
            {isDark ? <Moon className="h-3.5 w-3.5 mr-1.5" /> : <Sun className="h-3.5 w-3.5 mr-1.5" />}
            {!collapsed && <span className="text-xs font-bold tracking-wider uppercase">โหมดแสดงผล</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {collapsed ? (
              <div className="flex justify-center px-1 py-1">
                <button
                  onClick={toggleTheme}
                  title={isDark ? "สลับเป็นกลางวัน" : "สลับเป็นกลางคืน"}
                  className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted/50 transition-all"
                >
                  {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-500" />}
                </button>
              </div>
            ) : (
              <div className="px-2 py-1">
                <button
                  onClick={toggleTheme}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border transition-all duration-200 ${
                    isDark
                      ? "bg-slate-800/60 border-slate-600/50 hover:bg-slate-700/70"
                      : "bg-amber-50/80 border-amber-200/60 hover:bg-amber-100/80"
                  }`}
                >
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                    isDark ? "bg-slate-700 text-amber-400" : "bg-amber-100 text-amber-500"
                  }`}>
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
                  {/* Toggle pill */}
                  <div className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${isDark ? "bg-primary" : "bg-muted-foreground/30"}`}>
                    <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-300 ${isDark ? "translate-x-5" : "translate-x-0.5"}`} />
                  </div>
                </button>
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Font size section */}
        <SidebarGroup>
          <SidebarGroupLabel>
            <ALargeSmall className="h-3.5 w-3.5 mr-1.5" />
            {!collapsed && <span className="text-xs font-bold tracking-wider uppercase">ขนาดตัวอักษร</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {collapsed ? (
              <div className="flex flex-col items-center gap-1 px-1 py-1">
                <button
                  onClick={() => setFontSize(Math.min(fontSize + 1, FONT_SIZE_MAX))}
                  disabled={fontSize >= FONT_SIZE_MAX}
                  className="w-full flex items-center justify-center py-0.5 rounded text-sm font-bold text-primary hover:bg-primary/10 disabled:opacity-30 transition-all"
                >▲</button>
                <span className="text-sm font-mono text-primary font-bold">{fontSize}</span>
                <button
                  onClick={() => setFontSize(Math.max(fontSize - 1, FONT_SIZE_MIN))}
                  disabled={fontSize <= FONT_SIZE_MIN}
                  className="w-full flex items-center justify-center py-0.5 rounded text-sm font-bold text-muted-foreground hover:bg-muted/50 disabled:opacity-30 transition-all"
                >▼</button>
              </div>
            ) : (
              <div className="px-2 py-1 select-none">
                <div className="flex items-center gap-2">
                  {/* ปุ่มลด */}
                  <button
                    onClick={() => setFontSize(Math.max(fontSize - 1, FONT_SIZE_MIN))}
                    disabled={fontSize <= FONT_SIZE_MIN}
                    className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-base font-bold text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 transition-all shrink-0"
                  >‹</button>

                  {/* แสดงค่าปัจจุบัน */}
                  <div className="flex-1 flex flex-col items-center">
                    <span className="text-sm font-bold text-primary leading-none">{fontSize}px</span>
                    <span className="text-[9px] text-muted-foreground mt-0.5">
                      {fontSize <= 14 ? "เล็กสุด" : fontSize <= 16 ? "ปกติ" : fontSize <= 20 ? "ใหญ่" : fontSize <= 26 ? "ใหญ่มาก" : "ใหญ่สุด"}
                    </span>
                  </div>

                  {/* ปุ่มเพิ่ม */}
                  <button
                    onClick={() => setFontSize(Math.min(fontSize + 1, FONT_SIZE_MAX))}
                    disabled={fontSize >= FONT_SIZE_MAX}
                    className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-base font-bold text-primary hover:bg-primary/10 hover:border-primary disabled:opacity-30 transition-all shrink-0"
                  >›</button>
                </div>

                {/* Progress dots */}
                <div className="flex justify-center gap-0.5 mt-2">
                  {[14, 16, 18, 20, 24, 28, 32, 36].map((v) => (
                    <button
                      key={v}
                      onClick={() => setFontSize(v)}
                      title={`${v}px`}
                      className={`rounded-full transition-all ${
                        fontSize === v
                          ? "w-3 h-1.5 bg-primary"
                          : fontSize > v
                          ? "w-1.5 h-1.5 bg-primary/30"
                          : "w-1.5 h-1.5 bg-muted-foreground/20"
                      }`}
                    />
                  ))}
                </div>

                {/* Reset */}
                <button
                  onClick={() => setFontSize(16)}
                  className="mt-2 w-full text-[10px] text-muted-foreground hover:text-primary transition-colors text-center"
                >
                  รีเซ็ต (16px)
                </button>
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {!collapsed && (
            <SidebarMenuItem>
              <div className="flex items-center gap-2 px-2 py-1.5">
                <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(58,125,44,0.15)" }}>
                  <User className="h-3.5 w-3.5" style={{ color: "#3a7d2c" }} />
                </div>
                <span className="text-xs font-bold truncate" style={{ color: "var(--green-heading)" }}>
                  {user?.name || user?.email || ""}
                </span>
              </div>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={async () => { await signOut(); navigate("/"); }}
              className="hover:bg-destructive/10 hover:text-destructive"
              style={{ color: "var(--green-heading)" }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {!collapsed && <span>ออกจากระบบ</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>);

}