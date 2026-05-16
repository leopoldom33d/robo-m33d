const express = require('express');
const app = express();
app.use(express.json());

// ─── CONFIGURAÇÕES ────────────────────────────────────────────────────────────
const CONFIG = {
  ZAPI_INSTANCE:     '3F32B071F907731481F89EB43ACFB5D4',
  ZAPI_TOKEN:        'DDE1060134ECCBC0FA9651F4',
  ZAPI_API_URL:      'https://api.z-api.io/instances',
  LEOPOLDO_WHATSAPP: '5583981778623',
  HOTMART_LINK:      'https://go.hotmart.com/metodo-m33d', // substituir pelo link real
};

// ─── FLUXO DE CONVERSA ────────────────────────────────────────────────────────
const FLOW = {
  MSG1: `Oi 👋

Vi que você se interessou pelo M33D.

Saiu um estudo agora em 2026 que confirma o que eu vejo todo dia na clínica: a resistência à insulina não afeta só a barriga — ela afeta o cérebro.

Memória, foco, energia.

Sabe aquela névoa mental que você sente à tarde? É isso.

O protocolo trabalha exatamente nessa raiz metabólica, em 33 dias.

Posso te mandar mais detalhes?`,

  MSG2: `Perfeito!

Eu sou o Dr. Leopoldo Alencar, nutricionista esportivo há mais de 20 anos.

E vou te contar algo que poucos sabem:

Eu mesmo já fui o paciente que eu atendo hoje.

Cheguei a 34kg acima do peso. Agenda lotada, estresse crônico, tentei de tudo.
Até que entendi que o problema não era força de vontade — era metabolismo travado.

Criei o Método M33D a partir disso.

33 dias. Protocolo completo. Sem academia obrigatória. Sem dieta de faminto.

Antes de te mandar o material, me diz uma coisa:

Qual dessas situações mais te identifica agora?

1️⃣ Barriga que não sai mesmo fazendo exercício
2️⃣ Cansaço e sem energia pra nada depois das 15h
3️⃣ Já tentei várias dietas — funciona um pouco e volta tudo
4️⃣ Sei que preciso mudar mas não sei por onde começar

Só digita o número. 👇`,

  MSG4: {
    '1': `Faz todo sentido.

A barriga visceral — aquela que fica mesmo em quem malha — é sinal claro de cortisol elevado + resistência à insulina.

Não é falta de exercício. É desregulação hormonal.

O M33D ataca esse mecanismo direto na raiz.
Nos primeiros 10 dias já dá pra sentir a diferença no inchaço e no peso.`,

    '2': `Esse é o sinal mais ignorado — e o mais perigoso.

Queda de energia à tarde = glicose desregulada + inflamação silenciosa.

O seu corpo está pedindo socorro de um jeito que parece só "cansaço normal".
Não é.

O M33D inclui um protocolo de reequilíbrio energético que a maioria dos executivos sente já na primeira semana.`,

    '3': `Essa é a resposta mais honesta que eu recebo.

E te digo: não é culpa sua.

Dieta convencional não funciona pra executivo porque ignora o fator número 1: o estresse crônico que sabota o metabolismo por dentro.

O M33D foi criado especificamente pra quem já tentou e não conseguiu.
Porque trabalha a raiz, não o sintoma.`,

    '4': `Ótimo que você reconhece isso — é o primeiro passo real.

E a boa notícia: o M33D existe exatamente pra isso.

Você não precisa saber nada. O protocolo te diz o que fazer, quando fazer e por quê — dia por dia, nos 33 dias.

Sem achismo. Sem dieta de internet. Só ciência aplicada à sua realidade.`,
  },

  MSG5: `O Método M33D inclui:

✅ Protocolo alimentar de 33 dias — sem contar caloria, sem passar fome
✅ Guia metabólico completo com base na sua rotina de executivo
✅ Módulo de controle do cortisol — o hormônio que sabota tudo
✅ Suporte direto pelo grupo exclusivo de alunos
✅ Acesso vitalício com atualizações

Tudo isso por R$197.

Menos que uma consulta. Menos que um exame. Menos que um mês de remédio.

E o resultado é definitivo — porque ataca a causa, não o sintoma.

Quer o link de acesso agora?`,

  OBJECTIONS: {
    caro: `Entendo.

Mas me deixa fazer uma conta rápida contigo.

Plano de saúde: R$1.200/mês
Consulta com nutricionista: R$300 por visita
Remédio pra pressão/colesterol: R$150/mês, pra sempre

O M33D custa R$197 — uma vez só.

E o objetivo é exatamente te tirar da rota desses gastos.

Faz sentido encarar assim?`,

    pensar: `Claro, sem pressão!

Me diz uma coisa: o que vocà ainda precisa entender pra tomar essa decisão?

Pode me perguntar agora — prefiro resolver sua dúvida do que te deixar com algo na cabeça.`,

    tempo: `Essa é a objeção que eu mais ouço — e entendo.

Por isso o M33D foi desenhado pra quem tem 0 tempo disponível.

Não tem reunião semanal. Não tem aula ao vivo. Não tem horário fixo.

Você acessa quando puder, no ritmo que der. O protocolo se adapta a você, não o contrário.

Isso muda alguma coisa pra você?`,

    naoFuncionou: `É exatamente por isso que o M33D existe.

As dietas tradicionais falham porque ignoram a bioquímica do estresse.
Executivo com cortisol alto não emagrece com dieta de academia. Ponto.

O protocolo foi criado depois de anos vendo exatamente isso na clínica.

Quer que eu te mande um caso real de alguém com o mesmo perfil que o seu?`,
  },
};

