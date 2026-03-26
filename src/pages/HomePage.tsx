import { useState } from "react";
import { Building2, UtensilsCrossed, Home, Factory, Trees, Recycle, Award, ArrowRight, Star, ClipboardCheck, MapPin, Calendar, Phone, Users, ShieldCheck, Loader2, UserPlus } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/axios";
import gLogo from "@/assets/g-logo.png";
import dcceLogo from "@/assets/dcce-logo.png";
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
    <>
      <div className="flex flex-col min-h-screen bg-white">

        {/* ── Hero Section ── */}
        <section className="relative overflow-hidden bg-[#dfe8e6] px-5 py-10 sm:px-10 sm:py-14 lg:px-16 lg:py-20">
          {/* G logo watermark */}
          <img
            src={gLogo}
            alt=""
            className="absolute right-6 top-1/2 -translate-y-1/2 h-[100px] w-[100px] sm:h-[180px] sm:w-[180px] lg:h-[220px] lg:w-[220px] object-contain opacity-30 pointer-events-none select-none mix-blend-multiply"
          />
          <div className="relative z-10 max-w-7xl mx-auto">
            <div className="flex items-center gap-2 sm:gap-3 mb-4">
              <img src={dcceLogo} alt="กรมการเปลี่ยนแปลงสภาพภูมิอากาศและสิ่งแวดล้อม" className="h-9 w-9 sm:h-12 sm:w-12 object-contain shrink-0" />
              <p className="text-green-800 text-xs sm:text-sm leading-relaxed">
                กรมการเปลี่ยนแปลงสภาพภูมิอากาศและสิ่งแวดล้อม
                <br />
                <span className="text-xs text-green-700/70">Department of Climate Change and Environment</span>
              </p>
            </div>
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold text-green-900 leading-tight mb-6 max-w-2xl">
              โครงการพัฒนาระบบบริการข้อมูลการผลิต การบริการและการบริโภคที่เป็นมิตรกับสิ่งแวดล้อม
            </h1>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setRegOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-green-700 text-white text-sm sm:text-base font-bold shadow-md hover:bg-green-800 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
                สมัครเข้าร่วมโครงการ <UserPlus className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              <button
                onClick={() => navigate("/register")}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-green-700 text-green-800 bg-white text-sm sm:text-base font-bold shadow-sm hover:bg-green-50 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
                เข้าประเมิน G-Green <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          </div>
        </section>

        {/* ── Main Content ── */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <Tabs defaultValue="programs">
            <TabsList className="w-full justify-start mb-6">
              <TabsTrigger value="programs" className="text-xs sm:text-sm">โครงการภายใต้ G-Green</TabsTrigger>
              <TabsTrigger value="reports" className="text-xs sm:text-sm">รายงาน</TabsTrigger>
            </TabsList>

            {/* Programs Grid */}
            <TabsContent value="programs">
              {programsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                  {programs.map((p: { id: string; name: string; description: string; icon: string }) => {
                    const IconComp = iconMap[p.icon] ?? Building2;
                    return (
                      <button
                        key={p.id}
                        onClick={() => navigate(`/program/${p.id}`)}
                        className="group bg-white rounded-2xl border border-gray-100 shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.14)] hover:-translate-y-0.5 transition-all duration-200 p-4 sm:p-5 flex flex-col items-center text-center gap-3">
                        <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors shrink-0">
                          <IconComp className="h-6 w-6 sm:h-7 sm:w-7 text-green-700" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800 leading-snug">{p.name}</p>
                          <p className="text-xs text-gray-400 mt-1 leading-tight hidden sm:block">{p.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Reports */}
            <TabsContent value="reports">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => navigate("/reports/participants")}
                  className="group bg-white rounded-2xl border border-gray-100 shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.14)] hover:-translate-y-0.5 transition-all duration-200 p-5 flex items-center gap-4 text-left">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors shrink-0">
                    <Users className="h-6 w-6 text-green-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">รายชื่อผู้เข้าร่วมโครงการ</p>
                    <p className="text-xs text-gray-400 mt-0.5">รายงานข้อมูลผู้เข้าร่วมโครงการ G-Green</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-green-600 transition-colors shrink-0" />
                </button>
                <button
                  onClick={() => navigate("/reports/all-green")}
                  className="group bg-white rounded-2xl border border-gray-100 shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.14)] hover:-translate-y-0.5 transition-all duration-200 p-5 flex items-center gap-4 text-left">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors shrink-0">
                    <ShieldCheck className="h-6 w-6 text-green-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">รายชื่อผู้ได้รับสัญลักษณ์ All Green</p>
                    <p className="text-xs text-gray-400 mt-0.5">รายงานผู้ได้รับสัญลักษณ์ All Green</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-green-600 transition-colors shrink-0" />
                </button>
              </div>
            </TabsContent>
          </Tabs>
        </main>

        {/* ── Footer ── */}
        <footer className="bg-green-900 text-white px-6 py-10 sm:px-10">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8 items-start justify-between">
            <div className="space-y-3">
              <h3 className="text-base sm:text-lg font-bold text-white">
                กรมการเปลี่ยนแปลงสภาพภูมิอากาศและสิ่งแวดล้อม
              </h3>
              <p className="text-sm font-medium text-green-200">
                กระทรวงทรัพยากรธรรมชาติและสิ่งแวดล้อม
              </p>
              <p className="text-xs text-green-400">
                DEPARTMENT OF CLIMATE CHANGE AND ENVIRONMENT (DCCE)
              </p>
              <div className="space-y-2 text-sm text-green-200 pt-2">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-green-400 shrink-0" />
                  <span>เลขที่ 49 ซอย 30 ถนนพระราม 6 แขวงพญาไท เขตพญาไท กรุงเทพมหานคร 10400</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-green-400 shrink-0" />
                  <span>จันทร์-ศุกร์ เวลา 08.30 – 16.30 น.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-green-400 shrink-0" />
                  <span>0-2278-8400-19</span>
                  <span className="text-green-500">·</span>
                  <span>เวอร์ชัน {health?.version ?? "..."}</span>
                </div>
              </div>
            </div>
          </div>
        </footer>

      </div>
      <ProjectRegistrationDialog open={regOpen} onOpenChange={setRegOpen} />
    </>
  );
}
