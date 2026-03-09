import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the marketplace shell from the new reference design', () => {
  render(<App />);

  expect(screen.getByLabelText(/realcommerce home/i)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/search realcommerce/i)).toBeInTheDocument();
  expect(screen.getByText(/gaming accessories/i)).toBeInTheDocument();
  expect(screen.getByText(/see personalized recommendations/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /back to top/i })).toBeInTheDocument();
});
