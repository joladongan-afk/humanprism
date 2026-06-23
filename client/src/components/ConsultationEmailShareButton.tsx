import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { EmailShareDialog } from "./EmailShareDialog";

export interface ConsultationEmailShareButtonProps {
  sessionId: number;
  disabled?: boolean;
}

export function ConsultationEmailShareButton({
  sessionId,
  disabled = false,
}: ConsultationEmailShareButtonProps) {
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const sendEmailMutation = trpc.consult.sendEmailShare.useMutation();

  const handleOpenDialog = () => {
    setEmailDialogOpen(true);
  };

  const handleSendEmail = async (email: string) => {
    setIsLoading(true);
    try {
      await sendEmailMutation.mutateAsync({
        sessionId,
        recipientEmail: email,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpenDialog}
        disabled={disabled || isLoading}
        className="bg-card"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Mail className="w-4 h-4" />
        )}
        <span className="hidden sm:inline ml-1">상담 기록 이메일</span>
      </Button>

      <EmailShareDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        sessionId={sessionId}
        title="전체 상담 기록"
        summary="전체 상담 기록을 이메일로 전송합니다."
        onConfirm={handleSendEmail}
        isLoading={isLoading}
      />
    </>
  );
}
