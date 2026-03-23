import { useState } from "react";
import { Building2, UtensilsCrossed, Home, Factory, Trees, Recycle, Award, ArrowRight, Star, ClipboardCheck, MapPin, Calendar, Phone, Users, ShieldCheck, Loader2, UserPlus } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
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
    <><div className="flex flex-col gap-6 sm:gap-8 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      {/* Hero Text Section */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 p-5 sm:p-8 lg:p-12" style={{ backgroundColor: '#dfe8e6' }}>
        <img
          src={gLogo}
          alt=""
          className="absolute right-3 top-1/2 -translate-y-1/2 h-[110px] w-[110px] sm:h-[200px] sm:w-[200px] lg:h-[240px] lg:w-[240px] object-contain opacity-70 pointer-events-none select-none mix-blend-multiply animate-fade-in [animation-duration:1.2s] [animation-delay:0.3s] [animation-fill-mode:backwards]" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 sm:gap-3 mb-3">
            <img src={dcceLogo} alt="กรมการเปลี่ยนแปลงสภาพภูมิอากาศและสิ่งแวดล้อม" className="h-9 w-9 sm:h-12 sm:w-12 object-contain shrink-0" />
            <p className="text-accent leading-relaxed text-xs sm:text-sm">
              กรมการเปลี่ยนแปลงสภาพภูมิอากาศและสิ่งแวดล้อม
              <br />
              <span className="text-xs text-accent/70">Department of Climate Change and Environment</span>
            </p>
          </div>
          <h1 className="text-lg sm:text-2xl lg:text-4xl font-bold text-foreground leading-tight mb-3 max-w-[calc(100%-120px)] sm:max-w-[calc(100%-220px)] lg:max-w-[calc(100%-260px)]">
            โครงการพัฒนาระบบบริการข้อมูลการผลิต การบริการและการบริโภคที่เป็นมิตรกับสิ่งแวดล้อม
          </h1>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
            <button
              onClick={() => setRegOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl bg-accent text-accent-foreground text-sm sm:text-base font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
              สมัครเข้าร่วมโครงการ <UserPlus className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <button
              onClick={() => navigate("/register")}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl bg-primary text-primary-foreground text-sm sm:text-base font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
              เข้าประเมิน G-Green <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="programs">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="programs" className="text-xs sm:text-sm">โครงการภายใต้ G-Green</TabsTrigger>
          <TabsTrigger value="reports" className="text-xs sm:text-sm">รายงาน</TabsTrigger>
        </TabsList>
        <TabsContent value="programs">
          {programsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {programs.map((p) => {
                const IconComp = iconMap[p.icon] ?? Building2;
                return (
                  <Card
                    key={p.id}
                    className="group hover:shadow-lg transition-shadow border-border/60 cursor-pointer"
                    onClick={() => navigate(`/program/${p.id}`)}>
                    <CardContent className="p-3 sm:p-4 flex flex-col items-center text-center gap-2">
                      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                        <IconComp className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
                      </div>
                      <span className="text-xs sm:text-sm font-semibold text-foreground">{p.name}</span>
                      <span className="text-xs text-muted-foreground leading-tight hidden sm:block">{p.description}</span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
        <TabsContent value="reports">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card
              className="group hover:shadow-lg transition-shadow border-border/60 cursor-pointer"
              onClick={() => navigate("/reports/participants")}
            >
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors shrink-0">
                  <Users className="h-6 w-6 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-foreground">รายชื่อผู้เข้าร่วมโครงการ</span>
                  <p className="text-xs text-muted-foreground">รายงานข้อมูลผู้เข้าร่วมโครงการ G-Green</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-accent transition-colors shrink-0" />
              </CardContent>
            </Card>
            <Card
              className="group hover:shadow-lg transition-shadow border-border/60 cursor-pointer"
              onClick={() => navigate("/reports/all-green")}
            >
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors shrink-0">
                  <ShieldCheck className="h-6 w-6 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-foreground">รายชื่อผู้ได้รับสัญลักษณ์ All Green</span>
                  <p className="text-xs text-muted-foreground">รายงานผู้ได้รับสัญลักษณ์ All Green</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-accent transition-colors shrink-0" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>



      {/* Footer */}
      <footer className="border-t border-border/60 mt-4 sm:mt-8 pt-6 sm:pt-8 pb-4">
        <div className="flex flex-col md:flex-row gap-8 items-start justify-between">
          <div className="flex-1 space-y-4">
            <h3 className="text-lg font-bold text-accent">
              กรมการเปลี่ยนแปลงสภาพภูมิอากาศและสิ่งแวดล้อม
            </h3>
            <p className="text-sm font-semibold text-accent">
              กระทรวงทรัพยากรธรรมชาติและสิ่งแวดล้อม
            </p>
            <p className="text-sm text-muted-foreground mt-3">
              DEPARTMENT OF CLIMATE CHANGE AND ENVIRONMENT (DCCE)
            </p>
            <div className="space-y-2 text-sm text-muted-foreground mt-4">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-accent shrink-0" />
                <span>เลขที่ 49 ซอย 30 ถนนพระราม 6 แขวงพญาไท เขตพญาไท กรุงเทพมหานคร 10400</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-accent shrink-0" />
                <span>จันทร์-ศุกร์ เวลา 08.30 – 16.30 น.</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-accent shrink-0" />
                <span>0-2278-8400-19</span>
                <span> เวอร์ชั่น 1.3</span>
                <span>เวอร์ชัน {health?.version ?? "..."}</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>

    <ProjectRegistrationDialog open={regOpen} onOpenChange={setRegOpen} />
    </>);

}