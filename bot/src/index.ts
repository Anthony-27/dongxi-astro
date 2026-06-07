interface Env {
  BOT_TOKEN: string;
  ADMIN_CHAT_ID: string;
  BOT_KV: KVNamespace;
}

const SANITY_PROJECT = '0brclyd6';
const SANITY_DATASET = 'production';
const SANITY_API = `https://${SANITY_PROJECT}.api.sanity.io/v2024-01-01/data/query/${SANITY_DATASET}`;

// ── Telegram helpers ──────────────────────────────────────────

async function tg(token: string, method: string, body: object) {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}

async function send(token: string, chat_id: number | string, text: string, extra: object = {}) {
  return tg(token, 'sendMessage', { chat_id, text, parse_mode: 'HTML', ...extra });
}

// ── Keyboards ─────────────────────────────────────────────────

function mainKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '🧵 Browse Catalog',      callback_data: 'catalog'   },
        { text: '📋 Send Inquiry',         callback_data: 'inquiry'   },
      ],
      [
        { text: '🔔 New Arrivals Alerts', callback_data: 'subscribe' },
        { text: '📞 Contact',             callback_data: 'contact'   },
      ],
    ],
  };
}

function catalogKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '🥻 Silk & Satin',  callback_data: 'cat_fabric' },
        { text: '🌸 Lace',          callback_data: 'cat_fabric' },
      ],
      [
        { text: '✨ Embroidery',    callback_data: 'cat_fabric' },
        { text: '🎨 Jacquard',      callback_data: 'cat_fabric' },
      ],
      [
        { text: '📦 Ready Stock →', url: 'https://dongxi.io/shop' },
      ],
      [
        { text: '← Back',           callback_data: 'back_main'  },
      ],
    ],
  };
}

function orderTypeKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '📸  Photo / sketch  →  bulk production',    callback_data: 'ot_photo'  }],
      [{ text: '📦  Send sample  →  replicate & bulk',      callback_data: 'ot_sample' }],
      [{ text: '🧶  Source fabric only',                    callback_data: 'ot_fabric' }],
      [{ text: '✂️  Full CMT  (cut, make & trim)',          callback_data: 'ot_cmt'    }],
    ],
  };
}

// ── Sanity fetch ──────────────────────────────────────────────

async function fetchProducts(limit = 6) {
  const q = encodeURIComponent(
    `*[_type == "product" && active == true] | order(_createdAt desc) [0...${limit}] {
      _id, name, category, price, unit, moq, composition,
      "imageUrl": images[0].asset->url
    }`
  );
  const r = await fetch(`${SANITY_API}?query=${q}`);
  const data: any = await r.json();
  return data.result ?? [];
}

// ── Inquiry state machine ─────────────────────────────────────

type InquiryStep = 'order_type' | 'country' | 'message' | 'photo';

interface InquiryState {
  step: InquiryStep;
  order_type?: string;
  country?: string;
  message?: string;
  photo_file_id?: string;
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  ot_photo:  'Photo / sketch → bulk production',
  ot_sample: 'Send sample → replicate & bulk',
  ot_fabric: 'Source fabric only',
  ot_cmt:    'Full CMT (cut, make & trim)',
};

async function startInquiry(token: string, chat_id: number, kv: KVNamespace) {
  const state: InquiryState = { step: 'order_type' };
  await kv.put(`inq_${chat_id}`, JSON.stringify(state), { expirationTtl: 3600 });
  return send(token, chat_id,
    '<b>New Inquiry — Step 1 / 4</b>\n\nWhat type of order are you looking for?',
    { reply_markup: orderTypeKeyboard() }
  );
}

