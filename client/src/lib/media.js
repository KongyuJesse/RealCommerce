import { apiBaseUrl } from './api';

export const DEFAULT_PRODUCT_IMAGE = '/images/placeholder.svg';
const ABSOLUTE_URL_PATTERN = /^(?:[a-z]+:)?\/\//i;

export const resolveApiAssetUrl = (value) => {
  const normalizedValue = String(value || '').trim();
  if (!normalizedValue) {
    return '';
  }

  if (
    ABSOLUTE_URL_PATTERN.test(normalizedValue) ||
    normalizedValue.startsWith('data:') ||
    normalizedValue.startsWith('blob:')
  ) {
    return normalizedValue;
  }

  const baseUrl = apiBaseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  if (!baseUrl) {
    return normalizedValue;
  }

  try {
    return new URL(normalizedValue, `${baseUrl.replace(/\/+$/, '')}/`).toString();
  } catch (_error) {
    return normalizedValue;
  }
};

export const getProductImageUrl = (product, fallback = DEFAULT_PRODUCT_IMAGE) => {
  const candidate =
    product?.image_url ||
    product?.primary_image_url ||
    product?.imageUrl ||
    '';

  return resolveApiAssetUrl(candidate) || fallback;
};

export const getGalleryImageUrl = (image, fallback = DEFAULT_PRODUCT_IMAGE) => {
  const candidate = image?.url || image?.public_url || image?.source_url || '';
  return resolveApiAssetUrl(candidate) || fallback;
};

export const applyImageFallback = (event, fallback = DEFAULT_PRODUCT_IMAGE) => {
  if (!event?.currentTarget) {
    return;
  }

  if (event.currentTarget.dataset.fallbackApplied === 'true') {
    return;
  }

  event.currentTarget.dataset.fallbackApplied = 'true';
  event.currentTarget.src = fallback;
};
