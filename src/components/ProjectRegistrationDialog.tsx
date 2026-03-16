import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UserPlus, Building2, MapPin, Phone, Mail, User } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const registrationSchema = z.object({
  program_id: z.string().min(1, "กรุณาเลือกโครงการ"),
  organization_name: z.string().trim().min(1, "กรุณาระบุชื่อหน่วยงาน/สถานประกอบการ").max(200),
  organization_type: z.string().trim().min(1, "กรุณาระบุประเภทหน่วยงาน").max(100),
  address: z.string().trim().min(1, "กรุณาระบุที่อยู่").max(500),
  province: z.string().trim().min(1, "กรุณาระบุจังหวัด").max(100),
  contact_name: z.string().trim().min(1, "กรุณาระบุชื่อผู้ติดต่อ").max(100),
  contact_phone: z.string().trim().min(1, "กรุณาระบุเบอร์โทรศัพท์").max(20),
  contact_email: z.string().trim().email("รูปแบบอีเมลไม่ถูกต้อง").max(255),
});

type RegistrationForm = z.infer<typeof registrationSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProjectRegistrationDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const { data: programs = [] } = useQuery({
    queryKey: ["programs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("programs").select("id, name, icon").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const form = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      program_id: "",
      organization_name: "",
      organization_type: "",
      address: "",
      province: "",
      contact_name: "",
      contact_phone: "",
      contact_email: "",
    },
  });

  const onSubmit = async (values: RegistrationForm) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.from("project_registrations" as any).insert(values as any);
      if (error) throw error;
      toast({ title: "สมัครสำเร็จ", description: "ส่งข้อมูลการสมัครเข้าร่วมโครงการเรียบร้อยแล้ว" });
      form.reset();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">สมัครเข้าร่วมโครงการ</DialogTitle>
              <DialogDescription className="text-sm">
                กรอกข้อมูลด้านล่างเพื่อสมัครเข้าร่วมโครงการ G-Green
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-2">
            {/* โครงการ */}
            <FormField
              control={form.control}
              name="program_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5 text-sm font-semibold">
                    <Building2 className="h-4 w-4 text-primary" /> โครงการที่ต้องการสมัคร
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกโครงการ" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {programs.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ข้อมูลหน่วยงาน */}
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">ข้อมูลหน่วยงาน</p>
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-4">
                <FormField
                  control={form.control}
                  name="organization_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ชื่อหน่วยงาน/สถานประกอบการ</FormLabel>
                      <FormControl><Input placeholder="เช่น บริษัท ABC จำกัด" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="organization_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ประเภทหน่วยงาน</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
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
                        <MapPin className="h-3.5 w-3.5 text-primary" /> ที่อยู่
                      </FormLabel>
                      <FormControl><Textarea rows={2} placeholder="ที่อยู่หน่วยงาน" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="province"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>จังหวัด</FormLabel>
                      <FormControl><Input placeholder="เช่น กรุงเทพมหานคร" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* ข้อมูลผู้ติดต่อ */}
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">ข้อมูลผู้ติดต่อ</p>
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-4">
                <FormField
                  control={form.control}
                  name="contact_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-primary" /> ชื่อ-นามสกุล ผู้ติดต่อ
                      </FormLabel>
                      <FormControl><Input placeholder="ชื่อ-นามสกุล" {...field} /></FormControl>
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
                        <FormLabel className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-primary" /> เบอร์โทรศัพท์
                        </FormLabel>
                        <FormControl><Input placeholder="0xx-xxx-xxxx" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contact_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-primary" /> อีเมล
                        </FormLabel>
                        <FormControl><Input type="email" placeholder="email@example.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 text-base font-bold" disabled={submitting}>
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> กำลังส่งข้อมูล...</> : "ส่งใบสมัคร"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