// ─── SESSÕES ─────────────────────────────────────────────────────────────────
// Estrutura: phone → { step, expiry, profile }
// step: 'MSG1_SENT' | 'MSG2_SENT' | 'MSG5_SENT' | 'LINK_SENT' | 'DONE'
const sessions = new Map();

// ─── HELPERS ─────────────────────────────────────────────────────────────────
async function sendWhatsApp(phone, text) {
  const url = `${CONFIG.ZAPI_API_URL}/${CONFIG.ZAPI_INSTANCE}/token/${CONFIG.ZAPI_TOKEN}/send-text`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message: text }),
    });
    const data = await res.json();
    console.log(`✉️ Enviado para ${phone}:`, JSON.stringify(data).substring(0, 100));
    return data;
  } catch (err) {
    console.error(`❌ Erro ao enviar para ${phone}:`, err.message);
  }
}

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function notifyLeopoldo(phone) {
  const msg = `🔥 *Lead Quente M33D!*\n\nWhatsApp: +${phone}\n\nEle completou o fluxo e está pronto para fechar. Entre em contato agora!`;
  await sendWhatsApp(CONFIG.LEOPOLDO_WHATSAPP, msg);
}

function detectObjection(msg) {
  const lower = msg.toLowerCase();
  if (lower.includes('caro') || lower.includes('valor') || lower.includes('preço') || lower.includes('dinheiro')) return 'caro';
  if (lower.includes('pensar') || lower.includes('depois') || lower.includes('não sei') || lower.includes('talvez')) return 'pensar';
  if (lower.includes('tempo') || lower.includes('ocupado') || lower.includes('corrido') || lower.includes('agenda')) return 'tempo';
  if (lower.includes('não funcionou') || lower.includes('nao funcionou') || lower.includes('já tentei') || lower.includes('ja tentei')) return 'naoFuncionou';
  return null;
}

function isPositive(msg) {
  const lower = msg.toLowerCase();
  return /sim|s|ok|claro|vai|quero|manda|pode|vamos|bora|yes|ótimo|otimo|boa|legal|top|show|beleza|perfeito|com certeza|certeza/.test(lower);
}

function extractChoice(msg) {
  const m = msg.trim().match(/^[1-4]/);
  return m ? m[0] : null;
}

