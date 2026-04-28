import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import apiClient from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogIn, AlertCircle } from "lucide-react";
import gLogo from "@/assets/g-logo.png";
import loginBg from "@/assets/login2.jpg";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();

  const searchParams = new URLSearchParams(window.location.search);
  const redirectTo = searchParams.get("redirect");
  const reason = searchParams.get("reason");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await apiClient.post("auth/login", { email, password });
      if (response.data.token) {
        const userData = response.data.user;
        login(userData, response.data.token);
        const role = userData?.role?.toUpperCase();
        const isAdmin = role === "SUPERADMIN" || role === "ADMIN";
        const isEvaluator = role === "EVALUATOR";

        // ใช้ redirect param เฉพาะเมื่อ path นั้น ตรงกับสิทธิ์ของ role
        const redirectIsValid =
          redirectTo &&
          (isAdmin    ? redirectTo.startsWith("/settings") || redirectTo.startsWith("/evaluation") || redirectTo.startsWith("/registration") || redirectTo.startsWith("/projects") :
           isEvaluator ? redirectTo.startsWith("/evaluation") :
                         redirectTo.startsWith("/register"));

        if (redirectIsValid) {
          navigate(redirectTo!, { replace: true });
          return;
        }

        if (isAdmin) {
          navigate("/settings/programs");
        } else if (isEvaluator) {
          navigate("/evaluation");
        } else {
          navigate("/resource-usage");
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
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      {/* Glassmorphism card */}
      <div className="w-full max-w-sm rounded-3xl p-8 space-y-6"
        style={{
          background: "rgba(240, 230, 190, 0.55)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
          border: "1px solid rgba(255,255,255,0.4)",
        }}
      >
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto h-24 w-24">
            <img src={gLogo} alt="G-Green" className="h-full w-full object-contain drop-shadow-md" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--green-body)" }}>ระบบประเมินผล G-Green</h1>
            <p className="text-sm mt-1" style={{ color: "var(--green-muted)" }}>เข้าสู่ระบบเพื่อดำเนินการ</p>
          </div>
        </div>

        {/* Session expired banner */}
        {reason === "session_expired" && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50/80 px-3 py-2.5">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              <span className="font-bold">เซสชันหมดอายุ</span> — ข้อมูลที่บันทึกไว้ยังคงอยู่ กรุณาเข้าสู่ระบบใหม่เพื่อดำเนินการต่อ
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email" className="text-sm font-medium" style={{ color: "var(--green-body)" }}>อีเมล</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-white/80 border-white/60 rounded-xl h-11 focus-visible:ring-green-600"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password" className="text-sm font-medium" style={{ color: "var(--green-body)" }}>รหัสผ่าน</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="bg-white/80 border-white/60 rounded-xl h-11 focus-visible:ring-green-600"
            />
          </div>
          <Button
            type="submit"
            className="w-full h-11 rounded-xl text-white font-semibold text-base mt-2"
            style={{ background: "#3a7d2c" }}
            disabled={loading}
          >
            {loading ? "กำลังดำเนินการ..." : (
              <><LogIn className="mr-2 h-4 w-4" /> เข้าสู่ระบบ</>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
