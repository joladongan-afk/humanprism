import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Send, X, MessageCircle, Phone } from "lucide-react";
import { CsAvatarIcon } from "./CsAvatarIcon";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const CONTACT_NUMBER = "010-4448-8064";
const CONTACT_HOURS = "09:00 ~ 21:00";

export function CsChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const chatMutation = trpc.cs?.chat?.useMutation?.();
  const saveHistoryMutation = trpc.cs?.saveChatHistory?.useMutation?.();

  // 메시지 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const currentInput = input.trim();

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: currentInput,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // 멀티턴 히스토리 구성 (현재 메시지 제외한 이전 대화)
    const historyForServer = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const result = await chatMutation.mutateAsync({
        message: currentInput,
        history: historyForServer,
      });

      const responseText = typeof result.response === "string"
        ? result.response
        : "죄송합니다. 잠시 후 다시 시도해 주세요.";

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: responseText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // 인증된 사용자면 채팅 기록 저장
      if (user) {
        await saveHistoryMutation.mutateAsync({
          message: currentInput,
          response: responseText,
          matchedFaqId: result.matchedFaqId ?? undefined,
          similarityScore: result.similarityScore,
        });
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content:
          "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주시거나, 운영자에게 직접 문의해 주세요.\n\n📞 **010-4448-8064** (문자, 09:00~21:00)",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // 한글 IME 조합 중의 엔터는 글자 확정용이므로 전송하지 않음
    if ((e.nativeEvent as any).isComposing || (e as any).keyCode === 229) {
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 닫힌 상태: 플로팅 버튼
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 translate-y-0 lg:bottom-1/2 lg:right-6 lg:translate-y-1/2 z-40 flex items-center justify-center w-16 h-16 lg:w-20 lg:h-20 rounded-full shadow-xl ring-2 ring-white/60 hover:shadow-2xl transition-all hover:scale-110 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%)" }}
        aria-label="이용 안내 챗봇 열기"
      >
        <CsAvatarIcon />
      </button>
    );
  }

  return (
    <Card className="fixed bottom-20 right-3 left-3 translate-y-0 lg:bottom-1/2 lg:right-6 lg:left-auto lg:translate-y-1/2 z-50 w-auto lg:w-96 max-h-[70vh] lg:max-h-[640px] flex flex-col shadow-2xl border-0 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 text-white"
        style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%)" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full overflow-hidden ring-2 ring-white/40 shrink-0">
            <CsAvatarIcon />
          </div>
          <div>
            <h3 className="font-bold text-sm leading-tight">이용 안내 도우미</h3>
            <p className="text-xs opacity-80 leading-tight">서비스 이용에 대해 무엇이든 물어보세요</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
          aria-label="닫기"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 운영자 연락처 배너 */}
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
        <MessageCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>
          직접 문의:{" "}
          <a
            href={`sms:${CONTACT_NUMBER.replace(/-/g, "")}`}
            className="font-semibold text-blue-700 hover:underline"
          >
            {CONTACT_NUMBER}
          </a>
          {" "}문자 응대 {CONTACT_HOURS}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-20 h-20 mb-4 rounded-full overflow-hidden ring-4 ring-slate-200 shadow">
              <CsAvatarIcon />
            </div>
            <p className="text-sm font-bold text-slate-700 mb-1">안녕하세요!</p>
            <p className="text-xs text-slate-500 leading-relaxed max-w-[220px]">
              휴먼프리즘 이용 안내 도우미입니다.
              <br />
              서비스 이용 방법, 요금, 상담 방법 등
              <br />
              무엇이든 편하게 물어보세요.
            </p>
            <div className="mt-4 flex flex-col gap-2 w-full max-w-[240px]">
              {[
                "어떤 서비스인가요?",
                "요금은 얼마인가요?",
                "어떻게 시작하나요?",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q);
                    setTimeout(() => {
                      const btn = document.querySelector("[data-send-btn]") as HTMLButtonElement;
                      if (btn) btn.click();
                    }, 50);
                  }}
                  className="text-xs text-left px-3 py-2 bg-white border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-slate-600"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full overflow-hidden ring-1 ring-slate-200 shrink-0 mt-0.5">
                <CsAvatarIcon />
              </div>
            )}
            <div
              className={`max-w-[72%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-tr-sm"
                  : "bg-white text-slate-800 border border-slate-200 rounded-tl-sm shadow-sm"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              <p
                className={`text-[10px] mt-1 text-right ${
                  msg.role === "user" ? "text-blue-200" : "text-slate-400"
                }`}
              >
                {msg.timestamp.toLocaleTimeString("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2 justify-start">
            <div className="w-7 h-7 rounded-full overflow-hidden ring-1 ring-slate-200 shrink-0 mt-0.5">
              <CsAvatarIcon />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-3.5 py-2.5 flex items-center gap-2 shadow-sm">
              <Spinner className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-sm text-slate-500">답변을 작성 중입니다...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t bg-white">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="궁금한 점을 입력하세요..."
            disabled={isLoading}
            className="flex-1 text-sm rounded-full border-slate-300 focus:border-blue-400"
          />
          <Button
            data-send-btn
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            size="sm"
            className="rounded-full w-9 h-9 p-0 bg-blue-600 hover:bg-blue-700 text-white shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
