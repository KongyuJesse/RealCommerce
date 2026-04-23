const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeOrigin = (value) => {
  const trimmedValue = String(value || '').trim();

  if (!trimmedValue) {
    return '';
  }

  try {
    const parsedUrl = new URL(trimmedValue);

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return trimmedValue.replace(/\/+$/, '');
    }

    return parsedUrl.origin;
  } catch (_error) {
    return trimmedValue.replace(/\/+$/, '');
  }
};

const buildImplicitOriginRegexes = (origins = []) =>
  origins
    .map((origin) => {
      try {
        const parsedUrl = new URL(origin);

        if (parsedUrl.protocol !== 'https:' || !parsedUrl.hostname.endsWith('.vercel.app')) {
          return null;
        }

        const hostnamePrefix = parsedUrl.hostname.slice(0, -'.vercel.app'.length);

        if (!hostnamePrefix) {
          return null;
        }

        return new RegExp(
          `^https://${escapeRegExp(hostnamePrefix)}(?:-[a-z0-9-]+)?\\.vercel\\.app$`,
          'i'
        );
      } catch (_error) {
        return null;
      }
    })
    .filter(Boolean);

module.exports = {
  buildImplicitOriginRegexes,
  normalizeOrigin,
};
