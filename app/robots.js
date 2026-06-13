export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/dashboard/', '/settings/', '/projects/'],
      },
    ],
    sitemap: 'https://allfreelancershere.ru/sitemap.xml',
  };
}
