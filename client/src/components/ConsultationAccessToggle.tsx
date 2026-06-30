import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Lock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ConsultationAccessToggleProps {
  sessionId: number;
  initialAllow: boolean;
  onToggle?: (allow: boolean) => void;
}

export function ConsultationAccessToggle({
  sessionId,
  initialAllow,
  onToggle,
}: ConsultationAccessToggleProps) {
  const [isEnabled, setIsEnabled] = useState(initialAllow);
  const [isLoading, setIsLoading] = useState(false);

  const toggleMutation = trpc.consult.toggleMasterAccess.useMutation();

  const handleChange = async (allow: boolean) => {
    if (isLoading || allow === isEnabled) return;
    setIsLoading(true);
    try {
      await toggleMutation.mutateAsync({
        sessionId,
        allow,
      });

      setIsEnabled(allow);
      onToggle?.(allow);

      toast.success(
        allow
          ? "운영자가 상담 내용을 열람할 수 있습니다."
          : "운영자 열람이 차단되었습니다."
      );
    } catch (error) {
      toast.error("설정 변경에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card
      className={`px-3 py-2.5 ${
        isEnabled
          ? "border-green-200 bg-green-50"
          : "border-rose-300 bg-rose-50 ring-1 ring-rose-200"
      }`}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Label className="flex items-center gap-2 text-sm font-medium">
          {isEnabled ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
          ) : (
            <Lock className="h-4 w-4 shrink-0 text-rose-600" />
          )}
          <span className={isEnabled ? "text-green-800" : "text-rose-700"}>
            <strong>상담 내용 공유 {isEnabled ? "허용 중" : "차단 중"}</strong>
            {" / 아래 두 버튼 중 하나를 선택하여 운영자(마스터)의 열람 권한을 설정하실 수 있습니다."}
          </span>
        </Label>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleChange(true)}
            disabled={isLoading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border-2 text-sm font-bold transition-colors ${
              isEnabled
                ? "border-green-600 bg-green-600 text-white"
                : "border-slate-300 bg-white text-slate-500"
            }`}
          >
            <span
              className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                isEnabled ? "border-white" : "border-slate-400"
              }`}
            >
              {isEnabled && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
            </span>
            허용함
          </button>
          <button
            type="button"
            onClick={() => handleChange(false)}
            disabled={isLoading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border-2 text-sm font-bold transition-colors ${
              !isEnabled
                ? "border-rose-600 bg-rose-600 text-white"
                : "border-slate-300 bg-white text-slate-500"
            }`}
          >
            <span
              className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                !isEnabled ? "border-white" : "border-slate-400"
              }`}
            >
              {!isEnabled && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
            </span>
            허용 안 함
          </button>
        </div>
      </div>
    </Card>
  );
}
