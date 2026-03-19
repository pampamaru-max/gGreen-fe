import { UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ProjectRegistration() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <UserPlus className="h-6 w-6 text-accent" />
        <h1 className="text-xl font-bold text-foreground">เข้าประเมิน G-Green</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">เลือกโครงการที่ต้องการสมัคร</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            เลือกประเภทโครงการ G-Green ที่ท่านต้องการสมัครเข้าร่วม
          </p>
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
            เริ่มสมัคร
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
