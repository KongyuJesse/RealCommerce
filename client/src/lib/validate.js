/**
 * Client-side form validation helpers.
 * Returns an object mapping field names → error messages.
 * An empty object means validation passed.
 */

export const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

export const validateLoginForm = (form) => {
  const errors = {};
  if (!form.email?.trim()) errors.email = 'Email is required.';
  else if (!isEmail(form.email)) errors.email = 'Enter a valid email address.';
  if (!form.password?.trim()) errors.password = 'Password is required.';
  return errors;
};

export const validateRegisterForm = (form) => {
  const errors = {};
  if (!form.fullName?.trim()) errors.fullName = 'Full name is required.';
  else if (form.fullName.trim().length < 2) errors.fullName = 'Name must be at least 2 characters.';
  if (!form.email?.trim()) errors.email = 'Email is required.';
  else if (!isEmail(form.email)) errors.email = 'Enter a valid email address.';
  if (!form.password?.trim()) errors.password = 'Password is required.';
  else if (form.password.length < 10) errors.password = 'Password must be at least 10 characters.';
  else if (!/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/\d/.test(form.password) || !/[^A-Za-z0-9]/.test(form.password)) {
    errors.password = 'Password must include uppercase, lowercase, a number, and a special character.';
  }
  return errors;
};

export const validateCheckoutForm = (form) => {
  const errors = {};
  const addr = form.shippingAddress || {};
  if (!addr.recipientName?.trim()) errors.recipientName = 'Recipient name is required.';
  if (!addr.line1?.trim()) errors.line1 = 'Address line 1 is required.';
  if (!addr.city?.trim()) errors.city = 'City is required.';
  if (!addr.country?.trim()) errors.country = 'Country is required.';
  if (!addr.postalCode?.trim()) errors.postalCode = 'Postal code is required.';
  return errors;
};

export const validateProductForm = (form) => {
  const errors = {};
  if (!form.name?.trim()) errors.name = 'Product name is required.';
  if (!form.sku?.trim()) errors.sku = 'SKU is required.';
  if (!form.categoryId) errors.categoryId = 'Category is required.';
  const price = Number(form.unitPrice);
  if (!form.unitPrice || !Number.isFinite(price) || price <= 0) errors.unitPrice = 'Enter a valid price greater than 0.';
  if (!form.slug?.trim()) errors.slug = 'Slug is required.';
  return errors;
};

export const validateManagedUserForm = (form) => {
  const errors = {};
  if (!form.fullName?.trim()) errors.fullName = 'Full name is required.';
  if (!form.email?.trim()) errors.email = 'Email is required.';
  else if (!isEmail(form.email)) errors.email = 'Enter a valid email address.';
  if (!form.password?.trim()) errors.password = 'Password is required.';
  else if (form.password.length < 10) errors.password = 'Password must be at least 10 characters.';
  if (!/[A-Z]/.test(form.password || '') || !/[a-z]/.test(form.password || '') || !/\d/.test(form.password || '') || !/[^A-Za-z0-9]/.test(form.password || '')) {
    errors.password = 'Password must include uppercase, lowercase, a number, and a special character.';
  }
  if (!form.roleName?.trim()) errors.roleName = 'Role is required.';
  return errors;
};

export const validateWarehouseForm = (form) => {
  const errors = {};
  if (!form.code?.trim()) errors.code = 'Warehouse code is required.';
  if (!form.name?.trim()) errors.name = 'Warehouse name is required.';
  if (!form.city?.trim()) errors.city = 'City is required.';
  if (!form.country?.trim()) errors.country = 'Country is required.';
  const capacityUnits = Number(form.capacityUnits);
  if (!form.capacityUnits || !Number.isInteger(capacityUnits) || capacityUnits <= 0) {
    errors.capacityUnits = 'Capacity must be a whole number greater than 0.';
  }
  return errors;
};

export const hasErrors = (errors) => Object.keys(errors).length > 0;
