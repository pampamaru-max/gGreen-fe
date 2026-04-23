import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/axios";
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { findScoringLevelMatch } from "@/helpers/functions";
import { ScoringLevelType } from "./SettingsScoringCriteria";

interface Template {
  id: number;
  title: string;
  subtitle: string;
  bodyText: string;
  footerText: string;
  signerName: string;
  signerTitle: string;
  bgImageUrl: string | null;
  logoUrl: string | null;
  primaryColor: string;
  orientation?: string;
  layout?: any[];
}

interface ScoringLevel {
  name: string;
  color: string;
  template: Template | null;
}

function formatThaiDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    calendar: "buddhist",
  } as Intl.DateTimeFormatOptions);
}

interface CertificateData {
  evaluationId: string;
  year: number;
  programName: string;
  organizationName: string;
  province: string;
  startDate: string | null;
  endDate: string | null;
  result: {
    totalScore: number;
    totalMaxScore: number;
    normalLevel: ScoringLevel | null;
    specialLevel: ScoringLevel | null;
  } | null;
}

export default function PrintCertificate() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = useQuery<CertificateData>({
    queryKey: ["certificate-data", id],
    queryFn: async () => {
      const res = await apiClient.get(`evaluation/${id}/certificate`);
      let certData = res.data;

      // If results are missing levels, try to trigger a calculation once
      if (certData?.result && !certData.result.normalLevel && !certData.result.specialLevel) {
        try {
          await apiClient.post(`evaluation/${id}/calculate`);
          const retryRes = await apiClient.get(`evaluation/${id}/certificate`);
          certData = retryRes.data;
        } catch (e) {
          console.error("Auto-calculation failed:", e);
        }
      }

      // If levels are still missing, try manual matching (especially for Yes/No programs)
      if (certData?.result && !certData.result.normalLevel && !certData.result.specialLevel) {
        try {
          const isYesNoProgram = certData.result.totalScore === 0 && certData.result.totalMaxScore === 0;
          const [evalRes, levelsRes, templatesRes] = await Promise.all([
            isYesNoProgram ? apiClient.get(`evaluation/${id}`) : Promise.resolve(null),
            apiClient.get("scoring-levels"),
            apiClient.get("certificate-templates"),
          ]);

          const allLevels: any[] = levelsRes.data || [];
          const allTemplates: any[] = templatesRes.data || [];

          if (isYesNoProgram && evalRes?.data) {
            const scores: any[] = evalRes.data.evaluationScores ?? [];
            const passCount = scores.filter(s => Number(s.committeeScore) === 1).length;
            const totalIndicators = scores.length;
            const passPct = totalIndicators > 0 ? (passCount === totalIndicators ? 100 : Math.floor((passCount / totalIndicators) * 100)) : 0;
            
            // Try to match level using passPct
            const programLevels = allLevels.filter(l => l.programId === evalRes.data.programId);
            const matched = findScoringLevelMatch(programLevels, ScoringLevelType.new, passPct, 0, true);
            
            if (matched) {
              // Find template for this level or program
              const templateData = allTemplates.find(t => {
                const tProgId = t.programId || t.program_id;
                const tNormId = t.normalLevelId || t.normal_level_id;
                const tSpecId = t.specialLevelId || t.special_level_id;
                return (tProgId && String(tProgId) === String(evalRes.data.programId)) || 
                       (tNormId && Number(tNormId) === Number(matched.id)) ||
                       (tSpecId && Number(tSpecId) === Number(matched.id));
              });

              certData.result.normalLevel = {
                name: matched.name,
                color: matched.color,
                template: templateData ? {
                  id: templateData.id,
                  title: templateData.title,
                  subtitle: templateData.subtitle,
                  bodyText: templateData.bodyText || templateData.body_text,
                  footerText: templateData.footerText || templateData.footer_text,
                  signerName: templateData.signerName || templateData.signer_name,
                  signerTitle: templateData.signerTitle || templateData.signer_title,
                  bgImageUrl: templateData.bgImageUrl || templateData.bg_image_url,
                  logoUrl: templateData.logoUrl || templateData.logo_url,
                  primaryColor: templateData.primaryColor || templateData.primary_color,
                  orientation: templateData.orientation,
                  layout: templateData.layout,
                } : null
              };
            }
          }
        } catch (e) {
          console.error("Manual level matching failed:", e);
        }
      }

      return certData;
    },
    enabled: !!id,
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-slate-500 font-medium">กำลังเตรียมข้อมูลใบประกาศ...</p>
      </div>
    );
  }

  if (error || !data || !data.result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4 text-center">
        <div className="bg-amber-50 text-amber-600 p-8 rounded-3xl border border-amber-100 max-w-xl shadow-sm">
          <h2 className="text-2xl font-bold mb-4">ไม่พบข้อมูลใบประกาศ</h2>
          <div className="space-y-3 text-sm opacity-90 text-left list-disc pl-5">
            <p>อาจเกิดจากสาเหตุ ดังนี้:</p>
            <ul className="list-disc space-y-1">
              <li>ยังไม่ได้มีการคำนวณผลการประเมิน หรือคะแนนยังไม่ถูกสรุป</li>
              <li>ไม่พบรหัสการประเมินที่ระบุ</li>
            </ul>
          </div>
        </div>
        <Button onClick={() => window.close()} variant="outline" className="rounded-xl">
          ปิดหน้าต่าง
        </Button>
      </div>
    );
  }

  const scoringLevel = data.result.specialLevel ?? data.result.normalLevel;

  if (!scoringLevel) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4 text-center">
        <div className="bg-amber-50 text-amber-600 p-8 rounded-3xl border border-amber-100 max-w-xl shadow-sm">
          <h2 className="text-2xl font-bold mb-4">ไม่พบระดับรางวัล</h2>
          <div className="space-y-3 text-sm opacity-90 text-left list-disc pl-5">
            <p>อาจเกิดจากสาเหตุ ดังนี้:</p>
            <ul className="list-disc space-y-1">
              <li>ยังไม่ได้มีการคำนวณผลการประเมิน หรือคะแนนยังไม่ถูกสรุป</li>
              <li>คะแนนที่ได้ไม่ตรงกับช่วงคะแนนของระดับรางวัลใดๆ ({Math.round(((data.result.totalScore || 0) / (data.result.totalMaxScore || 1)) * 100)}%)</li>
            </ul>
          </div>
        </div>
        <Button onClick={() => window.close()} variant="outline" className="rounded-xl">
          ปิดหน้าต่าง
        </Button>
      </div>
    );
  }

  const levelName = scoringLevel.name;
  
  // Use template from DB or fallback to default
  const template = scoringLevel.template || {
    id: 0,
    title: "ใบประกาศนียบัตร",
    subtitle: `โครงการ ${data.programName}`,
    bodyText: "ขอมอบใบประกาศนียบัตรฉบับนี้ให้แก่",
    footerText: "กรมการเปลี่ยนแปลงสภาพภูมิอากาศและสิ่งแวดล้อม",
    signerName: "",
    signerTitle: "",
    bgImageUrl: null,
    logoUrl: null,
    primaryColor: scoringLevel.color || "#1a5632",
    orientation: "landscape",
    layout: [],
  };

  const isPortrait = template.orientation === "portrait";
  const rawLayout = typeof template.layout === "string"
    ? (() => { try { return JSON.parse(template.layout as string); } catch { return []; } })()
    : template.layout;
  
  let layout: any[] = [];
  if (Array.isArray(rawLayout)) {
    layout = rawLayout;
  } else if (rawLayout && typeof rawLayout === "object") {
    layout = rawLayout[isPortrait ? "portrait" : "landscape"] || [];
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center py-10 print:py-0 print:bg-white">
      {/* Actions Bar - Hidden on print */}
      <div className="mb-8 flex items-center gap-4 print:hidden">
        <Button onClick={handlePrint} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Printer className="h-4 w-4" />
          พิมพ์ใบประกาศ
        </Button>
        <Button onClick={() => window.close()} variant="outline">
          ปิด
        </Button>
      </div>

      {/* Certificate Paper */}
      <div 
        id="certificate-paper"
        className="certificate-paper relative bg-white shadow-2xl overflow-hidden flex flex-col items-center justify-center text-center print:shadow-none print:m-0"
        style={{
          width: isPortrait ? "210mm" : "297mm",
          height: isPortrait ? "297mm" : "210mm",
          backgroundImage: template.bgImageUrl ? `url(${template.bgImageUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Overlay if there is a background image to ensure readability */}
        {template.bgImageUrl && (
          <div className="absolute inset-0 bg-white/70 pointer-events-none" />
        )}

        {/* Inner Border */}
        <div className="absolute inset-4 border border-slate-200 pointer-events-none" />

        {/* Render Layout Elements if exists, else fallback to Legacy */}
        {layout && layout.length > 0 ? (
          <div className="relative w-full h-full">
            {layout.map((el: any) => (
              <div
                key={el.id}
                className="absolute"
                style={{
                  left: `${el.x}%`,
                  top: `${el.y}%`,
                  width: (el.width && el.width > 0) ? `${el.width}%` : "auto",
                  minWidth: el.type === "image" ? undefined : "max-content",
                  maxWidth: (el.width && el.width > 0) ? undefined : "90%",
                  height: el.height ? `${el.height}%` : undefined,
                  fontSize: el.fontSize ? `${el.fontSize}px` : undefined,
                  fontWeight: el.fontWeight === "bold" ? "800" : "400",
                  color: el.color || template.primaryColor,
                  textAlign: el.textAlign || "center",
                  transform: "translate(-50%, -50%)",
                  fontFamily: el.fontFamily ? `'${el.fontFamily}', sans-serif` : "'Sarabun', sans-serif",
                }}
              >
                {el.type === "image" && <img src={el.content} alt="Logo" className="w-full h-full object-contain" />}
                {el.type === "text" && <span className="break-words block w-full">{el.content}</span>}
                {el.type === "variable" && (
                  <span className="break-words block w-full">
                    {el.content === "{recipient}" ? data.organizationName :
                     el.content === "{level}" ? `ระดับ ${levelName}` :
                     el.content === "{year}" ? data.year :
                     el.content === "{signer_name}" ? template.signerName :
                     el.content === "{signer_title}" ? template.signerTitle :
                     el.content === "{start_date}" ? formatThaiDate(data.startDate) :
                     el.content === "{end_date}" ? formatThaiDate(data.endDate) :
                     el.content}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="relative z-10 flex flex-col items-center w-full h-full justify-center gap-10 py-12 px-16">
            {/* Legacy Header */}
            <div className="flex flex-col items-center gap-4">
              {template.logoUrl && (
                <img 
                  src={template.logoUrl} 
                  alt="Logo" 
                  className="h-24 w-24 object-contain" 
                />
              )}
              <div className="space-y-1">
                <h1 
                  className="text-5xl font-bold tracking-tight"
                  style={{ color: template.primaryColor }}
                >
                  {template.title}
                </h1>
                {template.subtitle && (
                  <p className="text-xl text-slate-600 font-medium">
                    {template.subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Legacy Body */}
            <div className="flex flex-col items-center gap-6 w-full max-w-4xl">
              <p className="text-xl text-slate-700">
                {template.bodyText}
              </p>
              
              <div className="flex flex-col items-center gap-2">
                <h2 
                  className="text-4xl font-bold border-b-2 px-12 pb-2 mb-2"
                  style={{ borderColor: template.primaryColor, color: template.primaryColor }}
                >
                  {data.organizationName}
                </h2>
                {data.province && (
                  <p className="text-lg text-slate-800 font-medium">
                    จังหวัด{data.province}
                  </p>
                )}
              </div>

              <div 
                className="px-8 py-3 rounded-full text-white text-xl font-bold shadow-sm"
                style={{ backgroundColor: template.primaryColor }}
              >
                ระดับ {levelName}
              </div>

              <p className="text-2xl font-bold text-slate-800 -mt-4">
                ประจำปี {data.year}
              </p>

              <p className="text-xl text-slate-800 font-medium max-w-prose">
                {template.footerText}
              </p>
            </div>

            {/* Legacy Signer */}
            {template.signerName && (
              <div className="flex flex-col items-center mt-4">
                <div className="w-64 border-b border-slate-300 mb-4" />
                <p className="text-xl font-bold text-slate-800">
                  {template.signerName}
                </p>
                {template.signerTitle && (
                  <p className="text-base text-slate-600">
                    {template.signerTitle}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          @page {
            size: A4 ${isPortrait ? "portrait" : "landscape"};
            margin: 0;
          }
          .certificate-paper {
            width: ${isPortrait ? "210mm" : "297mm"} !important;
            height: ${isPortrait ? "297mm" : "210mm"} !important;
            box-shadow: none !important;
            margin: 0 !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
        .certificate-paper {
          font-family: 'Sarabun', sans-serif;
        }
      `}} />
    </div>
  );
}
