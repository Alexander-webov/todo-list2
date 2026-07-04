// ЕДИНЫЙ ИСТОЧНИК ПРАВДЫ ПО ЦЕНАМ И СКИДКЕ.
// Меняешь здесь — меняется везде: страница тарифов, попап, и РЕАЛЬНЫЕ суммы платежей
// в YooKassa и Stripe. Чтобы выключить акцию — поставь DISCOUNT_ACTIVE = false.

export const DISCOUNT_ACTIVE = true;     // включить/выключить акцию одним флагом
export const DISCOUNT_PERCENT = 60;      // как показываем скидку в маркетинге ("−60%")

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
    discountPercent: DISCOUNT_PERCENT,
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
