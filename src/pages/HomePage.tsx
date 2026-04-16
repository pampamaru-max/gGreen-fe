import { useState } from "react";
import { Building2, UtensilsCrossed, Home, Factory, Trees, Recycle, Award, ArrowRight, Star, ClipboardCheck, MapPin, Calendar, Phone, Users, ShieldCheck, UserPlus } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/axios";
import gLogo from "@/assets/g-logo.png";
import dcceLogo from "@/assets/dcce-logo.png";
import footerBg from "@/assets/login2.jpg";
import ProjectRegistrationDialog from "@/components/ProjectRegistrationDialog";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Building2, UtensilsCrossed, Home, Factory, Trees, Recycle, Award, Star, ClipboardCheck,
};

export default function HomePage() {
  const navigate = useNavigate();
  const [regOpen, setRegOpen] = useState(false);

  const { data: programs = [], isLoading: programsLoading } = useQuery({
    queryKey: ["programs"],
    queryFn: async () => {
      const { data } = await apiClient.get("programs/names");
      return data ?? [];
    },
  });

  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const { data } = await apiClient.get("health");
      return data;
    },
  });

  return (
    <><div className="relative h-screen overflow-hidden">
      {/* Page background */}
      <img
        src={footerBg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-center scale-105 brightness-105 saturate-130 pointer-events-none select-none"
      />
      <div className="absolute inset-0 bg-white/10" />
    <div className="relative z-10 h-screen flex flex-col gap-3 sm:gap-4 p-4 sm:p-5 max-w-7xl mx-auto w-full">

      {/* Hero — glass card */}
      <div
        className="relative overflow-hidden rounded-2xl p-4 sm:p-6 shrink-0"
        style={{
          background: "var(--glass-bg-soft)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          border: "1px solid var(--glass-border)",
        }}
      >
        <img
          src={gLogo}
          alt=""
          className="absolute right-3 top-1/2 -translate-y-1/2 h-[110px] w-[110px] sm:h-[200px] sm:w-[200px] lg:h-[240px] lg:w-[240px] object-contain opacity-60 pointer-events-none select-none mix-blend-multiply animate-fade-in [animation-duration:1.2s] [animation-delay:0.3s] [animation-fill-mode:backwards]" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 sm:gap-3 mb-3">
            <img src={dcceLogo} alt="กรมการเปลี่ยนแปลงสภาพภูมิอากาศและสิ่งแวดล้อม" className="h-9 w-9 sm:h-12 sm:w-12 object-contain shrink-0" />
            <p className="leading-relaxed text-xs sm:text-sm font-medium" style={{ color: "var(--green-body)" }}>
              กรมการเปลี่ยนแปลงสภาพภูมิอากาศและสิ่งแวดล้อม
              <br />
              <span className="text-xs" style={{ color: "var(--green-muted)" }}>Department of Climate Change and Environment</span>
            </p>
          </div>
          <h1 className="text-lg sm:text-2xl lg:text-4xl font-bold leading-tight mb-3 max-w-[calc(100%-120px)] sm:max-w-[calc(100%-220px)] lg:max-w-[calc(100%-260px)]" style={{ color: "var(--green-heading)" }}>
            โครงการพัฒนาระบบบริการข้อมูลการผลิต การบริการและการบริโภคที่เป็นมิตรกับสิ่งแวดล้อม
          </h1>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-3 sm:mt-4">
            <button
              onClick={() => setRegOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl text-sm sm:text-base font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              style={{ background: "rgba(58,125,44,0.85)", backdropFilter: "blur(8px)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)" }}>
              สมัครเข้าร่วมโครงการ <UserPlus className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <button
              onClick={() => navigate("/register")}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl text-sm sm:text-base font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)", color: "var(--green-body)", border: "1px solid rgba(255,255,255,0.6)" }}>
              เข้าประเมิน G-Green <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Section — glass wrapper */}
      <Tabs defaultValue="programs" className="flex-1 flex flex-col min-h-0">
        <TabsList
          className="w-full justify-start"
          style={{
            background: "var(--glass-bg-soft)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <TabsTrigger
            value="programs"
            className="text-xs sm:text-sm font-semibold data-[state=active]:!bg-[#3a7d2c] data-[state=active]:!text-white data-[state=active]:!shadow-md"
          >
            โครงการภายใต้ G-Green
          </TabsTrigger>
          <TabsTrigger
            value="reports"
            className="text-xs sm:text-sm font-semibold data-[state=active]:!bg-[#3a7d2c] data-[state=active]:!text-white data-[state=active]:!shadow-md"
          >
            รายงาน
          </TabsTrigger>
        </TabsList>

        <TabsContent value="programs" className="flex-1 overflow-auto mt-2">
          {programsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-xl p-3 sm:p-4 flex flex-col items-center gap-2" style={{ background: "var(--glass-bg-soft)", backdropFilter: "blur(12px)", border: "1px solid var(--glass-border)" }}>
                  <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {programs.map((p) => {
                const IconComp = iconMap[p.icon] ?? Building2;
                return (
                  <div
                    key={p.id}
                    className="group flex flex-col items-center text-center gap-2 p-3 sm:p-4 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.03] hover:shadow-lg"
                    style={{
                      background: "var(--glass-bg-soft)",
                      backdropFilter: "blur(12px)",
                      WebkitBackdropFilter: "blur(12px)",
                      border: "1px solid var(--glass-border)",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                    }}
                    onClick={() => navigate(`/program/${p.id}`)}>
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center transition-colors" style={{ background: "rgba(58,125,44,0.15)" }}>
                      <IconComp className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: "#3a7d2c" }} />
                    </div>
                    <span className="text-xs sm:text-sm font-semibold" style={{ color: "var(--green-heading)" }}>{p.name}</span>
                    <span className="text-xs leading-tight hidden sm:block" style={{ color: "var(--green-muted)" }}>{p.description}</span>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reports" className="flex-1 overflow-auto mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: Users, label: "รายชื่อผู้ประกอบการที่ผ่านเข้าร่วมโครงการ", desc: "รายงานข้อมูลผู้ประกอบการที่ผ่านการคัดเลือก", path: "/reports/participants" },
              { icon: ShieldCheck, label: "รายชื่อผู้ได้รับสัญลักษณ์ All Green", desc: "รายงานผู้ได้รับสัญลักษณ์ All Green", path: "/reports/all-green" },
            ].map(({ icon: Icon, label, desc, path }) => (
              <div
                key={path}
                className="group flex items-center gap-4 p-5 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
                style={{
                  background: "var(--glass-bg-soft)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  border: "1px solid var(--glass-border)",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                }}
                onClick={() => navigate(path)}
              >
                <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(58,125,44,0.15)" }}>
                  <Icon className="h-6 w-6" style={{ color: "#3a7d2c" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold" style={{ color: "var(--green-heading)" }}>{label}</span>
                  <p className="text-xs mt-0.5" style={{ color: "var(--green-muted)" }}>{desc}</p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 transition-colors" style={{ color: "#3a7d2c" }} />
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer — glass strip */}
      <footer
        className="rounded-xl px-5 py-3 shrink-0"
        style={{
          background: "var(--glass-bg-soft)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid var(--glass-border)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        }}
      >
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-bold" style={{ color: "var(--green-heading)" }}>กรมการเปลี่ยนแปลงสภาพภูมิอากาศและสิ่งแวดล้อม</h3>
          <p className="text-xs font-semibold" style={{ color: "var(--green-body)" }}>กระทรวงทรัพยากรธรรมชาติและสิ่งแวดล้อม</p>
          <p className="text-xs" style={{ color: "var(--green-muted)" }}>DEPARTMENT OF CLIMATE CHANGE AND ENVIRONMENT (DCCE)</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-1 text-xs" style={{ color: "#3a6b28" }}>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: "#3a7d2c" }} />
              เลขที่ 49 ซอย 30 ถนนพระราม 6 แขวงพญาไท เขตพญาไท กรุงเทพมหานคร 10400
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0" style={{ color: "#3a7d2c" }} />
              จันทร์-ศุกร์ เวลา 08.30 – 16.30 น.
            </span>
            <span className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 shrink-0" style={{ color: "#3a7d2c" }} />
              0-2278-8400-19
              <span className="ml-2 opacity-60">เวอร์ชัน {health?.version ?? "1.5"}</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
    </div>

    <ProjectRegistrationDialog open={regOpen} onOpenChange={setRegOpen} />
    </>);

}