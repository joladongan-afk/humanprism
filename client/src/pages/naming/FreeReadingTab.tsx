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

  const handleShare = () => {
    if (!data?.analysis) return;
    const certNum = data.certificateNumber;
    const url = `${window.location.origin}/share/${certNum}`;
    navigator.clipboard.writeText(url).then(() => {
      alert("공유 링크가 복사됐습니다!\n카카오톡에 붙여넣기 하세요.");
    }).catch(() => {
      prompt("아래 링크를 복사하세요:", url);
    });
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
