import { useState } from "react";
import { FreeReadingForm } from "./FreeReadingForm";
import { FreeReadingResult } from "./FreeReadingResult";

interface FreeReadingResult {
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
}

export function FreeReadingTab() {
  const [result, setResult] = useState<FreeReadingResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleSuccess = (data: FreeReadingResult) => {
    setResult(data);
    setShowResult(true);
    // 자동 스크롤
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 100);
  };

  const handlePdfDownload = () => {
    // TODO: PDF 생성 및 다운로드 (맥스에서)
    alert("PDF 다운로드 기능은 준비 중입니다");
  };

  const handleShare = () => {
    // TODO: 공유 기능 (맥스에서)
    alert("공유 기능은 준비 중입니다");
  };

  return (
    <div className="space-y-8">
      {/* 입력 폼 */}
      <div className="flex justify-center">
        <FreeReadingForm onSuccess={handleSuccess} />
      </div>

      {/* 결과 화면 */}
      {showResult && result && (
        <div className="flex justify-center">
          <div className="w-full max-w-2xl">
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
