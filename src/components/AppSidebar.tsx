import { ClipboardCheck, Settings, FolderTree, ListChecks, FolderKanban, UserPlus, Award, FileText, LogOut, User, FileBarChart, Users, ShieldCheck, Home, FileArchive, Shield } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
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
  { title: "จัดการผู้ใช้", url: "/settings/users", icon: Shield },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();

  const isSettingsActive = currentPath.startsWith("/settings");
  const isReportsActive = currentPath.startsWith("/reports");
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
                  <NavLink to="/evaluation" className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
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
                <Collapsible defaultOpen={isSettingsActive} className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
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
                    {!collapsed &&
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
                    }
                  </SidebarMenuItem>
                </Collapsible>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {!collapsed && (
            <SidebarMenuItem>
              <div className="flex items-center gap-2 px-2 py-1.5">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground truncate">
                  {user?.email ?? ""}
                </span>
              </div>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={async () => { await signOut(); navigate("/"); }}
              className="hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {!collapsed && <span>ออกจากระบบ</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>);

}