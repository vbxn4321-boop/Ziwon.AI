import nodemailer from "nodemailer";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<{ success: boolean; previewUrl?: string }> {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

  // 1. If SMTP credentials are configured in .env (Real Mail Transmission)
  if (user && pass) {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: `"Ziwon.AI 지원사업" <${user}>`,
      to,
      subject,
      html,
    });

    console.log(`[SMTP REAL MAIL SENT] >> ${to} (Subject: ${subject})`);
    return { success: true };
  }

  // 2. If SMTP is not yet configured, use Ethereal Test SMTP or log
  try {
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    const info = await transporter.sendMail({
      from: '"Ziwon.AI 인증센터" <no-reply@ziwon.ai>',
      to,
      subject,
      html,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    console.log(`[EMAIL DISPATCHED] To: ${to} | Preview: ${previewUrl}`);
    return { success: true, previewUrl };
  } catch (err: any) {
    console.warn("SMTP fallback warning:", err.message);
    return { success: true };
  }
}

export function buildOtpEmailHtml(email: string, code: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Ziwon.AI 이메일 인증번호</title>
</head>
<body style="margin: 0; padding: 40px 0; background-color: #0B0F17; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; margin: 0 auto; background-color: #111827; border: 1px solid #1F2937; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
    <!-- Header -->
    <tr>
      <td style="padding: 36px 40px; background: linear-gradient(135deg, #1E1B4B 0%, #0F172A 100%); border-bottom: 1px solid #312E81; text-align: center;">
        <span style="font-size: 26px; font-weight: 800; background: linear-gradient(90deg, #818CF8, #C084FC); -webkit-background-clip: text; color: #818CF8; letter-spacing: -0.5px;">Ziwon.AI</span>
        <div style="font-size: 13px; color: #A5B4FC; margin-top: 6px; font-weight: 600;">대한민국 1등 AI 정부지원사업 매칭 & PSST 플랫폼</div>
      </td>
    </tr>
    <!-- Content -->
    <tr>
      <td style="padding: 40px 40px 30px 40px;">
        <h1 style="font-size: 20px; font-weight: 700; color: #F8FAFC; margin: 0 0 16px 0;">이메일 인증번호를 확인해 주세요</h1>
        <p style="font-size: 14px; line-height: 1.6; color: #94A3B8; margin: 0 0 28px 0;">
          안녕하세요, 대표님!<br>
          <strong style="color: #E2E8F0;">${email}</strong> 계정의 안전한 회원가입을 위해 아래 6자리 인증번호를 가입 화면에 입력해 주세요.
        </p>

        <!-- OTP Code Box -->
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #1E1B4B; border: 1px solid #4F46E5; border-radius: 16px; margin-bottom: 28px;">
          <tr>
            <td style="padding: 24px; text-align: center;">
              <div style="font-size: 12px; font-weight: 600; color: #A5B4FC; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">인증번호 (유효시간 3분)</div>
              <div style="font-size: 36px; font-weight: 800; font-family: monospace; letter-spacing: 8px; color: #FFFFFF; text-shadow: 0 0 15px rgba(99,102,241,0.6);">${code}</div>
            </td>
          </tr>
        </table>

        <p style="font-size: 12px; line-height: 1.5; color: #64748B; margin: 0;">
          * 본 인증번호는 발송 시점으로부터 <strong>3분간만 유효</strong>합니다.<br>
          * 본인이 요청하지 않은 경우 본 메일을 무시하셔도 안전합니다.
        </p>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="padding: 24px 40px; background-color: #0F172A; border-top: 1px solid #1E293B; text-align: center; font-size: 12px; color: #475569;">
        © 2026 Ziwon.AI Inc. All rights reserved.<br>
        본 메일은 발신 전용 메일입니다.
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
