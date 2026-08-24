"use client";

import React, { useState, useEffect } from "react";
import { supabase, saveLocalAuth } from "@/lib/supabase-client";
import {
  backendSendOtp,
  backendVerifyOtp,
  backendSignup,
  backendLogin,
  backendResetPassword,
} from "@/lib/backend-client";
import { validatePasswordSecurity, PasswordValidationResult } from "@/lib/password-validator";
import {
  X,
  Mail,
  Lock,
  User,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
  ArrowLeft,
  Check,
  Clock,
  Send,
  LogIn,
  ShieldCheck,
} from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
}

export default function AuthModal({ isOpen, onClose, onLoginSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [fullName, setFullName] = useState("");

  // Email Inline Verification States
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(180); // 3분 타이머
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 실시간 비밀번호 4대 보안 정책 검증
  const pwdSecurity: PasswordValidationResult = validatePasswordSecurity(password);

  // 모달이 열릴 때 모든 폼 상태 및 에러/성공 메시지를 완전 초기화 (로그인 모드로 리셋)
  useEffect(() => {
    if (isOpen) {
      setMode("login");
      setEmail("");
      setPassword("");
      setPasswordConfirm("");
      setFullName("");
      setIsOtpSent(false);
      setOtpCode("");
      setIsEmailVerified(false);
      setTimeLeft(180);
      setSendingOtp(false);
      setVerifyingOtp(false);
      setLoading(false);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  // 3분 카운트다운 타이머
  useEffect(() => {
    let timerId: any;
    if (isOtpSent && !isEmailVerified && timeLeft > 0) {
      timerId = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timerId);
  }, [isOtpSent, isEmailVerified, timeLeft]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  if (!isOpen) return null;

  // 1. Social Login (Google / Kakao)
  const handleSocialLogin = async (provider: "google" | "kakao") => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  // 2. Send Inline Email OTP (인증번호 발송)
  const handleSendEmailOtp = async () => {
    if (!email || !email.includes("@")) {
      setErrorMsg("올바른 이메일 주소를 먼저 입력해주세요.");
      return;
    }

    setSendingOtp(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await backendSendOtp(email);
      setIsOtpSent(true);
      setTimeLeft(180);
      setSuccessMsg(res.message || `${email} 주소로 인증번호가 발송되었습니다. 메일함을 확인해주세요!`);
    } catch (err: any) {
      setErrorMsg(err.message || "인증번호 발송에 실패했습니다.");
    } finally {
      setSendingOtp(false);
    }
  };

  // 3. Verify Inline Email OTP (인증번호 확인)
  const handleVerifyEmailOtp = async () => {
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
      setErrorMsg(err.message || "인증번호가 올바르지 않거나 만료되었습니다.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Client-Side Password Hashing (E2EE 암호화 - 네트워크 탭에서도 평문 비밀번호 노출 차단)
  const hashClientPassword = async (rawPassword: string): Promise<string> => {
    const msgBuffer = new TextEncoder().encode(rawPassword);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };

  // 4. Final Sign Up / Login Submit
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "signup") {
      if (!isEmailVerified) {
        setErrorMsg("먼저 이메일 인증번호 확인을 완료해주세요.");
        return;
      }
      // 4대 보안 정책 엄격 검증
      if (!pwdSecurity.valid) {
        setErrorMsg(pwdSecurity.errorMessages[0] || "비밀번호 보안 규칙을 모두 만족해야 합니다.");
        return;
      }
      if (password !== passwordConfirm) {
        setErrorMsg("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
        return;
      }
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 프론트엔드에서 1차 암호화 해싱 후 전송 (네트워크 페이로드 평문 노출 방지)
      const securePassword = await hashClientPassword(password);

      if (mode === "signup") {
        const res = await backendSignup(email, securePassword, fullName);
        if (res.accessToken) {
          saveLocalAuth(res.accessToken, res.user, res.refreshToken);
        }
        setSuccessMsg("회원가입이 완료되었습니다! 자동 로그인됩니다.");
        setTimeout(() => {
          onLoginSuccess?.();
          onClose();
        }, 1000);
      } else {
        // Normal Login
        const res = await backendLogin(email, securePassword);
        if (res.accessToken) {
          saveLocalAuth(res.accessToken, res.user, res.refreshToken);
        }
        setSuccessMsg("로그인 성공!");
        setTimeout(() => {
          onLoginSuccess?.();
          onClose();
        }, 800);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "로그인/가입 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 5. Password Reset (Forgot Password)
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg("이메일 주소를 입력해주세요.");
      return;
    }
    if (!isEmailVerified) {
      setErrorMsg("먼저 이메일 인증번호 확인을 완료해주세요.");
      return;
    }
    if (!pwdSecurity.valid) {
      setErrorMsg(pwdSecurity.errorMessages[0] || "비밀번호 보안 조건을 충족해주세요.");
      return;
    }
    if (password !== passwordConfirm) {
      setErrorMsg("새 비밀번호와 확인이 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const securePassword = await hashClientPassword(password);
      const res = await backendResetPassword(email, securePassword);
      if (res.accessToken) {
        saveLocalAuth(res.accessToken, res.user, res.refreshToken);
      }
      setSuccessMsg("비밀번호가 성공적으로 변경되었습니다! 자동 로그인됩니다.");
      setTimeout(() => {
        onLoginSuccess?.();
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || "비밀번호 재설정 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (newMode: "login" | "signup" | "forgot") => {
    setMode(newMode);
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsOtpSent(false);
    setIsEmailVerified(false);
    setOtpCode("");
    setPassword("");
    setPasswordConfirm("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-purple-950/30 overflow-hidden text-slate-100 max-h-[92vh] flex flex-col">
        {/* Background Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Title */}
        <div className="text-center space-y-2 mb-5 flex-shrink-0">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Ziwon.AI 원클릭 통합 로그인</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {mode === "login"
              ? "다시 오신 것을 환영합니다"
              : mode === "signup"
              ? "간편 회원가입"
              : "비밀번호 재설정"}
          </h2>
        </div>

        {/* Mode Switch Tabs (Only in login / signup mode) */}
        {mode !== "forgot" && (
          <div className="grid grid-cols-2 p-1 bg-slate-950/70 border border-slate-800 rounded-2xl mb-4 flex-shrink-0">
            <button
              onClick={() => handleModeChange("login")}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                mode === "login"
                  ? "bg-slate-800 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              로그인
            </button>
            <button
              onClick={() => handleModeChange("signup")}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                mode === "signup"
                  ? "bg-purple-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              회원가입
            </button>
          </div>
        )}

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto pr-1 flex-1 space-y-4">
          {/* Error / Success Alerts */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/30 text-red-300 text-xs flex items-center space-x-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Mode: Forgot Password */}
          {mode === "forgot" ? (
            <form onSubmit={handleResetPassword} className="space-y-3.5">
              {/* 1. Email Field */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">가입한 이메일 주소 *</label>
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
                      className={`w-full bg-slate-950/80 border rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none transition-colors ${
                        isEmailVerified
                          ? "border-emerald-500/60 bg-emerald-950/10 text-emerald-300"
                          : "border-slate-800 focus:border-purple-500"
                      }`}
                    />
                  </div>

                  {/* [인증번호 발송] 버튼 */}
                  {!isEmailVerified && (
                    <button
                      type="button"
                      disabled={sendingOtp || !email}
                      onClick={handleSendEmailOtp}
                      className="px-3.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white font-bold text-xs transition-all flex items-center space-x-1.5 flex-shrink-0 cursor-pointer shadow-md shadow-purple-600/20 disabled:opacity-50"
                    >
                      {sendingOtp ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>{isOtpSent ? "재발송" : "인증번호 발송"}</span>
                    </button>
                  )}

                  {/* 이메일 인증 완료 뱃지 */}
                  {isEmailVerified && (
                    <div className="px-3 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center space-x-1 flex-shrink-0">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>인증완료</span>
                    </div>
                  )}
                </div>
              </div>

              {/* [인증번호 6자리 입력칸] */}
              {isOtpSent && !isEmailVerified && (
                <div className="p-3.5 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-2 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-purple-300 font-bold">이메일 6자리 인증번호</span>
                    <span className="text-amber-400 font-mono flex items-center space-x-1">
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
                      placeholder="6자리 숫자 입력"
                      className="flex-1 bg-slate-900 border border-purple-500/40 rounded-xl py-2 px-3 text-xs text-slate-100 font-mono tracking-widest focus:outline-none focus:border-purple-400"
                    />
                    <button
                      type="button"
                      disabled={verifyingOtp || otpCode.length < 6}
                      onClick={handleVerifyEmailOtp}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold text-xs transition-all flex items-center space-x-1 cursor-pointer disabled:opacity-50 shadow-md shadow-emerald-600/20"
                    >
                      {verifyingOtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>인증 확인</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    * 전송받은 6자리 인증번호를 입력하고 [인증 확인]을 눌러주세요.
                  </p>
                </div>
              )}

              {/* [새 비밀번호 설정 필드 - 이메일 인증 완료 후 활성화] */}
              {isEmailVerified && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">새 비밀번호 *</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="영문 대/소문자, 숫자, 특수문자 포함 (최소 6자)"
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  {/* 실시간 4대 보안 정책 피드백 */}
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] space-y-1.5">
                    <div className="flex items-center space-x-1.5 text-slate-300 font-bold mb-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                      <span>비밀번호 보안 충족 조건 (Bcrypt 12 Rounds)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <div className={`flex items-center space-x-1 ${pwdSecurity.lengthValid ? "text-emerald-400 font-semibold" : "text-slate-500"}`}>
                        <span>{pwdSecurity.lengthValid ? "✓" : "•"}</span>
                        <span>최소 6자 이상</span>
                      </div>
                      <div className={`flex items-center space-x-1 ${pwdSecurity.byteLengthValid ? "text-emerald-400 font-semibold" : "text-red-400"}`}>
                        <span>{pwdSecurity.byteLengthValid ? "✓" : "•"}</span>
                        <span>72바이트 이하</span>
                      </div>
                      <div className={`flex items-center space-x-1 ${pwdSecurity.hasUppercase && pwdSecurity.hasLowercase ? "text-emerald-400 font-semibold" : "text-slate-500"}`}>
                        <span>{pwdSecurity.hasUppercase && pwdSecurity.hasLowercase ? "✓" : "•"}</span>
                        <span>영문 대문자 & 소문자</span>
                      </div>
                      <div className={`flex items-center space-x-1 ${pwdSecurity.hasNumber && pwdSecurity.hasSpecial ? "text-emerald-400 font-semibold" : "text-slate-500"}`}>
                        <span>{pwdSecurity.hasNumber && pwdSecurity.hasSpecial ? "✓" : "•"}</span>
                        <span>숫자 및 특수문자</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">새 비밀번호 확인 *</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type="password"
                        required
                        value={passwordConfirm}
                        onChange={(e) => setPasswordConfirm(e.target.value)}
                        placeholder="새 비밀번호 다시 입력"
                        className={`w-full bg-slate-950/80 border rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none transition-colors ${
                          passwordConfirm && password !== passwordConfirm
                            ? "border-red-500 focus:border-red-500"
                            : passwordConfirm && password === passwordConfirm
                            ? "border-emerald-500 focus:border-emerald-500"
                            : "border-slate-800 focus:border-purple-500"
                        }`}
                      />
                    </div>
                    {passwordConfirm && password !== passwordConfirm && (
                      <p className="text-[10px] text-red-400">비밀번호가 일치하지 않습니다.</p>
                    )}
                    {passwordConfirm && password === passwordConfirm && (
                      <p className="text-[10px] text-emerald-400">비밀번호가 일치합니다. ✓</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !pwdSecurity.valid || password !== passwordConfirm}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                    <span>새 비밀번호로 변경 및 즉시 로그인</span>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleModeChange("login")}
                className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 flex items-center justify-center space-x-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>로그인 화면으로 돌아가기</span>
              </button>
            </form>
          ) : (
            /* Mode: Login / Sign Up Main Form (이메일 입력이 최상단!) */
            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              {/* Name (Only in Signup) */}
              {mode === "signup" && (
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">대표자명 / 닉네임</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="예: 홍길동 대표"
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              )}

              {/* 1. Email Field */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">이메일 주소 *</label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      disabled={mode === "signup" && isEmailVerified}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className={`w-full bg-slate-950/80 border rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none transition-colors ${
                        isEmailVerified
                          ? "border-emerald-500/60 bg-emerald-950/10 text-emerald-300"
                          : "border-slate-800 focus:border-purple-500"
                      }`}
                    />
                  </div>

                  {/* [인증번호 발송] 버튼 */}
                  {mode === "signup" && !isEmailVerified && (
                    <button
                      type="button"
                      disabled={sendingOtp || !email}
                      onClick={handleSendEmailOtp}
                      className="px-3.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white font-bold text-xs transition-all flex items-center space-x-1.5 flex-shrink-0 cursor-pointer shadow-md shadow-purple-600/20 disabled:opacity-50"
                    >
                      {sendingOtp ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>{isOtpSent ? "재발송" : "인증번호 발송"}</span>
                    </button>
                  )}

                  {/* 이메일 인증 완료 뱃지 */}
                  {mode === "signup" && isEmailVerified && (
                    <div className="px-3 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center space-x-1 flex-shrink-0">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>인증완료</span>
                    </div>
                  )}
                </div>
              </div>

              {/* [인증번호 6자리 입력칸] */}
              {mode === "signup" && isOtpSent && !isEmailVerified && (
                <div className="p-3.5 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-2 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-purple-300 font-bold">이메일 6자리 인증번호</span>
                    <span className="text-amber-400 font-mono flex items-center space-x-1">
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
                      placeholder="6자리 숫자 입력"
                      className="flex-1 bg-slate-900 border border-purple-500/40 rounded-xl py-2 px-3 text-xs text-slate-100 font-mono tracking-widest focus:outline-none focus:border-purple-400"
                    />
                    <button
                      type="button"
                      disabled={verifyingOtp || otpCode.length < 6}
                      onClick={handleVerifyEmailOtp}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold text-xs transition-all flex items-center space-x-1 cursor-pointer disabled:opacity-50 shadow-md shadow-emerald-600/20"
                    >
                      {verifyingOtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>인증 확인</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    * 이메일로 전송된 6자리 번호를 입력하고 [인증 확인]을 눌러주세요.
                  </p>
                </div>
              )}

              {/* 2. Password Field */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-300">비밀번호 *</label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-[11px] text-purple-400 hover:text-purple-300 underline cursor-pointer"
                    >
                      비밀번호를 잊으셨나요?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "signup" ? "12자 이상 (대소문자, 숫자, 특수문자)" : "비밀번호 입력"}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* [최고 보안 4대 조건 실시간 체크리스트] (회원가입 모드일 때만 표시) */}
              {mode === "signup" && password.length > 0 && (
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5 text-[10.5px] animate-in fade-in">
                  <div className="flex items-center space-x-1.5 text-slate-300 font-bold mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                    <span>비밀번호 보안 충족 조건 (Bcrypt 12 Rounds)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <div className={`flex items-center space-x-1 ${pwdSecurity.lengthValid ? "text-emerald-400 font-semibold" : "text-slate-500"}`}>
                      <span>{pwdSecurity.lengthValid ? "✓" : "•"}</span>
                      <span>최소 12자 이상 ({password.length}/12)</span>
                    </div>
                    <div className={`flex items-center space-x-1 ${pwdSecurity.byteLengthValid ? "text-emerald-400 font-semibold" : "text-red-400"}`}>
                      <span>{pwdSecurity.byteLengthValid ? "✓" : "•"}</span>
                      <span>72바이트 이하</span>
                    </div>
                    <div className={`flex items-center space-x-1 ${pwdSecurity.hasUppercase && pwdSecurity.hasLowercase ? "text-emerald-400 font-semibold" : "text-slate-500"}`}>
                      <span>{pwdSecurity.hasUppercase && pwdSecurity.hasLowercase ? "✓" : "•"}</span>
                      <span>영문 대문자 & 소문자</span>
                    </div>
                    <div className={`flex items-center space-x-1 ${pwdSecurity.hasNumber && pwdSecurity.hasSpecial ? "text-emerald-400 font-semibold" : "text-slate-500"}`}>
                      <span>{pwdSecurity.hasNumber && pwdSecurity.hasSpecial ? "✓" : "•"}</span>
                      <span>숫자 및 특수문자</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Password Confirm Field (Signup Only) */}
              {mode === "signup" && (
                <div className="space-y-1 animate-in fade-in">
                  <label className="text-[11px] font-semibold text-slate-300">비밀번호 확인 *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="비밀번호 다시 입력"
                      className={`w-full bg-slate-950/80 border rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none transition-colors ${
                        passwordConfirm && password !== passwordConfirm
                          ? "border-red-500 focus:border-red-500"
                          : passwordConfirm && password === passwordConfirm
                          ? "border-emerald-500 focus:border-emerald-500"
                          : "border-slate-800 focus:border-purple-500"
                      }`}
                    />
                  </div>
                  {passwordConfirm && password !== passwordConfirm && (
                    <p className="text-[10px] text-red-400">비밀번호가 일치하지 않습니다.</p>
                  )}
                  {passwordConfirm && password === passwordConfirm && (
                    <p className="text-[10px] text-emerald-400">비밀번호가 일치합니다. ✓</p>
                  )}
                </div>
              )}

              {/* 3. Main Login / Signup Submit Button */}
              <button
                type="submit"
                disabled={loading || (mode === "signup" && (!isEmailVerified || !pwdSecurity.valid))}
                className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>처리 중...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-3.5 h-3.5" />
                    <span>
                      {mode === "login"
                        ? "이메일로 로그인하기"
                        : !isEmailVerified
                        ? "이메일 인증을 먼저 완료해주세요"
                        : !pwdSecurity.valid
                        ? "비밀번호 보안 조건을 충족해주세요"
                        : "회원가입 완료하기"}
                    </span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* 4. Social Login Section (Placed at the Bottom!) */}
          {mode === "login" && (
            <div className="pt-2 space-y-3">
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-800" />
                <span className="flex-shrink mx-3 text-[11px] text-slate-500 font-medium">
                  또는 소셜 계정으로 간편 로그인
                </span>
                <div className="flex-grow border-t border-slate-800" />
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => handleSocialLogin("kakao")}
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#FEE500] hover:bg-[#FEE500]/90 text-[#191919] font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  <span className="font-extrabold text-sm">💬</span>
                  <span>카카오로 3초 만에 시작하기</span>
                </button>

                <button
                  onClick={() => handleSocialLogin("google")}
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-white border border-slate-700 font-semibold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <span className="font-bold text-sm">G</span>
                  <span>Google 계정으로 계속하기</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
