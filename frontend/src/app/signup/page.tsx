"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, saveLocalAuth } from "@/lib/supabase-client";
import {
  backendSignup,
  backendSendOtp,
  backendVerifyOtp,
} from "@/lib/backend-client";
import { validatePasswordSecurity } from "@/lib/password-validator";
import {
  Mail,
  Lock,
  User,
  Sparkles,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Send,
  Check,
  Clock,
  ShieldCheck,
} from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [fullName, setFullName] = useState("");

  // Email Inline OTP States
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
      setErrorMsg(err.message || `${provider} 회원가입 중 오류가 발생했습니다.`);
      setSocialLoading(null);
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
    setSuccessMsg(null);
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
      setSuccessMsg("이메일 인증이 성공적으로 완료되었습니다! ✓");
    } catch (err: any) {
      setErrorMsg(err.message || "인증번호가 일치하지 않거나 만료되었습니다.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Signup Submit
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailVerified) {
      setErrorMsg("이메일 인증번호 확인을 먼저 완료해주세요.");
      return;
    }
    if (!pwdSecurity.valid) {
      setErrorMsg(pwdSecurity.errorMessages[0] || "비밀번호 보안 조건을 충족해주세요.");
      return;
    }
    if (password !== passwordConfirm) {
      setErrorMsg("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const securePassword = await hashClientPassword(password);
      const res = await backendSignup(email, securePassword, fullName);
      if (res.accessToken) {
        saveLocalAuth(res.accessToken, res.user, res.refreshToken);
      }
      setSuccessMsg("회원가입이 완료되었습니다! 메인 화면으로 이동합니다.");
      setTimeout(() => {
        router.push("/");
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || "회원가입 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-blue-600 selection:text-white">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 right-1/2 translate-x-1/2 w-[600px] h-[350px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[300px] bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />

      {/* Top back navigation */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 mb-6">
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>메인 화면으로 돌아가기</span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Card Box */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          {/* Header & Logo */}
          <div className="text-center space-y-2">
            <Link href="/" className="inline-flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-xs">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Ziwon<span className="text-blue-600">.AI</span>
              </span>
            </Link>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight pt-1">
              회원가입
            </h1>
            <p className="text-xs text-slate-500">
              3초 만에 가입하고 AI 맞춤 지원사업과 사업계획서를 무료로 체험하세요.
            </p>
          </div>

          {/* Mode Switch Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
            <Link
              href="/login"
              className="py-2.5 text-xs font-semibold rounded-xl text-slate-500 hover:text-slate-900 transition-all text-center flex items-center justify-center"
            >
              로그인
            </Link>
            <button
              type="button"
              className="py-2.5 text-xs font-bold rounded-xl bg-white text-slate-900 shadow-2xs transition-all border border-slate-200"
            >
              회원가입
            </button>
          </div>

          {/* Notification Messages */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2 animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center space-x-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Social Sign Up Section (Top Focus for Easy Sign-up) */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleSocialLogin("kakao")}
              disabled={loading || socialLoading !== null}
              className="w-full py-3 px-4 rounded-xl bg-[#FEE500] hover:bg-[#FEE500]/90 text-[#191919] font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-2xs cursor-pointer disabled:opacity-60"
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
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-60 shadow-2xs"
            >
              {socialLoading === "google" ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-700" />
                  <span>Google 연결 중...</span>
                </>
              ) : (
                <>
                  <span className="font-bold text-sm text-slate-900">G</span>
                  <span>Google 계정으로 계속하기</span>
                </>
              )}
            </button>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200" />
            <span className="flex-shrink mx-3 text-[11px] text-slate-400 font-medium">
              또는 이메일로 가입
            </span>
            <div className="flex-grow border-t border-slate-200" />
          </div>

          {/* Email Signup Form */}
          <form onSubmit={handleSignupSubmit} className="space-y-3.5">
            {/* 1. Name */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">이름 / 닉네임 (선택)</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="홍길동"
                  className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-100 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors shadow-2xs"
                />
              </div>
            </div>

            {/* 2. Email & OTP */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">이메일 주소 *</label>
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    disabled={isEmailVerified}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className={`w-full bg-white border rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors shadow-2xs ${
                      isEmailVerified ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-100"
                    }`}
                  />
                </div>

                {!isEmailVerified && (
                  <button
                    type="button"
                    disabled={sendingOtp || !email}
                    onClick={handleSendOtp}
                    className="px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all flex items-center space-x-1 flex-shrink-0 cursor-pointer disabled:opacity-50 shadow-2xs"
                  >
                    {sendingOtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>{isOtpSent ? "재발송" : "인증번호"}</span>
                  </button>
                )}

                {isEmailVerified && (
                  <div className="px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center space-x-1 flex-shrink-0">
                    <Check className="w-4 h-4" />
                    <span>인증완료</span>
                  </div>
                )}
              </div>
            </div>

            {/* OTP Code Box */}
            {isOtpSent && !isEmailVerified && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2 animate-fade-in">
                <div className="flex justify-between text-[11px]">
                  <span className="text-blue-800 font-bold">인증번호 6자리</span>
                  <span className="text-amber-700 font-mono font-bold flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>남은 시간 {formatTimer(timeLeft)}</span>
                  </span>
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="6자리 숫자"
                    className="flex-1 bg-white border border-blue-300 rounded-xl py-2 px-3 text-xs text-slate-900 font-mono tracking-widest focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={verifyingOtp || otpCode.length < 6}
                    onClick={handleVerifyOtp}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs disabled:opacity-50 cursor-pointer"
                  >
                    {verifyingOtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "확인"}
                  </button>
                </div>
              </div>
            )}

            {/* 3. Password */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">비밀번호 (6자 이상) *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="안전한 비밀번호 입력"
                  className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-100 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors shadow-2xs"
                />
              </div>
            </div>

            {/* 4. Password Confirm */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">비밀번호 확인 *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="비밀번호 다시 입력"
                  className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-100 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors shadow-2xs"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !isEmailVerified || !pwdSecurity.valid || password !== passwordConfirm}
              className="w-full mt-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:border disabled:border-slate-200 text-white font-bold text-xs shadow-md shadow-blue-600/25 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>가입 처리 중...</span>
                </>
              ) : (
                <span>
                  {!isEmailVerified
                    ? "이메일 인증을 먼저 완료해주세요"
                    : !pwdSecurity.valid
                    ? "비밀번호 조건을 충족해주세요"
                    : password !== passwordConfirm
                    ? "비밀번호 확인이 일치하지 않습니다"
                    : "회원가입 완료하기"}
                </span>
              )}
            </button>
          </form>

          {/* Footer Terms Notice */}
          <div className="pt-2 text-center text-[11px] text-slate-400 space-x-2">
            <span>가입 시</span>
            <Link href="/terms" className="text-slate-600 hover:text-blue-600 underline underline-offset-2">
              이용약관
            </Link>
            <span>및</span>
            <Link href="/privacy" className="text-slate-600 hover:text-blue-600 underline underline-offset-2">
              개인정보 처리방침
            </Link>
            <span>에 동의하게 됩니다.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
