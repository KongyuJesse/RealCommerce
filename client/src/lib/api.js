const apiBaseUrl = (process.env.REACT_APP_API_BASE_URL || '').replace(/\/+$/, '');

function buildApiUrl(pathname) {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return apiBaseUrl ? `${apiBaseUrl}${normalizedPath}` : normalizedPath;
}

async function fetchJson(pathname, options = {}) {
  const response = await fetch(buildApiUrl(pathname), options);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}.`);
  }

  return response.json();
}

async function fetchHomepage(signal) {
  const payload = await fetchJson('/api/homepage', { signal });
  return payload.data;
}

export { apiBaseUrl, buildApiUrl, fetchHomepage };
