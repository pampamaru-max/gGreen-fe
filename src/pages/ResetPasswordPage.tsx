import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { KeyRound } from "lucide-react";
import gLogo from "@/assets/g-logo.png";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    if (hashParams.get("type") === "recovery") {
      setIsRecovery(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "รหัสผ่านไม่ตรงกัน", description: "กรุณากรอกรหัสผ่านให้ตรงกันทั้งสองช่อง", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({ title: "เปลี่ยนรหัสผ่านไม่สำเร็จ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "เปลี่ยนรหัสผ่านสำเร็จ", description: "คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้แล้ว", variant: "success" });
      navigate("/login");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto h-20 w-20">
            <img src={gLogo} alt="G-Green" className="h-full w-full object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">ตั้งรหัสผ่านใหม่</h1>
            <p className="text-sm text-muted-foreground mt-1">กรุณากรอกรหัสผ่านใหม่ที่ต้องการ</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">รหัสผ่านใหม่</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">ยืนยันรหัสผ่านใหม่</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "กำลังดำเนินการ..." : (
                <><KeyRound className="mr-2 h-4 w-4" /> เปลี่ยนรหัสผ่าน</>
              )}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button type="button" onClick={() => navigate("/login")} className="text-sm text-primary hover:underline">
              กลับไปหน้าเข้าสู่ระบบ
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
