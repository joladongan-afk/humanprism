import { useState } from "react";
import { Switch } from "@/components/ui/switch";
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

  const handleToggle = async (allow: boolean) => {
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
      setIsEnabled(!allow);
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
      <div className="flex items-center justify-between gap-3">
        <Label
          htmlFor="master-access"
          className="flex items-center gap-2 cursor-pointer text-sm font-medium"
        >
          {isEnabled ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
          ) : (
            <Lock className="h-4 w-4 shrink-0 text-rose-600" />
          )}
          <span className={isEnabled ? "text-green-800" : "text-rose-700"}>
            <strong>상담 내용 공유 {isEnabled ? "허용 중" : "차단 중"}</strong>
            {" / 오른쪽 끝 버튼을 클릭하시면 운영자(마스터)의 열람 권한을 설정하실 수 있습니다."}
          </span>
        </Label>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-sm font-bold ${isEnabled ? "text-green-700" : "text-rose-700"}`}>
            {isEnabled ? "허용함" : "허용 안 함"}
          </span>
          <Switch
            id="master-access"
            checked={isEnabled}
            onCheckedChange={handleToggle}
            disabled={isLoading}
            className="scale-125"
          />
        </div>
      </div>
    </Card>
  );
}
