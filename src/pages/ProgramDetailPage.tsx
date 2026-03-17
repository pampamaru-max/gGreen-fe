import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, UtensilsCrossed, Home, Factory, Trees, Recycle, Award, Star, ClipboardCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import gLogo from "@/assets/g-logo.png";
import AboutContentRenderer from "@/components/AboutContentRenderer";
import type { ContentBlock } from "@/components/AboutContentEditor";
import type { GuidelineItem } from "@/pages/SettingsPrograms";
import { FileText } from "lucide-react";

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
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">ไม่พบข้อมูลโครงการ</p>
        <Button variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> กลับหน้าหลัก
        </Button>
      </div>
    );
  }

  const IconComp = iconMap[program.icon] ?? Building2;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      <Button variant="ghost" className="self-start -ml-2" onClick={() => navigate("/")}>
        <ArrowLeft className="mr-2 h-4 w-4" /> กลับหน้าหลัก
      </Button>

      <div className="relative overflow-hidden rounded-2xl border border-border/60 p-8 sm:p-10" style={{ backgroundColor: '#dfe8e6' }}>
        <img src={gLogo} alt="" className="absolute right-6 top-1/2 -translate-y-1/2 h-[160px] w-[160px] sm:h-[200px] sm:w-[200px] object-contain opacity-60 pointer-events-none select-none mix-blend-multiply" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-accent/15 flex items-center justify-center shrink-0">
            <IconComp className="h-7 w-7 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{program.name}</h1>
            <p className="text-muted-foreground mt-1">{program.description}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="about" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="about" className="flex-1 sm:flex-none">เกี่ยวกับโครงการ</TabsTrigger>
          <TabsTrigger value="guidelines" className="flex-1 sm:flex-none">แนวทางการดำเนินงาน</TabsTrigger>
          <TabsTrigger value="reports" className="flex-1 sm:flex-none">รายงาน</TabsTrigger>
        </TabsList>

        <TabsContent value="about" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">เกี่ยวกับโครงการ {program.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <AboutContentRenderer blocks={program.about} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guidelines" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">แนวทางการดำเนินงาน</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {program.guidelines.map((g, i) => (
                  <li key={i} className="space-y-1.5">
                    <div className="flex items-start gap-3 text-sm font-medium text-foreground">
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-accent shrink-0" />
                      <span>{g.title}</span>
                    </div>
                    {g.files.length > 0 && (
                      <div className="ml-5 space-y-1">
                        {g.files.map((file, fi) => (
                          <a
                            key={fi}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <FileText className="h-3.5 w-3.5 shrink-0" />
                            <span className="underline">{file.name}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">รายงาน</CardTitle>
            </CardHeader>
            <CardContent>
              {program.reports.length === 0 ? (
                <p className="text-sm text-muted-foreground">ยังไม่มีรายงาน</p>
              ) : (
                <ul className="space-y-4">
                  {program.reports.map((r, i) => (
                    <li key={i} className="space-y-1.5">
                      <div className="flex items-start gap-3 text-sm font-medium text-foreground">
                        <span className="mt-1.5 h-2 w-2 rounded-full bg-accent shrink-0" />
                        <span>{r.title}</span>
                      </div>
                      {r.files.length > 0 && (
                        <div className="ml-5 space-y-1">
                          {r.files.map((file, fi) => (
                            <a
                              key={fi}
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
