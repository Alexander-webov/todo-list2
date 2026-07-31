export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /projects/ было в disallow раньше, но эти страницы теперь несут
        // JobPosting-разметку, хлебные крошки и внутреннюю перелинковку —
        // блокировка полностью обнуляла эту работу. Google-у нужно видеть
        // именно такие страницы для попадания в раздел вакансий поиска.
        disallow: ['/api/', '/admin/', '/dashboard/', '/settings/'],
      },
    ],
    sitemap: 'https://allfreelancershere.ru/sitemap.xml',
  };
}
