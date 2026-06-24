import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export function SelfNamingTab() {
  return (
    <div className="flex justify-center">
      <Card className="w-full max-w-2xl border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            셀프작명 준비 중
          </CardTitle>
          <CardDescription>
            셀프작명 기능은 현재 개발 중입니다. 곧 서비스될 예정입니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            무료 이름감정으로 당신의 이름을 먼저 분석해보세요. 마스터 작명 상담을 통해 더 깊이 있는 조언을 받을 수 있습니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
