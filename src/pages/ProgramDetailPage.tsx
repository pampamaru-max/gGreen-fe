import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, UtensilsCrossed, Home, Factory, Trees, Recycle, Award, Star, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLoading } from "@/components/ui/page-loading";
import gLogo from "@/assets/g-logo.png";
import natureBg from "@/assets/login2.jpg";
import nightBg from "@/assets/night-bg.jpg";
import AboutContentRenderer from "@/components/AboutContentRenderer";
import type { ContentBlock } from "@/components/AboutContentEditor";
import type { GuidelineItem } from "@/pages/SettingsPrograms";
import { FileText } from "lucide-react";
import { FirefliesLayer } from "@/components/FirefliesLayer";
import { useTheme } from "@/contexts/ThemeContext";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Building2, UtensilsCrossed, Home, Factory, Trees, Recycle, Award, Star, ClipboardCheck,
};

/** Backward compat: convert old string[] to GuidelineItem[] */
function normalizeGuidelines(raw: unknown): GuidelineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item === "string") return { title: item, files: [] };
    if (item && typeof item === "object" && "title" in item) {
      return { title: String((item as any).title), files: Array.isArray((item as any).files) ? (item as any).files : [] };
    }
    return { title: "", files: [] };
  });
}

export default function ProgramDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const glassCard = {
    background: "var(--glass-bg)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    boxShadow: "var(--glass-shadow)",
    border: "1px solid var(--glass-border)",
  } as React.CSSProperties;

  const { data: program, isLoading } = useQuery({
    queryKey: ["program", slug],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}programs/${slug}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch program");
      const data = await res.json();
      return { ...data, about: (data.about as ContentBlock[]) ?? [], guidelines: normalizeGuidelines(data.guidelines), reports: normalizeGuidelines(data.reports) };
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return <PageLoading />;
  }

  if (!program) {
    return (
      <div className="relative min-h-screen">
        <img src={isDark ? nightBg : natureBg} alt="" className="fixed inset-0 w-full h-full object-cover pointer-events-none select-none" style={{ zIndex: 0, filter: isDark ? "brightness(0.6) saturate(0.8)" : "brightness(1.05) saturate(1.3)" }} />
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0, background: isDark ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.1)" }} />
        <FirefliesLayer />
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen gap-4">
          <p className="text-muted-foreground">ไม่พบข้อมูลโครงการ</p>
          <Button 
            variant="outline" 
            onClick={() => navigate("/")}
            className="rounded-full px-6 transition-all hover:scale-105"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> กลับหน้าหลัก
          </Button>
        </div>
      </div>
    );
  }

  const IconComp = iconMap[program.icon] ?? Building2;

  return (
    <div className="relative min-h-screen">
      {/* Background */}
      <img src={isDark ? nightBg : natureBg} alt="" className="fixed inset-0 w-full h-full object-cover pointer-events-none select-none transition-opacity duration-500" style={{ zIndex: 0, filter: isDark ? "brightness(0.6) saturate(0.8)" : "brightness(1.05) saturate(1.3)" }} />
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0, background: isDark ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.1)" }} />
      <FirefliesLayer />

      {/* Content */}
      <div className="relative z-10 flex flex-col gap-4 p-6 max-w-screen-2xl mx-auto">
        <Button 
          variant="ghost" 
          className="self-start px-4 py-2 rounded-full transition-all duration-300 hover:scale-105 active:scale-95 shadow-md group border border-white/20 bg-white/20 backdrop-blur-md text-foreground/90 hover:bg-white/30 hover:text-foreground" 
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" /> 
          <span className="font-medium">กลับหน้าหลัก</span>
        </Button>

        {/* Hero card */}
        <div className="relative overflow-hidden rounded-2xl p-8 sm:p-10" style={glassCard}>
          <img src={gLogo} alt="" className="absolute right-6 top-1/2 -translate-y-1/2 h-[160px] w-[160px] sm:h-[200px] sm:w-[200px] object-contain opacity-40 pointer-events-none select-none mix-blend-multiply dark:mix-blend-luminosity" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "#3a7d2c" }}>
              <IconComp className="h-7 w-7 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold break-words" style={{ color: "var(--green-heading)" }}>{program.name}</h1>
              <p className="text-muted-foreground mt-1 text-sm break-words">{program.description}</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="about" className="w-full">
          <TabsList className="w-full sm:w-auto" style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}>
            <TabsTrigger value="about" className="flex-1 sm:flex-none">เกี่ยวกับโครงการ</TabsTrigger>
            <TabsTrigger value="guidelines" className="flex-1 sm:flex-none">แนวทางการดำเนินงาน</TabsTrigger>
            <TabsTrigger value="reports" className="flex-1 sm:flex-none">รายงาน</TabsTrigger>
          </TabsList>

          <TabsContent value="about" className="mt-3">
            <div className="rounded-2xl p-5" style={glassCard}>
              <h2 className="font-bold mb-4 break-words" style={{ color: "var(--green-heading)" }}>เกี่ยวกับโครงการ {program.name}</h2>
              <AboutContentRenderer blocks={program.about} />
            </div>
          </TabsContent>

          <TabsContent value="guidelines" className="mt-3">
            <div className="rounded-2xl p-5" style={glassCard}>
              <h2 className="font-bold mb-4" style={{ color: "var(--green-heading)" }}>แนวทางการดำเนินงาน</h2>
              <ul className="space-y-4">
                {program.guidelines.map((g, i) => (
                  <li key={i} className="space-y-1.5">
                    <div className="flex items-start gap-3 font-medium text-foreground">
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-accent shrink-0" />
                      <span>{g.title}</span>
                    </div>
                    {g.files.length > 0 && (
                      <div className="ml-5 space-y-1">
                        {g.files.map((file, fi) => (
                          <a key={fi} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                            <FileText className="h-3.5 w-3.5 shrink-0" />
                            <span className="underline">{file.name}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="mt-3">
            <div className="rounded-2xl p-5" style={glassCard}>
              <h2 className="font-bold mb-4" style={{ color: "var(--green-heading)" }}>รายงาน</h2>
              {program.reports.length === 0 ? (
                <p className="text-muted-foreground">ยังไม่มีรายงาน</p>
              ) : (
                <ul className="space-y-4">
                  {program.reports.map((r, i) => (
                    <li key={i} className="space-y-1.5">
                      <div className="flex items-start gap-3 font-medium text-foreground">
                        <span className="mt-1.5 h-2 w-2 rounded-full bg-accent shrink-0" />
                        <span>{r.title}</span>
                      </div>
                      {r.files.length > 0 && (
                        <div className="ml-5 space-y-1">
                          {r.files.map((file, fi) => (
                            <a key={fi} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                              <FileText className="h-3.5 w-3.5 shrink-0" />
                              <span className="underline">{file.name}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
