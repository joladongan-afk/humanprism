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
      };
      pado: {
        ohaeng: string;
        result: string;
        detail: string;
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
  const getResultBadgeColor = (result: string) => {
    if (result.includes("양호") || result.includes("길")) return "bg-green-100 text-green-800";
    if (result.includes("보완")) return "bg-yellow-100 text-yellow-800";
    if (result.includes("凶")) return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  const getResultIcon = (result: string) => {
    if (result.includes("양호") || result.includes("길")) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (result.includes("보완")) return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    if (result.includes("凶")) return <AlertCircle className="w-5 h-5 text-red-600" />;
    return null;
  };

  return (
    <div className="w-full space-y-6">
      {/* 인증 정보 */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-lg">이름 감정 완료</CardTitle>
          <CardDescription>인증번호: {data.certificateNumber}</CardDescription>
        </CardHeader>
      </Card>

      {/* 자원오행 분석 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {getResultIcon(data.analysis.jawon.result)}
            자원오행 분석
          </CardTitle>
          <CardDescription>한자의 부수와 획수를 기반으로 분석한 오행</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">오행 구성</span>
            <Badge className={getResultBadgeColor(data.analysis.jawon.result)}>
              {data.analysis.jawon.ohaeng}
            </Badge>
          </div>
          <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded">
            자원오행은 현재 분석 중입니다. 마스터 상담을 통해 더 자세한 해석을 받을 수 있습니다.
          </div>
        </CardContent>
      </Card>

      {/* 파동오행 분석 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {getResultIcon(data.analysis.pado.result)}
            파동오행 분석
          </CardTitle>
          <CardDescription>이름의 초성을 기반으로 분석한 오행 상생</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">오행 흐름</span>
            <Badge className={getResultBadgeColor(data.analysis.pado.result)}>
              {data.analysis.pado.ohaeng}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">판정</span>
            <Badge className={getResultBadgeColor(data.analysis.pado.result)}>
              {data.analysis.pado.result}
            </Badge>
          </div>
          <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded">
            {data.analysis.pado.detail}
          </div>
        </CardContent>
      </Card>

      {/* 수리사격 분석 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {getResultIcon(data.analysis.suri.gilhyung)}
            수리사격 분석
          </CardTitle>
          <CardDescription>이름의 획수를 기반으로 분석한 길흉</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">수리</span>
            <Badge className={getResultBadgeColor(data.analysis.suri.gilhyung)}>
              {data.analysis.suri.number}획
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">길흉</span>
            <Badge className={getResultBadgeColor(data.analysis.suri.gilhyung)}>
              {data.analysis.suri.gilhyung}
            </Badge>
          </div>
          <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded">
            {data.analysis.suri.description}
          </div>
        </CardContent>
      </Card>

      {/* 불용문자 검사 */}
      {data.analysis.bulmyong.hasBulmyong && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              불용문자 포함
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              <p className="mb-2">다음 글자가 포함되어 있습니다:</p>
              <div className="flex flex-wrap gap-2">
                {data.analysis.bulmyong.chars.map((char, idx) => (
                  <Badge key={idx} variant="destructive">
                    {char}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 종합 판정 */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-base">종합 판정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Badge className={getResultBadgeColor(data.analysis.overall)} variant="outline">
            {data.analysis.overall}
          </Badge>
          <div className="text-sm text-gray-700 italic p-3 bg-white rounded border border-green-100">
            "{data.analysis.comment}"
          </div>
        </CardContent>
      </Card>

      {/* 액션 버튼 */}
      <div className="flex gap-3">
        <Button onClick={onPdfDownload} className="flex-1 bg-green-600 hover:bg-green-700">
          PDF 저장
        </Button>
        <Button onClick={onShare} variant="outline" className="flex-1">
          공유하기
        </Button>
      </div>
    </div>
  );
}
