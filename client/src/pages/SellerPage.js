import { useEffect } from 'react';
import EmptyState from '../components/EmptyState';

const SellerPage = ({ onNavigate }) => {
  useEffect(() => {
    // Redirect to catalog since seller pages no longer exist
    onNavigate('catalog');
  }, [onNavigate]);

  return (
    <EmptyState
      title="Page not found"
      copy="This page is no longer available. RealCommerce is a single-seller platform."
      action={<button className="ghost-btn" type="button" onClick={() => onNavigate('catalog')}>Browse catalog</button>}
    />
  );
};

export default SellerPage;
