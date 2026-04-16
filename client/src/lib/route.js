export const parseRoute = () => {
  const hash = window.location.hash || '#/home';
  const clean = hash.replace(/^#\/?/, '');
  const segments = clean.split('/').filter(Boolean);
  const [page = 'home', slug = '', detail = ''] = segments;
  return { page, slug, detail, segments };
};
