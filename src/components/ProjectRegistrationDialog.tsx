import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2,
  UserPlus,
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  Check,
  ChevronsUpDown,
  Globe,
  Map,
  Briefcase,
  FileText,
  Upload,
  Trash2,
  Download,
  AlertCircle,
  Hash,
  Eye,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/axios";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { AlertActionPopup } from "./AlertActionPopup";
import { MAX_FILE_SIZE, MAX_FILE_SIZE_MB } from "@/helpers/constants";
import { BackToTopButton } from "./BackToTopButton";

interface DocumentTemplate {
  id: string;
  name: string;
  isRequired: boolean;
  sampleFileUrl: string | null;
  sampleFileName: string | null;
  sortOrder: number;
}

const BANNED_FILE_EXTENSIONS = [".zip", ".rar", ".7z", ".tar", ".gz", ".bz2"];
const BANNED_FILE_MIME_TYPES = [
  "application/zip",
  "application/x-zip-compressed",
  "application/x-zip",
  "multipart/x-zip",
  "application/x-rar-compressed",
  "application/vnd.rar",
  "application/x-7z-compressed",
  "application/gzip",
  "application/x-tar",
];

const registrationSchema = z.object({
  program_id: z.string().min(1, "กรุณาเลือกโครงการ"),
  juristic_id: z.string().trim().min(1, "กรุณาระบุเลขทะเบียนนิติบุคคล"),
  branch_number: z.string().trim().optional(),
  organization_name: z
    .string()
    .trim()
    .min(1, "กรุณาระบุชื่อหน่วยงาน (ไทย)")
    .max(200),
  organization_name_en: z
    .string()
    .trim()
    .min(1, "กรุณาระบุชื่อหน่วยงาน (อังกฤษ)"),
  organization_type: z
    .string()
    .trim()
    .min(1, "กรุณาระบุประเภทหน่วยงาน")
    .max(100),
  address: z.string().trim().min(1, "กรุณาระบุที่อยู่").max(500),
  organization_phone: z
    .string()
    .trim()
    .min(1, "กรุณาระบุเบอร์โทรศัพท์หน่วยงาน"),
  province: z.string().trim().min(1, "กรุณาระบุจังหวัด").max(100),
  district: z.string().trim().min(1, "กรุณาระบุอำเภอ/เขต"),
  subdistrict: z.string().trim().min(1, "กรุณาระบุตำบล/แขวง"),
  postal_code: z.string().trim().optional(),
  map_link: z.string().trim().optional(),
  latitude: z.string().trim().min(1, "กรุณาระบุละติจูด"),
  longitude: z.string().trim().min(1, "กรุณาระบุลองจิจูด"),
  contact_name: z.string().trim().min(1, "กรุณาระบุชื่อผู้ติดต่อ").max(100),
  contact_last_name: z.string().trim().optional(),
  contact_position: z.string().trim().optional(),
  contact_phone: z.string().trim().min(1, "กรุณาระบุเบอร์โทรศัพท์").max(20),
  contact_email: z
    .string()
    .trim()
    .email("รูปแบบอีเมลไม่ถูกต้อง")
    .max(255)
    .optional()
    .or(z.literal("")),
});

