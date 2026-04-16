import { render, screen } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  global.fetch = jest.fn(() => Promise.reject(new Error('offline')));
});

afterEach(() => {
  jest.resetAllMocks();
});

test('renders the storefront shell with fallback data', async () => {
  render(<App />);

  expect(await screen.findByText(/top picks for you/i)).toBeInTheDocument();
  expect(screen.getByText(/shop by category/i)).toBeInTheDocument();
});
