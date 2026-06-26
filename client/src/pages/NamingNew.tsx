import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SiteHeader from "@/components/SiteHeader";
import { useAuth } from "@/_core/hooks/useAuth";
import LoginDialog from "@/components/LoginDialog";
import { FreeReadingTab } from "./naming/FreeReadingTab";
import { SelfNamingTab } from "./naming/SelfNamingTab";
import { MasterNamingTab } from "./naming/MasterNamingTab";

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

      {/* 페이지 헤더 — 개인상담과 동일한 hero 양식 */}
      <div className="page-hero relative w-full h-[360px] flex items-center bg-gradient-to-br from-slate-950 via-blue-900 to-slate-900 overflow-hidden">
        {/* 배경 블러 오브 */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-700/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/25 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl" />

        <div className="relative z-10 w-full text-center px-6 space-y-4">
          <span className="text-base md:text-lg tracking-[0.4em] text-cyan-300/80 font-semibold">
            NAME READING & NAMING
          </span>
          <h1 className="hanja-display text-5xl md:text-6xl text-white font-bold mt-2">
            작명
          </h1>
          <p className="text-white/70 text-base md:text-lg mt-3 max-w-xl mx-auto leading-relaxed">
            이름은 평생 불리는 기운입니다.<br />
            사주에 맞는 이름으로 삶의 흐름을 바꾸세요.
          </p>
        </div>
      </div>

      {/* 탭 구조 */}
      <div className="container py-12 max-w-4xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="free-reading">무료 이름 감정</TabsTrigger>
            <TabsTrigger value="self-naming">셀프작명</TabsTrigger>
            <TabsTrigger value="master-naming">마스터 작명</TabsTrigger>
          </TabsList>

          <TabsContent value="free-reading" className="mt-6">
            <FreeReadingTab />
          </TabsContent>

          <TabsContent value="self-naming" className="mt-6">
            <SelfNamingTab />
          </TabsContent>

          <TabsContent value="master-naming" className="mt-6">
            <MasterNamingTab />
          </TabsContent>
        </Tabs>
      </div>

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  );
}
