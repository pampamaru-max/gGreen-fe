import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole, AppRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { Loader2, Users, Shield, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface UserWithRole {
  userId: string;
  email: string;
  displayName: string;
  role: AppRole | null;
  programIds: string[];
}

interface Program {
  id: string;
  name: string;
}

const roleLabelMap: Record<string, string> = {
  admin: "ผู้ดูแลระบบ",
  evaluator: "ผู้ประเมิน",
  user: "ผู้ใช้งาน",
};

const roleBadgeVariant: Record<string, "default" | "secondary" | "outline"> = {
  admin: "default",
  evaluator: "secondary",
  user: "outline",
};

const SettingsUsers = () => {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignDialog, setAssignDialog] = useState<{ userId: string; email: string } | null>(null);
  const [selectedProgram, setSelectedProgram] = useState("");

  const fetchUsers = async () => {
    setLoading(true);

    // Fetch all profiles
    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name");
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const { data: access } = await supabase.from("user_program_access").select("user_id, program_id");
    const { data: progs } = await supabase.from("programs").select("id, name").order("sort_order");

    setPrograms(progs || []);

    // We need emails - fetch from profiles (display_name may contain email as fallback)
    // Since we can't query auth.users, we'll use profiles
    const userMap = new Map<string, UserWithRole>();

    profiles?.forEach((p) => {
      userMap.set(p.user_id, {
        userId: p.user_id,
        email: "",
        displayName: p.display_name || "",
        role: null,
        programIds: [],
      });
    });

    roles?.forEach((r) => {
      const u = userMap.get(r.user_id);
      if (u) u.role = r.role as AppRole;
    });

    access?.forEach((a) => {
      const u = userMap.get(a.user_id);
      if (u) u.programIds.push(a.program_id);
    });

    setUsers(Array.from(userMap.values()));
    setLoading(false);
  };

  useEffect(() => {
    if (!roleLoading && isAdmin) fetchUsers();
  }, [roleLoading, isAdmin]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    // Delete existing role
    await supabase.from("user_roles").delete().eq("user_id", userId);

    if (newRole) {
      const { error } = await supabase.from("user_roles").insert({
        user_id: userId,
        role: newRole as AppRole,
      });
      if (error) {
        toast.error("ไม่สามารถเปลี่ยน role ได้");
        return;
      }
    }

    toast.success("เปลี่ยน role เรียบร้อยแล้ว");
    fetchUsers();
  };

  const handleAssignProgram = async () => {
    if (!assignDialog || !selectedProgram) return;

    const { error } = await supabase.from("user_program_access").insert({
      user_id: assignDialog.userId,
      program_id: selectedProgram,
    });

    if (error) {
      if (error.code === "23505") {
        toast.error("ผู้ใช้นี้ถูกกำหนดโครงการนี้แล้ว");
      } else {
        toast.error("ไม่สามารถกำหนดโครงการได้");
      }
      return;
    }

    toast.success("กำหนดโครงการเรียบร้อยแล้ว");
    setAssignDialog(null);
    setSelectedProgram("");
    fetchUsers();
  };

  const handleRemoveAccess = async (userId: string, programId: string) => {
    await supabase.from("user_program_access").delete()
      .eq("user_id", userId)
      .eq("program_id", programId);
    toast.success("ลบสิทธิ์เข้าถึงโครงการเรียบร้อยแล้ว");
    fetchUsers();
  };

  const getProgramName = (id: string) => programs.find((p) => p.id === id)?.name || id;

  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <div className="border-b bg-card/50 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">จัดการผู้ใช้</h2>
            <p className="text-xs text-muted-foreground">กำหนด role และสิทธิ์เข้าถึงโครงการ</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              รายชื่อผู้ใช้ ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ชื่อ</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>โครงการที่เข้าถึงได้</TableHead>
                  <TableHead className="w-[100px]">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.userId}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{u.displayName || "ไม่ระบุชื่อ"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={u.role || ""}
                        onValueChange={(val) => handleRoleChange(u.userId, val)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="เลือก role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">ผู้ดูแลระบบ</SelectItem>
                          <SelectItem value="evaluator">ผู้ประเมิน</SelectItem>
                          <SelectItem value="user">ผู้ใช้งาน</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {u.role === "admin" ? (
                          <Badge variant="default">ทุกโครงการ</Badge>
                        ) : (
                          <>
                            {u.programIds.map((pid) => (
                              <Badge key={pid} variant="secondary" className="gap-1">
                                {getProgramName(pid)}
                                <button
                                  onClick={() => handleRemoveAccess(u.userId, pid)}
                                  className="ml-0.5 hover:text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                            {u.programIds.length === 0 && (
                              <span className="text-xs text-muted-foreground">ยังไม่ได้กำหนด</span>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.role !== "admin" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setAssignDialog({ userId: u.userId, email: u.displayName })}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          โครงการ
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!assignDialog} onOpenChange={() => { setAssignDialog(null); setSelectedProgram(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>กำหนดโครงการให้ {assignDialog?.email}</DialogTitle>
          </DialogHeader>
          <Select value={selectedProgram} onValueChange={setSelectedProgram}>
            <SelectTrigger>
              <SelectValue placeholder="เลือกโครงการ" />
            </SelectTrigger>
            <SelectContent>
              {programs.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(null)}>ยกเลิก</Button>
            <Button onClick={handleAssignProgram} disabled={!selectedProgram}>บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsUsers;
