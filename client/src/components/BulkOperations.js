import { useState } from 'react';
import { CheckCircleIcon, XIcon } from './MarketplaceIcons';

const BulkOperations = ({ items, itemType = 'product', onBulkAction, availableActions }) => {
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showActions, setShowActions] = useState(false);

  const toggleItem = (itemId) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const toggleAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(item => item.id)));
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedItems.size === 0) {
      alert('Please select items first');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${selectedItems.size} ${itemType}(s)?`
    );

    if (confirmed) {
      await onBulkAction(action, Array.from(selectedItems));
      setSelectedItems(new Set());
      setShowActions(false);
    }
  };

  const defaultActions = {
    product: [
      { id: 'activate', label: 'Activate', color: 'var(--success)' },
      { id: 'deactivate', label: 'Deactivate', color: 'var(--warning)' },
      { id: 'delete', label: 'Delete', color: 'var(--danger)' },
      { id: 'export', label: 'Export Selected', color: 'var(--primary)' },
    ],
    order: [
      { id: 'process', label: 'Mark as Processing', color: 'var(--primary)' },
      { id: 'ship', label: 'Mark as Shipped', color: 'var(--success)' },
      { id: 'cancel', label: 'Cancel Orders', color: 'var(--danger)' },
      { id: 'export', label: 'Export Selected', color: 'var(--primary)' },
    ],
    user: [
      { id: 'activate', label: 'Activate', color: 'var(--success)' },
      { id: 'suspend', label: 'Suspend', color: 'var(--warning)' },
      { id: 'export', label: 'Export Selected', color: 'var(--primary)' },
    ],
  };

  const actions = availableActions || defaultActions[itemType] || defaultActions.product;

  if (items.length === 0) {
    return null;
  }

  return (
    <div style={{ marginBottom: '1rem' }}>
      {/* Selection bar */}
      <div
        style={{
          background: selectedItems.size > 0 ? 'var(--primary)' : 'var(--background)',
          color: selectedItems.size > 0 ? 'white' : 'var(--ink)',
          padding: '1rem',
          borderRadius: 8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          transition: 'all 0.3s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={selectedItems.size === items.length && items.length > 0}
              onChange={toggleAll}
              style={{ width: 18, height: 18, cursor: 'pointer' }}
            />
            <span style={{ fontWeight: 500 }}>
              {selectedItems.size === 0
                ? `Select all (${items.length})`
                : `${selectedItems.size} selected`}
            </span>
          </label>
        </div>

        {selectedItems.size > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={() => setShowActions(!showActions)}
              className="btn-secondary"
              style={{
                background: 'white',
                color: 'var(--primary)',
                padding: '0.5rem 1rem',
              }}
            >
              Bulk Actions
            </button>
            <button
              onClick={() => setSelectedItems(new Set())}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '0.5rem',
              }}
              aria-label="Clear selection"
            >
              <XIcon size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Bulk actions menu */}
      {showActions && selectedItems.size > 0 && (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '1rem',
            marginBottom: '1rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
            Choose an action for {selectedItems.size} {itemType}(s):
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleBulkAction(action.id)}
                style={{
                  padding: '0.5rem 1rem',
                  border: `2px solid ${action.color}`,
                  background: 'white',
                  color: action.color,
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = action.color;
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.color = action.color;
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Render items with checkboxes */}
      <div style={{ display: 'grid', gap: '0.5rem' }}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              background: selectedItems.has(item.id) ? '#f0f7ff' : 'var(--surface)',
              border: selectedItems.has(item.id) ? '2px solid var(--primary)' : '1px solid var(--border)',
              borderRadius: 8,
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              transition: 'all 0.2s',
            }}
          >
            <input
              type="checkbox"
              checked={selectedItems.has(item.id)}
              onChange={() => toggleItem(item.id)}
              style={{ width: 18, height: 18, cursor: 'pointer' }}
            />
            <div style={{ flex: 1 }}>
              {item.name || item.order_number || item.full_name || `${itemType} #${item.id}`}
            </div>
            {selectedItems.has(item.id) && (
              <CheckCircleIcon size={20} style={{ color: 'var(--primary)' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BulkOperations;
