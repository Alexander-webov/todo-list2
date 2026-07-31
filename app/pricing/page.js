import { PricingClient } from './PricingClient';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://allfreelancershere.ru';

// Раньше этой страницы серверной обёртки не было вообще — весь файл был
// 'use client', а такие компоненты не могут экспортировать metadata в
// Next.js. В итоге Google все эти месяцы показывал в сниппете общий
// заголовок сайта вместо чего-то про цену — при позиции 4.5 (топ-10!)
// но 0 кликов из 4 показов это и объясняет: сниппет не был про тариф.
export const metadata = {
  title: 'Премиум FreelanceHere — 399 ₽ за все заказы без лимита | Цены',
  description: 'Премиум-доступ FreelanceHere: все фриланс-заказы и вакансии без ограничения в 5 штук, уведомления в Telegram. От 399 ₽ за 30 дней, без автопродления.',
  alternates: { canonical: `${SITE_URL}/pricing` },
};

export default function PricingPage() {
  return <PricingClient />;
}
