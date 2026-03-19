import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import apiClient from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogIn } from "lucide-react";
import gLogo from "@/assets/g-logo.png";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { checkAuth } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await apiClient.post("auth/login", { email, password });
      if (response.data.token) {
        localStorage.setItem("auth_token", response.data.token);
        const userData = response.data.user;
        if (userData) {
          localStorage.setItem("auth_user", JSON.stringify(userData));
        }
        checkAuth();
        const role = userData?.role?.toUpperCase();
        if (role === "SUPERADMIN" || role === "ADMIN") {
          navigate("/settings/programs");
        } else if (role === "EVALUATOR") {
          navigate("/evaluation");
        } else {
          navigate("/register");
        }
      }
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message ?? err.message
        : "เกิดข้อผิดพลาด";
      toast({ title: "เข้าสู่ระบบไม่สำเร็จ", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto h-20 w-20">
            <img src={gLogo} alt="G-Green" className="h-full w-full object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">ระบบประเมินผล G-Green</h1>
            <p className="text-sm text-muted-foreground mt-1">เข้าสู่ระบบเพื่อดำเนินการ</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">อีเมล</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">รหัสผ่าน</Label>
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
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "กำลังดำเนินการ..." : (
                <><LogIn className="mr-2 h-4 w-4" /> เข้าสู่ระบบ</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
