import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function MasterNamingTab() {
  return (
    <div className="flex justify-center">
      <Card className="w-full max-w-2xl border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-amber-900">
            명의 본질에 가장 부합하는 이름 짓기
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-700 space-y-3">
            <p className="text-base font-medium text-amber-800">
              30년 사주쟁이의 안목으로, 당신을 빛내줄 이름을 선물합니다.
            </p>
            <p>
              아무나 이름에 오행을 부여할 수 없습니다.<br />
              사주를 반영하지 않은 작명은 반쪽짜리일 뿐입니다.
            </p>
            <p className="text-base font-semibold text-gray-800">
              사주는 몸이고, 이름이 옷입니다.
            </p>
            <p>
              당신의 삶을 더 빛나게 해줄 이름은 전문가에게 맡기세요.
            </p>
            <p className="text-sm text-amber-700 font-medium">
              사주에 꼭 맞는 자원오행 감정 + 정통 수리사격(원형이정 작명법)
            </p>
          </div>
          <Button className="w-full bg-amber-700 hover:bg-amber-800 text-white text-base py-6">
            마스터 작명 상담 신청 (₩300,000)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

