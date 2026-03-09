import { render, screen } from '@testing-library/react';
import App from './App';

const homepagePayload = {
  departmentLinks: ['Deals', 'Workspace', 'Audio', 'Lighting', 'Wellness'],
  dealStrip: [{ title: 'Deals up to 18% off' }],
  heroSlides: [
    {
      id: 'hero-1',
      eyebrow: 'Featured collection',
      title: 'Shop the latest workspace upgrades.',
      subtitle: 'Curated picks from the live backend storefront.',
      imageUrl: 'https://example.com/hero-1.jpg',
      imageAlt: 'Workspace hero',
    },
  ],
  productRails: [
    {
      id: 'featured-products',
      title: 'Popular products',
      products: [
        {
          name: 'Atlas Standing Desk',
          imageUrl: 'https://example.com/desk.jpg',
          imageAlt: 'Atlas Standing Desk',
        },
        {
          name: 'Halo Task Chair',
          imageUrl: 'https://example.com/chair.jpg',
          imageAlt: 'Halo Task Chair',
        },
        {
          name: 'Pulse Smart Lamp',
          imageUrl: 'https://example.com/lamp.jpg',
          imageAlt: 'Pulse Smart Lamp',
        },
        {
          name: 'Drift Earbuds',
          imageUrl: 'https://example.com/earbuds.jpg',
          imageAlt: 'Drift Earbuds',
        },
      ],
    },
    {
      id: 'shop-by-category',
      title: 'Shop by category',
      products: [],
    },
  ],
  promoTiles: [
    {
      slug: 'workspace',
      name: 'Workspace Systems',
      ctaLabel: 'Shop now',
      imageUrl: 'https://example.com/workspace.jpg',
      imageAlt: 'Workspace Systems',
    },
    {
      slug: 'mobility',
      name: 'Urban Mobility',
      ctaLabel: 'Browse',
      imageUrl: 'https://example.com/mobility.jpg',
      imageAlt: 'Urban Mobility',
    },
  ],
  shopByCategory: [
    {
      slug: 'workspace',
      name: 'Workspace Systems',
      imageUrl: 'https://example.com/workspace.jpg',
      imageAlt: 'Workspace Systems',
    },
    {
      slug: 'audio',
      name: 'Creator Gear',
      imageUrl: 'https://example.com/audio.jpg',
      imageAlt: 'Creator Gear',
    },
    {
      slug: 'lighting',
      name: 'Connected Living',
      imageUrl: 'https://example.com/lighting.jpg',
      imageAlt: 'Connected Living',
    },
    {
      slug: 'wellness',
      name: 'Wellness Technology',
      imageUrl: 'https://example.com/wellness.jpg',
      imageAlt: 'Wellness Technology',
    },
  ],
  featureBanner: {
    title: 'Build the setup',
    ctaLabel: 'Build now',
    imageUrl: 'https://example.com/banner.jpg',
    imageAlt: 'Feature banner',
  },
  footerLinks: {
    shop: [],
    support: [],
    about: [],
    connect: [],
  },
};

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ data: homepagePayload }),
    })
  );
});

afterEach(() => {
  jest.resetAllMocks();
});

test('renders the marketplace shell from the live homepage API mapping', async () => {
  render(<App />);

  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringMatching(/\/api\/homepage$/),
    expect.objectContaining({
      signal: expect.any(Object),
    })
  );

  await screen.findByText(/shop the latest workspace upgrades/i);
  expect(screen.getAllByText(/workspace systems/i).length).toBeGreaterThan(0);
  expect(screen.getByRole('button', { name: /back to top/i })).toBeInTheDocument();
});
