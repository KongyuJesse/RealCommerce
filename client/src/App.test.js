import { render, screen } from '@testing-library/react';
import App from './App';
import fallbackHomeData from './fallbackHomeData';

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ data: fallbackHomeData }),
    })
  );
});

afterEach(() => {
  jest.resetAllMocks();
});

test('renders the realcommerce homepage hero', async () => {
  render(<App />);

  expect(global.fetch).toHaveBeenCalledWith(
    '/api/homepage',
    expect.objectContaining({
      signal: expect.any(Object),
    })
  );

  await screen.findByText('ready');
  expect(
    screen.getByText(/operate catalog, orders, and fulfilment/i)
  ).toBeInTheDocument();
});
