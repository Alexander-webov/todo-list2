import { NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';
import { supabaseAdmin } from '@/lib/supabase';
import { CATEGORIES, CATEGORY_EMOJI } from '@/lib/categories';

export const runtime = 'nodejs';

// Клавиатура выбора категорий
function buildCategoryKeyboard(selectedCategories = []) {
  const buttons = CATEGORIES.map(cat => {
    const emoji = CATEGORY_EMOJI[cat];
    const isSelected = selectedCategories.includes(cat);
    return [{
      text: `${isSelected ? '✅' : '⬜'} ${emoji} ${cat}`,
      callback_data: `toggle_cat:${cat}`
    }];
  });

  buttons.push([{
    text: selectedCategories.length === 0 ? '📬 Все категории (текущий режим)' : '💾 Сохранить',
    callback_data: 'save_categories'
  }]);

  return { inline_keyboard: buttons };
}

async function getUserCategories(chatId) {
  const db = supabaseAdmin();
  const { data } = await db
    .from('profiles')
    .select('filter_categories, telegram_chat_id')
    .eq('telegram_chat_id', String(chatId))
    .single();
  return data?.filter_categories || [];
}

async function saveUserCategories(chatId, categories) {
  const db = supabaseAdmin();
  await db
    .from('profiles')
    .update({ filter_categories: categories })
    .eq('telegram_chat_id', String(chatId));
}

async function editMessageReplyMarkup(chatId, messageId, replyMarkup) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageReplyMarkup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      reply_markup: replyMarkup,
    }),
  });
}

async function editMessageText(chatId, messageId, text, replyMarkup) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    }),
  });
}

async function answerCallbackQuery(callbackQueryId, text) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}

export async function POST(request) {
  try {
    const body = await request.json();

    // Обработка нажатий на кнопки
    if (body?.callback_query) {
      const query = body.callback_query;
      const chatId = query.message.chat.id;
      const messageId = query.message.message_id;
      const data = query.data;

      let categories = await getUserCategories(chatId);

      if (data.startsWith('toggle_cat:')) {
        const cat = data.replace('toggle_cat:', '');
        if (categories.includes(cat)) {
          categories = categories.filter(c => c !== cat);
        } else {
          categories = [...categories, cat];
        }

        // Обновляем клавиатуру без сохранения
        await editMessageReplyMarkup(chatId, messageId, buildCategoryKeyboard(categories));
        await answerCallbackQuery(query.id, categories.includes(cat)
          ? `✅ ${cat} добавлена`
          : `❌ ${cat} убрана`
        );

        // Временно сохраняем в БД (для следующего нажатия)
        await saveUserCategories(chatId, categories);
      }

      if (data === 'save_categories') {
        await saveUserCategories(chatId, categories);

        const text = categories.length === 0
          ? '📬 <b>Фильтр сброшен</b>\n\nБуду присылать проекты из <b>всех категорий</b>.'
          : `✅ <b>Категории сохранены!</b>\n\nБуду присылать только:\n${categories.map(c => `${CATEGORY_EMOJI[c]} ${c}`).join('\n')}`;

        await editMessageText(chatId, messageId, text, null);
        await answerCallbackQuery(query.id, '✅ Сохранено!');
      }

      return NextResponse.json({ ok: true });
    }

    // Обработка текстовых сообщений
    const message = body?.message;
    if (!message) return NextResponse.json({ ok: true });

    const chatId = message.chat?.id;
    const text = message.text || '';
    const firstName = message.from?.first_name || 'Фрилансер';

    if (text === '/start') {
      await sendTelegramMessage(
        chatId,
        `👋 Привет, <b>${firstName}</b>!\n\n` +
        `Я бот <b>allFreelancersHere</b> — агрегатора фриланс-проектов.\n\n` +
        `🔑 Твой <b>Chat ID</b>: <code>${chatId}</code>\n\n` +
        `Скопируй этот ID и вставь в <b>личном кабинете</b> на сайте.\n\n` +
        `После подключения используй /categories чтобы выбрать интересующие категории.`
      );
    }

    if (text === '/categories') {
      // Проверяем что пользователь есть в БД
      const db = supabaseAdmin();
      const { data: profile } = await db
        .from('profiles')
        .select('telegram_chat_id')
        .eq('telegram_chat_id', String(chatId))
        .single();

      if (!profile) {
        await sendTelegramMessage(
          chatId,
          '❌ <b>Сначала подключи Telegram в личном кабинете на сайте.</b>\n\n' +
          `Твой Chat ID: <code>${chatId}</code>`
        );
        return NextResponse.json({ ok: true });
      }

      const categories = await getUserCategories(chatId);
      await sendTelegramMessage(
        chatId,
        '🗂 <b>Выбери категории проектов</b>\n\n' +
        (categories.length === 0
          ? 'Сейчас: все категории'
          : `Сейчас выбрано: ${categories.join(', ')}`),
        { reply_markup: buildCategoryKeyboard(categories) }
      );
    }

    if (text === '/status') {
      const categories = await getUserCategories(chatId);
      const catText = categories.length === 0
        ? 'Все категории'
        : categories.map(c => `${CATEGORY_EMOJI[c]} ${c}`).join('\n');

      await sendTelegramMessage(
        chatId,
        `📊 <b>Твои настройки:</b>\n\n` +
        `Категории:\n${catText}\n\n` +
        `Команды:\n` +
        `/categories — выбрать категории\n` +
        `/status — текущие настройки`
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[TG webhook]', err);
    return NextResponse.json({ ok: true });
  }
}
