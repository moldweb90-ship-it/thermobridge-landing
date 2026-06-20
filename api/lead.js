function cleanValue(v) {
  if (typeof v !== 'string') return v;
  return v.trim().replace(/\s+/g, ' ').slice(0, 1000);
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ ok: true });
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const data = {};
    for (const [k, v] of Object.entries(body)) data[k] = cleanValue(v);

    const phone = data.telefon || data.phone || data.whatsapp;
    if (!phone) return res.status(400).json({ ok: false, error: 'phone_required' });

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    // If Telegram is not configured on Vercel, return an error so frontend falls back to WhatsApp.
    if (!token || !chatId) return res.status(503).json({ ok: false, error: 'telegram_not_configured' });

    const lines = [
      '🔥 Nouă aplicare ThermoBridge',
      '',
      `Telefon: ${data.telefon || data.phone || '-'}`,
      `Nume: ${data.nume || '-'}`,
      `Experiență: ${data.experienta || '-'}`,
      `Permis B: ${data.permis || '-'}`,
      `Formular: ${data.form_type || '-'}`,
      `Pagina: ${data.page || '-'}`,
      `IP: ${req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '-'}`,
    ];

    const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: lines.map(escapeHtml).join('\n'),
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!tg.ok) {
      let details = null;
      try { details = await tg.json(); } catch (_) {}
      return res.status(502).json({ ok: false, error: 'telegram_failed', telegram: details });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
};
