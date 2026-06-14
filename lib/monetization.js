// РЕЖИМ МОНЕТИЗАЦИИ — переключатель теста.
// 'subscription' — старое поведение: лента ограничена, пейволл, продажа премиума.
// 'cpa'          — тест: лента открыта всем, пейволла нет, показываются CPA-офферы.
//
// Меняешь ОДНУ строку — откатываешься обратно. Ничего не удаляется.
export const MONETIZATION_MODE = 'cpa';

export const isCpaMode = () => MONETIZATION_MODE === 'cpa';
export const isSubscriptionMode = () => MONETIZATION_MODE === 'subscription';
