import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import apiClient from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogIn } from "lucide-react";
import gLogo from "@/assets/g-logo.png";
import plantDeco from "@/assets/plant-deco.png";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await apiClient.post("auth/login", { email, password });
      if (response.data.token) {
        const userData = response.data.user;
        login(userData, response.data.token);
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
    <div className="min-h-screen bg-[#f0f7f3] flex items-center justify-center p-4">
      {/* Plant decoration */}
      <img
        src={plantDeco}
        alt=""
        className="fixed bottom-0 right-0 w-[500px] object-contain pointer-events-none select-none z-0"
      />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-sm">
        {/* Header strip */}
        <div className="bg-[#dfe8e6] rounded-t-2xl px-8 py-6 text-center">
          <img src={gLogo} alt="G-Green" className="h-16 w-16 object-contain mx-auto mb-3" />
          <h1 className="text-lg font-bold text-green-900">ระบบประเมินผล G-Green</h1>
          <p className="text-xs text-green-700/70 mt-0.5">เข้าสู่ระบบเพื่อดำเนินการ</p>
        </div>

        {/* Form area */}
        <div className="bg-white rounded-b-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] px-8 py-7 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">อีเมล</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-gray-50 border-gray-200 focus:border-green-500 focus:ring-green-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">รหัสผ่าน</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-gray-50 border-gray-200 focus:border-green-500 focus:ring-green-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-700 text-white font-bold text-sm hover:bg-green-800 active:scale-[0.98] transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? "กำลังดำเนินการ..." : <><LogIn className="h-4 w-4" /> เข้าสู่ระบบ</>}
            </button>
          </form>

          <div className="text-center">
            <a href="/reset-password" className="text-xs text-green-700 hover:text-green-900 hover:underline transition-colors">
              ลืมรหัสผ่าน?
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
