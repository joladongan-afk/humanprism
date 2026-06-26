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
  };
}

export function FreeReadingTab() {
  const [result, setResult] = useState<FreeReadingResultData | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleSuccess = (data: FreeReadingResultData) => {
    setResult(data);
    setShowResult(true);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 100);
  };

  const handlePdfDownload = () => {
    alert("PDF 다운로드 기능은 준비 중입니다");
  };

  const handleShare = () => {
    alert("공유 기능은 준비 중입니다");
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-center">
        <FreeReadingForm onSuccess={handleSuccess} />
      </div>

      {showResult && result && (
        <div className="flex justify-center">
          <div className="w-full max-w-3xl">
            <FreeReadingResult
              data={result}
              onPdfDownload={handlePdfDownload}
              onShare={handleShare}
            />
          </div>
        </div>
      )}
    </div>
  );
}
