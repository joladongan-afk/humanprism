import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SiteHeader from "@/components/SiteHeader";
import { useAuth } from "@/_core/hooks/useAuth";
import LoginDialog from "@/components/LoginDialog";
import { FreeReadingTab } from "./naming/FreeReadingTab";
import { SelfNamingTab } from "./naming/SelfNamingTab";
import { MasterNamingTab } from "./naming/MasterNamingTab";

/**
 * 작명 서비스 메인 페이지
 * 
 * 3가지 하위 탭:
 * 1. 무료 이름 감정
 * 2. 셀프작명
 * 3. 마스터 작명
 */

export default function NamingNew() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("free-reading");

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader activeOverride="/naming/new" />
        <div className="container py-20 text-center text-muted-foreground">
          잠시만요...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader activeOverride="/naming/new" />

      <div className="container py-12 max-w-4xl">
        {/* 페이지 헤더 */}
        <div className="mb-10 fade-up">
          <span className="text-xs tracking-[0.4em] text-muted-foreground">NAME READING & NAMING</span>
          <h1 className="hanja-display text-4xl mt-3">작명</h1>
          <div className="gold-divider w-32 mt-6" />
        </div>

        {/* 탭 구조 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="free-reading">무료 이름 감정</TabsTrigger>
            <TabsTrigger value="self-naming">셀프작명</TabsTrigger>
            <TabsTrigger value="master-naming">마스터 작명</TabsTrigger>
          </TabsList>

          {/* 탭 1: 무료 이름 감정 */}
          <TabsContent value="free-reading" className="mt-6">
            <FreeReadingTab />
          </TabsContent>

          {/* 탭 2: 셀프작명 */}
          <TabsContent value="self-naming" className="mt-6">
            <SelfNamingTab />
          </TabsContent>

          {/* 탭 3: 마스터 작명 */}
          <TabsContent value="master-naming" className="mt-6">
            <MasterNamingTab />
          </TabsContent>
        </Tabs>
      </div>

      {/* 로그인 다이얼로그 */}
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  );
}
