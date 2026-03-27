import { useEffect, useState, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Upload, FileText, Trash2, Loader2, Download, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/lib/axios";
import { useQuery } from "@tanstack/react-query";

interface Registration {
  id: string;
  programId: string;
  juristicId?: string;
  organizationName: string;
  organizationNameEn: string;
  organizationType: string;
  address: string;
  organizationPhone : string;
  province: string;
  provinceName?: string;
  district: string;
  districtName?: string;
  subdistrict: string;
  subdistrictName?: string;
  postalCode: string;
  mapLink: string;
  latitude: string;
  longitude: string;
  contactName: string;
  contactLastName : string;
  contactPosition : string;
  contactPhone: string;
  contactEmail: string;
  status: string;
  createdAt: string;
}

interface DocumentTemplate {
  id: string;
  name: string;
  isRequired: boolean;
  sampleFileUrl: string | null;
  sampleFileName: string | null;
  sortOrder: number;
}

interface RegistrationDocument {
  id: string;
  documentTemplateId: string;
  fileName: string;
  fileUrl: string;
  filePath: string;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "รอดำเนินการ", variant: "secondary" },
  selected: { label: "ผ่านการคัดเลือก", variant: "default" },
  rejected: { label: "ไม่ผ่านการคัดเลือก", variant: "destructive" },
};

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

interface Props {
  registration: Registration | null;
  programName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange?: (id: string, newStatus: string) => void;
}

