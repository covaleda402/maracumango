import nodemailer from 'nodemailer';

interface SendResetEmailResult {
  sent: boolean;
  message: string;
  error?: string;
}

const buildResetEmailHtml = (resetLink: string, recipientName?: string): string => {
  const greeting = recipientName ? `Hola <strong>${recipientName}</strong>,` : 'Hola,';
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restablecer Contraseña - Maracumango</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f6f8f3; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1c19;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f6f8f3; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e1e4da; overflow: hidden;">
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #2d6a00 0%, #468600 100%); padding: 28px 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">
                🥭 Maracumango
              </h1>
              <p style="margin: 6px 0 0; color: #d8f5a2; font-size: 13px; font-weight: 500;">
                Granizados & Micheladas Artesanales • Neiva, Huila
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 28px;">
              <p style="font-size: 16px; margin: 0 0 14px; color: #1a1c19;">
                ${greeting}
              </p>
              <p style="font-size: 14px; line-height: 1.5; color: #43483f; margin: 0 0 24px;">
                Recibimos una solicitud para restablecer la contraseña de acceso a tu cuenta en <strong>Maracumango</strong>. Haz clic en el siguiente botón seguro para crear tu nueva contraseña:
              </p>

              <!-- CTA Button Box -->
              <div style="text-align: center; margin: 28px 0;">
                <a href="${resetLink}" target="_blank" rel="noopener noreferrer" style="background-color: #2d6a00; color: #ffffff; padding: 14px 32px; border-radius: 14px; font-size: 15px; font-weight: 700; text-decoration: none; display: inline-block; box-shadow: 0 4px 14px rgba(45,106,0,0.3);">
                  🔐 Restablecer mi Contraseña
                </a>
              </div>

              <div style="background-color: #fff9e6; border-left: 4px solid #f59e0b; padding: 12px 14px; border-radius: 8px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 12px; line-height: 1.4; color: #78350f;">
                  <strong>Seguridad criptográfica:</strong> Este enlace es único, de un solo uso y expirará automáticamente en <strong>15 minutos</strong>. Si tú no solicitaste este cambio, puedes ignorar este mensaje de forma segura.
                </p>
              </div>

              <p style="font-size: 11px; color: #73796e; line-height: 1.4; margin: 0 0 8px;">
                Si el botón de arriba no abre, copia y pega el siguiente enlace seguro en tu navegador:
              </p>
              <p style="font-size: 11px; color: #2d6a00; word-break: break-all; margin: 0; font-family: monospace;">
                ${resetLink}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8faf5; padding: 18px 24px; border-top: 1px solid #e1e4da; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #8d9387;">
                © ${new Date().getFullYear()} Maracumango Neiva. Todos los derechos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

export const sendPasswordResetEmail = async (
  toEmail: string,
  resetLink: string,
  recipientName?: string
): Promise<SendResetEmailResult> => {
  // Option 1: Resend HTTP API (if RESEND_API_KEY is configured in Vercel)
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const fromEmail = process.env.RESEND_FROM || 'Maracumango <onboarding@resend.dev>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [toEmail],
          subject: 'Enlace seguro para restablecer tu contraseña - Maracumango',
          html: buildResetEmailHtml(resetLink, recipientName),
        }),
      });

      if (res.ok) {
        console.log(`✅ [EmailService:Resend] Enlace de recuperación enviado exitosamente a ${toEmail}`);
        return { sent: true, message: 'Enlace enviado exitosamente vía Resend.' };
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.warn('⚠️ [EmailService:Resend Error]:', errJson);
      }
    } catch (err: any) {
      console.warn('⚠️ [EmailService:Resend Exception]:', err.message);
    }
  }

  // Option 2: Gmail SMTP or Custom SMTP (via Nodemailer)
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
  const smtpFrom =
    process.env.SMTP_FROM ||
    (gmailUser ? `"Maracumango Neiva" <${gmailUser}>` : '"Maracumango Neiva" <notificaciones@maracumango.com>');

  let transporter: nodemailer.Transporter | null = null;

  if (gmailUser && gmailPass) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });
  } else if (smtpHost && smtpUser && smtpPass) {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }

  if (transporter) {
    try {
      await transporter.sendMail({
        from: smtpFrom,
        to: toEmail,
        subject: 'Enlace seguro para restablecer tu contraseña - Maracumango',
        text: `Hola ${recipientName || 'Cliente'},\n\nPara restablecer la contraseña de tu cuenta en Maracumango, ingresa al siguiente enlace seguro:\n${resetLink}\n\nEste enlace es de un solo uso y vence en 15 minutos.\n\nSi no solicitaste este cambio, puedes ignorar este mensaje.\n\nMaracumango - Neiva, Huila`,
        html: buildResetEmailHtml(resetLink, recipientName),
      });

      console.log(`✅ [EmailService:SMTP] Enlace de recuperación enviado exitosamente a ${toEmail}`);
      return { sent: true, message: 'Enlace enviado exitosamente vía SMTP.' };
    } catch (err: any) {
      console.error('❌ [EmailService:SMTP Error]:', err.message);
      return {
        sent: false,
        message: 'Fallo al despachar el correo mediante el servidor SMTP.',
        error: err.message,
      };
    }
  }

  // Option 3: Not configured in environment variables
  console.log('ℹ️ [EmailService]: No hay credenciales de correo (Gmail/SMTP/Resend) configuradas en las variables de entorno.');
  return {
    sent: false,
    message: 'El servidor no tiene configurado un servicio de correo SMTP.',
  };
};
