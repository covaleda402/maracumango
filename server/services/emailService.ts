import nodemailer from 'nodemailer';

interface SendResetEmailResult {
  sent: boolean;
  message: string;
  error?: string;
}

const buildResetEmailHtml = (code: string, recipientName?: string): string => {
  const greeting = recipientName ? `Hola <strong>${recipientName}</strong>,` : 'Hola,';
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Código de Recuperación - Maracumango</title>
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
                Recibimos una solicitud para restablecer la contraseña de acceso a tu cuenta. Usa el siguiente código de verificación de 6 dígitos para continuar:
              </p>

              <!-- Code Box -->
              <div style="background-color: #f1f5ea; border: 2px dashed #468600; border-radius: 16px; padding: 20px; text-align: center; margin: 0 0 24px;">
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #2d6a00; display: inline-block;">
                  ${code}
                </span>
                <p style="margin: 8px 0 0; font-size: 12px; color: #5f655b; font-weight: 600;">
                  ⏳ Válido únicamente durante los próximos 15 minutos
                </p>
              </div>

              <div style="background-color: #fff9e6; border-left: 4px solid #f59e0b; padding: 12px 14px; border-radius: 8px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 12px; line-height: 1.4; color: #78350f;">
                  <strong>Seguridad:</strong> Se permite un máximo de 5 intentos fallidos. Si tú no solicitaste este código, puedes ignorar este correo de forma segura; tu contraseña seguirá protegida.
                </p>
              </div>

              <p style="font-size: 12px; color: #73796e; line-height: 1.4; margin: 0;">
                Si necesitas ayuda adicional, contáctanos a través de nuestras líneas oficiales en Neiva.
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
  code: string,
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
          subject: `${code} es tu código de recuperación - Maracumango`,
          html: buildResetEmailHtml(code, recipientName),
        }),
      });

      if (res.ok) {
        console.log(`✅ [EmailService:Resend] Correo enviado exitosamente a ${toEmail}`);
        return { sent: true, message: 'Correo enviado exitosamente vía Resend.' };
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
        subject: `${code} es tu código de recuperación de contraseña - Maracumango`,
        text: `Hola ${recipientName || 'Cliente'},\n\nTu código de recuperación de contraseña para Maracumango es: ${code}\n\nEste código vence en 15 minutos.\n\nSi no solicitaste este cambio, puedes ignorar este mensaje de forma segura.\n\nMaracumango - Neiva, Huila`,
        html: buildResetEmailHtml(code, recipientName),
      });

      console.log(`✅ [EmailService:SMTP] Correo de recuperación enviado exitosamente a ${toEmail}`);
      return { sent: true, message: 'Correo enviado exitosamente vía SMTP.' };
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
