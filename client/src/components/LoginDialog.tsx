import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getKakaoLoginUrl,
  getLoginUrl,
  getNaverLoginUrl,
} from "@/const";

type LoginDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 로그인 완료 후 돌아올 안내 문구(선택) */
  description?: string;
};

/**
 * 손님 로그인 화면에 "이메일 · 구글로 시작하기"(Manus 기본 로그인) 버튼을 노출할지 여부.
 *
 * 4·50대 타깃 손님에게는 카카오·네이버 2개만 보여주기로 하여 false 로 둔다.
 * 버튼 자체(아래 렌더링 코드)와 로직은 그대로 보존되어 있으므로,
 * 다시 노출이 필요하면 이 값을 true 로만 바꾸면 즉시 부활한다. (삭제 아님 = 숨김)
 */
const SHOW_EMAIL_GOOGLE_LOGIN = false;

/**
 * 로그인 제공자 선택 다이얼로그.
 * 카카오 → 네이버 → Manus(이메일/구글) 순으로 제시한다.
 * 각 버튼은 해당 제공자의 백엔드 진입 URL로 전체 페이지 이동한다.
 */
export default function LoginDialog({
  open,
  onOpenChange,
  description,
}: LoginDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-center">휴먼프리즘 로그인</DialogTitle>
          <DialogDescription className="text-center">
            {description ?? "간편하게 로그인하고 상담을 이어가세요."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 pt-2">
          {/* 카카오 */}
          <button
            type="button"
            onClick={() => (window.location.href = getKakaoLoginUrl())}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#FEE500] text-[#191600] font-medium transition-transform active:scale-[0.98]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 3C6.48 3 2 6.58 2 10.99c0 2.85 1.9 5.35 4.76 6.76-.21.77-.76 2.79-.87 3.22-.14.54.2.53.41.39.17-.11 2.66-1.81 3.74-2.55.64.09 1.3.14 1.96.14 5.52 0 10-3.58 10-7.99C24 6.58 19.52 3 12 3z"
                fill="#191600"
              />
            </svg>
            카카오로 시작하기
          </button>

          {/* 네이버 */}
          <button
            type="button"
            onClick={() => (window.location.href = getNaverLoginUrl())}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#03C75A] text-white font-medium transition-transform active:scale-[0.98]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M16.27 12.84 7.5 0H0v24h7.73V11.16L16.5 24H24V0h-7.73z" fill="#fff" />
            </svg>
            네이버로 시작하기
          </button>

          {/* Manus (이메일/구글 등) — SHOW_EMAIL_GOOGLE_LOGIN 으로 노출 토글. 기본 숨김. */}
          {SHOW_EMAIL_GOOGLE_LOGIN && (
            <button
              type="button"
              onClick={() => (window.location.href = getLoginUrl())}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background text-foreground font-medium transition-transform active:scale-[0.98] hover:bg-muted"
            >
              이메일 · 구글로 시작하기
            </button>
          )}
        </div>

        <p className="pt-1 text-center text-xs text-muted-foreground">
          로그인 시 서비스 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
        </p>
      </DialogContent>
    </Dialog>
  );
}
