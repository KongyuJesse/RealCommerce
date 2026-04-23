import { useState } from 'react';
import { SearchIcon, PackageIcon, TruckIcon, RefreshIcon, CreditCardIcon, ShieldIcon, HeadphonesIcon, ChevronRightIcon } from '../components/MarketplaceIcons';

const HELP_CATEGORIES = [
  {
    id: 'orders',
    title: 'Orders & Shipping',
    icon: PackageIcon,
    topics: [
      'Track my order',
      'Change or cancel order',
      'Shipping rates and delivery times',
      'International shipping',
      'Order status meanings',
    ],
  },
  {
    id: 'returns',
    title: 'Returns & Refunds',
    icon: RefreshIcon,
    topics: [
      'Start a return',
      'Return policy',
      'Refund timeline',
      'Exchange an item',
      'Return shipping costs',
    ],
  },
  {
    id: 'payment',
    title: 'Payment & Pricing',
    icon: CreditCardIcon,
    topics: [
      'Payment methods accepted',
      'Currency conversion',
      'Promotional codes',
      'Price matching',
      'Payment security',
    ],
  },
  {
    id: 'account',
    title: 'Account & Security',
    icon: ShieldIcon,
    topics: [
      'Reset password',
      'Update account information',
      'Manage addresses',
      'Privacy settings',
      'Delete account',
    ],
  },
  {
    id: 'products',
    title: 'Products & Availability',
    icon: TruckIcon,
    topics: [
      'Product availability',
      'Pre-orders',
      'Product specifications',
      'Warranty information',
      'Product reviews',
    ],
  },
  {
    id: 'support',
    title: 'Customer Support',
    icon: HeadphonesIcon,
    topics: [
      'Contact us',
      'Live chat support',
      'Email support',
      'Phone support hours',
      'Report an issue',
    ],
  },
];

const FAQ_ITEMS = [
  {
    question: 'How long does shipping take?',
    answer: 'Standard shipping typically takes 3-5 business days. Express shipping is available for 1-2 day delivery. International orders may take 7-14 business days depending on the destination.',
  },
  {
    question: 'What is your return policy?',
    answer: 'We offer a 30-day return policy on most items. Products must be unused and in original packaging. Return shipping is free for defective items, otherwise a small fee may apply.',
  },
  {
    question: 'Do you ship internationally?',
    answer: 'Yes! We ship to over 40 countries worldwide. International shipping rates and delivery times vary by destination. Customs fees may apply and are the responsibility of the customer.',
  },
  {
    question: 'How can I track my order?',
    answer: 'Once your order ships, you\'ll receive a tracking number via email. You can also track your order by logging into your account and viewing your order history.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, Mastercard, American Express), PayPal, and bank transfers. All payments are processed securely with 256-bit SSL encryption.',
  },
  {
    question: 'Can I change or cancel my order?',
    answer: 'Orders can be modified or cancelled within 1 hour of placement. After that, the order enters processing and cannot be changed. Contact support immediately if you need assistance.',
  },
];

const HelpCenterPage = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState(null);

  const filteredFaqs = FAQ_ITEMS.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ background: 'var(--canvas)', minHeight: '100vh' }}>
      {/* Hero Section */}
      <div style={{ background: 'linear-gradient(135deg, var(--nav) 0%, var(--nav-soft) 100%)', color: '#fff', padding: '4rem 1.5rem 3rem', textAlign: 'center' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, marginBottom: '1rem' }}>
            How can we help you?
          </h1>
          <p style={{ fontSize: '1.1rem', opacity: 0.9, marginBottom: '2rem' }}>
            Search our help center or browse categories below
          </p>

          {/* Search Bar */}
          <div style={{ position: 'relative', maxWidth: 600, margin: '0 auto' }}>
            <SearchIcon size={20} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-muted)' }} />
            <input
              type="text"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '1rem 1rem 1rem 3rem',
                fontSize: '1rem',
                border: 'none',
                borderRadius: 50,
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              }}
            />
          </div>
        </div>
      </div>

      <div className="section-shell" style={{ maxWidth: 1200, margin: '-2rem auto 0', position: 'relative', zIndex: 1 }}>
        {/* Help Categories */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          {HELP_CATEGORIES.map((category) => (
            <div
              key={category.id}
              style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '1.5rem',
                boxShadow: 'var(--shadow-card)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-card)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ width: 48, height: 48, background: 'var(--canvas-soft)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <category.icon size={24} style={{ color: 'var(--nav-soft)' }} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{category.title}</h3>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {category.topics.map((topic, idx) => (
                  <li key={idx}>
                    <button
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--link)',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        padding: '0.25rem 0',
                        textAlign: 'left',
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                      onMouseEnter={(e) => (e.target.style.textDecoration = 'underline')}
                      onMouseLeave={(e) => (e.target.style.textDecoration = 'none')}
                    >
                      <ChevronRightIcon size={14} />
                      {topic}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '2rem', boxShadow: 'var(--shadow-card)', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '1.5rem' }}>Frequently Asked Questions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredFaqs.map((faq, idx) => (
              <div
                key={idx}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  overflow: 'hidden',
                  transition: 'border-color 0.2s',
                }}
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                  style={{
                    width: '100%',
                    padding: '1rem 1.25rem',
                    background: expandedFaq === idx ? 'var(--canvas-soft)' : '#fff',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '1rem',
                    fontWeight: 600,
                    fontFamily: 'inherit',
                  }}
                >
                  {faq.question}
                  <span style={{ transform: expandedFaq === idx ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                    <ChevronRightIcon size={18} />
                  </span>
                </button>
                {expandedFaq === idx && (
                  <div style={{ padding: '1rem 1.25rem', background: 'var(--canvas-soft)', borderTop: '1px solid var(--border)', fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--ink-soft)' }}>
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredFaqs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--ink-soft)' }}>
              <p>No results found for "{searchQuery}"</p>
              <button
                onClick={() => setSearchQuery('')}
                style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: 'var(--accent)', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
              >
                Clear search
              </button>
            </div>
          )}
        </div>

        {/* Contact Section */}
        <div style={{ background: 'linear-gradient(135deg, #f0f7ff 0%, #fef3c7 100%)', border: '1px solid #d1e4f8', borderRadius: 12, padding: '2.5rem', textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.75rem' }}>Still need help?</h2>
          <p style={{ fontSize: '1rem', color: 'var(--ink-soft)', marginBottom: '1.5rem' }}>
            Our customer support team is here to assist you
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="accent-btn" style={{ padding: '0.875rem 2rem' }}>
              Contact Support
            </button>
            <button className="ghost-btn" style={{ padding: '0.875rem 2rem' }}>
              Live Chat
            </button>
          </div>
          <div style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
            <strong>Support Hours:</strong> Monday - Friday, 9:00 AM - 6:00 PM EST
          </div>
        </div>

        {/* Quick Links */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <button
            onClick={() => onNavigate('home')}
            style={{ background: 'none', border: 'none', color: 'var(--link)', fontSize: '0.9rem', cursor: 'pointer', textDecoration: 'underline' }}
          >
            ← Back to shopping
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpCenterPage;
