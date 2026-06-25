import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const steps = [
  {
    number: "01",
    title: "사주 분석",
    desc: "태어난 계절과 일간으로 기운의 지도를 그립니다",
    icon: "☯",
  },
  {
    number: "02",
    title: "필요 오행 확정",
    desc: "30년 안목으로 당신에게 부족한 기운을 찾습니다",
    icon: "🔥",
  },
  {
    number: "03",
    title: "한자 후보 선별",
    desc: "자원오행이 맞는 한자만 엄격하게 추립니다",
    icon: "漢",
  },
  {
    number: "04",
    title: "수리사격 검증",
    desc: "원형이정 4격이 모두 길한 수리인지 확인합니다",
    icon: "四",
  },
  {
    number: "05",
    title: "발음오행 검증",
    desc: "소리의 흐름이 조화로운지 귀로 확인합니다",
    icon: "♪",
  },
  {
    number: "06",
    title: "최종 작명",
    desc: "사주와 이름이 하나가 되는 이름을 선물합니다",
    icon: "✦",
  },
];

export function MasterNamingTab() {
  return (
    <div className="flex justify-center">
      <Card className="w-full max-w-2xl border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-amber-900">
            명의 본질에 가장 부합하는 이름 짓기
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* 문구 */}
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
          </div>

          {/* 구분선 */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-amber-200" />
            <span className="text-xs text-amber-600 font-semibold tracking-widest">작명 6단계</span>
            <div className="flex-1 h-px bg-amber-200" />
          </div>

          {/* 6단계 */}
          <div className="grid grid-cols-2 gap-3">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className="relative bg-white border border-amber-100 rounded-xl p-4 flex flex-col gap-2 shadow-sm"
              >
                {/* 번호 배지 */}
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-amber-700 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {step.number}
                  </span>
                  <span className="text-lg">{step.icon}</span>
                </div>
                <p className="text-sm font-bold text-amber-900">{step.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
                {/* 화살표 (마지막 제외) */}
                {idx < steps.length - 1 && idx % 2 === 0 && (
                  <span className="absolute -right-2 top-1/2 -translate-y-1/2 text-amber-300 text-lg z-10">▶</span>
                )}
              </div>
            ))}
          </div>

          {/* 하단 문구 */}
          <p className="text-xs text-center text-amber-700 font-medium">
            사주에 꼭 맞는 자원오행 감정 + 정통 수리사격(원형이정 작명법)
          </p>

          {/* CTA */}
          <Button className="w-full bg-amber-700 hover:bg-amber-800 text-white text-base py-6">
            마스터 작명 상담 신청 (₩300,000)
          </Button>

        </CardContent>
      </Card>
    </div>
  );
}
