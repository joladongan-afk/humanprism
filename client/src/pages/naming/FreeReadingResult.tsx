import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";

interface FreeReadingResultProps {
  data: {
    certificateNumber: string;
    analysis: {
      jawon: {
        ohaeng: string;
        result: string;
        detail?: string;
      };
      suri: {
        number: number;
        gilhyung: string;
        description: string;
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

export function FreeReadingResult({ data, onPdfDownload, onShare }: FreeReadingResultProps) {
  const getBadgeColor = (result: string) => {
    if (result.includes("양호") || result === "吉") return "bg-green-100 text-green-800";
    if (result.includes("보완") || result === "凶") return "bg-red-100 text-red-800";
    if (result.includes("중립") || result === "半吉半凶") return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-800";
  };

  const getIcon = (result: string) => {
    if (result.includes("양호") || result === "吉") return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (result.includes("보완") || result === "凶") return <AlertCircle className="w-5 h-5 text-red-600" />;
    return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
  };

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
            {getIcon(data.analysis.jawon.result)}
            자원오행 분석
          </CardTitle>
          <CardDescription>한자 부수를 기반으로 분석한 오행 에너지</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">오행 구성</span>
            <span className="text-lg font-bold tracking-widest text-amber-800">
              {data.analysis.jawon.ohaeng.split("").join(" · ")}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">판정</span>
            <Badge className={getBadgeColor(data.analysis.jawon.result)}>
              {data.analysis.jawon.result}
            </Badge>
          </div>
          {data.analysis.jawon.detail && (
            <div className="text-sm text-gray-600 p-3 bg-amber-50 rounded-lg border border-amber-100">
              {data.analysis.jawon.detail}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 수리사격 분석 */}
      <Card className="border-blue-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {getIcon(data.analysis.suri.gilhyung)}
            수리사격(四格) 분석
          </CardTitle>
          <CardDescription>이름 획수의 수리 에너지 분석</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">수리</span>
            <span className="text-2xl font-bold text-blue-900">{data.analysis.suri.number}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">길흉</span>
            <Badge className={getBadgeColor(data.analysis.suri.gilhyung)}>
              {data.analysis.suri.gilhyung}
            </Badge>
          </div>
          <div className="text-sm text-gray-700 p-3 bg-blue-50 rounded-lg border border-blue-100 leading-relaxed">
            {data.analysis.suri.description}
          </div>
        </CardContent>
      </Card>

      {/* 불용문자 */}
      {data.analysis.bulmyong.hasBulmyong && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              불용문자 포함
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-700 mb-2">이름에 사용을 피해야 할 한자가 포함되어 있습니다.</p>
            <div className="flex flex-wrap gap-2">
              {data.analysis.bulmyong.chars.map((char, idx) => (
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
          <Badge className={getBadgeColor(data.analysis.overall)}>
            {data.analysis.overall}
          </Badge>
          <div className="text-sm text-gray-700 italic p-3 bg-white rounded-lg border border-emerald-100 leading-relaxed">
            "{data.analysis.comment}"
          </div>
          <p className="text-xs text-emerald-700 font-medium text-center pt-1">
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
