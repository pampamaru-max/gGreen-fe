import { FolderKanban } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProjectOperations() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <FolderKanban className="h-6 w-6 text-accent" />
        <h1 className="text-xl font-bold text-foreground">การดำเนินการโครงการ</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">สถานะโครงการ</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            ยังไม่มีโครงการที่กำลังดำเนินการ — กรุณาสมัครเข้าร่วมโครงการก่อน
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
