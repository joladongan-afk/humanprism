import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Share2, Link2, MessageCircle, Check, Mail } from "lucide-react";
import { toast } from "sonner";
import { buildXIntentUrl } from "@shared/share";
import { EmailShareDialog } from "./EmailShareDialog";

declare global {
  interface Window {
    Kakao?: any;
  }
}

const KAKAO_JS_KEY = import.meta.env.VITE_KAKAO_JS_KEY as string | undefined;

/** 카카오 SDK 초기화 (JS 키가 있을 때만). 중복 init 방지. */
function ensureKakaoInit(): boolean {
  if (!KAKAO_JS_KEY) return false;
  const Kakao = window.Kakao;
  if (!Kakao) return false;
  if (!Kakao.isInitialized()) {
    try {
      Kakao.init(KAKAO_JS_KEY);
    } catch {
      return false;
    }
  }
  return Kakao.isInitialized();
}

export interface ShareButtonProps {
  /** 공유 제목 */
  title: string;
  /** 공유 설명(요약) */
  description?: string;
  /** 공유할 URL. 미지정 시 현재 페이지 URL */
  url?: string;
  /** 버튼 변형 */
  variant?: "outline" | "ghost" | "default";
  size?: "sm" | "default" | "icon";
  className?: string;
  /** 버튼 라벨. 기본 "공유" */
  label?: string;
  /** 이메일 공유 활성화 여부 (sessionId 필요) */
  enableEmailShare?: boolean;
  /** 상담 세션 ID (이메일 공유 시 필요) */
  sessionId?: number;
}

export default function ShareButton({
  title,
  description,
  url,
  variant = "outline",
  size = "sm",
  className,
  label = "공유",
  enableEmailShare = false,
  sessionId,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("링크를 복사했습니다.");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("복사에 실패했습니다. 주소창에서 직접 복사해 주세요.");
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: description, url: shareUrl });
      } catch {
        // 사용자가 취소한 경우 무시
      }
      return true;
    }
    return false;
  };

  const handleKakaoShare = () => {
    if (!ensureKakaoInit()) {
      toast.message("카카오 공유는 준비 중입니다.", {
        description: "링크 복사로 공유해 주세요.",
      });
      void handleCopyLink();
      return;
    }
    try {
      window.Kakao.Share.sendDefault({
        objectType: "text",
        text: `${title}\n\n${description ?? ""}`.trim(),
        link: {
          mobileWebUrl: shareUrl,
          webUrl: shareUrl,
        },
      });
    } catch {
      toast.error("카카오 공유에 실패했습니다.");
    }
  };

  const handleX = () => {
    window.open(buildXIntentUrl(title, shareUrl), "_blank", "noopener,noreferrer");
  };

  const handleEmailShare = () => {
    if (!enableEmailShare || !sessionId) {
      toast.error("이메일 공유를 사용할 수 없습니다.");
      return;
    }
    setEmailDialogOpen(true);
  };

  // 모바일 네이티브 공유가 가능하면, 한 번의 클릭으로 OS 공유 시트를 띄우는 것이 가장 자연스럽다.
  const canNativeShare =
    typeof navigator !== "undefined" && typeof (navigator as any).share === "function";

  const handlePrimaryClick = async () => {
    if (canNativeShare) {
      const ok = await handleNativeShare();
      if (ok) return;
    }
    // 데스크톱 등에서는 드롭다운으로 처리되므로 여기 도달하지 않음
  };

  if (canNativeShare) {
    // 모바일: 단일 버튼 → OS 공유 시트
    return (
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={handlePrimaryClick}
      >
        <Share2 className="w-4 h-4" />
        {size !== "icon" && <span className="ml-1.5">{label}</span>}
      </Button>
    );
  }

  // 데스크톱: 드롭다운으로 선택지 제공
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant={variant} size={size} className={className}>
            <Share2 className="w-4 h-4" />
            {size !== "icon" && <span className="ml-1.5">{label}</span>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer">
            {copied ? (
              <Check className="w-4 h-4 text-celadon-deep" />
            ) : (
              <Link2 className="w-4 h-4" />
            )}
            <span>{copied ? "복사됨" : "링크 복사"}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleKakaoShare} className="cursor-pointer">
            <MessageCircle className="w-4 h-4" />
            <span>카카오톡</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleX} className="cursor-pointer">
            <span className="w-4 h-4 inline-flex items-center justify-center font-bold text-[13px]">
              X
            </span>
            <span>X(트위터)</span>
          </DropdownMenuItem>
          {enableEmailShare && sessionId && (
            <DropdownMenuItem onClick={handleEmailShare} className="cursor-pointer">
              <Mail className="w-4 h-4" />
              <span>이메일</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {enableEmailShare && sessionId && (
        <EmailShareDialog
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
          sessionId={sessionId}
          title={title}
          summary={description || ""}
        />
      )}
    </>
  );
}
