# Редизайн FreelanceHub — какие файлы куда положить

Все пути относительно корня проекта `Railway-freelance-project/`.

## Изменённые файлы (заменить существующие)

| Файл | Что поменялось |
|------|----------------|
| `app/page.js` | Трёхколоночный layout: Sidebar + (TopBar+Feed) + RightSidebar. Добавил подсчёт `todayCount`. |
| `app/globals.css` | 3-колоночный `.main-layout`, новый CSS-переменная `--text-desc` (цвет описания, более синий), базовый `font-size: 15px`. |
| `components/HeaderClient.js` | Лого + ThemeToggle слева, навигация по центру, вход/регистрация справа. Удалён Live-бейдж. |
| `components/Header.module.css` | Логотип теперь "All" (жёлтый) + "Freelancers" (белый) + "Here" (синий). Новая раскладка через `leftGroup` / `nav` / `actions`. |
| `components/Sidebar.js` | Только фильтры. Чекбоксы вместо точек, разворачивающиеся группы категорий с эмодзи (Дизайн, Разработка, Маркетинг, Контент, Видео/Аудио, AI/Автоматизация, Аналитика, Другое). Telegram/Donation/Article переехали в RightSidebar. |
| `components/Sidebar.module.css` | Стили под новый дизайн. |
| `components/ProjectCard.js` | 4 ряда: source+time / title+price / description / tags+AI-button. Свежие проекты (<5 мин) подсвечиваются золотистой обводкой и бейджем «Только что». Кнопка одна — "Откликнуться с AI" (синяя). |
| `components/ProjectCard.module.css` | Новая структура и `cardFresh` стиль. |
| `components/ProjectsFeed.js` | Убрал старые региональные табы и SearchBar — это всё теперь в TopBar. Поддержка `region=all`. |
| `components/ProjectsFeed.module.css` | Очищены стили под старые табы. |

## Новые файлы (просто положить)

| Файл | Назначение |
|------|------------|
| `components/TopBar.js` | Счётчик "3 391 +127 сегодня" + toggle "Показывать только РФ" + Поиск + Найти. Выше фида. |
| `components/TopBar.module.css` | Стили TopBar. |
| `components/RightSidebar.js` | Telegram-каналы (РФ/INT) + рекламный слот + DonationBanner + ArticleOfDay. |
| `components/RightSidebar.module.css` | Стили правого сайдбара. |
| `app/api/stats/sources/route.js` | Endpoint, отдающий счётчики по каждой бирже. Нужен для пилюль с цифрами в Sidebar. |

## Ключевые поведенческие изменения

1. **Toggle "Показывать только РФ"**:
   - ON → `region=ru`, видны только 4 российские биржи
   - OFF → `region=all`, видны ВСЕ источники (раньше было только 'ru' или 'int')

2. **Свежие проекты**: если `published_at`/`created_at` < 5 минут назад, карточка получает золотистую обводку и бейдж "⚡ Только что" вместо обычного "18 минут назад".

3. **Чекбоксы биржи**: визуально multi-select, но клик работает как single-select (по твоему запросу). Если позже захочешь полный multi-select, нужно будет правок:
   - В API `/api/projects` — поддержать `source=fl,kwork,...` через `.in('source', list)`
   - В `Sidebar.js` функция `setFilter` — складывать значения через запятую

4. **Размер шрифта**: базовый `font-size: 15px` на `:root` (был дефолт 16). Можно подкрутить до 16, если хочется ещё крупнее.

5. **Цвет описания**: новая переменная `--text-desc: #7c8db5` (более синий). Использована в `.description` карточки.

## Что я не трогал

- Все остальные API роуты, парсеры, supabase схемы, страницы /blog, /faq, /pricing и т.д.
- `StatsBar.js` — его теперь нигде не используется, но я его не удалил (оставил на случай, если он нужен где-то ещё или ты захочешь его восстановить). Можно безопасно удалить вместе с `StatsBar.module.css`.

## Тестирование

После заливки файлов:
```bash
npm run dev
```
Открой http://localhost:3000 — должен увидеть новый макет.
Если что-то сломалось — пришли скриншот, посмотрим вместе.
