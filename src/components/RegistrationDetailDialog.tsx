import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Upload, FileText, Trash2, Loader2, Download, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

interface Registration {
  id: string;
  program_id: string;
  organization_name: string;
  organization_type: string;
  address: string;
  province: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  status: string;
  created_at: string;
}

interface DocumentTemplate {
  id: string;
  name: string;
  is_required: boolean;
  sample_file_url: string | null;
  sample_file_name: string | null;
  sort_order: number;
}

interface RegistrationDocument {
  id: string;
  document_template_id: string;
  file_name: string;
  file_url: string;
  file_path: string;
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

  useEffect(() => {
    if (!registration) return;
    setLoading(true);
    Promise.all([
      supabase
        .from("document_templates")
        .select("*")
        .eq("program_id", registration.program_id)
        .order("sort_order"),
      supabase
        .from("registration_documents")
        .select("*")
        .eq("registration_id", registration.id),
    ]).then(([tplRes, docRes]) => {
      setTemplates(tplRes.data ?? []);
      setDocuments(docRes.data ?? []);
      setLoading(false);
    });
  }, [registration]);

  const getDocForTemplate = (templateId: string) =>
    documents.find((d) => d.document_template_id === templateId);

  const handleUpload = async (templateId: string, file: File) => {
    if (!registration) return;
    setUploading((prev) => ({ ...prev, [templateId]: true }));

    const sanitized = sanitizeFileName(file.name);
    const filePath = `${registration.id}/${templateId}/${Date.now()}_${sanitized}`;

    const { error: uploadError } = await supabase.storage
      .from("registration-documents")
      .upload(filePath, file, { cacheControl: "3600" });

    if (uploadError) {
      toast.error("อัปโหลดไฟล์ไม่สำเร็จ: " + uploadError.message);
      setUploading((prev) => ({ ...prev, [templateId]: false }));
      return;
    }

    const { data: urlData } = supabase.storage
      .from("registration-documents")
      .getPublicUrl(filePath);

    // Remove old doc if exists
    const existing = getDocForTemplate(templateId);
    if (existing) {
      await supabase.storage.from("registration-documents").remove([existing.file_path]);
      await supabase.from("registration_documents").delete().eq("id", existing.id);
    }

    const { data: newDoc, error: insertError } = await supabase
      .from("registration_documents")
      .insert({
        registration_id: registration.id,
        document_template_id: templateId,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_path: filePath,
      })
      .select()
      .single();

    if (insertError) {
      toast.error("บันทึกข้อมูลไม่สำเร็จ: " + insertError.message);
    } else if (newDoc) {
      setDocuments((prev) => [
        ...prev.filter((d) => d.document_template_id !== templateId),
        newDoc,
      ]);
      toast.success("อัปโหลดไฟล์สำเร็จ");
    }

    setUploading((prev) => ({ ...prev, [templateId]: false }));
  };

  const handleDelete = async (doc: RegistrationDocument) => {
    await supabase.storage.from("registration-documents").remove([doc.file_path]);
    await supabase.from("registration_documents").delete().eq("id", doc.id);
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    toast.success("ลบไฟล์สำเร็จ");
  };

  if (!registration) return null;

  const status = statusMap[registration.status] ?? { label: registration.status, variant: "outline" as const };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>รายละเอียดการสมัคร</DialogTitle>
        </DialogHeader>

        {/* Registration Info */}
        <div className="space-y-2 text-sm">
          <DetailRow label="โครงการ" value={programName} />
          <DetailRow label="ชื่อหน่วยงาน" value={registration.organization_name} />
          <DetailRow label="ประเภทองค์กร" value={registration.organization_type} />
          <DetailRow label="ที่อยู่" value={registration.address} />
          <DetailRow label="จังหวัด" value={registration.province} />
          <DetailRow label="ผู้ติดต่อ" value={registration.contact_name} />
          <DetailRow label="โทรศัพท์" value={registration.contact_phone} />
          <DetailRow label="อีเมล" value={registration.contact_email} />
          <div className="flex gap-2 items-center">
            <span className="font-medium text-muted-foreground min-w-[120px]">สถานะ:</span>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <DetailRow
            label="วันที่สมัคร"
            value={new Date(registration.created_at).toLocaleDateString("th-TH", {
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
                const { error } = await supabase
                  .from("project_registrations")
                  .update({ status: "selected" })
                  .eq("id", registration.id);
                if (error) {
                  toast.error("เปลี่ยนสถานะไม่สำเร็จ");
                } else {
                  toast.success("เปลี่ยนสถานะเป็น ผ่านการคัดเลือก");
                  onStatusChange?.(registration.id, "selected");
                }
                setUpdatingStatus(false);
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
                const { error } = await supabase
                  .from("project_registrations")
                  .update({ status: "rejected" })
                  .eq("id", registration.id);
                if (error) {
                  toast.error("เปลี่ยนสถานะไม่สำเร็จ");
                } else {
                  toast.success("เปลี่ยนสถานะเป็น ไม่ผ่านการคัดเลือก");
                  onStatusChange?.(registration.id, "rejected");
                }
                setUpdatingStatus(false);
              }}
            >
              {updatingStatus ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
              ไม่ผ่านการคัดเลือก
            </Button>
          </div>
        </div>

        {/* Document Templates Section */}
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
                        {tpl.is_required && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            จำเป็น
                          </Badge>
                        )}
                      </div>
                      {tpl.sample_file_url && (
                        <a
                          href={tpl.sample_file_url}
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
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline truncate flex-1"
                        >
                          {doc.file_name}
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
                        {tpl.is_required && !doc && (
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
