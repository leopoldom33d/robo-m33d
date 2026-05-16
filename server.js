const express = require('express');
const app = express();
app.use(express.json());

const CONFIG = {
  TYPEBOT_API_TOKEN: '0MVZD2qEuz4gPZPEQQjFod3u',
  TYPEBOT_ID:        'cmp76idxq00000bgj1p7cb77q',
  TYPEBOT_API_URL:   'https://typebot.io/api/v1',
  ZAPI_INSTANCE:     '3F32B071F907731481F89EB43ACFB5D4',
  ZAPI_TOKEN:        'DDE1060134ECCBC0FA9651F4',
  ZAPI_API_URL:      'https://api.z-api.io/instances',
  LEOPOLDO_WHATSAPP: '5583981778623',
};

const sessions = new Map();

async function callTypebotStart(phone) {
  const res = await fetch(`${CONFIG.TYPEBOT_API_URL}/typebots/${CONFIG.TYPEBOT_ID}/startChat`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${CONFIG.TYPEBOT_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefilledVariables: { Name: phone } }),
  });
  return res.json();
}

async function callTypebotContinue(sessionId, message) {
  const res = await fetch(`${CONFIG.TYPEBOT_API_URL}/sessions/${sessionId}/continueChat`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${CONFIG.TYPEBOT_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  return res.json();
}

async function sendWhatsApp(phone, text) {
  const url = `${CONFIG.ZAPI_API_URL}/${CONFIG.ZAPI_INSTANCE}/token/${CONFIG.ZAPI_TOKEN}/send-text`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, message: text }),
  });
  return res.json();
}

function extractMessages(typebotResponse) {
  const messages = [];
  const msgs = typebotResponse?.messages || [];
  for (const msg of msgs) {
    if (msg.type === 'text' && msg.content?.richText) {
      const text = msg.content.richText
        .map(block => block.children?.map(c => c.text || '').join('') || '')
        .filter(t => t.trim())
        .join('\n');
      if (text.trim()) messages.push(text.trim());
    }
  }
  return messages;
}

async function notifyLeopoldo(phone, name) {
  const msg = `🔥 Lead Quente M33D!\n\nNome: ${name || 'Nao informado'}\nWhatsApp: +${phone}\n\nEle completou o fluxo. Entre em contato agora!`;
  await sendWhatsApp(CONFIG.LEOPOLDO_WHATSAPP, msg);
}

app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const body = req.body;
    if (body.fromMe || body.fromApi) return;
    const phone   = body.phone || body.from?.replace('@s.whatsapp.net','').replace(/\D/g,'');
    const message = body.text?.message || body.message || '';
    if (!phone || !message) return;
    console.log('Mensagem de ' + phone + ': ' + message);
    let sessionEntry = sessions.get(phone);
    const now = Date.now();
    if (sessionEntry && sessionEntry.expiry > now) {
      sessionEntry.expiry = now + 30 * 60 * 1000;
      const typebotRes = await callTypebotContinue(sessionEntry.sessionId, message);
      const msgs = extractMessages(typebotRes);
      for (const txt of msgs) {
        await sendWhatsApp(phone, txt);
        await new Promise(r => setTimeout(r, 800));
      }
      if (!typebotRes.input && typebotRes.status === 'ended') {
        const name = typebotRes.sessionState?.variables?.find(v => v.name === 'Name')?.value || phone;
        await notifyLeopoldo(phone, name);
        sessions.delete(phone);
      }
    } else {
      const typebotRes = await callTypebotStart(phone);
      if (typebotRes.sessionId) {
        sessions.set(phone, { sessionId: typebotRes.sessionId, expiry: now + 30 * 60 * 1000 });
        const msgs = extractMessages(typebotRes);
        for (const txt of msgs) {
          await sendWhatsApp(phone, txt);
          await new Promise(r => setTimeout(r, 800));
        }
      }
    }
  } catch (err) {
    console.error('Erro:', err.message);
  }
});

app.get('/', (req, res) => {
  res.json({ status: 'Robo M33D online', sessions: sessions.size });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Robo M33D na porta ' + PORT));