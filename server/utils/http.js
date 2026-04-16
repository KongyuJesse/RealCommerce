const wrap = (handler) => (request, response, next) =>
  Promise.resolve(handler(request, response, next)).catch(next);

const parseCookies = (header) =>
  String(header || '')
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((accumulator, entry) => {
      const [key, ...rest] = entry.split('=');

      try {
        accumulator[key] = decodeURIComponent(rest.join('=') || '');
      } catch (_error) {
        accumulator[key] = rest.join('=') || '';
      }

      return accumulator;
    }, {});

const buildCookieHeader = ({
  name,
  value,
  secure,
  maxAgeSeconds,
  sameSite = secure ? 'None' : 'Lax',
  path = '/',
  domain = '',
  httpOnly = true,
  priority = 'High',
}) => {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${path}`,
    `SameSite=${sameSite}`,
    `Max-Age=${maxAgeSeconds}`,
  ];

  if (httpOnly) {
    parts.push('HttpOnly');
  }

  if (secure) {
    parts.push('Secure');
  }

  if (domain) {
    parts.push(`Domain=${domain}`);
  }

  if (priority) {
    parts.push(`Priority=${priority}`);
  }

  return parts.join('; ');
};

module.exports = {
  wrap,
  parseCookies,
  buildCookieHeader,
};