async function advanceInquiry(
  token: string, chat_id: number, kv: KVNamespace,
  adminId: string, text: string, photoFileId?: string
) {
  const raw = await kv.get(`inq_${chat_id}`);
  if (!raw) {
    return send(token, chat_id, 'Session expired. Start again:',
      { reply_markup: { inline_keyboard: [[{ text: '📋 New Inquiry', callback_data: 'inquiry' }]] } }
    );
  }
  const state: InquiryState = JSON.parse(raw);

  if (state.step === 'country') {
    state.country = text;
    state.step = 'message';
    await kv.put(`inq_${chat_id}`, JSON.stringify(state), { expirationTtl: 3600 });
    return send(token, chat_id,
      '<b>Step 3 / 4</b> — Tell us what you need:\n\n(fabric type, quantity, colours, deadline, any other details)'
    );
  }

  if (state.step === 'message') {
    state.message = text;
    state.step = 'photo';
    await kv.put(`inq_${chat_id}`, JSON.stringify(state), { expirationTtl: 3600 });
    return send(token, chat_id,
      '<b>Step 4 / 4</b> — Reference photos (optional)\n\nSend a photo, or type <b>skip</b> to finish.'
    );
  }

  if (state.step === 'photo') {
    if (photoFileId) state.photo_file_id = photoFileId;
    await kv.delete(`inq_${chat_id}`);

    // Forward to admin
    const adminMsg =
      `🔔 <b>NEW INQUIRY via Telegram Bot</b>\n\n` +
      `💬 Chat ID: <code>${chat_id}</code>\n` +
      `📋 Type: ${ORDER_TYPE_LABELS[state.order_type ?? ''] ?? state.order_type}\n` +
      `🌍 Country: ${state.country}\n\n` +
      `📝 Message:\n${state.message}\n\n` +
      (state.photo_file_id ? '📷 Photo attached below.' : '📷 No photo.');

    await send(token, adminId, adminMsg);
    if (state.photo_file_id) {
      await tg(token, 'sendPhoto', { chat_id: adminId, photo: state.photo_file_id });
    }

    // Confirm to user
    return send(token, chat_id,
      '✅ <b>Inquiry received!</b>\n\nWe\'ll reply within 48 hours.\n\nIn the meantime, browse our ready stock:',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🛍  Shop Ready Stock', url: 'https://dongxi.io/shop' }],
            [{ text: '←  Main Menu',        callback_data: 'back_main'     }],
          ],
        },
      }
    );
  }
}

// ── Subscriber broadcast helpers ──────────────────────────────

async function getSubscribers(kv: KVNamespace): Promise<number[]> {
  const raw = await kv.get('subscribers');
  return raw ? JSON.parse(raw) : [];
}

async function addSubscriber(kv: KVNamespace, chat_id: number) {
  const list = await getSubscribers(kv);
  if (!list.includes(chat_id)) {
    list.push(chat_id);
    await kv.put('subscribers', JSON.stringify(list));
    return true;
  }
  return false;
}

