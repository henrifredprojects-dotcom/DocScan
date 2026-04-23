export async function sendInviteEmail(params: {
  to: string;
  inviteUrl: string;
  workspaceName: string;
  fromEmail: string;
}): Promise<{ sent: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false, error: "RESEND_API_KEY not configured." };

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, sans-serif; background: #f8f9fb; margin: 0; padding: 32px 16px;">
  <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 14px; border: 1px solid #e2e6ef; overflow: hidden; box-shadow: 0 4px 14px -6px rgba(15,40,80,.08);">
    <div style="background: linear-gradient(155deg, #3D66D0, #2f52a8); padding: 28px 32px;">
      <div style="font-size: 22px; font-weight: 700; color: #fff; letter-spacing: -0.02em;">DocScan</div>
      <div style="font-size: 12px; color: rgba(255,255,255,.7); margin-top: 2px;">AI bookkeeping</div>
    </div>
    <div style="padding: 32px;">
      <h2 style="margin: 0 0 12px; font-size: 20px; font-weight: 700; color: #1e2a3a;">You have been invited</h2>
      <p style="margin: 0 0 20px; font-size: 14px; color: #6b7a90; line-height: 1.6;">
        You have been invited to join the workspace <strong style="color: #1e2a3a;">${params.workspaceName}</strong> on DocScan.
        Click the button below to accept.
      </p>
      <a href="${params.inviteUrl}" style="display: inline-block; background: #3D66D0; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 9px; font-weight: 600; font-size: 14px;">
        Accept invitation →
      </a>
      <p style="margin: 20px 0 0; font-size: 12px; color: #9aa3b0; line-height: 1.5;">
        This link expires in 7 days. If you did not expect this invitation, you can ignore this email.
      </p>
      <p style="margin: 8px 0 0; font-size: 12px; color: #9aa3b0;">
        Or copy this URL: <span style="color: #3D66D0; word-break: break-all;">${params.inviteUrl}</span>
      </p>
    </div>
  </div>
</body>
</html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: params.fromEmail,
        to: params.to,
        subject: `You're invited to ${params.workspaceName} on DocScan`,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { sent: false, error: `Resend error ${res.status}: ${body}` };
    }

    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : "Network error" };
  }
}