// ─── PROCESSAMENTO DO FLUXO ───────────────────────────────────────────────────
async function processFlow(phone, message) {
  const now = Date.now();
  const EXPIRY = 30 * 60 * 1000; // 30 min

  let session = sessions.get(phone);

  // Sessão expirada ou nova
  if (!session || session.expiry < now) {
    // Inicia fluxo — envia MSG1
    sessions.set(phone, { step: 'MSG1_SENT', expiry: now + EXPIRY });
    await sendWhatsApp(phone, FLOW.MSG1);
    return;
  }

  // Renova timer
  session.expiry = now + EXPIRY;

  switch (session.step) {

    case 'MSG1_SENT': {
      // Qualquer resposta → envia MSG2 (história + qualificação)
      session.step = 'MSG2_SENT';
      await sendWhatsApp(phone, FLOW.MSG2);
      break;
    }

    case 'MSG2_SENT': {
      // Espera escolha 1-4
      const choice = extractChoice(message);
      if (choice && FLOW.MSG4[choice]) {
        session.step = 'MSG5_SENT';
        session.profile = choice;
        await sendWhatsApp(phone, FLOW.MSG4[choice]);
        await delay(1200);
        await sendWhatsApp(phone, FLOW.MSG5);
      } else {
        // Não entendeu a opção — repete instrução
        await sendWhatsApp(phone, 'Só digita o número da opção: 1️⃣ 2️⃣ 3️⃣ ou 4️⃣ 👇');
      }
      break;
    }

    case 'MSG5_SENT': {
      // Espera resposta sobre querer o link
      const objection = detectObjection(message);
      if (objection && FLOW.OBJECTIONS[objection]) {
        await sendWhatsApp(phone, FLOW.OBJECTIONS[objection]);
        // Mantém no step MSG5_SENT para continuar tratando objeções
      } else if (isPositive(message) || message.trim() === 'sim') {
        session.step = 'LINK_SENT';
        const linkMsg = `Perfeito! 🎯\n\nAqui está o seu acesso direto:\n👉 ${CONFIG.HOTMART_LINK}\n\n⚠️ Condição especial de R$197 — preço regular é R$297.\n\nQualquer dúvida no pagamento, me chama aqui. ✅`;
        await sendWhatsApp(phone, linkMsg);
        await delay(1000);
        await notifyLeopoldo(phone);
      } else {
        // Outra resposta — trata como dúvida
        await sendWhatsApp(phone, 'Me conta mais — o que ficou na cabeça? Prefiro tirar sua dúvida agora. 😊');
      }
      break;
    }

    case 'LINK_SENT': {
      // Lead já recebeu o link — qualquer mensagem → suporte
      await sendWhatsApp(phone, 'Oi! Qualquer dúvida sobre o acesso ou pagamento, é só me falar aqui. Estou online ✅');
      break;
    }

    default: {
      // Reinicia fluxo
      sessions.delete(phone);
      await sendWhatsApp(phone, FLOW.MSG1);
    }
  }
}

// ─── WEBHOOK ──────────────────────────────────────────────────────────────────
app.post('/webhook', async (req, res) => {
  res.sendStatus(200); // responde imediatamente

  try {
    const body = req.body;
    console.log('📩 Webhook:', JSON.stringify(body).substring(0, 400));

    // Ignora mensagens enviadas pelo próprio bot / pelo número
    if (body.fromMe || body.fromApi) return;

    // Extrai phone e message
    const phone   = body.phone || body.from?.replace('@s.whatsapp.net', '').replace(/\D/g, '');
    const message = body.text?.message || body.message || '';

    if (!phone || !message) {
      console.log('⚠️ Sem phone ou message, ignorando');
      return;
    }

    console.log(`📱 De ${phone}: "${message}"`);
    await processFlow(phone, message);

  } catch (err) {
    console.error('❌ Erro no webhook:', err.message, err.stack);
  }
});

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'Robô M33D online ✅',
    sessions: sessions.size,
    version: '2.0 — fluxo nativo',
  });
});

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🤖 Robô M33D v2.0 rodando na porta ${PORT}`);
});
