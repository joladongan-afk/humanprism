import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Download, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

interface SajuDownloadButtonProps {
  sajuId: number;
  label: string;
  className?: string;
}

export function SajuDownloadButton({ sajuId, label, className }: SajuDownloadButtonProps) {
  const downloadQuery = trpc.saju.downloadPdf.useQuery(
    { id: sajuId },
    { enabled: false }
  );

  useEffect(() => {
    if (downloadQuery.error) {
      toast.error("PDF 다운로드에 실패했습니다. 다시 시도해주세요.");
    }
  }, [downloadQuery.error]);

  const handleDownload = async () => {
    try {
      const result = await downloadQuery.refetch();
      if (result.data) {
        const { data, filename } = result.data;
        if (!data) {
          toast.error("PDF 데이터를 찾을 수 없습니다.");
          return;
        }
        const binaryString = atob(data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`${filename} 다운로드 완료!`);
      }
    } catch (error) {
      console.error("다운로드 실패:", error);
      toast.error("PDF 다운로드 중 오류가 발생했습니다.");
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleDownload}
      disabled={downloadQuery.isLoading}
      className={className ?? "gap-2 border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-600 hover:text-white"}
    >
      {downloadQuery.isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      <span className="hidden sm:inline">PDF 다운로드</span>
    </Button>
  );
}
