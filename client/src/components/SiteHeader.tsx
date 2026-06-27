import { Button } from "@/components/ui/button";
import LoginDialog from "@/components/LoginDialog";
import { AuroraLogo } from "@/components/AuroraLogo";
import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { consultActiveTab } from "@shared/consultActiveTab";

export { consultActiveTab };

export default function SiteHeader({ activeOverride }: { activeOverride?: string } = {}) {
  const { user, isAuthenticated, logout } = useAuth();
  const [location, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error("Logout error:", e);
    }
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/";
  };

  const NAV: { href: string; label: string; protected?: boolean; disabled?: boolean }[] = [
    { href: "/", label: "홈" },
    { href: "/saju/new", label: "만세력" },
    { href: "/plans", label: "개인 상담" },
    { href: "/compatibility", label: "궁합", protected: true },
    { href: "/naming/new", label: "작명 (준비 중)" },
    { href: "/appointments/new", label: "마스터 상담" },
    { href: "/me", label: "내 상담실", protected: true },
  ];

  const isActive = (href: string) => {
    if (activeOverride) return href === activeOverride;
    if (href === "/") return location === "/";
    return location === href || location.startsWith(href + "/");
  };

  const handleNavClick = (item: (typeof NAV)[0]) => {
    if (item.disabled) return;
    if (item.protected && !isAuthenticated) {
      setLoginOpen(true);
    } else {
      navigate(item.href);
    }
    setMobileMenuOpen(false);
  };

  // 모바일 뒤로가기: 홈이 아닌 경우 표시
  const showBack = location !== "/";
  const [visitorCount, setVisitorCount] = useState<number | null>(null);
  useEffect(() => {
    fetch("/api/visitor-count").then(r => r.json()).then(d => setVisitorCount(d.count)).catch(() => {});
  }, []);

  return (
    <header className="sticky top-0 z-50">
      {/* ── 1단: 로고 바 ── */}
      <div className="bg-black/90 backdrop-blur-md border-b border-white/[0.07]">
        {/* 모바일: 2줄 구조 */}
        <div className="md:hidden">
          {/* 모바일 1줄: 뒤로가기 + 로고 */}
          <div className="flex items-center justify-center px-4 relative" style={{ height: "3rem" }}>
            {showBack && (
              <button
                onClick={() => window.history.back()}
                className="absolute left-4 text-white/80 hover:text-white transition-colors p-1"
                aria-label="뒤로가기"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <Link href="/">
              <div className="flex items-center cursor-pointer leading-none">
                <AuroraLogo height={32} />
              </div>
            </Link>
          </div>
          {/* 모바일 2줄: 방문자수 + 로그인 + 메뉴 */}
          <div className="flex items-center justify-between px-4 pb-2 gap-2">
            <div className="flex items-center gap-1">
              {visitorCount !== null && (
                <span className="text-sm font-medium text-white/70">{visitorCount.toLocaleString()}명</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {user ? (
                <button
                  onClick={handleLogout}
                  className="text-sm font-semibold text-pink-400 hover:text-pink-300 transition-colors px-2 py-1"
                >
                  로그아웃
                </button>
              ) : (
                <button
                  onClick={() => setLoginOpen(true)}
                  className="text-sm font-semibold bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full px-3 py-1"
                >
                  로그인
                </button>
              )}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-white/80 hover:text-white transition-colors flex items-center gap-1"
                aria-label="메뉴 열기"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                </svg>
                <span className="text-sm font-semibold">메뉴</span>
              </button>
            </div>
          </div>
        </div>

        {/* 데스크탑: 기존 1줄 구조 */}
        <div
          className="hidden md:flex container items-center justify-between px-4 md:px-0"
          style={{ height: "4.5rem" }}
        >
          <Link href="/">
            <div className="flex items-center cursor-pointer leading-none">
              <AuroraLogo height={40} />
            </div>
          </Link>
          <div className="flex items-center gap-2">
            {user?.role === "admin" && (
              <Link href="/admin">
                <Button
                  variant="outline"
                  size="sm"
                  className={`text-white border-white/30 hover:bg-white/10 rounded-full px-4 whitespace-nowrap ${
                    isActive("/admin") ? "bg-white/15 border-white/50" : ""
                  }`}
                  style={{ fontSize: "1.1rem" }}
                >
                  관리자
                </Button>
              </Link>
            )}
            {user ? (
              <Button
                onClick={handleLogout}
                size="sm"
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-full px-5 transition-transform active:scale-[0.97] whitespace-nowrap"
                style={{ fontSize: "1.1rem" }}
              >
                로그아웃
              </Button>
            ) : (
              <Button
                onClick={() => setLoginOpen(true)}
                size="sm"
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-full px-5 transition-transform active:scale-[0.97] whitespace-nowrap"
                style={{ fontSize: "1.1rem" }}
              >
                로그인 / 회원가입
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── 2단: 탭 바 (데스크탑만) ── */}
      <div className="hidden md:block bg-black/75 backdrop-blur-sm border-b border-white/[0.10]">
        <div className="container flex items-center justify-center gap-0 px-4 md:px-0" style={{ height: "3.2rem" }}>
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <button
                key={item.href}
                onClick={() => handleNavClick(item)}
                disabled={item.disabled}
                className={`relative h-full px-5 font-bold whitespace-nowrap transition-colors duration-150 ${
                  item.disabled
                    ? "text-white/40 cursor-not-allowed"
                    : active
                    ? "aurora-green"
                    : "text-white hover:text-white/80"
                }`}
                style={{ fontSize: "1.3rem" }}
              >
                {item.label}
                {active && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-sm"
                    style={{ background: "linear-gradient(90deg, #ef4444, #f97316)" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 모바일 드롭다운 메뉴 ── */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-black/95 backdrop-blur-md border-b border-white/10">
          <div className="container py-3 flex flex-col gap-1 px-4">
            {NAV.map((item) => {
              const active = isActive(item.href);
              return (
                <button
                  key={item.href}
                  onClick={() => handleNavClick(item)}
                  disabled={item.disabled}
                  className={`w-full text-left py-3 px-3 rounded-lg text-base font-medium transition-colors ${
                    item.disabled
                      ? "text-white/40 cursor-not-allowed"
                      : active
                      ? "text-white bg-white/10 border-l-2 border-red-500"
                      : "text-white/75 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
            {/* 모바일 전용: 관리자/로그인/로그아웃 */}
            {user?.role === "admin" && (
              <button
                onClick={() => { navigate("/admin"); setMobileMenuOpen(false); }}
                className={`w-full text-left py-3 px-3 rounded-lg text-base font-medium transition-colors ${
                  isActive("/admin")
                    ? "text-white bg-white/10 border-l-2 border-red-500"
                    : "text-white/75 hover:text-white hover:bg-white/5"
                }`}
              >
                관리자
              </button>
            )}
            <div className="border-t border-white/10 mt-1 pt-2">
              {user ? (
                <button
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="w-full text-left py-3 px-3 rounded-lg text-base font-medium text-pink-400 hover:text-pink-300 hover:bg-white/5 transition-colors"
                >
                  로그아웃
                </button>
              ) : (
                <button
                  onClick={() => { setLoginOpen(true); setMobileMenuOpen(false); }}
                  className="w-full text-left py-3 px-3 rounded-lg text-base font-medium text-pink-400 hover:text-pink-300 hover:bg-white/5 transition-colors"
                >
                  로그인 / 회원가입
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </header>
  );
}
