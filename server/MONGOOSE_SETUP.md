# Mongoose Schemas Setup Guide

## Overview
This guide explains the Mongoose schemas created for the e-commerce backend, including models for Products, Orders, and Users.

## Installation

Install required dependencies:
```bash
npm install mongoose bcryptjs
```

## Database Connection

Update your `server/db.js` or create a MongoDB connection:

```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/realcommerce', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
```

Add to your `server/app.js`:
```javascript
const connectDB = require('./db');
connectDB();
```

## Schemas Overview

### 1. Product Schema

**Fields:**
- `name` (String, required): Product name (3-100 chars)
- `price` (Number, required): Price with 2 decimal validation
- `description` (String, required): Product details (max 1000 chars)
- `image` (String, required): Valid image URL
- `category` (String, required): One of specified categories
- `countInStock` (Number, required): Available quantity
- `rating` (Number, optional): 0-5 rating
- `numReviews` (Number, optional): Review count
- `sku` (String, optional): Unique stock keeping unit

**Features:**
- Text search indexes on name and description
- Virtual `isAvailable` property
- Category enum validation
- Timestamp tracking (createdAt, updatedAt)

**Usage:**
```javascript
const { Product } = require('./models');

// Create product
const product = await Product.create({
  name: 'Wireless Headphones',
  price: 79.99,
  description: 'High quality wireless headphones',
  image: 'https://example.com/image.jpg',
  category: 'electronics',
  countInStock: 50,
});

// Search products
const results = await Product.find({ $text: { $search: 'headphones' } });

// Filter by category
const electronics = await Product.find({ category: 'electronics' });
```

### 2. Order Schema

**Fields:**
- `user` (ObjectId, required): Reference to User
- `orderItems` (Array, required): Nested items with name, qty, price, product reference
- `totalPrice` (Number, required): Auto-calculated from items
- `status` (String): pending, processing, shipped, delivered, cancelled
- `shippingAddress` (Object): Full shipping details
- `paymentMethod` (String): Payment type
- `isPaid` (Boolean): Payment status
- `paidAt` (Date): Payment timestamp
- `isDelivered` (Boolean): Delivery status
- `deliveredAt` (Date): Delivery timestamp
- `notes` (String, optional): Order notes

**Features:**
- Automatic totalPrice calculation from order items
- Virtual `daysSinceOrder` property
- Instance methods: `canBeCancelled()`, `markAsShipped()`, `markAsDelivered()`
- Static method: `getOrderStats()` for analytics
- Status lifecycle validation

**Usage:**
```javascript
const { Order } = require('./models');

// Create order
const order = await Order.create({
  user: userId,
  orderItems: [
    {
      name: 'Wireless Headphones',
      qty: 2,
      price: 79.99,
      product: productId,
    },
  ],
  shippingAddress: {
    fullName: 'John Doe',
    street: '123 Main St',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'USA',
  },
  paymentMethod: 'credit-card',
});

// Mark as shipped
await order.markAsShipped();

// Mark as delivered
await order.markAsDelivered();

// Get order statistics
const stats = await Order.getOrderStats();
```

### 3. User Schema

**Fields:**
- `email` (String, required): Unique email address
- `firstName` (String, required): First name
- `lastName` (String, required): Last name
- `password` (String, required): Hashed password (not selected by default)
- `phone` (String, optional): E.164 format phone number
- `role` (String): 'customer' or 'admin'
- `isActive` (Boolean): Account status
- `address` (Object): Full address fields
- `orders` (Array): References to user's orders
- `totalSpent` (Number): Cumulative spending
- `lastLogin` (Date): Last authentication time

**Features:**
- Automatic password hashing with bcryptjs
- Virtual `fullName` property
- Instance methods: `comparePassword()`, `updateLastLogin()`
- Static method: `findByEmail()`
- Email validation and unique constraint

**Usage:**
```javascript
const { User } = require('./models');

// Create user (password auto-hashed)
const user = await User.create({
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
  password: 'securePassword123',
  phone: '+12015550123',
});

// Authenticate user
const foundUser = await User.findByEmail('user@example.com').select('+password');
const isPasswordValid = await foundUser.comparePassword('securePassword123');

// Update last login
await user.updateLastLogin();

// Get user with full name virtual
const userData = user.toJSON(); // includes fullName
```

## Validation Best Practices

### 1. Custom Validators
All schemas include built-in validators for:
- Field length (min/max)
- Enum values (categories, roles, statuses)
- Regex patterns (email, phone, URL)
- Numeric ranges (min/max)

### 2. Error Handling
Validation errors are thrown with descriptive messages:
```javascript
try {
  await Product.create({ name: 'AB' }); // Too short
} catch (error) {
  console.error(error.message); // Name must be at least 3 characters
}
```

## Indexes

### Product Indexes
- `category`: Fast filtering by category
- Text index: Full-text search on name and description
- `price`: Sorting/filtering by price
- `countInStock`: Inventory queries

### Order Indexes
- `{ user: 1, createdAt: -1 }`: User's orders sorted by date
- `status`: Quick status filtering
- `createdAt`: Timeline queries

### User Indexes
- `email`: Authentication lookups
- `createdAt`: User analytics

## Relationships

```
User (1) ──── (Many) Order
  │
  └─── orders array (references Order._id)

Order (1) ──── (Many) OrderItems
  │
  └─── orderItems array (nested)

OrderItems contains references to Product._id
```

## Environment Variables

Add to `.env`:
```
MONGODB_URI=mongodb://localhost:27017/realcommerce
# or for MongoDB Atlas:
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/realcommerce
```

## Performance Considerations

1. **Indexing**: All frequently queried fields are indexed
2. **Select Fields**: Password fields are excluded by default
3. **Text Search**: Optimized for product name/description search
4. **Aggregations**: Use static methods for complex analytics
5. **Pagination**: Implement in routes for large result sets

## Next Steps

1. Create API routes using these models
2. Add error handling middleware
3. Implement authentication with JWT
4. Add validation middleware for request bodies
5. Create service layer for business logic

## Tips

- Always populate references when needed: `.populate('user')`, `.populate('product')`
- Use `.select()` to optimize returned fields
- Leverage instance methods for state changes (markAsShipped, etc.)
- Use static methods for aggregations and analytics
