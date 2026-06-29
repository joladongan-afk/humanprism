import { useState } from "react";
import { FreeReadingForm } from "./FreeReadingForm";
import { FreeReadingResult } from "./FreeReadingResult";

interface SuriGrade {
  number: number;
  gilhyung: string;
  description: string;
}

interface FreeReadingResultData {
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
    requiredOhaeng?: { primary: string; secondary: string } | null;
  };
}

interface InputData {
  name1Korean: string;
  name1Hanja?: string;
  name2Korean: string;
  name2Hanja?: string;
}

export function FreeReadingTab() {
  const [result, setResult] = useState<FreeReadingResultData | null>(null);
  const [inputData, setInputData] = useState<InputData | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleSuccess = (data: FreeReadingResultData, input?: InputData) => {
    setResult(data);
    setInputData(input || null);
    setShowResult(true);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 100);
  };

  const handlePdfDownload = () => {
    alert("PDF 다운로드 기능은 준비 중입니다");
  };

  const handleShare = async () => {
    if (!data?.analysis) return;
    const certNum = data.certificateNumber;
    // Railway URL: OG 태그+이미지 완벽 지원, 클릭 시 human-prism.com으로 리다이렉트
    const ogUrl = `https://humanprism-production.up.railway.app/share/${certNum}`;
    const shareData = {
      title: "휴먼프리즘 이름감정 결과",
      text: "30년 명리학 전문가의 AI 이름감정 결과를 확인해보세요.",
      url: ogUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (e) {
        // 사용자가 취소한 경우 무시
      }
    } else {
      // Web Share API 미지원 시 클립보드 복사
      navigator.clipboard.writeText(url).then(() => {
        alert("링크가 복사됐습니다!");
      }).catch(() => {
        prompt("아래 링크를 복사하세요:", url);
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-center">
        <FreeReadingForm onSuccess={handleSuccess} />
      </div>

      {showResult && result && (
        <div className="flex justify-center">
          <div className="w-full max-w-5xl">
            <FreeReadingResult
              data={result}
              inputData={inputData || undefined}
              onPdfDownload={handlePdfDownload}
              onShare={handleShare}
            />
          </div>
        </div>
      )}
    </div>
  );
}
