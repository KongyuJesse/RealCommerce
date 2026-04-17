const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
    },
    qty: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    orderItems: [
      {
        type: orderItemSchema,
        required: [true, 'Order must contain at least one item'],
        validate: {
          validator: function (items) {
            return Array.isArray(items) && items.length > 0;
          },
          message: 'Order must contain at least one item',
        },
      },
    ],
    totalPrice: {
      type: Number,
      required: [true, 'Total price is required'],
      min: [0, 'Total price cannot be negative'],
      validate: {
        validator: function (value) {
          return /^\d+(\.\d{1,2})?$/.test(value);
        },
        message: 'Total price must be a valid number with up to 2 decimal places',
      },
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    shippingAddress: {
      fullName: String,
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
    paymentMethod: {
      type: String,
      enum: ['credit-card', 'debit-card', 'paypal', 'bank-transfer'],
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    paidAt: Date,
    isDelivered: {
      type: Boolean,
      default: false,
    },
    deliveredAt: Date,
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound index for efficient queries
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

// Middleware to validate and calculate total
orderSchema.pre('save', async function (next) {
  if (this.isModified('orderItems')) {
    const calculatedTotal = this.orderItems.reduce((total, item) => {
      return total + item.price * item.qty;
    }, 0);

    // Round to 2 decimal places
    this.totalPrice = Math.round(calculatedTotal * 100) / 100;
  }

  next();
});

// Virtual for days since order
orderSchema.virtual('daysSinceOrder').get(function () {
  const now = new Date();
  const createdDate = new Date(this.createdAt);
  const diffTime = Math.abs(now - createdDate);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
});

// Middleware to ensure virtuals are included in JSON
orderSchema.set('toJSON', { virtuals: true });

// Instance methods
orderSchema.methods.canBeCancelled = function () {
  return this.status === 'pending' || this.status === 'processing';
};

orderSchema.methods.markAsShipped = function () {
  if (this.status !== 'processing') {
    throw new Error('Only processing orders can be shipped');
  }
  this.status = 'shipped';
  return this.save();
};

orderSchema.methods.markAsDelivered = function () {
  if (this.status !== 'shipped') {
    throw new Error('Only shipped orders can be delivered');
  }
  this.status = 'delivered';
  this.isDelivered = true;
  this.deliveredAt = new Date();
  return this.save();
};

// Static methods
orderSchema.statics.getOrderStats = async function () {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$totalPrice' },
      },
    },
  ]);
};

module.exports = mongoose.model('Order', orderSchema);
