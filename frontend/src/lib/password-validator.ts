// Enterprise Password Security Policy Validator

export interface PasswordValidationResult {
  valid: boolean;
  lengthValid: boolean;      // 12자 이상
  byteLengthValid: boolean;  // 72바이트 이하 (Bcrypt truncation 한계 방어)
  hasUppercase: boolean;     // 대문자 포함
  hasLowercase: boolean;     // 소문자 포함
  hasNumber: boolean;        // 숫자 포함
  hasSpecial: boolean;       // 특수문자 포함
  errorMessages: string[];
}

export function validatePasswordSecurity(password: string): PasswordValidationResult {
  const p = password || "";
  
  // 1. 길이: 최소 12자 이상
  const lengthValid = p.length >= 12;

  // 2. 바이트 길이: 72바이트 이하
  const byteLength = new TextEncoder().encode(p).length;
  const byteLengthValid = byteLength <= 72;

  // 3. 문자 다양성 (대문자, 소문자, 숫자, 특수문자)
  const hasUppercase = /[A-Z]/.test(p);
  const hasLowercase = /[a-z]/.test(p);
  const hasNumber = /[0-9]/.test(p);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(p);

  const errorMessages: string[] = [];
  if (!lengthValid) errorMessages.push("비밀번호는 최소 12자 이상이어야 합니다.");
  if (!byteLengthValid) errorMessages.push("비밀번호는 72바이트 이하여야 합니다.");
  if (!hasUppercase) errorMessages.push("영문 대문자(A-Z)가 최소 1자 이상 포함되어야 합니다.");
  if (!hasLowercase) errorMessages.push("영문 소문자(a-z)가 최소 1자 이상 포함되어야 합니다.");
  if (!hasNumber) errorMessages.push("숫자(0-9)가 최소 1자 이상 포함되어야 합니다.");
  if (!hasSpecial) errorMessages.push("특수문자(!@#$%^&* 등)가 최소 1자 이상 포함되어야 합니다.");

  const valid = lengthValid && byteLengthValid && hasUppercase && hasLowercase && hasNumber && hasSpecial;

  return {
    valid,
    lengthValid,
    byteLengthValid,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecial,
    errorMessages,
  };
}
