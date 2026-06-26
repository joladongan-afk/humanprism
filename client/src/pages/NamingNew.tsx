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

      {/* 페이지 헤더 — 마스터 상담과 동일한 구조, 에메랄드 계열 */}
      <div className="page-hero relative w-full h-[360px] flex items-center bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-900 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-600/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/25 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-green-600/20 rounded-full blur-3xl" />

        <div className="relative z-10 w-full text-center px-6">
          <span className="text-base md:text-lg tracking-[0.4em] text-emerald-200/90 font-semibold leading-tight h-6 flex items-center justify-center">
            NAME READING & NAMING
          </span>
          <h1 className="hanja-display text-6xl md:text-7xl mt-6 text-white leading-[1.3] font-bold">
            작명
          </h1>
          <div className="gold-divider w-40 mx-auto mt-8" />
          <p className="text-emerald-50/90 mt-8 leading-relaxed max-w-2xl mx-auto text-xl md:text-2xl">
            이름은 평생 불리는 기운입니다.<br />
            사주에 맞는 이름으로 삶의 흐름을 바꾸세요.
          </p>
        </div>
      </div>

      {/* 탭 구조 */}
      <div className="container py-12 max-w-6xl">
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