type RegistrationForm = z.infer<typeof registrationSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProjectRegistrationDialog({
  open,
  onOpenChange,
}: Props) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [provinceOpen, setProvinceOpen] = useState(false);
  const [districtOpen, setDistrictOpen] = useState(false);
  const [subdistrictOpen, setSubdistrictOpen] = useState(false);
  const [juristicExists, setJuristicExists] = useState(false);
  const [juristicChecking, setJuristicChecking] = useState(false);
  const [branchExists, setBranchExists] = useState(false);
  const [branchChecking, setBranchChecking] = useState(false);
  const juristicDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const branchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});
  const [uploadingMap, setUploadingMap] = useState<Record<string, number>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const formContentRef = useRef<HTMLDivElement | null>(null);

  const { data: programs = [] } = useQuery({
    queryKey: ["programs"],
    queryFn: async () => {
      const { data } = await apiClient.get("programs/names");
      return data ?? [];
    },
  });

  const { data: provinces = [] } = useQuery({
    queryKey: ["provinces"],
    queryFn: async () => {
      const { data } = await apiClient.get("provinces");
      return data ?? [];
    },
  });

  const form = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      program_id: "",
      juristic_id: "",
      branch_number: "",
      organization_name: "",
      organization_name_en: "",
      organization_type: "",
      address: "",
      organization_phone: "",
      province: "",
      district: "",
      subdistrict: "",
      postal_code: "",
      map_link: "",
      latitude: "",
      longitude: "",
      contact_name: "",
      contact_last_name: "",
      contact_position: "",
      contact_phone: "",
      contact_email: "",
    },
    mode: 'onBlur'
  });

  const selectedProvince = form.watch("province");
  const selectedDistrict = form.watch("district");
  const selectedProgramId = form.watch("program_id");

  useEffect(() => {
    setPendingFiles({});
    if (selectedProgramId) {
      handleBranchChange(
        form.getValues("juristic_id") || "",
        form.getValues("branch_number") || "",
        selectedProgramId
      );
    }
  }, [selectedProgramId]);

  const { data: districts = [] } = useQuery({
    queryKey: ["districts", selectedProvince],
    queryFn: async () => {
      if (!selectedProvince) return [];
      const { data } = await apiClient.get(
        `provinces/${selectedProvince}/districts`,
      );
      return data ?? [];
    },
    enabled: !!selectedProvince,
  });

  const { data: subdistricts = [] } = useQuery({
    queryKey: ["subdistricts", selectedDistrict],
    queryFn: async () => {
      if (!selectedDistrict) return [];
      const { data } = await apiClient.get(
        `provinces/districts/${selectedDistrict}/subdistricts`,
      );
      return data ?? [];
    },
    enabled: !!selectedDistrict,
  });

  const { data: documentTemplates = [], isFetching: isFetchingTemplates } = useQuery<DocumentTemplate[]>({
    queryKey: ["document-templates", selectedProgramId],
    queryFn: async () => {
      if (!selectedProgramId) return [];
      const { data } = await apiClient.get("document-templates", {
        params: { programId: selectedProgramId },
      });
      return data ?? [];
    },
    enabled: !!selectedProgramId,
  });

  const handleJuristicIdChange = (value: string) => {
    if (juristicDebounceRef.current) clearTimeout(juristicDebounceRef.current);
    setJuristicExists(false);
    if (!value.trim()) return;
    setJuristicChecking(true);
    juristicDebounceRef.current = setTimeout(async () => {
      try {
        const { data } = await apiClient.get("project-registrations/check-juristic", {
          params: { juristicId: value.trim() },
        });
        setJuristicExists(data.exists);
      } catch {
        setJuristicExists(false);
      } finally {
        setJuristicChecking(false);
      }
    }, 500);
  };

  const handleBranchChange = (juristicId: string, branchNumber: string, programId: string) => {
    if (branchDebounceRef.current) clearTimeout(branchDebounceRef.current);
    setBranchExists(false);
    if (!branchNumber.trim() || !programId) return;
    setBranchChecking(true);
    branchDebounceRef.current = setTimeout(async () => {
      try {
        const { data } = await apiClient.get("project-registrations/check-branch", {
          params: { juristicId: (juristicId || "").trim(), branchNumber: branchNumber.trim(), programId },
        });
        setBranchExists(data.exists);
      } catch {
        setBranchExists(false);
      } finally {
        setBranchChecking(false);
      }
    }, 500);
  };

  const getDownloadUrl = (id: string, fileName: string | null) => {
    const base = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5001/api/").replace(/\/$/, "");
    return `${base}/document-templates/${id}/download/${encodeURIComponent(fileName ?? "")}`;
  };

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6)
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
  };

  const formatOfficePhone = (value: string = "") => {
    const cleaned = value.replace(/\D/g, "");
    const digits = cleaned.slice(0, 10);

    // เบอร์กรุงเทพ (02)
    if (digits.startsWith("02")) {
      if (digits.length <= 2) return digits;
      if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
      return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    }

    // เบอร์ทั่วไป
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const formatCoordinate = (value: string) => {
    // 1. Remove anything not a number, dot, or minus sign
    let filtered = value.replace(/[^-0-9.]/g, "");

    // 2. Allow minus sign only at the beginning
    if (filtered.includes("-")) {
      const isNegative = filtered.startsWith("-");
      filtered = (isNegative ? "-" : "") + filtered.replace(/-/g, "");
    }

    // 3. Allow only one decimal point
    const parts = filtered.split(".");
    if (parts.length > 2) {
      filtered = parts[0] + "." + parts.slice(1).join("");
    }

    return filtered;
  };

  const onSubmit = async (values: RegistrationForm) => {
    setSubmitting(true);
    try {
      const { data: registration } = await apiClient.post("project-registrations", {
        programId: values.program_id,
        juristicId: values.juristic_id || undefined,
        branchNumber: values.branch_number,
        organizationName: values.organization_name,
        organizationNameEn: values.organization_name_en,
        organizationType: values.organization_type,
        address: values.address,
        organizationPhone: values.organization_phone,
        province: values.province,
        district: values.district,
        subdistrict: values.subdistrict,
        postalCode: values.postal_code,
        mapLink: values.map_link,
        latitude: values.latitude,
        longitude: values.longitude,
        contactName: values.contact_name,
        contactLastName: values.contact_last_name,
        contactPosition: values.contact_position,
        contactPhone: values.contact_phone,
        contactEmail: values.contact_email || undefined,
      });

      // Upload pending documents via BE API
      const uploadEntries = Object.entries(pendingFiles);
      for (const [templateId, file] of uploadEntries) {
        setUploadingMap((prev) => ({ ...prev, [templateId]: 0 }));
        try {
          const formData = new FormData();
          formData.append("file", file);
          await apiClient.post(
            `registration-documents?registrationId=${registration.id}&documentTemplateId=${templateId}`,
            formData,
            {
              headers: { "Content-Type": "multipart/form-data" },
              onUploadProgress: (e) => {
                const pct = e.total ? Math.round((e.loaded / e.total) * 100) : 50;
                setUploadingMap((prev) => ({ ...prev, [templateId]: pct }));
              },
            },
          );
        } catch {
          // Continue uploading other files even if one fails
        }
        setUploadingMap((prev) => { const n = { ...prev }; delete n[templateId]; return n; });
      }

      toast({
        title: "สมัครสำเร็จ",
        description: "ส่งข้อมูลการสมัครเข้าร่วมโครงการเรียบร้อยแล้ว",
        variant: "success",
      });
      form.reset();
      setPendingFiles({});
      setJuristicExists(false);
      setBranchExists(false);
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: err.response?.data?.message ?? err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1100px] max-h-[90vh] overflow-hidden p-0 flex flex-col">
        <div className="px-6 pt-6 pb-3 flex-shrink-0">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg">
                  สมัครเข้าร่วมโครงการ
                </DialogTitle>
                <DialogDescription className="text-sm">
                  กรอกข้อมูลด้านล่างเพื่อสมัครเข้าร่วมโครงการ G-Green
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>
        <div ref={formContentRef} className="overflow-y-auto scrollbar-thin flex-1 px-6 pb-6 mr-2">
          <BackToTopButton containerRef={formContentRef} heightToShow={150} />
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-5 mt-2"
            >
              {/* โครงการ */}
              <FormField
                control={form.control}
                name="program_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5 text-sm font-semibold">
                      <Building2 className="h-4 w-4 text-primary" />{" "}
                      โครงการที่ต้องการสมัคร{" "}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกโครงการ" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {programs.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ข้อมูลหน่วยงาน */}
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  ข้อมูลหน่วยงาน
                </p>
                <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-4">
                  {/* เลขทะเบียนนิติบุคคล และ รหัสสาขา */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="juristic_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5 text-sm font-semibold">
                            <Hash className="h-4 w-4 text-primary" />
                            เลขทะเบียนนิติบุคคล
                            <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="เช่น 0105535000001"
                              {...field}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, "").slice(0, 13);
                                field.onChange(val);
                                handleJuristicIdChange(val);
                                handleBranchChange(val, form.getValues("branch_number"), form.getValues("program_id"));
                              }}
                            />
                          </FormControl>
                          {juristicChecking && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" /> กำลังตรวจสอบ...
                            </p>
                          )}
                          {juristicExists && !juristicChecking && (
                            <p className="text-xs text-amber-600 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              เลขทะเบียนนิติบุคคลนี้มีอยู่แล้วในระบบ
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="branch_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5 text-sm font-semibold">
                            <Hash className="h-4 w-4 text-primary" />
                            รหัสสาขา
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="เช่น 00000"
                              {...field}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, "").slice(0, 5);
                                field.onChange(val);
                                handleBranchChange(form.getValues("juristic_id") || "", val, form.getValues("program_id"));
                              }}
                            />
                          </FormControl>
                          {branchChecking && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" /> กำลังตรวจสอบ...
                            </p>
                          )}
                          {branchExists && !branchChecking && (
                            <p className="text-xs text-amber-500 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              รหัสสาขานี้มีอยู่แล้วในระบบ
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="organization_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          ชื่อหน่วยงาน/สถานประกอบการ (ภาษาไทย){" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="เช่น บริษัท ABC จำกัด"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="organization_name_en"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-primary" />{" "}
                          ชื่อหน่วยงาน/สถานประกอบการ (ภาษาอังกฤษ){" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. ABC Company Limited"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="organization_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          ประเภทหน่วยงาน{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="-- กรุณาเลือก --" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[
                              "หน่วยงาน กส.",
                              "หน่วยงาน สส.",
                              "หน่วยงานภาครัฐ (ส่วนราชการ)",
                              "หน่วยงานภาครัฐ (รัฐวิสาหกิจ)",
                              "หน่วยงานภาครัฐ (องค์กรปกครองส่วนท้องถิ่น)",
                              "หน่วยงานภาครัฐ (องค์การมหาชน)",
                              "ภาคเอกชน",
                              "สถาบันการศึกษา (โรงเรียน)",
                              "สถาบันการศึกษา (มหาวิทยาลัย)",
                              "สถานพยาบาล",
                              "โรงแรม/รีสอร์ท",
                              "ร้านอาหาร/สวนอาหาร",
                              "อื่น ๆ",
                            ].map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-primary" />{" "}
                          ที่อยู่ <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            rows={2}
                            placeholder="ที่อยู่หน่วยงาน"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="organization_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-primary" />{" "}
                          หมายเลขโทรศัพท์หน่วยงาน{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="0x-xxx-xxxx"
                            {...field}
                            onChange={(e) => {
                              const formatted = formatOfficePhone(
                                e.target.value,
                              );
                              field.onChange(formatted);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="province"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>
                          จังหวัด <span className="text-destructive">*</span>
                        </FormLabel>
                        <Popover
                          open={provinceOpen}
                          onOpenChange={setProvinceOpen}
                        >
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={provinceOpen}
                                className={cn(
                                  "w-full justify-between font-normal",
                                  !field.value && "text-muted-foreground",
                                )}
                              >
                                {(() => {
                                  if (!field.value) return "-- เลือกจังหวัด --";
                                  const found = provinces.find(
                                    (p: any) => String(p.code) === field.value,
                                  );
                                  return found ? found.name : field.value;
                                })()}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-[--radix-popover-trigger-width] p-0"
                            align="start"
                          >
                            <Command>
                              <CommandInput placeholder="ค้นหาจังหวัด..." />
                              <CommandList>
                                <CommandEmpty>ไม่พบข้อมูลจังหวัด</CommandEmpty>
                                <CommandGroup>
                                  {provinces.map((province: any) => (
                                    <CommandItem
                                      value={province.name}
                                      key={province.code}
                                      onSelect={() => {
                                        form.setValue(
                                          "province",
                                          String(province.code),
                                        );
                                        form.setValue("district", "");
                                        form.setValue("subdistrict", "");
                                        form.setValue("postal_code", "");
                                        setProvinceOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          String(province.code) === field.value
                                            ? "opacity-100"
                                            : "opacity-0",
                                        )}
                                      />
                                      {province.name}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="district"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>
                            อำเภอ/เขต{" "}
                            <span className="text-destructive">*</span>
                          </FormLabel>
                          <Popover
                            open={districtOpen}
                            onOpenChange={setDistrictOpen}
                          >
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={districtOpen}
                                  disabled={!selectedProvince}
                                  className={cn(
                                    "w-full justify-between font-normal",
                                    !field.value && "text-muted-foreground",
                                  )}
                                >
                                  {(() => {
                                    if (!field.value) return "-- เลือกอำเภอ --";
                                    const found = districts.find(
                                      (d: any) =>
                                        String(d.code) === field.value,
                                    );
                                    return found ? found.name : field.value;
                                  })()}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-[--radix-popover-trigger-width] p-0"
                              align="start"
                            >
                              <Command>
                                <CommandInput placeholder="ค้นหาอำเภอ..." />
                                <CommandList>
                                  <CommandEmpty>ไม่พบข้อมูลอำเภอ</CommandEmpty>
                                  <CommandGroup>
                                    {districts.map((district: any) => (
                                      <CommandItem
                                        value={district.name}
                                        key={district.code}
                                        onSelect={() => {
                                          form.setValue(
                                            "district",
                                            String(district.code),
                                          );
                                          form.setValue("subdistrict", "");
                                          form.setValue("postal_code", "");
                                          setDistrictOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            String(district.code) ===
                                              field.value
                                              ? "opacity-100"
                                              : "opacity-0",
                                          )}
                                        />
                                        {district.name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="subdistrict"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>
                            ตำบล/แขวง{" "}
                            <span className="text-destructive">*</span>
                          </FormLabel>
                          <Popover
                            open={subdistrictOpen}
                            onOpenChange={setSubdistrictOpen}
                          >
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={subdistrictOpen}
                                  disabled={!selectedDistrict}
                                  className={cn(
                                    "w-full justify-between font-normal",
                                    !field.value && "text-muted-foreground",
                                  )}
                                >
                                  {(() => {
                                    if (!field.value) return "-- เลือกตำบล --";
                                    const found = subdistricts.find(
                                      (s: any) =>
                                        String(s.code) === field.value,
                                    );
                                    return found ? found.name : field.value;
                                  })()}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-[--radix-popover-trigger-width] p-0"
                              align="start"
                            >
                              <Command>
                                <CommandInput placeholder="ค้นหาตำบล..." />
                                <CommandList>
                                  <CommandEmpty>ไม่พบข้อมูลตำบล</CommandEmpty>
                                  <CommandGroup>
                                    {subdistricts.map((sub: any) => (
                                      <CommandItem
                                        value={sub.name}
                                        key={sub.code}
                                        onSelect={() => {
                                          form.setValue(
                                            "subdistrict",
                                            String(sub.code),
                                          );
                                          form.setValue(
                                            "postal_code",
                                            String(sub.postalCode),
                                          );
                                          setSubdistrictOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            String(sub.code) === field.value
                                              ? "opacity-100"
                                              : "opacity-0",
                                          )}
                                        />
                                        {sub.name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="postal_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>รหัสไปรษณีย์</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="รหัสไปรษณีย์ (อัตโนมัติ)"
                            {...field}
                            readOnly
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="map_link"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Map className="w-4 h-4 text-primary" /> Link แผนที่
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://maps.google.com/..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="latitude"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ละติจูด (Latitude) <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                              <Input
                                placeholder="เช่น 13.7563"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(formatCoordinate(e.target.value));
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="longitude"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ลองจิจูด (Longitude) <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                              <Input
                                placeholder="เช่น 100.5018"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(formatCoordinate(e.target.value));
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                  </div>
                </div>
              </div>

              {/* ข้อมูลผู้ติดต่อ */}
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  ข้อมูลผู้ติดต่อ
                </p>
                <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contact_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 min-h-[24px]">
                            <User className="w-4 h-4 text-primary" />{" "}
                            ชื่อผู้ติดต่อ{" "}
                            <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="ชื่อ"
                              {...field}
                              onChange={(e) => {
                                const value = e.target.value;
                                const filtered = value.replace(
                                  /[^a-zA-Z\u0E00-\u0E7F\s.]/g,
                                  "",
                                );
                                field.onChange(filtered);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contact_last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 min-h-[24px]">
                            {" "}
                            นามสกุลผู้ติดต่อ
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="นามสกุล"
                              {...field}
                              onChange={(e) => {
                                const value = e.target.value;
                                const filtered = value.replace(
                                  /[^a-zA-Z\u0E00-\u0E7F\s.]/g,
                                  "",
                                );
                                field.onChange(filtered);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="contact_position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-primary" /> ตำแหน่ง
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="เช่น ผู้จัดการ" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contact_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-primary" />{" "}
                            เบอร์โทรศัพท์{" "}
                            <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="0xx-xxx-xxxx"
                              {...field}
                              onChange={(e) => {
                                const formatted = formatPhoneNumber(
                                  e.target.value,
                                );
                                field.onChange(formatted);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contact_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-primary" /> อีเมล{" "}
                            <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              required
                              placeholder="email@example.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* เอกสารการสมัคร */}
              {selectedProgramId && isFetchingTemplates && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  กำลังโหลดรายการเอกสาร...
                </div>
              )}
              {documentTemplates.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-muted-foreground tracking-wider">
                    เอกสารการสมัคร
                    <span className="text-destructive text-xs"> รองรับ PDF, Word, Excel, PowerPoint และรูปภาพ (ไม่เกิน {MAX_FILE_SIZE_MB}MB)</span>
                  </p>
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
                    {documentTemplates.map((tpl, idx) => {
                      const pendingFile = pendingFiles[tpl.id];
                      const uploadPct = uploadingMap[tpl.id];
                      const isUploading = uploadPct !== undefined;
                      return (
                        <div key={tpl.id} className="border rounded-lg p-3 space-y-2 bg-background">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-medium text-muted-foreground">{idx + 1}.</span>
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
                          {pendingFile ? (
                            <div className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2">
                              <FileText className="h-4 w-4 text-primary shrink-0" />
                              <span className="text-sm truncate flex-1">{pendingFile.name}</span>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                title="ดูตัวอย่างเอกสาร"
                                className="h-7 w-7 text-primary hover:bg-primary/10"
                                onClick={() => {
                                  const url = URL.createObjectURL(pendingFile);
                                  window.open(url, "_blank");
                                  setTimeout(() => URL.revokeObjectURL(url), 10000);
                                }}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <AlertActionPopup
                                type="delete"
                                title="ยืนยันการลบ"
                                description="คุณต้องการลบไฟล์ที่แนบนี้หรือไม่?"
                                action={() => {
                                  setPendingFiles((prev) => {
                                    const next = { ...prev };
                                    delete next[tpl.id];
                                    return next;
                                  });
                                }}
                                trigger={
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                }
                              />
                            </div>
                          ) : (
                            <div>
                              <input
                                type="file"
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.gif,.bmp,.tiff"
                                ref={(el) => { fileInputRefs.current[tpl.id] = el; }}
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  e.target.value = "";
                                  if (!file) return;
                                  const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
                                  if (BANNED_FILE_EXTENSIONS.includes(ext) || BANNED_FILE_MIME_TYPES.includes(file.type)) {
                                    toast({
                                      title: "ไม่อนุญาตประเภทไฟล์นี้",
                                      description: `ไฟล์ "${file.name}" เป็นประเภทที่ไม่รองรับ กรุณาใช้ไฟล์ PDF, Word, Excel, PowerPoint หรือรูปภาพเท่านั้น`,
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  if (file.size > MAX_FILE_SIZE) {
                                    toast({ title: `ไฟล์ ${file.name} ใหญ่เกิน ${MAX_FILE_SIZE_MB}MB`, variant: "destructive" });
                                    return;
                                  }
                                  setPendingFiles((prev) => ({ ...prev, [tpl.id]: file }));
                                }}
                              />
                              {isUploading ? (
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" />กำลังอัปโหลด...</span>
                                    <span>{uploadPct}%</span>
                                  </div>
                                  <Progress value={uploadPct} className="h-1.5" />
                                </div>
                              ) : (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="text-xs"
                                  onClick={() => fileInputRefs.current[tpl.id]?.click()}
                                >
                                  <Upload className="h-3.5 w-3.5 mr-1" />
                                  อัปโหลดไฟล์
                                </Button>
                              )}
                              {tpl.isRequired && !pendingFile && (
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
                </div>
              )}

              {/* Validation hints */}
              {(() => {
                const hasRequiredDocsMissing = documentTemplates.some(
                  (t) => t.isRequired && !pendingFiles[t.id],
                );
                return (
                  <>
                    <Button
                      type="submit"
                      className="w-full h-11 text-base font-bold"
                      disabled={submitting || hasRequiredDocsMissing || branchExists}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />{" "}
                          กำลังส่งข้อมูล...
                        </>
                      ) : (
                        "ส่งใบสมัคร"
                      )}
                    </Button>
                    {hasRequiredDocsMissing && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        กรุณาแนบเอกสารบังคับให้ครบ
                      </p>
                    )}
                    {branchExists && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        รหัสสาขานี้มีอยู่ในระบบอยู่แล้ว
                      </p>
                    )}
                  </>
                );
              })()}
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

