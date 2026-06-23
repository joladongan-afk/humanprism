import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const freeReadingSchema = z.object({
  surnameKorean: z.string().min(1, "성씨를 입력해주세요"),
  surnameHanja: z.string().optional(),
  nameKorean: z.string().min(1, "이름을 입력해주세요"),
  nameHanja: z.string().min(1, "한자 이름을 입력해주세요"),
});

type FreeReadingFormData = z.infer<typeof freeReadingSchema>;

interface FreeReadingFormProps {
  onSuccess?: (result: any) => void;
}

export function FreeReadingForm({ onSuccess }: FreeReadingFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FreeReadingFormData>({
    resolver: zodResolver(freeReadingSchema),
    defaultValues: {
      surnameKorean: "",
      surnameHanja: "",
      nameKorean: "",
      nameHanja: "",
    },
  });

  const freeReadingMutation = trpc.naming.freeReading.useMutation({
    onSuccess: (data) => {
      toast.success(`이름 감정 완료 - 인증번호: ${data.certificateNumber}`);
      onSuccess?.(data);
      form.reset();
    },
    onError: (error) => {
      toast.error(error.message || "이름 감정 중 오류가 발생했습니다");
    },
  });

  const onSubmit = async (data: FreeReadingFormData) => {
    setIsLoading(true);
    try {
      await freeReadingMutation.mutateAsync(data);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>무료 이름 감정</CardTitle>
        <CardDescription>
          성씨와 이름을 입력하면 자원오행, 파동오행, 수리사격을 분석해드립니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 성씨 입력 */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="surnameKorean"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>성씨 (한글)</FormLabel>
                    <FormControl>
                      <Input placeholder="예: 김" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="surnameHanja"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>성씨 (한자)</FormLabel>
                    <FormControl>
                      <Input placeholder="예: 金" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 이름 입력 */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nameKorean"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이름 (한글)</FormLabel>
                    <FormControl>
                      <Input placeholder="예: 민준" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nameHanja"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이름 (한자)</FormLabel>
                    <FormControl>
                      <Input placeholder="예: 民俊" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 제출 버튼 */}
            <Button
              type="submit"
              disabled={isLoading || freeReadingMutation.isPending}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isLoading || freeReadingMutation.isPending ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  분석 중...
                </>
              ) : (
                "이름 감정하기"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
