import DashboardCard from './DashboardCard';

const ProductComposer = ({
  productForm,
  setProductForm,
  categories,
  currencies,
  productAttributes,
  warehouses,
  storageStatus,
  submitProduct,
  createSlug,
}) => {
  const updateAttributeRow = (index, field, value) => {
    setProductForm((current) => ({
      ...current,
      attributes: (current.attributes || []).map((attribute, attributeIndex) =>
        attributeIndex === index ? { ...attribute, [field]: value } : attribute
      ),
    }));
  };

  const updateInventoryRow = (index, field, value) => {
    setProductForm((current) => ({
      ...current,
      inventoryByWarehouse: (current.inventoryByWarehouse || []).map((stock, stockIndex) =>
        stockIndex === index ? { ...stock, [field]: value } : stock
      ),
    }));
  };

  return (
    <DashboardCard
      title="Create or update a retail product"
      copy="Catalog managers can publish products, attach imagery, capture flexible attributes, and seed stock across multiple warehouses."
    >
      <form className="stack-form" onSubmit={submitProduct}>
        <div className="form-grid">
          <select value={productForm.categoryId} onChange={(event) => setProductForm((current) => ({ ...current, categoryId: event.target.value }))}>
            <option value="">Category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select value={productForm.currencyCode} onChange={(event) => setProductForm((current) => ({ ...current, currencyCode: event.target.value }))}>
            {(currencies || []).map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.code}
              </option>
            ))}
          </select>
          <input value={productForm.sku} onChange={(event) => setProductForm((current) => ({ ...current, sku: event.target.value }))} placeholder="SKU" />
          <input
            value={productForm.name}
            onChange={(event) =>
              setProductForm((current) => {
                const generatedCurrentSlug = createSlug(current.name);
                return {
                  ...current,
                  name: event.target.value,
                  slug:
                    current.slug && current.slug !== generatedCurrentSlug
                      ? current.slug
                      : createSlug(event.target.value),
                };
              })
            }
            placeholder="Product name"
          />
          <input value={productForm.slug} onChange={(event) => setProductForm((current) => ({ ...current, slug: createSlug(event.target.value) }))} placeholder="Slug" />
          <input value={productForm.unitPrice} onChange={(event) => setProductForm((current) => ({ ...current, unitPrice: event.target.value }))} placeholder="Unit price" />
          <input value={productForm.launchMonth} onChange={(event) => setProductForm((current) => ({ ...current, launchMonth: event.target.value }))} placeholder="Launch month" />
          <input value={productForm.primaryImageUrl} onChange={(event) => setProductForm((current) => ({ ...current, primaryImageUrl: event.target.value }))} placeholder="External image URL" />
          <input value={productForm.altText} onChange={(event) => setProductForm((current) => ({ ...current, altText: event.target.value }))} placeholder="Alt text" />
          <textarea className="field-span-2" value={productForm.shortDescription} onChange={(event) => setProductForm((current) => ({ ...current, shortDescription: event.target.value }))} placeholder="Short description" />
          <textarea className="field-span-2" value={productForm.longDescription} onChange={(event) => setProductForm((current) => ({ ...current, longDescription: event.target.value }))} placeholder="Long description" />
        </div>

        <div className="panel-card" style={{ padding: '1rem', marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div>
              <strong>Flexible attributes</strong>
              <div className="muted-copy">Attach EAV-style values such as material, connectivity, RAM, or color.</div>
            </div>
            <button
              className="ghost-btn ghost-btn-small"
              type="button"
              onClick={() =>
                setProductForm((current) => ({
                  ...current,
                  attributes: [...(current.attributes || []), { name: '', valueText: '' }],
                }))
              }
            >
              Add attribute
            </button>
          </div>

          {(productForm.attributes || []).map((attribute, index) => (
            <div className="form-grid" key={`attribute-row-${index}`} style={{ marginBottom: '0.75rem' }}>
              <select value={attribute.name} onChange={(event) => updateAttributeRow(index, 'name', event.target.value)}>
                <option value="">Attribute</option>
                {(productAttributes || []).map((option) => (
                  <option key={option.id} value={option.name}>
                    {option.display_name}
                  </option>
                ))}
              </select>
              <input value={attribute.valueText} onChange={(event) => updateAttributeRow(index, 'valueText', event.target.value)} placeholder="Value" />
              <button
                className="ghost-btn ghost-btn-small"
                type="button"
                onClick={() =>
                  setProductForm((current) => ({
                    ...current,
                    attributes: (current.attributes || []).filter((_, attributeIndex) => attributeIndex !== index),
                  }))
                }
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="panel-card" style={{ padding: '1rem', marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div>
              <strong>Warehouse inventory</strong>
              <div className="muted-copy">Seed quantity on hand, reorder points, and safety stock per warehouse.</div>
            </div>
            <button
              className="ghost-btn ghost-btn-small"
              type="button"
              onClick={() =>
                setProductForm((current) => ({
                  ...current,
                  inventoryByWarehouse: [
                    ...(current.inventoryByWarehouse || []),
                    { warehouseId: '', quantityOnHand: '0', reorderPoint: '0', safetyStock: '0' },
                  ],
                }))
              }
            >
              Add warehouse
            </button>
          </div>

          {(productForm.inventoryByWarehouse || []).map((stock, index) => (
            <div className="form-grid" key={`warehouse-row-${index}`} style={{ marginBottom: '0.75rem' }}>
              <select value={stock.warehouseId} onChange={(event) => updateInventoryRow(index, 'warehouseId', event.target.value)}>
                <option value="">Warehouse</option>
                {(warehouses || []).map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
              <input value={stock.quantityOnHand} onChange={(event) => updateInventoryRow(index, 'quantityOnHand', event.target.value)} placeholder="Quantity on hand" />
              <input value={stock.reorderPoint} onChange={(event) => updateInventoryRow(index, 'reorderPoint', event.target.value)} placeholder="Reorder point" />
              <input value={stock.safetyStock} onChange={(event) => updateInventoryRow(index, 'safetyStock', event.target.value)} placeholder="Safety stock" />
              <button
                className="ghost-btn ghost-btn-small"
                type="button"
                onClick={() =>
                  setProductForm((current) => ({
                    ...current,
                    inventoryByWarehouse: (current.inventoryByWarehouse || []).filter((_, stockIndex) => stockIndex !== index),
                  }))
                }
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <label className="file-upload">
          <span>{productForm.imageFile ? productForm.imageFile.name : 'Choose a primary image file'}</span>
          <input type="file" accept="image/*" onChange={(event) => setProductForm((current) => ({ ...current, imageFile: event.target.files?.[0] || null }))} />
        </label>

        <div className="note-banner">
          {storageStatus.configured
            ? `Cloud storage is configured on ${storageStatus.provider}. File uploads will be sent to signed URLs.`
            : 'Cloud storage is not configured yet. Use an external image URL or finish the storage deployment variables.'}
        </div>

        <label className="checkbox-row">
          <input type="checkbox" checked={productForm.isFeatured} onChange={(event) => setProductForm((current) => ({ ...current, isFeatured: event.target.checked }))} />
          <span>Feature this product on the storefront</span>
        </label>

        <button className="accent-btn" type="submit">
          Publish product
        </button>
      </form>
    </DashboardCard>
  );
};

export default ProductComposer;
