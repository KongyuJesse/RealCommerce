const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a product name'],
      trim: true,
      maxlength: [100, 'Name cannot be more than 100 characters'],
      minlength: [3, 'Name must be at least 3 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Please provide a product price'],
      min: [0, 'Price cannot be negative'],
      validate: {
        validator: function (value) {
          return /^\d+(\.\d{1,2})?$/.test(value);
        },
        message: 'Price must be a valid number with up to 2 decimal places',
      },
    },
    description: {
      type: String,
      required: [true, 'Please provide a product description'],
      maxlength: [1000, 'Description cannot be more than 1000 characters'],
    },
    image: {
      type: String,
      required: [true, 'Please provide a product image URL'],
      validate: {
        validator: function (value) {
          return /^https?:\/\/.+/.test(value);
        },
        message: 'Image must be a valid URL',
      },
    },
    category: {
      type: String,
      required: [true, 'Please provide a product category'],
      enum: [
        'electronics',
        'clothing',
        'home-garden',
        'sports',
        'toys',
        'books',
        'beauty',
        'food',
        'other',
      ],
    },
    countInStock: {
      type: Number,
      required: [true, 'Please provide stock count'],
      min: [0, 'Stock count cannot be negative'],
      default: 0,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    sku: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes for better query performance
productSchema.index({ category: 1 });
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ price: 1 });
productSchema.index({ countInStock: 1 });

// Virtual field for availability
productSchema.virtual('isAvailable').get(function () {
  return this.countInStock > 0;
});

// Middleware to ensure virtuals are included in JSON
productSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
