import { useState, useEffect } from "react";
import apiClient from "@/lib/axios";
import { useUserRole } from "@/hooks/useUserRole";
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
  role: string | null;
  programIds: string[];
}

interface Program {
  id: string;
  name: string; 
}

const roleLabelMap: Record<string, string> = {
  SUPERADMIN: "ซูเปอร์แอดมิน",
  ADMIN: "ผู้ดูแลระบบ",
  EVALUATOR: "ผู้ประเมิน",
  EVALUATEE: "ผู้ถูกประเมิน",
};

const roleBadgeVariant: Record<string, "default" | "secondary" | "outline"> = {
  SUPERADMIN: "default",
  ADMIN: "default",
  EVALUATOR: "secondary",
  EVALUATEE: "outline",
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
    try {
      const [usersRes, programsRes] = await Promise.all([
        apiClient.get("/users"),
        apiClient.get("/programs"),
      ]);
      setUsers(usersRes.data);
      setPrograms(programsRes.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!roleLoading && isAdmin) fetchUsers();
  }, [roleLoading, isAdmin]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await apiClient.patch(`/users/${userId}/role`, { role: newRole });
      toast.success("เปลี่ยน role เรียบร้อยแล้ว");
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "ไม่สามารถเปลี่ยน role ได้");
    }
  };

  const handleAssignProgram = async () => {
    if (!assignDialog || !selectedProgram) return;

    try {
      await apiClient.post(`/users/${assignDialog.userId}/programs`, { programId: selectedProgram });
      toast.success("กำหนดโครงการเรียบร้อยแล้ว");
      setAssignDialog(null);
      setSelectedProgram("");
      fetchUsers();
    } catch (error: any) {
      if (error.response?.status === 409) {
        toast.error("ผู้ใช้นี้ถูกกำหนดโครงการนี้แล้ว");
      } else {
        toast.error(error.response?.data?.message || "ไม่สามารถกำหนดโครงการได้");
      }
    }
  };

  const handleRemoveAccess = async (userId: string, programId: string) => {
    try {
      await apiClient.delete(`/users/${userId}/programs/${programId}`);
      toast.success("ลบสิทธิ์เข้าถึงโครงการเรียบร้อยแล้ว");
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message);
    }
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
    <div className="h-full flex flex-col gap-3 p-4">
      <div className="px-6 py-4 rounded-2xl shrink-0" style={{ background: "var(--glass-bg)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", boxShadow: "var(--glass-shadow)", border: "1px solid var(--glass-border)" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: "#3a7d2c" }}>
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--green-heading)" }}>จัดการผู้ใช้</h2>
            <p className="text-xs" style={{ color: "var(--green-muted)" }}>กำหนด role และสิทธิ์เข้าถึงโครงการ</p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 rounded-2xl overflow-hidden" style={{ background: "var(--glass-bg)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", boxShadow: "var(--glass-shadow)", border: "1px solid var(--glass-border)" }}>
        <div className="h-full overflow-y-auto px-6 py-6">
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
                          <SelectItem value="SUPERADMIN">ซูเปอร์แอดมิน</SelectItem>
                          <SelectItem value="ADMIN">ผู้ดูแลระบบ</SelectItem>
                          <SelectItem value="EVALUATOR">ผู้ประเมิน</SelectItem>
                          <SelectItem value="EVALUATEE">ผู้ถูกประเมิน</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {u.role === "ADMIN" || u.role === "SUPERADMIN" ? (
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
