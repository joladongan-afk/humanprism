import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, AlertTriangle, HelpCircle } from "lucide-react";

interface SuriGrade {
  number: number;
  gilhyung: string;
  description: string;
}

interface FreeReadingResultProps {
  data: {
    certificateNumber: string;
    analysis: {
      jawon: {
        ohaeng: string;
        result: string;
        detail?: string;
        hasHanja?: boolean;
      };
      suri4: {
        won: SuriGrade;
        hyeong: SuriGrade;
        i: SuriGrade;
        jeong: SuriGrade;
      };
      bulmyong: {
        hasBulmyong: boolean;
        chars: string[];
      };
      overall: string;
      comment: string;
    };
  };
  onPdfDownload?: () => void;
  onShare?: () => void;
}

const GILHYUNG_COLOR: Record<string, string> = {
  "吉": "bg-green-100 text-green-800 border-green-300",
  "凶": "bg-red-100 text-red-800 border-red-300",
  "半吉半凶": "bg-yellow-100 text-yellow-800 border-yellow-300",
};

const RESULT_COLOR: Record<string, string> = {
  "양호": "bg-green-100 text-green-800",
  "우수": "bg-emerald-100 text-emerald-800",
  "중립": "bg-yellow-100 text-yellow-800",
  "보완 필요": "bg-red-100 text-red-800",
  "재검토 필요": "bg-red-100 text-red-800",
  "한자 미입력": "bg-gray-100 text-gray-600",
};

function getIcon(result: string) {
  if (result === "吉" || result === "양호" || result === "우수") return <CheckCircle className="w-5 h-5 text-green-600" />;
  if (result === "凶" || result === "보완 필요" || result === "재검토 필요") return <AlertCircle className="w-5 h-5 text-red-600" />;
  if (result === "한자 미입력") return <HelpCircle className="w-5 h-5 text-gray-400" />;
  return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
}

const OHAENG_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  木: { bg: "bg-green-100", text: "text-green-700", label: "목(木)" },
  火: { bg: "bg-red-100", text: "text-red-700", label: "화(火)" },
  土: { bg: "bg-yellow-100", text: "text-yellow-700", label: "토(土)" },
  金: { bg: "bg-gray-100", text: "text-gray-700", label: "금(金)" },
  水: { bg: "bg-blue-100", text: "text-blue-700", label: "수(水)" },
};

// 수리사격 4격 이름과 설명
const SURI4_META = {
  won:    { name: "원격(元格)", desc: "가운데 글자의 기운 — 어린 시절과 내면의 성품" },
  hyeong: { name: "형격(亨格)", desc: "끝 글자의 기운 — 청장년기와 사회활동 운세" },
  i:      { name: "이격(利格)", desc: "성씨+가운데 글자의 기운 — 가정운과 대인관계" },
  jeong:  { name: "정격(貞格)", desc: "전체 이름의 기운 — 총괄적인 평생 운세" },
};

function SuriCard({ grade, meta }: { grade: SuriGrade; meta: { name: string; desc: string } }) {
  return (
    <div className="border border-gray-100 rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-gray-800 text-base">{meta.name}</p>
          <p className="text-sm text-gray-500 mt-0.5">{meta.desc}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-blue-900">{grade.number}</p>
          <p className="text-xs text-gray-400">획수 합계</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge className={`border ${GILHYUNG_COLOR[grade.gilhyung] || "bg-gray-100 text-gray-600"}`}>
          {grade.gilhyung}
        </Badge>
      </div>
      <p className="text-base text-gray-700 bg-blue-50 rounded-lg p-4 leading-relaxed border border-blue-100">
        {grade.description}
      </p>
    </div>
  );
}

export function FreeReadingResult({ data, onPdfDownload, onShare }: FreeReadingResultProps) {
  const { jawon, suri4, bulmyong, overall, comment } = data.analysis;
  const ohaengChars = jawon.ohaeng ? jawon.ohaeng.split("") : [];

  return (
    <div className="w-full space-y-5">

      {/* 인증 정보 */}
      <Card className="border-emerald-200 bg-emerald-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-emerald-900">이름 감정 완료</CardTitle>
          <CardDescription className="text-emerald-700">
            인증번호: <span className="font-mono font-bold">{data.certificateNumber}</span>
          </CardDescription>
        </CardHeader>
      </Card>

      {/* 자원오행 분석 */}
      <Card className="border-amber-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {getIcon(jawon.result)}
            자원오행(字源五行) 분석
          </CardTitle>
          <CardDescription className="text-sm">한자 부수(部首)를 기준으로 분석한 오행 에너지</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!jawon.hasHanja ? (
            <div className="text-base text-gray-500 p-4 bg-gray-50 rounded-lg border border-gray-200">
              한자를 입력하시면 자원오행을 분석합니다. 이름의 각 한자가 지닌 오행 기운을 확인하세요.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                {ohaengChars.map((oh, idx) => {
                  const style = OHAENG_STYLE[oh] || { bg: "bg-gray-100", text: "text-gray-600", label: oh };
                  return (
                    <span key={idx} className={`px-3 py-1.5 rounded-lg text-sm font-bold ${style.bg} ${style.text}`}>
                      {style.label}
                    </span>
                  );
                })}
                <span className="text-gray-400 text-sm mx-1">→</span>
                <Badge className={RESULT_COLOR[jawon.result] || "bg-gray-100 text-gray-600"}>
                  {jawon.result}
                </Badge>
              </div>
              {jawon.detail && (
                <div className="text-base text-gray-700 p-4 bg-amber-50 rounded-lg border border-amber-100">
                  {jawon.detail}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 수리사격 4격 분석 */}
      <Card className="border-blue-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            수리사격(數理四格) 분석
          </CardTitle>
          <CardDescription>
            이름 획수의 조합으로 보는 네 가지 운세 — 숫자는 획수 합계(1~81)이며, 각 구간마다 고유한 운세 풀이가 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <SuriCard grade={suri4.won} meta={SURI4_META.won} />
          <SuriCard grade={suri4.hyeong} meta={SURI4_META.hyeong} />
          <SuriCard grade={suri4.i} meta={SURI4_META.i} />
          <SuriCard grade={suri4.jeong} meta={SURI4_META.jeong} />
        </CardContent>
      </Card>

      {/* 불용문자 */}
      {bulmyong.hasBulmyong && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              불용문자(不用文字) 포함
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base text-red-700 mb-2">이름에 사용을 피해야 할 한자가 포함되어 있습니다.</p>
            <div className="flex flex-wrap gap-2">
              {bulmyong.chars.map((char, idx) => (
                <Badge key={idx} variant="destructive">{char}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 종합 판정 */}
      <Card className="border-emerald-200 bg-emerald-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-emerald-900">종합 판정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Badge className={RESULT_COLOR[overall] || "bg-gray-100 text-gray-600"}>
            {overall}
          </Badge>
          <div className="text-base text-gray-700 italic p-4 bg-white rounded-lg border border-emerald-100 leading-relaxed">
            &ldquo;{comment}&rdquo;
          </div>
          <p className="text-sm text-emerald-700 font-medium text-center pt-1">
            더 깊은 분석은 마스터 작명 상담을 통해 받으실 수 있습니다.
          </p>
        </CardContent>
      </Card>

      {/* 액션 버튼 */}
      <div className="flex gap-3">
        <Button onClick={onPdfDownload} className="flex-1 bg-emerald-700 hover:bg-emerald-800">
          PDF 저장
        </Button>
        <Button onClick={onShare} variant="outline" className="flex-1 border-emerald-300 text-emerald-700">
          공유하기
        </Button>
      </div>
    </div>
  );
}
