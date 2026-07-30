// ЕДИНЫЙ ИСТОЧНИК ПРАВДЫ ПО ЦЕНАМ И СКИДКЕ.
// Меняешь здесь — меняется везде: страница тарифов, попап, и РЕАЛЬНЫЕ суммы платежей
// в YooKassa и Stripe. Чтобы выключить акцию — поставь DISCOUNT_ACTIVE = false.

export const DISCOUNT_ACTIVE = true;     // включить/выключить акцию одним флагом

// Базовые (старые) цены — показываются зачёркнутыми
const BASE = {
  ru: { amount: 999, currency: 'RUB', symbol: '₽' },
  int: { amount: 15, currency: 'USD', symbol: '$' },
};

// Цены со скидкой. Заданы явно (красивые значения без копеек).

const SALE = {
  ru: { amount: 399, currency: 'RUB', symbol: '₽' },
  int: { amount: 5, currency: 'USD', symbol: '$' },
};

// Раньше процент скидки был одной общей константой (60%), но реальная
// разница у RU (999→399 = 60%) и INT (15→5 = 66.7%) отличается — бейдж
// "−60%" на международном тарифе занижал реальную скидку и не совпадал
// с фактическими цифрами. Считаем процент из самих цен, чтобы это не
// могло разъехаться снова, если цены поменяются, а константу забудут обновить.
function computeDiscountPercent(plan) {
  const base = BASE[plan].amount;
  const sale = SALE[plan].amount;
  return Math.round((1 - sale / base) * 100);
}

// Для мест, где показывается один общий процент на оба тарифа сразу
// (например заголовок промо-баннера) — берём меньший из двух, чтобы
// обещание не завышало реальную скидку ни по одному из тарифов.
export const DISCOUNT_PERCENT = Math.min(
  computeDiscountPercent('ru'),
  computeDiscountPercent('int')
);

// Итоговая цена для плана: 'ru' (YooKassa) или 'int' (Stripe)
export function getPrice(plan) {
  const base = BASE[plan];
  const sale = SALE[plan];
  const active = DISCOUNT_ACTIVE;
  return {
    plan,
    currency: base.currency,
    symbol: base.symbol,
    base: base.amount,          // старая цена (зачёркнутая)
    final: active ? sale.amount : base.amount, // что реально платит юзер
    discountActive: active,
    discountPercent: computeDiscountPercent(plan), // реальный процент именно этого тарифа
  };
}

// Удобные хелперы для серверных платёжных роутов
export function yookassaAmountString() {
  // YooKassa ждёт строку вида '399.00'
  return getPrice('ru').final.toFixed(2);
}

export function stripeUnitAmountCents() {
  // Stripe ждёт сумму в центах
  return Math.round(getPrice('int').final * 100);
}
