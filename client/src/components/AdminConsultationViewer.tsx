import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Streamdown } from "streamdown";

interface AdminConsultationViewerProps {
  sessionId: number;
}

export function AdminConsultationViewer({ sessionId }: AdminConsultationViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: messages, isLoading, error } = trpc.consult.getSessionMessages.useQuery(
    { sessionId },
    { enabled: isExpanded }
  );

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          {error instanceof Error ? error.message : "메시지를 불러올 수 없습니다."}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">상담 내용</CardTitle>
            <CardDescription>세션 #{sessionId}</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-auto"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="h-5 w-5" />
              <span className="ml-2 text-sm text-gray-600">메시지 로딩 중...</span>
            </div>
          ) : messages && messages.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {messages.map((msg) => (
                <div key={msg.id} className="border-l-2 border-gray-200 pl-3 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <Badge
                      variant={msg.role === "user" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {msg.role === "user" ? "사용자" : "AI"}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {format(new Date(msg.createdAt), "HH:mm:ss", { locale: ko })}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 prose prose-sm max-w-none">
                    <Streamdown>{msg.content}</Streamdown>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-4 text-center">메시지가 없습니다.</p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
