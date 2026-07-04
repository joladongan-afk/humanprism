import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const steps = [
  {
    number: "01",
    title: "마스터 사주 분석",
    desc: "태어난 계절과 일간으로 기운의 지도를 그립니다",
  },
  {
    number: "02",
    title: "핵심 오행 도출",
    desc: "30년 안목으로 당신에게 꼭 필요한 기운을 찾습니다",
  },
  {
    number: "03",
    title: "한자 후보 선별",
    desc: "자원오행이 맞는 한자만 엄격하게 추립니다",
  },
  {
    number: "04",
    title: "수리사격(四格) 검증",
    desc: "원형이정 4격이 모두 길한 수리인지 확인합니다",
  },
  {
    number: "05",
    title: "의뢰인 전달 및 확인",
    desc: "마음에 드는 이름이 나올 때까지 1회차 3~5개 제안",
  },
  {
    number: "06",
    title: "최종 작명 완성",
    desc: "사주와 이름이 하나가 되는 이름을 선물합니다",
  },
];

export function MasterNamingTab() {
  return (
    <div className="flex justify-center">
      <Card className="w-full max-w-5xl border-amber-300 bg-stone-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold text-amber-900">
            명의 본질에 가장 부합하는 이름 짓기
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

          <div className="text-gray-700 space-y-3">
            <p className="text-lg font-semibold text-amber-800">
              30년 사주쟁이의 안목으로, 당신을 빛내줄 이름을 선물합니다.
            </p>
            <p className="text-base leading-relaxed">
              아무나 이름에 오행을 부여할 수 없습니다.<br />
              사주를 반영하지 않은 작명은 반쪽짜리일 뿐입니다.
            </p>
            <p className="text-lg font-bold text-amber-900">
              사주는 몸이고, 이름이 옷입니다.
            </p>
            <p className="text-base leading-relaxed">
              당신의 삶을 더 빛나게 해줄 이름은 전문가에게 맡기세요.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-amber-300" />
            <span className="text-sm text-amber-600 font-bold tracking-widest">작명 6단계</span>
            <div className="flex-1 h-px bg-amber-300" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className="relative bg-white border border-amber-200 rounded-xl p-5 flex flex-col gap-3 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-amber-700 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                    {step.number}
                  </span>
                  <p className="text-base font-bold text-amber-900 leading-tight">{step.title}</p>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed pl-12">{step.desc}</p>
                {idx % 2 === 0 && idx < steps.length - 1 && (
                  <span className="absolute -right-3 top-1/2 -translate-y-1/2 text-amber-400 text-xl z-10">▶</span>
                )}
              </div>
            ))}
          </div>

          <p className="text-sm text-center text-amber-700 font-semibold">
            사주에 꼭 맞는 자원오행 감정 + 정통 수리사격(원형이정 작명법)
          </p>

          <Button className="w-full bg-amber-700 hover:bg-amber-800 text-white text-lg font-bold py-7">
            마스터 작명 상담 신청 (₩300,000)
          </Button>

        </CardContent>
      </Card>
    </div>
  );
}
