import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

const ReportParticipants = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">รายชื่อผู้เข้าร่วมโครงการ</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">รายงานผู้เข้าร่วมโครงการ G-Green</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">ยังไม่มีข้อมูลรายงาน</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportParticipants;
