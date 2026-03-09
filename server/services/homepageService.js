const { listCategories, listProducts } = require('./catalogService');
const {
  categoryProfiles,
  departmentLinks,
  productProfiles,
  trustHighlights,
  utilityLinks,
} = require('./storefrontProfiles');

function resizeImageUrl(imageUrl, width, height) {
  if (!imageUrl) {
    return '';
  }

  try {
    const parsedUrl = new URL(imageUrl);

    parsedUrl.searchParams.set('w', String(width));
    parsedUrl.searchParams.set('h', String(height));

    return parsedUrl.toString();
  } catch (error) {
    return imageUrl;
  }
}

function withProductProfile(product) {
  const profile = productProfiles[product.slug] || {};

  return {
    ...product,
    imageUrl: resizeImageUrl(product.imageUrl, 1200, 900),
    badge: profile.badge || 'Featured',
    compareAt: profile.compareAt || null,
    rating: profile.rating || 4.7,
    reviewCount: profile.reviewCount || 40,
  };
}

function withCategoryProfile(category) {
  const profile = categoryProfiles[category.slug] || {};

  return {
    ...category,
    imageUrl: resizeImageUrl(category.imageUrl, 1200, 760),
    eyebrow: profile.eyebrow || 'Featured',
    ctaLabel: profile.ctaLabel || 'Browse now',
    description: profile.description || category.description,
  };
}

function selectProductsBySlug(products, slugs) {
  const catalog = new Map(products.map((product) => [product.slug, product]));

  return slugs.map((slug) => catalog.get(slug)).filter(Boolean);
}

function buildHeroSlides(products) {
  const featured = selectProductsBySlug(products, [
    'atlas-standing-desk',
    'drift-noise-canceling-buds',
    'rover-fold-e-scooter',
  ]);

  return [
    {
      id: 'workspace-refresh',
      eyebrow: 'Workspace refresh',
      title: 'Upgrade the room where the work actually happens.',
      subtitle:
        'Discover desks, calmer lighting, and ergonomic seating selected for long workdays and better focus.',
      ctaLabel: 'Shop workspace picks',
      ctaHref: '#trending-now',
      imageUrl: resizeImageUrl(featured[0]?.imageUrl, 1800, 820),
      imageAlt: featured[0]?.imageAlt || 'Workspace collection hero image.',
    },
    {
      id: 'creator-sound',
      eyebrow: 'Audio and creator gear',
      title: 'Sharper sound for focused work, travel, and studio time.',
      subtitle:
        'Portable audio picks that move easily between home office, studio sessions, and busy travel days.',
      ctaLabel: 'Explore audio gear',
      ctaHref: '#daily-upgrades',
      imageUrl: resizeImageUrl(featured[1]?.imageUrl, 1800, 820),
      imageAlt: featured[1]?.imageAlt || 'Audio product hero image.',
    },
    {
      id: 'move-smarter',
      eyebrow: 'City mobility',
      title: 'Move through dense days with gear built for modern routes.',
      subtitle:
        'Shop mobility and recovery essentials made for compact commutes and demanding routines.',
      ctaLabel: 'See mobility',
      ctaHref: '#shop-by-category',
      imageUrl: resizeImageUrl(featured[2]?.imageUrl, 1800, 820),
      imageAlt: featured[2]?.imageAlt || 'Mobility product hero image.',
    },
  ];
}

function buildPromoTiles(categories) {
  return categories.slice(0, 4).map((category) => withCategoryProfile(category));
}

function buildProductRails(products) {
  const enriched = products.map(withProductProfile);

  return [
    {
      id: 'trending-now',
      title: 'Popular picks across workspace, audio, and lighting',
      subtitle: 'A tighter edit of the products customers reach for most often.',
      products: enriched,
    },
    {
      id: 'daily-upgrades',
      title: 'Portable favorites for work, travel, and recovery',
      subtitle: 'Compact products chosen for easier movement between rooms, bags, and routines.',
      products: selectProductsBySlug(enriched, [
        'drift-noise-canceling-buds',
        'pulse-smart-lamp',
        'tempo-recovery-massager',
        'rover-fold-e-scooter',
        'atlas-standing-desk',
      ]),
    },
  ];
}

function buildFeatureBanner(products) {
  const desk = products.find((product) => product.slug === 'atlas-standing-desk');
  const lamp = products.find((product) => product.slug === 'pulse-smart-lamp');
  const audio = products.find((product) => product.slug === 'drift-noise-canceling-buds');
  const bannerImage = desk?.imageUrl || lamp?.imageUrl || audio?.imageUrl || '';

  return {
    eyebrow: 'Room builder',
    title: 'Layer desks, light, and sound into one sharper setup.',
    subtitle:
      'Build a calmer setup with a few focused upgrades that work better together than they do alone.',
    imageUrl: resizeImageUrl(bannerImage, 1600, 900),
    imageAlt: desk?.imageAlt || lamp?.imageAlt || audio?.imageAlt || 'Featured bundle image.',
    ctaLabel: 'Build the setup',
    ctaHref: '#shop-by-category',
    highlights: ['Desk systems', 'Warm task lighting', 'Travel-ready audio'],
  };
}

async function getHomepageData() {
  const [featuredCategories, featuredProducts] = await Promise.all([
    listCategories(4),
    listProducts({ featuredOnly: true, limit: 6 }),
  ]);

  const profiledCategories = featuredCategories.map(withCategoryProfile);
  const profiledProducts = featuredProducts.map(withProductProfile);

  return {
    updatedAt: new Date().toISOString(),
    utilityLinks,
    departmentLinks,
    heroSlides: buildHeroSlides(profiledProducts),
    promoTiles: buildPromoTiles(profiledCategories),
    productRails: buildProductRails(profiledProducts),
    featureBanner: buildFeatureBanner(profiledProducts),
    shopByCategory: profiledCategories,
    trustHighlights,
    dealStrip: [
      {
        title: 'Deals up to 18% off',
        text: 'Selected workspace and creator favorites are priced for a limited seasonal window.',
      },
      {
        title: 'New arrivals this week',
        text: 'Fresh desk, lighting, and mobility additions are now live across featured collections.',
      },
      {
        title: 'Business pricing',
        text: 'Flexible buying options for teams, studios, and modern retail customers.',
      },
      {
        title: 'Gift-ready picks',
        text: 'Portable audio, lamps, and recovery essentials make practical premium gifts.',
      },
    ],
    searchSuggestions: [
      'standing desk',
      'wireless audio',
      'smart lamp',
      'recovery massager',
      'electric scooter',
    ],
    footerLinks: {
      shop: ["Today's deals", 'Best sellers', 'Workspace', 'Audio'],
      support: ['Help center', 'Returns', 'Delivery', 'Business orders'],
      about: ['Our story', 'Sustainability', 'Trade program', 'Store locations'],
      connect: ['Email updates', 'Instagram', 'X', 'Contact us'],
    },
  };
}

module.exports = {
  getHomepageData,
};
