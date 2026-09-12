// lib/email.ts

export type WelcomeEmailOptions = {
  email: string;
  name?: string;
  companyName?: string;
};

export async function sendWelcomeEmail({ email, name, companyName }: WelcomeEmailOptions) {
  const userName = name || email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const company = companyName || "Oogway AI";

  const subject = `🎉 You're in! Welcome to Oogway AI — 15-Day Trial Unlocked`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Oogway AI</title>
</head>
<body style="margin: 0; padding: 0; background-color: #090d16; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #090d16; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-bottom: 1px solid #1e293b;">
              <div style="display: inline-block; width: 56px; height: 56px; background-color: #1e293b; border-radius: 50%; padding: 4px; margin-bottom: 12px; border: 1px solid #334155;">
                <img src="https://oogway.ai/images/oogway_turtle_logo.png" alt="Oogway Logo" width="48" height="48" style="border-radius: 50%; object-fit: cover;" />
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Account Registered! 🎉</h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #94a3b8; font-weight: 500;">Your 24/7 AI Employee is ready for action.</p>
            </td>
          </tr>

          <!-- Main Body Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="font-size: 15px; line-height: 1.6; color: #e2e8f0; margin-top: 0;">
                Hi <strong>${userName}</strong>,
              </p>
              <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
                Congratulations! You’ve successfully registered for <strong>${company}</strong>. You're now equipped with an enterprise-grade AI support employee for your website.
              </p>

              <!-- Highlighted Value Hook Box -->
              <div style="background: linear-gradient(135deg, rgba(178, 234, 77, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%); border: 1px solid rgba(178, 234, 77, 0.3); border-radius: 12px; padding: 20px; margin: 24px 0;">
                <p style="margin: 0 0 10px; font-size: 13px; font-weight: 800; color: #b2ea4d; text-transform: uppercase; letter-spacing: 1px;">
                  🎁 15-DAY VIP TRIAL ACTIVATED ($2,999 VALUE)
                </p>
                <ul style="margin: 0; padding-left: 18px; color: #e2e8f0; font-size: 13px; line-height: 1.7;">
                  <li>⚡ <strong>Sub-50ms Response Speed</strong>: Delight visitors with instant replies.</li>
                  <li>💰 <strong>Cut Support Costs by 90%</strong>: Automate up to 80% of customer inquiries.</li>
                  <li>📈 <strong>Auto Lead & Ticket Creation</strong>: Never lose a potential customer or order query.</li>
                  <li>🔒 <strong>Zero Setup Hassle</strong>: Crawl your site & go live in 2 minutes.</li>
                </ul>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0 16px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" target="_blank" style="display: inline-block; background-color: #b2ea4d; color: #0f172a; font-size: 14px; font-weight: 800; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 12px rgba(178, 234, 77, 0.3);">
                  Launch Your AI Chatbot Now →
                </a>
              </div>

              <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 24px; margin-bottom: 0;">
                No credit card required. Need help getting started? Simply reply to this email!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #0b1329; border-top: 1px solid #1e293b; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748b;">
                © ${new Date().getFullYear()} Oogway AI Inc. All rights reserved. • Pure, Instant AI Automation
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "Oogway AI <welcome@oogway.ai>",
          to: [email],
          subject,
          html: htmlContent,
        }),
      });
      const data = await res.json();
      console.log("Welcome Email dispatched via Resend:", data);
      return { success: true, provider: "resend", data, htmlContent, subject };
    } else {
      console.log(`[WELCOME EMAIL DISPATCH] (Simulated / Development Mode) To: ${email} | Subject: ${subject}`);
      return { success: true, provider: "simulated", email, subject, htmlContent };
    }
  } catch (err: any) {
    console.warn("Failed to dispatch Welcome Email:", err?.message || err);
    return { success: false, error: err?.message || err, htmlContent, subject };
  }
}

export type VerificationEmailOptions = {
  email: string;
  name?: string;
  verificationUrl: string;
};

export async function sendVerificationEmail({ email, name, verificationUrl }: VerificationEmailOptions) {
  const userName = name || email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const subject = `✉️ Verify your email address for Oogway AI`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your Email Address</title>
</head>
<body style="margin: 0; padding: 0; background-color: #090d16; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #090d16; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-bottom: 1px solid #1e293b;">
              <div style="display: inline-block; width: 56px; height: 56px; background-color: #1e293b; border-radius: 50%; padding: 4px; margin-bottom: 12px; border: 1px solid #334155;">
                <img src="https://oogway.ai/images/oogway_turtle_logo.png" alt="Oogway Logo" width="48" height="48" style="border-radius: 50%; object-fit: cover;" />
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Verify Your Email Address</h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #94a3b8; font-weight: 500;">One final step to complete your registration.</p>
            </td>
          </tr>

          <!-- Main Body Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="font-size: 15px; line-height: 1.6; color: #e2e8f0; margin-top: 0;">
                Hi <strong>${userName}</strong>,
              </p>
              <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
                Please click the button below to verify your email address and activate your Oogway AI account.
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0 24px;">
                <a href="${verificationUrl}" target="_blank" style="display: inline-block; background-color: #b2ea4d; color: #0f172a; font-size: 14px; font-weight: 800; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 12px rgba(178, 234, 77, 0.3);">
                  Verify Email Address →
                </a>
              </div>

              <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; word-break: break-all; text-align: center;">
                Or copy and paste this link in your browser:<br/>
                <a href="${verificationUrl}" style="color: #b2ea4d; text-decoration: underline;">${verificationUrl}</a>
              </p>

              <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 24px; margin-bottom: 0;">
                If you did not create an account with Oogway AI, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #0b1329; border-top: 1px solid #1e293b; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748b;">
                © ${new Date().getFullYear()} Oogway AI Inc. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "Oogway AI <verify@oogway.ai>",
          to: [email],
          subject,
          html: htmlContent,
        }),
      });
      const data = await res.json();
      console.log("Verification Email dispatched via Resend:", data);
      return { success: true, provider: "resend", data, htmlContent, subject };
    } else {
      console.log(`[VERIFICATION EMAIL DISPATCH] (Simulated / Dev Mode) To: ${email} | Link: ${verificationUrl}`);
      return { success: true, provider: "simulated", email, subject, verificationUrl, htmlContent };
    }
  } catch (err: any) {
    console.warn("Failed to dispatch Verification Email:", err?.message || err);
    return { success: false, error: err?.message || err, htmlContent, subject };
  }
}

