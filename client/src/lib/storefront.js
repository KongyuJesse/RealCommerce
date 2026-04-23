export const defaultStorageStatus = {
  provider: 'gcs',
  configured: false,
  bucketName: null,
  publicBaseUrl: null,
};

export const createInitialCheckoutForm = () => ({
  currencyCode: 'USD',
  shippingMethod: 'standard',
  paymentMethod: 'card',
  promoCode: '',
  saveAddress: true,
  note: '',
  shippingAddress: {
    label: 'Primary address',
    recipientName: '',
    line1: '',
    line2: '',
    city: '',
    stateRegion: '',
    postalCode: '',
    country: '',
    phone: '',
  },
});

export const createInitialRegisterForm = () => ({
  fullName: '',
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  companyName: '',
  phone: '',
  city: '',
  country: '',
});

export const createInitialProductForm = () => ({
  categoryId: '',
  sku: '',
  name: '',
  slug: '',
  shortDescription: '',
  longDescription: '',
  unitPrice: '',
  currencyCode: 'USD',
  isFeatured: false,
  launchMonth: '',
  primaryImageUrl: '',
  altText: '',
  imageFile: null,
  attributes: [{ name: '', valueText: '' }],
  inventoryByWarehouse: [{ warehouseId: '', quantityOnHand: '0', reorderPoint: '0', safetyStock: '0' }],
});

export const createInitialDiscountForm = () => ({
  name: '',
  code: '',
  description: '',
  discountType: 'PERCENT',
  discountValue: '',
  minimumOrderAmount: '0',
  startsAt: '',
  endsAt: '',
});

export const createInitialPlatformSettingsForm = () => ({
  tax_rate: '0.07',
  free_shipping_threshold: '250',
  support_email: 'support@realcommerce.com',
  default_return_window_days: '30',
  review_auto_publish: true,
});

export const createInitialManagedUserForm = () => ({
  fullName: '',
  email: '',
  password: '',
  roleName: 'customer',
  city: '',
  country: '',
  phone: '',
  companyName: '',
  isActive: true,
});

export const createInitialWarehouseForm = () => ({
  code: '',
  name: '',
  city: '',
  country: '',
  capacityUnits: '',
  isActive: true,
});

export const createInitialReviewForm = () => ({
  rating: '5',
  title: '',
  body: '',
});

export const applyAddressToCheckout = (address) => ({
  label: address.label || 'Saved address',
  recipientName: address.recipient_name || '',
  line1: address.line1 || '',
  line2: address.line2 || '',
  city: address.city || '',
  stateRegion: address.state_region || '',
  postalCode: address.postal_code || '',
  country: address.country || '',
  phone: address.phone || '',
});

export const buildFallbackProductDetail = (product) => ({
  ...product,
  original_unit_price: product.original_unit_price || product.unit_price,
  discount_amount: product.discount_amount || 0,
  long_description: product.short_description,
  images: [{ id: `fallback-${product.id}`, url: product.image_url, alt_text: product.name }],
  attributes: [],
  reviews: [],
  relatedProducts: [],
});