export default function RegistrationDetailDialog({ registration, programName, open, onOpenChange, onStatusChange }: Props) {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [documents, setDocuments] = useState<RegistrationDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { data: provinces = [] } = useQuery({
    queryKey: ["provinces"],
    queryFn: async () => {
      const { data } = await apiClient.get("provinces");
      return data ?? [];
    },
    enabled: open,
  });

  const provinceDisplay = useMemo(() => {
    if (!registration) return "-";
    if (registration.provinceName) return registration.provinceName;
    const found = provinces.find((p: any) => String(p.code) === registration.province);
    return found ? `${found.name}` : registration.province;
  }, [registration, provinces]);

  useEffect(() => {
    if (!registration) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [tplRes, docRes] = await Promise.all([
          apiClient.get("document-templates", { params: { programId: registration.programId } }),
          apiClient.get("registration-documents", { params: { registrationId: registration.id } }),
        ]);
        setTemplates(tplRes.data ?? []);
        const mappedDocs = (docRes.data ?? []).map((d: any) => ({
          id: d.id,
          documentTemplateId: d.documentTemplateId,
          fileName: d.fileName,
          fileUrl: d.fileUrl,
          filePath: d.filePath,
        }));
        setDocuments(mappedDocs);
      } catch (error) {
        console.error("Error fetching registration details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [registration]);

  const getDocForTemplate = (templateId: string) =>
    documents.find((d) => d.documentTemplateId === templateId);

  const handleUpload = async (templateId: string, file: File) => {
    if (!registration) return;
    setUploading((prev) => ({ ...prev, [templateId]: true }));

    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data: newDoc } = await apiClient.post(
        `registration-documents?registrationId=${registration.id}&documentTemplateId=${templateId}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      setDocuments((prev) => [
        ...prev.filter((d) => d.documentTemplateId !== templateId),
        {
          id: newDoc.id,
          documentTemplateId: newDoc.documentTemplateId,
          fileName: newDoc.fileName,
          fileUrl: newDoc.fileUrl,
          filePath: newDoc.filePath,
        },
      ]);
      toast.success("อัปโหลดไฟล์สำเร็จ");
    } catch (err: any) {
      toast.error("อัปโหลดไฟล์ไม่สำเร็จ: " + (err.response?.data?.message ?? err.message));
    } finally {
      setUploading((prev) => ({ ...prev, [templateId]: false }));
    }
  };

  const handleDelete = async (doc: RegistrationDocument) => {
    try {
      await apiClient.delete(`registration-documents/${doc.id}`);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      toast.success("ลบไฟล์สำเร็จ");
    } catch (err: any) {
      toast.error("ลบไฟล์ไม่สำเร็จ: " + (err.response?.data?.message ?? err.message));
    }
  };

  if (!registration) return null;

  const status = statusMap[registration.status] ?? { label: registration.status, variant: "outline" as const };

  const getDownloadUrl = (id: string,fileName: string | null) =>{
    const base = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5001/api/").replace(/\/$/, "");
    return `${base}/document-templates/${id}/download/${encodeURIComponent(fileName ?? "")}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>รายละเอียดการสมัคร</DialogTitle>
        </DialogHeader>

        {/* Registration Info */}
        <div className="space-y-2 text-sm">
          <DetailRow label="โครงการ" value={programName} />
          {registration.juristicId && (
            <DetailRow label="เลขทะเบียนนิติบุคคล" value={registration.juristicId} />
          )}
          <DetailRow label="ชื่อหน่วยงาน (ไทย)" value={registration.organizationName} />
          <DetailRow label="ชื่อหน่วยงาน (อังกฤษ)" value={registration.organizationNameEn} />
          <DetailRow label="ประเภทองค์กร" value={registration.organizationType} />
          <DetailRow label="ที่อยู่" value={registration.address} />
          <DetailRow label="โทรศัพท์หน่วยงาน" value={registration.organizationPhone} />
          <DetailRow label="จังหวัด" value={provinceDisplay} />
          <DetailRow label="อำเภอ/เขต" value={registration.districtName || registration.district} />
          <DetailRow label="ตำบล/แขวง" value={registration.subdistrictName || registration.subdistrict} />
          <DetailRow label="รหัสไปรษณีย์" value={registration.postalCode} />
          {registration.mapLink && (
            <div className="flex gap-2">
              <span className="font-medium text-muted-foreground min-w-[120px]">Link แผนที่:</span>
              <a href={registration.mapLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                {registration.mapLink}
              </a>
            </div>
          )}
          {(registration.latitude || registration.longitude) && (
            <DetailRow label="พิกัด" value={`${registration.latitude || "-"}, ${registration.longitude || "-"}`} />
          )}
          <Separator className="my-2" />
          <DetailRow label="ผู้ติดต่อ" value={[registration.contactName, registration.contactLastName].filter(Boolean).join(" ")} />
          <DetailRow label="ตำแหน่ง" value={registration.contactPosition} />
          <DetailRow label="โทรศัพท์" value={registration.contactPhone} />
          <DetailRow label="อีเมล" value={registration.contactEmail} />
          <div className="flex gap-2 items-center">
            <span className="font-medium text-muted-foreground min-w-[120px]">สถานะ:</span>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <DetailRow
            label="วันที่สมัคร"
            value={new Date(registration.createdAt).toLocaleDateString("th-TH", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          />
        </div>

        <Separator className="my-4" />

        {/* Status Change Buttons */}
        <div>
          <h3 className="text-sm font-semibold mb-3">เปลี่ยนสถานะ</h3>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={updatingStatus || registration.status === "selected"}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={async () => {
                setUpdatingStatus(true);
                try {
                  await apiClient.patch(`project-registrations/${registration.id}/status`, { status: "selected" });
                  toast.success("เปลี่ยนสถานะเป็น ผ่านการคัดเลือก");
                  onStatusChange?.(registration.id, "selected");
                } catch (error) {
                  toast.error("เปลี่ยนสถานะไม่สำเร็จ");
                } finally {
                  setUpdatingStatus(false);
                }
              }}
            >
              {updatingStatus ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
              ผ่านการคัดเลือก
            </Button>
            <Button
              size="sm"
              disabled={updatingStatus || registration.status === "rejected"}
              variant="destructive"
              onClick={async () => {
                setUpdatingStatus(true);
                try {
                  await apiClient.patch(`project-registrations/${registration.id}/status`, { status: "rejected" });
                  toast.success("เปลี่ยนสถานะเป็น ไม่ผ่านการคัดเลือก");
                  onStatusChange?.(registration.id, "rejected");
                } catch (error) {
                  toast.error("เปลี่ยนสถานะไม่สำเร็จ");
                } finally {
                  setUpdatingStatus(false);
                }
              }}
            >
              {updatingStatus ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
              ไม่ผ่านการคัดเลือก
            </Button>
          </div>
        </div>

        {/* Document Templates Section */}
        <Separator className="my-4" />
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            เอกสารการสมัคร
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              ยังไม่มีรายการเอกสารสำหรับโครงการนี้
            </p>
          ) : (
            <div className="space-y-3">
              {templates.map((tpl, idx) => {
                const doc = getDocForTemplate(tpl.id);
                const isUploading = uploading[tpl.id];

                return (
                  <div
                    key={tpl.id}
                    className="border rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          {idx + 1}.
                        </span>
                        <span className="text-sm font-medium">{tpl.name}</span>
                        {tpl.isRequired && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            จำเป็น
                          </Badge>
                        )}
                      </div>
                      {tpl.sampleFileUrl && (
                        <a
                          href={getDownloadUrl(tpl.id, tpl.sampleFileName)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0"
                        >
                          <Download className="h-3 w-3" />
                          ตัวอย่าง
                        </a>
                      )}
                    </div>

                    {doc ? (
                      <div className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline truncate flex-1"
                        >
                          {doc.fileName}
                        </a>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(doc)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          ref={(el) => { fileInputRefs.current[tpl.id] = el; }}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUpload(tpl.id, file);
                            e.target.value = "";
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          disabled={isUploading}
                          onClick={() => fileInputRefs.current[tpl.id]?.click()}
                        >
                          {isUploading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                          ) : (
                            <Upload className="h-3.5 w-3.5 mr-1" />
                          )}
                          อัปโหลดไฟล์
                        </Button>
                        {tpl.isRequired && !doc && (
                          <span className="text-[11px] text-destructive flex items-center gap-1 mt-1">
                            <AlertCircle className="h-3 w-3" />
                            ยังไม่ได้แนบเอกสาร
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="font-medium text-muted-foreground min-w-[120px]">{label}:</span>
      <span className="text-foreground">{value || "-"}</span>
    </div>
  );
}