// ── Main handler ──────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // ── Sanity webhook → broadcast new product ──
    if (url.pathname === '/new-product' && request.method === 'POST') {
      try {
        const body: any = await request.json();
        const p = body.result ?? body;
        if (p?.name && p?.active) {
          const subscribers = await getSubscribers(env.BOT_KV);
          const msg =
            `🆕 <b>New Arrival at DONGXI</b>\n\n` +
            `<b>${p.name}</b>\n` +
            `${p.category ?? ''} ${p.composition ? '· ' + p.composition : ''}\n\n` +
            `<b>$${Number(p.price).toFixed(2)}</b> ${p.unit ?? '/m'}\n` +
            (p.moq ? `Min: ${p.moq}\n` : '') +
            `\n<a href="https://dongxi.io/shop">View in Shop →</a>`;

          for (const chat_id of subscribers) {
            try { await send(env.BOT_TOKEN, chat_id, msg); } catch {}
          }
        }
      } catch {}
      return new Response('OK');
    }

    // ── Telegram webhook ──
    if (url.pathname !== '/webhook' || request.method !== 'POST') {
      return new Response('DONGXI Bot 🤖');
    }

    let update: any;
    try { update = await request.json(); } catch { return new Response('bad request', { status: 400 }); }

    const { BOT_TOKEN: token, ADMIN_CHAT_ID: adminId, BOT_KV: kv } = env;

    // Callback query (button tap)
    if (update.callback_query) {
      const cq   = update.callback_query;
      const chat_id: number = cq.message.chat.id;
      const data: string    = cq.data;

      await tg(token, 'answerCallbackQuery', { callback_query_id: cq.id });

      switch (true) {
        case data === 'back_main':
          await send(token, chat_id, 'Main menu:', { reply_markup: mainKeyboard() });
          break;

        case data === 'catalog':
          await send(token, chat_id, 'Choose a category:', { reply_markup: catalogKeyboard() });
          break;

        case data.startsWith('cat_'): {
          const products = await fetchProducts(5);
          if (products.length === 0) {
            await send(token, chat_id,
              'No products listed yet — check our website!',
              { reply_markup: { inline_keyboard: [[{ text: '🛍 dongxi.io/shop', url: 'https://dongxi.io/shop' }]] } }
            );
            break;
          }
          for (const p of products) {
            const cap =
              `<b>${p.name}</b>\n` +
              `${p.category ?? ''} ${p.composition ? '· ' + p.composition : ''}\n\n` +
              `<b>$${Number(p.price).toFixed(2)}</b> ${p.unit ?? '/m'}\n` +
              (p.moq ? `Min: ${p.moq}` : '');
            if (p.imageUrl) {
              await tg(token, 'sendPhoto', { chat_id, photo: p.imageUrl, caption: cap, parse_mode: 'HTML' });
            } else {
              await send(token, chat_id, cap);
            }
            await new Promise(r => setTimeout(r, 250));
          }
          await send(token, chat_id, 'Interested? Start an inquiry or view full shop:', {
            reply_markup: {
              inline_keyboard: [
                [{ text: '📋 Send Inquiry',    callback_data: 'inquiry' }],
                [{ text: '🛍 Full Shop',        url: 'https://dongxi.io/shop' }],
                [{ text: '← Back',             callback_data: 'catalog' }],
              ],
            },
          });
          break;
        }

        case data === 'inquiry':
          await startInquiry(token, chat_id, kv);
          break;

        case data.startsWith('ot_'): {
          const raw = await kv.get(`inq_${chat_id}`);
          if (raw) {
            const state: InquiryState = JSON.parse(raw);
            state.order_type = data;
            state.step = 'country';
            await kv.put(`inq_${chat_id}`, JSON.stringify(state), { expirationTtl: 3600 });
            await send(token, chat_id,
              '<b>Step 2 / 4</b> — Which country are you shipping to?\n\n(just type the country name)'
            );
          }
          break;
        }

        case data === 'subscribe': {
          const added = await addSubscriber(kv, chat_id);
          await send(token, chat_id,
            added
              ? '🔔 <b>Subscribed!</b>\n\nYou\'ll be the first to know when new fabrics arrive.'
              : '✅ You\'re already subscribed!',
            { reply_markup: { inline_keyboard: [[{ text: '← Main Menu', callback_data: 'back_main' }]] } }
          );
          break;
        }

        case data === 'contact':
          await send(token, chat_id,
            '📞 <b>Contact DONGXI</b>\n\n📧 hello@dongxi.io\n📍 Guangzhou, China\n🌐 dongxi.io',
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🌐 Visit Website', url: 'https://dongxi.io' }],
                  [{ text: '← Main Menu',      callback_data: 'back_main' }],
                ],
              },
            }
          );
          break;
      }

      return new Response('OK');
    }

    // Text / photo message
    if (update.message) {
      const msg      = update.message;
      const chat_id: number = msg.chat.id;
      const text: string    = msg.text ?? '';
      const photo           = msg.photo;

      // Check active inquiry flow
      const inqRaw = await kv.get(`inq_${chat_id}`);
      if (inqRaw) {
        const state: InquiryState = JSON.parse(inqRaw);
        if (['country', 'message', 'photo'].includes(state.step)) {
          if (state.step === 'photo') {
            if (photo) {
              const fileId = photo[photo.length - 1].file_id;
              await advanceInquiry(token, chat_id, kv, adminId, '', fileId);
            } else if (text.toLowerCase() === 'skip' || text) {
              await advanceInquiry(token, chat_id, kv, adminId, 'skip');
            }
          } else {
            if (text) await advanceInquiry(token, chat_id, kv, adminId, text);
          }
          return new Response('OK');
        }
      }

      // Commands
      if (text.startsWith('/start')) {
        await send(token, chat_id,
          `<b>Welcome to DONGXI 东西</b> 🇨🇳\n\n` +
          `Guangzhou fabric & garment manufacturer since 1995.\n\n` +
          `• Silk · Lace · Embroidery · Jacquard & more\n` +
          `• MOQ from 50 m · 48h quote\n` +
          `• Ships worldwide\n\n` +
          `How can we help you today?`,
          { reply_markup: mainKeyboard() }
        );
      } else if (text === '/catalog') {
        await send(token, chat_id, 'Choose a category:', { reply_markup: catalogKeyboard() });
      } else if (text === '/inquiry') {
        await startInquiry(token, chat_id, kv);
      } else if (text === '/menu') {
        await send(token, chat_id, 'Main menu:', { reply_markup: mainKeyboard() });
      } else if (text === '/getid') {
        // Helper: merchant runs this to find their Chat ID
        await send(token, chat_id, `Your Chat ID: <code>${chat_id}</code>`);
      } else {
        await send(token, chat_id, 'Use the menu to get started:', { reply_markup: mainKeyboard() });
      }
    }

    return new Response('OK');
  },
};
