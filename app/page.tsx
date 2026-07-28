"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/components/AuthProvider";
import { isFirebaseConfigured } from "@/src/lib/firebase";
import AnimatedBackground from "@/src/components/common/AnimatedBackground";

export default function LoginPage() {
  const router = useRouter();
  const { signInWithGoogle, authError } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const displayError = authError || errorMsg;

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleGoogleLogin = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isFirebaseConfigured) {
      setErrorMsg("Firebase chưa được cấu hình. Vui lòng liên hệ quản trị viên để thiết lập.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      await signInWithGoogle();
      router.replace("/dashboard");
    } catch (error: any) {
      console.error("Firebase Google Auth Error:", error);
      
      const errStr = (error.message || error.code || "").toLowerCase();
      if (error.code === "auth/popup-closed-by-user" || errStr.includes("popup-closed-by-user")) {
        setErrorMsg("Hộp thoại đăng nhập đã bị đóng. Vui lòng thử lại!");
      } else if (error.code === "auth/popup-blocked" || errStr.includes("popup-blocked")) {
        setErrorMsg("Trình duyệt đã chặn cửa sổ đăng nhập Google. Vui lòng cho phép popup để tiếp tục!");
      } else if (error.code === "auth/unauthorized-domain" || errStr.includes("unauthorized-domain")) {
        setErrorMsg("Tên miền này chưa được cấu hình (Authorized Domain) trong Firebase Console.");
      } else if (error.code === "auth/network-request-failed" || errStr.includes("network-request-failed")) {
        setErrorMsg("Lỗi kết nối mạng. Vui lòng kiểm tra lại kết nối internet!");
      } else {
        setErrorMsg(`Đăng nhập thất bại: ${error.message || error.code}`);
      }
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="relative w-screen h-screen flex items-center justify-center overflow-hidden select-none font-sans">
      <AnimatedBackground />

      {/* Dynamic inline styles for premium floating animations */}
      <style jsx global>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-18px) rotate(4deg); }
        }
        @keyframes float-medium {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-28px) rotate(-6deg); }
        }
        @keyframes pulse-soft {
          0%, 100% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.05); opacity: 0.25; }
        }
        .animate-float-slow {
          animation: float-slow 10s ease-in-out infinite;
        }
        .animate-float-medium {
          animation: float-medium 7s ease-in-out infinite;
        }
        .animate-pulse-soft {
          animation: pulse-soft 5s ease-in-out infinite;
        }
      `}</style>

      {/* Decorative Floating Background Elements */}
      {/* Top Left: Egg Outline */}
      <div className="absolute top-10 left-10 md:top-20 md:left-24 text-white/40 animate-float-slow">
        <svg width="80" height="100" viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M40 10C18 10 10 45 10 65C10 82 23 90 40 90C57 90 70 82 70 65C70 45 62 10 40 10Z" stroke="currentColor" strokeWidth="3" strokeDasharray="6 6" />
        </svg>
      </div>

      {/* Top Right: Chick Face Outline */}
      <div className="absolute top-16 right-12 md:top-32 md:right-28 text-white/30 animate-float-medium hidden sm:block">
        <svg width="70" height="70" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="35" cy="35" r="30" stroke="currentColor" strokeWidth="3" strokeDasharray="4 4" />
          <path d="M30 40L35 45L40 40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="23" cy="30" r="3" fill="currentColor" />
          <circle cx="47" cy="30" r="3" fill="currentColor" />
        </svg>
      </div>

      {/* Bottom Left: Another Egg */}
      <div className="absolute bottom-16 left-12 md:bottom-28 md:left-32 text-white/35 animate-float-medium hidden md:block">
        <svg width="60" height="75" viewBox="0 0 60 75" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M30 8C14 8 8 34 8 49C8 62 17 68 30 68C43 68 52 62 52 49C52 34 46 8 30 8Z" stroke="currentColor" strokeWidth="2.5" />
        </svg>
      </div>

      {/* Bottom Right: Little Chick Footprints or Egg Shell */}
      <div className="absolute bottom-10 right-10 md:bottom-20 md:right-24 text-white/40 animate-float-slow">
        <svg width="90" height="90" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 55L35 70L50 55L65 70L80 55L90 75H10V55Z" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="8 4" />
        </svg>
      </div>



      {/* Main Login Card */}
      <div className="relative w-full max-w-[460px] mx-4 bg-white/95 rounded-[32px] shadow-[0_24px_70px_rgba(224,140,0,0.22)] border border-white/60 p-8 sm:p-10 md:p-12 z-10 backdrop-blur-md transition-all duration-500 hover:shadow-[0_30px_80px_rgba(224,140,0,0.3)] hover:scale-[1.01] flex flex-col items-center">

        {/* Logo Image */}
        <div className="relative mb-6 w-24 h-24 rounded-full overflow-hidden border-4 border-amber-50 shadow-[0_8px_20px_rgba(245,176,0,0.18)] bg-white flex items-center justify-center transition-transform duration-500 hover:scale-105 select-none pointer-events-none">
          <img
            src="/logov2.png"
            alt="Logo"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Brand Titles */}
        <div className="flex flex-col items-center mb-1">
          <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-[#1F2937] tracking-wide text-center">
            HỆ THỐNG ẤP TRỨNG
          </h3>
          <h3 className="text-lg sm:text-xl md:text-2xl font-bold tracking-wide text-center">
            <span className="text-[#f97316]">HATCH</span><span className="text-[#0284c7]">MATE</span>
          </h3>
          <span className="text-[11px] sm:text-xs font-bold text-[#F5B000] tracking-widest uppercase mt-1">
            Smart Incubation Management System
          </span>
        </div>

        {/* Divider with soft gradient */}
        <div className="w-16 h-1 rounded-full bg-gradient-to-r from-transparent via-[#FFD56B] to-transparent my-4"></div>

        {/* Short Description */}
        <p className="text-gray-500 text-xs sm:text-sm font-medium leading-relaxed max-w-[340px] mb-8 select-none text-center">
          Theo dõi nhiệt độ, độ ẩm, đảo trứng và trạng thái thiết bị theo thời gian thực.
        </p>

        {/* Firebase Config Warning Alert */}
        {!isFirebaseConfigured && (
          <div className="w-full mb-6 p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-800 text-xs font-semibold select-none transition-all duration-300 flex flex-col gap-1 text-left">
            <span className="font-bold flex items-center gap-1 text-amber-900">
              ⚠️ Cấu hình Firebase chưa sẵn sàng
            </span>
            <p className="text-amber-700/90 font-medium leading-relaxed">
              Tệp <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-950 font-bold font-mono">.env.local</code> chưa được cấu hình API Key hợp lệ. Đăng nhập Google đã bị tạm khóa.
            </p>
          </div>
        )}

        {/* Error / Warning Alert */}
        {displayError && (
          <div className="w-full mb-6 p-3 rounded-2xl bg-orange-50 border border-orange-200/50 text-orange-700 text-xs font-semibold text-center select-none transition-all duration-300">
            {displayError}
          </div>
        )}

        {/* Login Area / Action Button */}
        <div className="w-full flex flex-col items-center">
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading || !isFirebaseConfigured}
            className={`group relative w-full flex items-center justify-center gap-3.5 px-6 py-3.5 rounded-full shadow-md transition-all duration-300 ${
              isLoading || !isFirebaseConfigured
              ? "bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed opacity-60"
              : "bg-gradient-to-r from-[#f97316] to-[#0284c7] text-white font-extrabold hover:from-[#ea580c] hover:to-[#0369a1] hover:shadow-lg hover:-translate-y-[2px] active:translate-y-0 active:scale-[0.98] cursor-pointer"
            }`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="font-bold text-white">Đang kết nối...</span>
              </>
            ) : (
              <>
                {/* Official Google G Icon inside a white circle for contrast */}
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-105">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                </div>
                <span>Đăng nhập bằng Google</span>
              </>
            )}
          </button>

        </div>

        {/* Footer info */}
        <div className="mt-8 text-center">
          <p className="text-[10px] sm:text-xs text-gray-400 font-semibold tracking-wider">
            © 2026 HatchMate. Smart Agri-Tech Solution.
          </p>
        </div>
      </div>
    </div>
  );
}
