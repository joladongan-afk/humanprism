import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export function MasterNamingTab() {
  return (
    <div className="flex justify-center">
      <Card className="w-full max-w-2xl border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            마스터 작명 상담
          </CardTitle>
          <CardDescription>
            30년 경력의 명리 전문가와 함께하는 프리미엄 작명 상담
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-700 space-y-2">
            <p>
              마스터 작명은 사주와 성명학을 종합적으로 분석하여 개인의 운명과 조화를 이루는 이름을 지어드리는 서비스입니다.
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>사주 분석 기반 필요 오행 파악</li>
              <li>음양오행의 조화로운 이름 구성</li>
              <li>수리사격의 길한 수 배치</li>
              <li>개인 운명과의 시너지 분석</li>
            </ul>
          </div>
          <Button className="w-full bg-blue-600 hover:bg-blue-700">
            마스터 작명 상담 신청 (₩100,000)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
