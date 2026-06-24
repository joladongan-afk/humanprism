import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export interface EmailShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: number;
  /** 공유할 제목 (이메일 제목으로 사용) */
  title: string;
  /** 공유할 요약 텍스트 */
  summary: string;
  /** 이메일 전송 콜백 (외부에서 처리하는 경우) */
  onConfirm?: (email: string) => Promise<void>;
  /** 로딩 상태 */
  isLoading?: boolean;
}

export function EmailShareDialog({
  open,
  onOpenChange,
  sessionId,
  title,
  summary,
  onConfirm,
  isLoading: externalIsLoading = false,
}: EmailShareDialogProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const sendEmailMutation = trpc.consult.sendEmailShare.useMutation();

  const handleSend = async () => {
    if (!email.trim()) {
      toast.error("이메일 주소를 입력해 주세요.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("올바른 이메일 주소를 입력해 주세요.");
      return;
    }

    setIsLoading(true);
    try {
      // 외부 콜백 또는 내부 처리
      if (onConfirm) {
        await onConfirm(email);
      } else {
        await sendEmailMutation.mutateAsync({
          sessionId,
          recipientEmail: email,
        });
      }
      toast.success("상담 기록이 이메일로 전송되었습니다.");
      setEmail("");
      onOpenChange(false);
    } catch (error) {
      console.error("이메일 전송 실패:", error);
      toast.error("이메일 전송에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  const loading = isLoading || externalIsLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>상담 기록 이메일 전송</DialogTitle>
          <DialogDescription>
            상담 기록을 이메일로 받으실 주소를 입력해 주세요.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">이메일 주소</Label>
            <Input
              id="email"
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !loading) {
                  handleSend();
                }
              }}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {title === "전체 상담 기록"
              ? "전체 상담 기록이 이메일로 전송됩니다."
              : "상담 기록의 요약과 함께 이메일이 전송됩니다."}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            취소
          </Button>
          <Button onClick={handleSend} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                전송 중...
              </>
            ) : (
              "전송"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
