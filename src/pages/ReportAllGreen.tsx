import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

const ReportAllGreen = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">รายชื่อผู้ได้รับสัญลักษณ์ All Green</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">รายงานผู้ได้รับสัญลักษณ์ All Green</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">ยังไม่มีข้อมูลรายงาน</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportAllGreen;
