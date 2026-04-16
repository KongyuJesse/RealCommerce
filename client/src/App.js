import { startTransition, useDeferredValue, useEffect, useState } from 'react';
import './App.css';
import fallbackData from './fallbackData';
import { ErrorBoundary, ProductComposer, SiteFooter, SiteHeader, ToastProvider } from './components';
import {
  AccessPage,
  AnalyticsPage,
  CartPage,
  CatalogPage,
  CheckoutPage,
  DashboardPage,
  HomePage,
  InventoryPage,
  LoginPage,
  OrderPage,
  ProductPage,
  RegisterPage,
  WishlistPage,
} from './pages';
import {
  apiRequest,
  applyAddressToCheckout,
  buildFallbackProductDetail,
  createInitialCheckoutForm,
  createInitialDiscountForm,
  createInitialManagedUserForm,
  createInitialPlatformSettingsForm,
  createInitialProductForm,
  createInitialWarehouseForm,
  createSlug,
  defaultStorageStatus,
  parseRoute,
  validateLoginForm,
  validateManagedUserForm,
  validateRegisterForm,
  validateCheckoutForm,
  validateProductForm,
  validateWarehouseForm,
  hasErrors,
} from './lib';
import LoadingSkeleton from './components/LoadingSkeleton';

function App() {
  const [route, setRoute] = useState(parseRoute());
  const [data, setData] = useState(fallbackData);
  const [storageStatus, setStorageStatus] = useState(defaultStorageStatus);
  const [productState, setProductState] = useState({ status: 'idle', data: null });
  const [orderState, setOrderState] = useState({ status: 'idle', data: null });
  const [catalogState, setCatalogState] = useState({ status: 'ready', data: [] });
  const [catalogSort, setCatalogSort] = useState('featured');
  const [search, setSearch] = useState('');
  const [checkoutForm, setCheckoutForm] = useState(createInitialCheckoutForm);
  const [quote, setQuote] = useState(null);
  const [authForm, setAuthForm] = useState({ mode: 'login', fullName: '', email: '', password: '' });
  const [productForm, setProductForm] = useState(createInitialProductForm);
  const [discountForm, setDiscountForm] = useState(createInitialDiscountForm);
  const [managedUserForm, setManagedUserForm] = useState(createInitialManagedUserForm);
  const [platformSettingsForm, setPlatformSettingsForm] = useState(createInitialPlatformSettingsForm);
  const [warehouseForm, setWarehouseForm] = useState(createInitialWarehouseForm);
  const [opsForm, setOpsForm] = useState({
    orderId: '',
    orderStatus: 'PROCESSING',
    shipmentId: '',
    shipmentStatus: 'PACKED',
    note: '',
  });
  const [flash, setFlash] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [analyticsState, setAnalyticsState] = useState({ status: 'idle', data: null });
  const [inventoryState, setInventoryState] = useState({ status: 'idle', data: null });
  const [wishlistState, setWishlistState]   = useState({ status: 'idle', data: [] });

  const deferredSearch = useDeferredValue(search);
  const session = data.session || null;
  const cart = data.cart || null;
  const customerDashboard = data.customerDashboard || null;
  const adminDashboard = data.adminDashboard || null;
  const operationsDashboard = data.operationsDashboard || null;
  const productDetail = productState.data;
  const orderDetail = orderState.data;

  // Fetch analytics when navigating to analytics or inventory
  useEffect(() => {
    const isAnalyticsPage  = route.page === 'analytics';
    const isInventoryPage  = route.page === 'inventory';
    if (!isAnalyticsPage && !isInventoryPage) return;
    const isAdmin = ['admin', 'operations_manager', 'merchandising_manager'].includes(session?.roleName);
    if (!isAdmin) return;

    if (isAnalyticsPage) {
      setAnalyticsState({ status: 'loading', data: null });
      apiRequest('/api/analytics')
        .then((d) => setAnalyticsState({ status: 'ready', data: d }))
        .catch(() => setAnalyticsState({ status: 'error', data: null }));
    }

    if (isInventoryPage) {
      setInventoryState({ status: 'loading', data: null });
      apiRequest('/api/analytics/inventory-health')
        .then((d) => setInventoryState({ status: 'ready', data: d }))
        .catch(() => setInventoryState({ status: 'error', data: null }));
    }
  }, [route.page, session?.roleName]);

  // Fetch wishlist when navigating to wishlist page or after login
  useEffect(() => {
    if (route.page !== 'wishlist' || !session?.customerId) return;
    setWishlistState({ status: 'loading', data: [] });
    apiRequest('/api/wishlist')
      .then((d) => setWishlistState({ status: 'ready', data: d }))
      .catch(() => setWishlistState({ status: 'error', data: [] }));
  }, [route.page, session?.customerId]);

  useEffect(() => {
    if (route.page !== 'catalog' && route.page !== 'home' && route.page !== '') {
      return;
    }

    let active = true;
    setCatalogState((current) => ({ ...current, status: 'loading' }));

    const queryParams = new URLSearchParams();
    if (deferredSearch.trim()) queryParams.set('q', deferredSearch.trim());
    if (route.page === 'catalog' && route.slug) queryParams.set('category', route.slug);
    if (catalogSort) queryParams.set('sort', catalogSort);

    apiRequest(`/api/products?${queryParams.toString()}`)
      .then((payload) => {
        if (active) {
          setCatalogState({ status: 'ready', data: payload });
        }
      })
      .catch(() => {
        if (active) {
          setCatalogState({ status: 'error', data: [] });
        }
      });

    return () => {
      active = false;
    };
  }, [route.page, route.slug, deferredSearch, catalogSort]);

  const goToRoute = (page, slug = '', detail = '') => {
    const segments = [page, slug, detail].filter(Boolean);
    window.location.hash = segments.length > 0 ? `#/${segments.join('/')}` : '#/home';
    setRoute(parseRoute());
  };

  const refreshStorageStatus = async () => {
    try {
      const payload = await apiRequest('/api/storage/status');
      setStorageStatus(payload);
    } catch (_error) {
      setStorageStatus(defaultStorageStatus);
    }
  };

  const refreshBootstrap = async () => {
    try {
      const payload = await apiRequest('/api/bootstrap');
      startTransition(() => {
        setData(payload);
        setQuote(payload.checkout || null);
      });
    } catch (_error) {
      startTransition(() => {
        setData(fallbackData);
        setQuote(null);
      });
    }
  };

  useEffect(() => {
    refreshBootstrap();
    refreshStorageStatus();
  }, []);

  // Scroll to top on every route change
  useEffect(() => {
    if (typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [route.page, route.slug]);

  // Auto-dismiss flash banners after 4 seconds
  useEffect(() => {
    if (!flash) return undefined;
    const timer = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(timer);
  }, [flash]);

  useEffect(() => {
    const handleHashChange = () => setRoute(parseRoute());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (session?.fullName && !checkoutForm.shippingAddress.recipientName) {
      setCheckoutForm((current) => ({
        ...current,
        shippingAddress: {
          ...current.shippingAddress,
          recipientName: session.fullName,
        },
      }));
    }
  }, [session, checkoutForm.shippingAddress.recipientName]);

  useEffect(() => {
    const preferredCurrencyCode = quote?.orderCurrencyCode || cart?.currency_code || null;
    if (!preferredCurrencyCode || checkoutForm.currencyCode === preferredCurrencyCode) {
      return;
    }

    setCheckoutForm((current) => ({
      ...current,
      currencyCode: preferredCurrencyCode,
    }));
  }, [quote?.orderCurrencyCode, cart?.currency_code, checkoutForm.currencyCode]);

  useEffect(() => {
    const settings = adminDashboard?.platformSettings || [];
    if (!settings.length) {
      return;
    }

    setPlatformSettingsForm((current) =>
      settings.reduce((next, setting) => {
        next[setting.key] = setting.value;
        return next;
      }, { ...current })
    );
  }, [adminDashboard]);

  useEffect(() => {
    if (route.page !== 'product' || !route.slug) {
      setProductState({ status: 'idle', data: null });
      return undefined;
    }

    let active = true;
    setProductState({ status: 'loading', data: null });

    apiRequest(`/api/products/${route.slug}`)
      .then((payload) => {
        if (active) {
          setProductState({ status: 'ready', data: payload });
        }
      })
      .catch(() => {
        const fallbackProduct = (data.products || []).find((item) => item.slug === route.slug);
        if (active) {
          setProductState(
            fallbackProduct
              ? { status: 'ready', data: buildFallbackProductDetail(fallbackProduct) }
              : { status: 'error', data: null }
          );
        }
      });

    return () => {
      active = false;
    };
  }, [route.page, route.slug, data.products]);

  useEffect(() => {
    if (route.page !== 'order' || !route.slug) {
      setOrderState({ status: 'idle', data: null });
      return undefined;
    }

    let active = true;
    setOrderState({ status: 'loading', data: null });

    apiRequest(`/api/orders/${route.slug}`)
      .then((payload) => {
        if (active) {
          setOrderState({ status: 'ready', data: payload });
        }
      })
      .catch(() => {
        if (active) {
          setOrderState({ status: 'error', data: null });
        }
      });

    return () => {
      active = false;
    };
  }, [route.page, route.slug]);

  useEffect(() => {
    const scriptId = 'realcommerce-structured-data';
    const existing = document.getElementById(scriptId);

    if (route.page === 'product' && productDetail) {
      document.title = `${productDetail.name} | RealCommerce`;
      const script = existing || document.createElement('script');
      script.type = 'application/ld+json';
      script.id = scriptId;
      script.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: productDetail.name,
        description: productDetail.short_description || productDetail.long_description,
        image: (productDetail.images || []).map((image) => image.url).filter(Boolean),
        sku: productDetail.sku,
        brand: { '@type': 'Brand', name: 'RealCommerce' },
        offers: {
          '@type': 'Offer',
          priceCurrency: productDetail.currency_code || 'USD',
          price: productDetail.unit_price,
          availability:
            Number(productDetail.available_units || 0) > 0
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
        },
      });

      if (!existing) {
        document.head.appendChild(script);
      }

      return () => {
        script.remove();
      };
    }

    if (route.page === 'catalog') {
      document.title = 'Catalog | RealCommerce';
    } else if (route.page === 'dashboard') {
      document.title = 'Dashboard | RealCommerce';
    } else if (route.page === 'checkout') {
      document.title = 'Checkout | RealCommerce';
    } else if (route.page === 'cart') {
      document.title = 'Cart | RealCommerce';
    } else if (route.page === 'login') {
      document.title = 'Login | RealCommerce';
    } else if (route.page === 'register') {
      document.title = 'Register | RealCommerce';
    } else if (route.page === 'access') {
      document.title = 'Access | RealCommerce';
    } else if (route.page === 'order' && route.slug) {
      document.title = `${route.slug} | RealCommerce`;
    } else {
      document.title = 'RealCommerce Marketplace';
    }

    if (existing) {
      existing.remove();
    }

    return undefined;
  }, [route.page, route.slug, productDetail]);

  const withBusy = async (work, successMessage) => {
    setIsBusy(true);
    setFlash(null);

    try {
      const result = await work();
      if (successMessage) {
        setFlash({ type: 'success', message: successMessage });
      }
      return result;
    } catch (error) {
      setFlash({ type: 'error', message: error.message || 'Request failed.' });
      return null;
    } finally {
      setIsBusy(false);
    }
  };

  const addToCart = async (productId) => {
    await withBusy(async () => {
      if (!session?.customerId) {
        setPendingAction({ type: 'addToCart', productId });
        goToRoute('access');
        throw new Error('Please sign in to add items to your cart.');
      }

      await apiRequest('/api/cart/items', {
        method: 'POST',
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      await refreshBootstrap();
    }, 'Cart updated.');
  };

  const updateCartQuantity = async (itemId, quantity) => {
    await withBusy(async () => {
      await apiRequest(`/api/cart/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      });
      await refreshBootstrap();
    }, 'Cart quantity updated.');
  };

  const removeCartItem = async (itemId) => {
    await withBusy(async () => {
      await apiRequest(`/api/cart/items/${itemId}`, { method: 'DELETE' });
      await refreshBootstrap();
    }, 'Item removed from cart.');
  };

  const refreshQuote = async () => {
    await withBusy(async () => {
      const payload = await apiRequest('/api/checkout/quote', {
        method: 'POST',
        body: JSON.stringify(checkoutForm),
      });
      setQuote(payload);
    }, 'Checkout quote refreshed.');
  };

  const submitLogin = (event) => {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
    const errors = validateLoginForm(authForm);
    if (hasErrors(errors)) {
      setFlash({ type: 'error', message: Object.values(errors)[0] });
      return;
    }
    withBusy(async () => {
      const payload = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(authForm),
      });
      setData(payload);
      setQuote(payload.checkout || null);

      if (pendingAction?.type === 'addToCart' && payload.session?.customerId) {
        try {
          await apiRequest('/api/cart/items', {
            method: 'POST',
            body: JSON.stringify({ productId: pendingAction.productId, quantity: 1 }),
          });
          await refreshBootstrap();
          setPendingAction(null);
          goToRoute('cart');
          return;
        } catch (_e) { /* fall through to dashboard */ }
      }

      if (pendingAction?.type === 'trackOrder') {
        const orderNumber = String(pendingAction.orderNumber || '').trim().toUpperCase();
        setPendingAction(null);
        if (orderNumber) {
          goToRoute('order', orderNumber);
          return;
        }
      }

      setPendingAction(null);
      goToRoute('dashboard');
    }, 'Signed in successfully.');
  };


  const submitCheckout = (event) => {
    event.preventDefault();
    const errors = validateCheckoutForm(checkoutForm);
    if (hasErrors(errors)) {
      setFlash({ type: 'error', message: Object.values(errors)[0] });
      return;
    }

    withBusy(async () => {
      const payload = await apiRequest('/api/checkout/complete', {
        method: 'POST',
        body: JSON.stringify(checkoutForm),
      });

      await refreshBootstrap();
      setQuote(null);
      setCheckoutForm(createInitialCheckoutForm());
      setFlash({
        type: 'success',
        message: `Order ${payload.order_number} placed. Tracking ${payload.trackingNumber}.`,
      });
      goToRoute('order', payload.order_number);
    });
  };

  const uploadProductImage = async (productId) => {
    if (!productForm.imageFile) {
      return;
    }

    const signed = await apiRequest('/api/uploads/product-images/sign', {
      method: 'POST',
      body: JSON.stringify({
        productId,
        fileName: productForm.imageFile.name,
        mimeType: productForm.imageFile.type || 'application/octet-stream',
      }),
    });

    if (!signed.uploadUrl) {
      throw new Error('Cloud image storage is not configured yet. Add an external image URL or finish storage setup.');
    }

    const uploadResponse = await fetch(signed.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': productForm.imageFile.type || 'application/octet-stream',
      },
      body: productForm.imageFile,
    });

    if (!uploadResponse.ok) {
      throw new Error('Image upload failed before the product image could be finalized.');
    }

    await apiRequest(`/api/uploads/product-images/${signed.imageId}/complete`, {
      method: 'POST',
      body: JSON.stringify({
        productId,
        publicUrl: signed.publicUrl,
        altText: productForm.altText || productForm.name,
        isPrimary: true,
      }),
    });
  };

  const submitProduct = (event) => {
    event.preventDefault();

    withBusy(async () => {
      const errors = validateProductForm(productForm);
      if (hasErrors(errors)) throw new Error(Object.values(errors)[0]);
      const payload = {
        categoryId: Number(productForm.categoryId),
        sku: productForm.sku,
        name: productForm.name,
        slug: productForm.slug,
        shortDescription: productForm.shortDescription,
        longDescription: productForm.longDescription,
        unitPrice: Number(productForm.unitPrice),
        currencyCode: productForm.currencyCode,
        isFeatured: Boolean(productForm.isFeatured),
        launchMonth: productForm.launchMonth || null,
        primaryImageUrl: productForm.primaryImageUrl || null,
        altText: productForm.altText || productForm.name,
        attributes: (productForm.attributes || [])
          .filter((attribute) => attribute.name && attribute.valueText)
          .map((attribute) => ({
            name: attribute.name,
            valueText: attribute.valueText,
          })),
        inventoryByWarehouse: (productForm.inventoryByWarehouse || [])
          .filter((stock) => stock.warehouseId)
          .map((stock) => ({
            warehouseId: Number(stock.warehouseId),
            quantityOnHand: Number(stock.quantityOnHand || 0),
            reorderPoint: Number(stock.reorderPoint || 0),
            safetyStock: Number(stock.safetyStock || 0),
          })),
      };

      const created = await apiRequest('/api/admin/products', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (productForm.imageFile) {
        await uploadProductImage(created.id);
      }

      setProductForm(createInitialProductForm());
      await refreshBootstrap();
      goToRoute('product', created.slug);
    }, 'Product created successfully.');
  };

  const submitOpsUpdate = (event) => {
    event.preventDefault();

    withBusy(async () => {
      if (opsForm.orderId) {
        await apiRequest(`/api/admin/orders/${opsForm.orderId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: opsForm.orderStatus, note: opsForm.note }),
        });
      }

      if (opsForm.shipmentId) {
        await apiRequest(`/api/admin/shipments/${opsForm.shipmentId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: opsForm.shipmentStatus,
            note: opsForm.note,
            location: 'Dashboard console',
          }),
        });
      }

      await refreshBootstrap();
    }, 'Operations update applied.');
  };

  const signOut = async () => {
    await withBusy(async () => {
      await apiRequest('/api/auth/logout', { method: 'POST' });
      await refreshBootstrap();
      setAuthForm({ mode: 'login', fullName: '', email: '', password: '' });
      setManagedUserForm(createInitialManagedUserForm());
      setWarehouseForm(createInitialWarehouseForm());
      goToRoute('home');
    }, 'Signed out.');
  };

  const submitDiscountCampaign = (event) => {
    event.preventDefault();

    withBusy(async () => {
      await apiRequest('/api/admin/discounts', {
        method: 'POST',
        body: JSON.stringify({
          sellerProfileId: discountForm.sellerProfileId ? Number(discountForm.sellerProfileId) : undefined,
          name: discountForm.name,
          code: discountForm.code || undefined,
          description: discountForm.description || undefined,
          discountType: discountForm.discountType,
          discountValue: Number(discountForm.discountValue),
          appliesTo: discountForm.appliesTo,
          categoryId: discountForm.categoryId ? Number(discountForm.categoryId) : undefined,
          productId: discountForm.productId ? Number(discountForm.productId) : undefined,
          minimumQuantity: Number(discountForm.minimumQuantity || 1),
          startsAt: discountForm.startsAt || undefined,
          endsAt: discountForm.endsAt || undefined,
        }),
      });

      setDiscountForm(createInitialDiscountForm());
      await refreshBootstrap();
    }, 'Discount campaign saved.');
  };

  const submitPlatformSettings = (event) => {
    event.preventDefault();

    withBusy(async () => {
      await apiRequest('/api/admin/platform-settings', {
        method: 'PUT',
        body: JSON.stringify({
          tax_rate: Number(platformSettingsForm.tax_rate),
          free_shipping_threshold: Number(platformSettingsForm.free_shipping_threshold),
          support_email: platformSettingsForm.support_email,
          default_return_window_days: Number(platformSettingsForm.default_return_window_days),
          review_auto_publish: Boolean(platformSettingsForm.review_auto_publish),
        }),
      });

      await refreshBootstrap();
    }, 'Platform settings updated.');
  };

  const submitManagedUser = (event) => {
    event.preventDefault();

    withBusy(async () => {
      const errors = validateManagedUserForm(managedUserForm);
      if (hasErrors(errors)) throw new Error(Object.values(errors)[0]);

      await apiRequest('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          fullName: managedUserForm.fullName,
          email: managedUserForm.email,
          password: managedUserForm.password,
          roleName: managedUserForm.roleName,
          city: managedUserForm.city || undefined,
          country: managedUserForm.country || undefined,
          phone: managedUserForm.phone || undefined,
          companyName: managedUserForm.companyName || undefined,
          isActive: Boolean(managedUserForm.isActive),
        }),
      });

      setManagedUserForm(createInitialManagedUserForm());
      await refreshBootstrap();
    }, 'User account created.');
  };

  const toggleManagedUserStatus = async (user) => {
    await withBusy(async () => {
      await apiRequest(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          isActive: !user.is_active,
          fullName: user.full_name,
          email: user.email,
        }),
      });

      await refreshBootstrap();
    }, user.is_active ? 'User access suspended.' : 'User access restored.');
  };

  const submitWarehouse = (event) => {
    event.preventDefault();

    withBusy(async () => {
      const errors = validateWarehouseForm(warehouseForm);
      if (hasErrors(errors)) throw new Error(Object.values(errors)[0]);

      await apiRequest('/api/admin/warehouses', {
        method: 'POST',
        body: JSON.stringify({
          code: warehouseForm.code,
          name: warehouseForm.name,
          city: warehouseForm.city,
          country: warehouseForm.country,
          capacityUnits: Number(warehouseForm.capacityUnits),
          isActive: Boolean(warehouseForm.isActive),
        }),
      });

      setWarehouseForm(createInitialWarehouseForm());
      await refreshBootstrap();
    }, 'Warehouse created.');
  };

  const toggleWarehouseStatus = async (warehouse) => {
    await withBusy(async () => {
      await apiRequest(`/api/admin/warehouses/${warehouse.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          isActive: !warehouse.is_active,
        }),
      });

      await refreshBootstrap();
    }, warehouse.is_active ? 'Warehouse paused.' : 'Warehouse activated.');
  };

  const refreshExchangeRateSync = async () => {
    await withBusy(async () => {
      await apiRequest('/api/admin/integrations/exchange-rates/sync', {
        method: 'POST',
        body: JSON.stringify({ force: true }),
      });
      await refreshBootstrap();
    }, 'Exchange rates synchronized.');
  };

  const saveCustomerProfile = async (payload) => {
    await withBusy(async () => {
      await apiRequest('/api/account/profile', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      await refreshBootstrap();
    }, 'Profile updated.');
  };

  const submitOrderLookup = (orderNumber) => {
    const trimmed = String(orderNumber || '').trim().toUpperCase();
    if (!trimmed) {
      setFlash({ type: 'error', message: 'Enter an order number to open order tracking.' });
      return;
    }

    if (!session) {
      setPendingAction({ type: 'trackOrder', orderNumber: trimmed });
      setFlash({ type: 'info', message: 'Sign in to view secure order tracking details.' });
      goToRoute('login');
      return;
    }

    goToRoute('order', trimmed);
  };

  const submitHeaderSearch = (value, categorySlug = '') => {
    const normalizedSearch = String(value || '').trim();
    setSearch(normalizedSearch);
    goToRoute('catalog', categorySlug);
  };

  /* ── Wishlist actions ── */
  const saveToWishlist = async (productId) => {
    await withBusy(async () => {
      if (!session?.customerId) { goToRoute('access'); throw new Error('Sign in to save items.'); }
      await apiRequest('/api/wishlist', { method: 'POST', body: JSON.stringify({ productId }) });
    }, 'Saved to wishlist.');
  };

  const removeFromWishlist = async (productId) => {
    await withBusy(async () => {
      await apiRequest(`/api/wishlist/${productId}`, { method: 'DELETE' });
      setWishlistState((s) => ({ ...s, data: (s.data || []).filter((i) => i.id !== productId) }));
    }, 'Removed from wishlist.');
  };

  const moveToCart = async (productId) => {
    await withBusy(async () => {
      await apiRequest(`/api/wishlist/${productId}/move-to-cart`, { method: 'POST' });
      setWishlistState((s) => ({ ...s, data: (s.data || []).filter((i) => i.id !== productId) }));
      await refreshBootstrap();
    }, 'Moved to cart.');
  };

  const submitReorder = async (inventoryRow) => {
    await withBusy(async () => {
      await apiRequest('/api/admin/reorder-requests', {
        method: 'POST',
        body: JSON.stringify({
          productId: inventoryRow.product_id,
          warehouseId: inventoryRow.warehouse_id,
          note: `Requested from inventory workspace for ${inventoryRow.product_name}.`,
        }),
      });
      await refreshBootstrap();
    }, `Reorder request queued for "${inventoryRow.product_name}" at ${inventoryRow.warehouse_name}.`);
  };

  const renderProductComposer = () => (
    <ProductComposer
      showSellerField={false}
      productForm={productForm}
      setProductForm={setProductForm}
      sellerOptions={[]}
      categories={data.lookups?.categories || []}
      currencies={data.lookups?.currencies || []}
      productAttributes={data.lookups?.productAttributes || []}
      warehouses={data.lookups?.warehouses || []}
      storageStatus={storageStatus}
      submitProduct={submitProduct}
      createSlug={createSlug}
    />
  );

  // Unified auth handler — works for both 'login' and 'register' mode (set via authForm.mode)
  const submitAuth = (event) => {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (authForm.mode === 'register') {
      const normalizedFullName = String(authForm.fullName || '').trim().replace(/\s+/g, ' ');
      const [firstName = '', ...rest] = normalizedFullName.split(' ');
      const syntheticRegisterForm = {
        fullName: normalizedFullName,
        email: authForm.email || '',
        password: authForm.password || '',
        firstName,
        lastName: rest.join(' ') || firstName,
      };
      const regErrors = validateRegisterForm(syntheticRegisterForm);
      if (hasErrors(regErrors)) {
        setFlash({ type: 'error', message: Object.values(regErrors)[0] });
        return;
      }
      withBusy(async () => {
        await apiRequest('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(syntheticRegisterForm),
        });
        setAuthForm((c) => ({ ...c, mode: 'login' }));
        goToRoute('access');
      }, 'Account created. You can sign in now.');
    } else {
      submitLogin(event);
    }
  };

  const [trackForm, setTrackForm] = useState({ orderNumber: '' });
  const submitTrack = (event) => {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    submitOrderLookup(trackForm.orderNumber);
  };

  const sharedAccessProps = {
    data,
    authForm,
    setAuthForm,
    submitAuth,
    trackForm,
    setTrackForm,
    submitTrack,
    isBusy,
    onNavigate: goToRoute,
  };

  const accessPageProps = { ...sharedAccessProps, accessView: 'access' };
  const loginPageProps = { ...sharedAccessProps, accessView: 'login' };
  const registerPageProps = { ...sharedAccessProps, accessView: 'register' };

  let pageContent;

  switch (route.page) {
    case 'catalog':
      pageContent = (
        <CatalogPage
          data={data}
          route={route}
          search={search}
          setSearch={setSearch}
          catalogState={catalogState}
          catalogSort={catalogSort}
          setCatalogSort={setCatalogSort}
          onNavigate={goToRoute}
          addToCart={addToCart}
        />
      );
      break;
    case 'product':
      if (productState.status === 'loading') {
        pageContent = <section className="section-shell"><LoadingSkeleton count={1} type="detail" /></section>;
        break;
      }
      pageContent = (
        <ProductPage
          productState={productState}
          productDetail={productDetail}
          addToCart={addToCart}
          onNavigate={goToRoute}
          session={session}
          saveToWishlist={saveToWishlist}
        />
      );
      break;
    case 'cart':
      if (!cart && isBusy) {
        pageContent = <section className="section-shell"><LoadingSkeleton count={3} type="cart" /></section>;
        break;
      }
      pageContent = (
        <CartPage
          session={session}
          cart={cart}
          quote={quote}
          onNavigate={goToRoute}
          updateCartQuantity={updateCartQuantity}
          removeCartItem={removeCartItem}
        />
      );
      break;
    case 'checkout':
      pageContent = (
        <CheckoutPage
          session={session}
          quote={quote}
          customerDashboard={customerDashboard}
          cart={cart}
          checkoutForm={checkoutForm}
          setCheckoutForm={setCheckoutForm}
          data={data}
          refreshQuote={refreshQuote}
          submitCheckout={submitCheckout}
          applyAddressToCheckout={applyAddressToCheckout}
          onNavigate={goToRoute}
        />
      );
      break;
    case 'access':
      pageContent = <AccessPage {...accessPageProps} />;
      break;
    case 'login':
      pageContent = <LoginPage {...loginPageProps} />;
      break;
    case 'register':
      pageContent = <RegisterPage {...registerPageProps} />;
      break;
    case 'dashboard':
      pageContent = (
        <DashboardPage
          session={session}
          customerDashboard={customerDashboard}
          adminDashboard={adminDashboard}
          operationsDashboard={operationsDashboard}
          addToCart={addToCart}
          onNavigate={goToRoute}
          signOut={signOut}
          renderProductComposer={renderProductComposer}
          setCheckoutForm={setCheckoutForm}
          applyAddressToCheckout={applyAddressToCheckout}
          opsForm={opsForm}
          setOpsForm={setOpsForm}
          submitOpsUpdate={submitOpsUpdate}
          discountForm={discountForm}
          setDiscountForm={setDiscountForm}
          submitDiscountCampaign={submitDiscountCampaign}
          managedUserForm={managedUserForm}
          setManagedUserForm={setManagedUserForm}
          submitManagedUser={submitManagedUser}
          platformSettingsForm={platformSettingsForm}
          setPlatformSettingsForm={setPlatformSettingsForm}
          submitPlatformSettings={submitPlatformSettings}
          refreshExchangeRateSync={refreshExchangeRateSync}
          saveCustomerProfile={saveCustomerProfile}
          submitWarehouse={submitWarehouse}
          toggleManagedUserStatus={toggleManagedUserStatus}
          toggleWarehouseStatus={toggleWarehouseStatus}
          warehouseForm={warehouseForm}
          setWarehouseForm={setWarehouseForm}
          categories={data.lookups?.categories || []}
          accessPageProps={loginPageProps}
        />
      );
      break;
    case 'order':
      if (orderState.status === 'loading') {
        pageContent = <section className="section-shell"><LoadingSkeleton count={4} type="dashboard" /></section>;
        break;
      }
      pageContent = (
        <OrderPage
          session={session}
          orderState={orderState}
          orderDetail={orderDetail}
          onNavigate={goToRoute}
        />
      );
      break;
    case 'analytics':
      pageContent = (
        <AnalyticsPage
          analyticsState={analyticsState}
          session={session}
          onNavigate={goToRoute}
        />
      );
      break;
    case 'inventory':
      pageContent = (
        <InventoryPage
          inventoryState={inventoryState}
          session={session}
          onNavigate={goToRoute}
          submitReorder={submitReorder}
        />
      );
      break;
    case 'wishlist':
      pageContent = (
        <WishlistPage
          session={session}
          wishlistState={wishlistState}
          onNavigate={goToRoute}
          addToCart={addToCart}
          removeFromWishlist={removeFromWishlist}
          moveToCart={moveToCart}
        />
      );
      break;
    case 'home':
    default:
      pageContent = (
        <HomePage
          data={data}
          allProducts={data.products || []}
          session={session}
          onNavigate={goToRoute}
          addToCart={addToCart}
        />
      );
      break;
  }

  const wishlistItemCount = wishlistState.data?.length || 0;

  return (
    <ErrorBoundary>
      <ToastProvider>
        <div className="app-shell">
          <SiteHeader
            search={search}
            setSearch={setSearch}
            onSearch={submitHeaderSearch}
            session={session}
            cart={cart}
            data={data}
            route={route}
            onNavigate={goToRoute}
            wishlistCount={wishlistItemCount}
          />

          <main id="main-content" className="main-content">
            {flash ? <div className={`flash-banner flash-banner-${flash.type}`} role="alert" aria-live="assertive">{flash.message}</div> : null}
            {isBusy ? <div className="busy-banner" aria-live="polite">Working through your request...</div> : null}
            {pageContent}
          </main>

          <SiteFooter storageStatus={storageStatus} data={data} onNavigate={goToRoute} />
        </div>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
