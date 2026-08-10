/**
 * Envío de correo por Mailjet (API v3.1), el mismo servicio que usa el formulario de
 * contacto de asn1click. Allá se hace en Java con la librería email.admin; acá alcanza
 * con un POST y el fetch nativo de Node, así que no suma dependencias.
 */

const MAILJET_URL = 'https://api.mailjet.com/v3.1/send';
const FROM = process.env.ALERT_EMAIL_FROM || 'noreply@v2x.tools';
const FROM_NAME = 'misnotas';
export const ALERT_TO = process.env.ALERT_EMAIL_TO || 'maxidigital@gmail.com';

/**
 * Devuelve true si Mailjet aceptó el mensaje. Nunca lanza: un aviso que no sale no puede
 * romper la petición que lo originó.
 */
export async function sendMail({ to = ALERT_TO, subject, text, html }) {
  const key = process.env.MAILJET_API_KEY;
  const secret = process.env.MAILJET_API_SECRET;
  if (!key || !secret) {
    console.warn('[mail] sin MAILJET_API_KEY/MAILJET_API_SECRET: no se envía', JSON.stringify(subject));
    return false;
  }

  const body = {
    Messages: [
      {
        From: { Email: FROM, Name: FROM_NAME },
        To: [{ Email: to }],
        Subject: subject,
        ...(text ? { TextPart: text } : {}),
        ...(html ? { HTMLPart: html } : {}),
      },
    ],
  };

  try {
    const res = await fetch(MAILJET_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + Buffer.from(key + ':' + secret).toString('base64'),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error('[mail] Mailjet respondió', res.status, (await res.text()).slice(0, 500));
      return false;
    }
    console.log('[mail] enviado a', to, '|', subject);
    return true;
  } catch (e) {
    console.error('[mail] falló el envío:', e.message);
    return false;
  }
}
