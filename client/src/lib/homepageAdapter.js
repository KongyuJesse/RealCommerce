function compactText(value, maxLength, fallback) {
  const source = (value || fallback || '').trim();

  if (!source) {
    return fallback || '';
  }

  if (source.length <= maxLength) {
    return source;
  }

  return `${source.slice(0, maxLength - 3).trim()}...`;
}

function mapMosaicItems(items, fallbackItems, labelSelector) {
  const mapped = (items || [])
    .slice(0, 4)
    .map((item, index) => ({
      title: compactText(labelSelector(item), 22, fallbackItems[index]?.title),
      imageUrl: item.imageUrl || fallbackItems[index]?.imageUrl || '',
      alt:
        item.imageAlt ||
        item.alt ||
        item.name ||
        item.title ||
        fallbackItems[index]?.alt ||
        '',
    }));

  if (!mapped.length) {
    return fallbackItems;
  }

  return mapped.concat(fallbackItems.slice(mapped.length)).slice(0, 4);
}

function mapSingleCard(source, fallbackCard) {
  if (!source) {
    return fallbackCard;
  }

  return {
    ...fallbackCard,
    id: source.slug || source.id || fallbackCard.id,
    title: compactText(source.name || source.title, 42, fallbackCard.title),
    linkLabel: source.ctaLabel || fallbackCard.linkLabel,
    imageUrl: source.imageUrl || fallbackCard.imageUrl,
    alt: source.imageAlt || source.alt || fallbackCard.alt,
  };
}

function adaptHomepageToMarketplaceData(homepageData, fallbackData) {
  if (!homepageData) {
    return fallbackData;
  }

  const firstRail = homepageData.productRails?.[0];
  const secondRail = homepageData.productRails?.[1];
  const promoTiles = homepageData.promoTiles || [];
  const categories = homepageData.shopByCategory || [];
  const secondarySources = [...promoTiles.slice(1), ...categories.slice(1)];

  return {
    ...fallbackData,
    secondaryLinks:
      homepageData.departmentLinks?.slice(0, 5).filter(Boolean) ||
      fallbackData.secondaryLinks,
    spotlightLabel:
      homepageData.dealStrip?.[0]?.title || fallbackData.spotlightLabel,
    heroSlides:
      homepageData.heroSlides?.length > 0
        ? homepageData.heroSlides.map((slide, index) => ({
            id: slide.id || fallbackData.heroSlides[index]?.id || `hero-${index}`,
            eyebrow: slide.eyebrow || fallbackData.heroSlides[index]?.eyebrow || '',
            title: slide.title || fallbackData.heroSlides[index]?.title || '',
            subtitle:
              slide.subtitle || fallbackData.heroSlides[index]?.subtitle || '',
            imageUrl:
              slide.imageUrl || fallbackData.heroSlides[index]?.imageUrl || '',
            alt: slide.imageAlt || fallbackData.heroSlides[index]?.alt || '',
          }))
        : fallbackData.heroSlides,
    featuredCards: [
      {
        ...fallbackData.featuredCards[0],
        id: firstRail?.id || fallbackData.featuredCards[0].id,
        title: compactText(firstRail?.title, 42, fallbackData.featuredCards[0].title),
        items: mapMosaicItems(
          firstRail?.products,
          fallbackData.featuredCards[0].items,
          (product) => product.name
        ),
      },
      mapSingleCard(promoTiles[0] || categories[0], fallbackData.featuredCards[1]),
      {
        ...fallbackData.featuredCards[2],
        id: secondRail?.id || fallbackData.featuredCards[2].id,
        title: compactText(
          secondRail?.title,
          42,
          fallbackData.featuredCards[2].title
        ),
        items: mapMosaicItems(
          categories,
          fallbackData.featuredCards[2].items,
          (category) => category.name
        ),
      },
      mapSingleCard(homepageData.featureBanner || promoTiles[1], fallbackData.featuredCards[3]),
    ],
    secondaryCards: fallbackData.secondaryCards.map((fallbackCard, index) =>
      mapSingleCard(secondarySources[index], fallbackCard)
    ),
  };
}

export { adaptHomepageToMarketplaceData };
