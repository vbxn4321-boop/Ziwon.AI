"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, saveLocalAuth } from "@/lib/supabase-client";
import {
  backendLogin,
  backendSendOtp,
  backendVerifyOtp,
  backendResetPassword,
} from "@/lib/backend-client";
import { validatePasswordSecurity } from "@/lib/password-validator";
import {
  Mail,
  Lock,
  Sparkles,
  ArrowLeft,
  Loader2,
  LogIn,
  AlertCircle,
  CheckCircle2,
  Send,
  Check,
  Clock,
  KeyRound,
  ShieldCheck,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Forgot password mode states
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(180);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"kakao" | "google" | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const pwdSecurity = validatePasswordSecurity(password);

  // Auto-reset loading on BFCache / page restore
  useEffect(() => {
    const handleReset = () => {
      setLoading(false);
      setSocialLoading(null);
    };
    window.addEventListener("pageshow", handleReset);
    window.addEventListener("focus", handleReset);
    return () => {
      window.removeEventListener("pageshow", handleReset);
      window.removeEventListener("focus", handleReset);
    };
  }, []);

  // OTP Timer
  useEffect(() => {
    let timerId: any;
    if (isOtpSent && !isEmailVerified && timeLeft > 0) {
      timerId = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timerId);
  }, [isOtpSent, isEmailVerified, timeLeft]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const hashClientPassword = async (rawPassword: string): Promise<string> => {
    const msgBuffer = new TextEncoder().encode(rawPassword);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };

  // Social Login Handler
  const handleSocialLogin = async (provider: "google" | "kakao") => {
    setSocialLoading(provider);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || `${provider} 로그인 중 오류가 발생했습니다.`);
      setSocialLoading(null);
    }
  };

  // Email Login Handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("이메일과 비밀번호를 모두 입력해주세요.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const securePassword = await hashClientPassword(password);
      const res = await backendLogin(email, securePassword);
      if (res.accessToken) {
        saveLocalAuth(res.accessToken, res.user, res.refreshToken);
      }
      setSuccessMsg("로그인 성공! 메인 화면으로 이동합니다.");
      setTimeout(() => {
        router.push("/");
      }, 600);
    } catch (err: any) {
      setErrorMsg(err.message || "로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.");
    } finally {
      setLoading(false);
    }
  };

  // OTP Send
  const handleSendOtp = async () => {
    if (!email || !email.includes("@")) {
      setErrorMsg("올바른 이메일 주소를 입력해주세요.");
      return;
    }
    setSendingOtp(true);
    setErrorMsg(null);
    try {
      const res = await backendSendOtp(email);
      setIsOtpSent(true);
      setTimeLeft(180);
      setSuccessMsg(res.message || `${email} 주소로 6자리 인증번호가 발송되었습니다.`);
    } catch (err: any) {
      setErrorMsg(err.message || "인증번호 발송 실패");
    } finally {
      setSendingOtp(false);
    }
  };

  // OTP Verify
  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 6) {
      setErrorMsg("6자리 인증번호를 정확히 입력해주세요.");
      return;
    }
    setVerifyingOtp(true);
    setErrorMsg(null);
    try {
      await backendVerifyOtp(email, otpCode.trim());
      setIsEmailVerified(true);
      setSuccessMsg("이메일 인증이 완료되었습니다. 새 비밀번호를 설정해주세요.");
    } catch (err: any) {
      setErrorMsg(err.message || "인증번호가 일치하지 않습니다.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Reset Password Submit
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailVerified) {
      setErrorMsg("이메일 인증을 먼저 완료해주세요.");
      return;
    }
    if (!pwdSecurity.valid) {
      setErrorMsg(pwdSecurity.errorMessages[0] || "비밀번호 보안 조건을 충족해주세요.");
      return;
    }
    if (password !== passwordConfirm) {
      setErrorMsg("새 비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const securePassword = await hashClientPassword(password);
      const res = await backendResetPassword(email, securePassword);
      if (res.accessToken) {
        saveLocalAuth(res.accessToken, res.user, res.refreshToken);
      }
      setSuccessMsg("비밀번호가 성공적으로 변경되었습니다! 로그인 처리됩니다.");
      setTimeout(() => {
        router.push("/");
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || "비밀번호 변경 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-blue-600 selection:text-white">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[300px] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Top back navigation */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 mb-6">
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>메인 화면으로 돌아가기</span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Card Box */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/50 space-y-6">
          {/* Header & Logo */}
          <div className="text-center space-y-2">
            <Link href="/" className="inline-flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-black text-white tracking-tight">
                Ziwon<span className="text-blue-400">.AI</span>
              </span>
            </Link>
            <h1 className="text-lg font-bold text-white tracking-tight pt-1">
              {isForgotMode ? "비밀번호 재설정" : "로그인"}
            </h1>
            <p className="text-xs text-slate-400">
              {isForgotMode
                ? "가입하신 이메일로 6자리 인증번호를 받아 재설정합니다."
                : "대한민국 100만 기업을 위한 AI 맞춤 지원사업 플랫폼"}
            </p>
          </div>

          {/* Mode Switch Tabs */}
          {!isForgotMode && (
            <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-2xl border border-slate-800">
              <button
                type="button"
                className="py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md transition-all"
              >
                로그인
              </button>
              <Link
                href="/signup"
                className="py-2.5 text-xs font-semibold rounded-xl text-slate-400 hover:text-white transition-all text-center flex items-center justify-center"
              >
                회원가입
              </Link>
            </div>
          )}

          {/* Notification Messages */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2 animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Login Form */}
          {!isForgotMode ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">이메일 주소</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-slate-950/90 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">비밀번호</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotMode(true);
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    비밀번호를 잊으셨나요?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호 입력"
                    className="w-full bg-slate-950/90 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>로그인 중...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>이메일로 로그인하기</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Forgot Password Form */
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">가입 이메일 주소</label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      disabled={isEmailVerified}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full bg-slate-950/90 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none transition-colors"
                    />
                  </div>
                  {!isEmailVerified && (
                    <button
                      type="button"
                      disabled={sendingOtp || !email}
                      onClick={handleSendOtp}
                      className="px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all flex items-center space-x-1 flex-shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {sendingOtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>{isOtpSent ? "재발송" : "인증번호"}</span>
                    </button>
                  )}
                  {isEmailVerified && (
                    <div className="px-3 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center space-x-1 flex-shrink-0">
                      <Check className="w-4 h-4" />
                      <span>인증완료</span>
                    </div>
                  )}
                </div>
              </div>

              {isOtpSent && !isEmailVerified && (
                <div className="p-3 bg-blue-950/20 border border-blue-500/30 rounded-xl space-y-2">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-blue-300 font-bold">인증번호 6자리</span>
                    <span className="text-amber-400 font-mono flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimer(timeLeft)}</span>
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="6자리 숫자"
                      className="flex-1 bg-slate-900 border border-blue-500/40 rounded-xl py-2 px-3 text-xs text-slate-100 font-mono tracking-widest focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={verifyingOtp || otpCode.length < 6}
                      onClick={handleVerifyOtp}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs disabled:opacity-50"
                    >
                      {verifyingOtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "확인"}
                    </button>
                  </div>
                </div>
              )}

              {isEmailVerified && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">새 비밀번호 (6자 이상)</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="새 비밀번호 입력"
                      className="w-full bg-slate-950/90 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">새 비밀번호 확인</label>
                    <input
                      type="password"
                      required
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="새 비밀번호 다시 입력"
                      className="w-full bg-slate-950/90 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {loading ? "변경 중..." : "비밀번호 변경 완료 및 로그인"}
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsForgotMode(false);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="w-full text-center text-xs text-slate-400 hover:text-slate-200 pt-2"
              >
                ← 로그인으로 돌아가기
              </button>
            </form>
          )}

          {/* Social Login Section */}
          {!isForgotMode && (
            <div className="space-y-3 pt-2">
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-800" />
                <span className="flex-shrink mx-3 text-[11px] text-slate-500 font-medium">
                  또는 간편 로그인
                </span>
                <div className="flex-grow border-t border-slate-800" />
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleSocialLogin("kakao")}
                  disabled={loading || socialLoading !== null}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#FEE500] hover:bg-[#FEE500]/90 text-[#191919] font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md cursor-pointer disabled:opacity-60"
                >
                  {socialLoading === "kakao" ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#191919]" />
                      <span>카카오 연결 중...</span>
                    </>
                  ) : (
                    <>
                      <span className="font-extrabold text-sm">💬</span>
                      <span>카카오로 3초 만에 시작하기</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleSocialLogin("google")}
                  disabled={loading || socialLoading !== null}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-white border border-slate-700 font-semibold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-60"
                >
                  {socialLoading === "google" ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>Google 연결 중...</span>
                    </>
                  ) : (
                    <>
                      <span className="font-bold text-sm">G</span>
                      <span>Google 계정으로 계속하기</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Footer Terms Notice */}
          <div className="pt-2 text-center text-[11px] text-slate-500 space-x-2">
            <span>로그인 시</span>
            <Link href="/terms" className="text-slate-400 hover:text-blue-400 underline underline-offset-2">
              이용약관
            </Link>
            <span>및</span>
            <Link href="/privacy" className="text-slate-400 hover:text-blue-400 underline underline-offset-2">
              개인정보 처리방침
            </Link>
            <span>에 동의하게 됩니다.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
