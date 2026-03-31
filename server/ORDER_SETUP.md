# Order System Setup Guide

## Quick Start

### 1. Install Dependencies

Add MongoDB driver to your project:

```bash
cd server
npm install mongoose bcryptjs
```

### 2. Environment Configuration

Update your `.env` file with MongoDB URI:

```env
MONGODB_URI=mongodb://localhost:27017/realcommerce
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/realcommerce

NODE_ENV=development
PORT=3000
```

### 3. Database Connection Setup

Create or update `server/mongodb.js`:

```javascript
const mongoose = require('mongoose');

async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/realcommerce';
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ MongoDB connected successfully');
    console.log(`📁 Database: ${mongoose.connection.name}`);
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

// Handle connection events
mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

mongoose.connection.on('error', (error) => {
  console.error('❌ MongoDB error:', error);
});

module.exports = connectDB;
```

### 4. Update Server Entry Point

Update `server/index.js` or `server/app.js` to initialize MongoDB:

```javascript
const express = require('express');
const connectDB = require('./mongodb');

const app = express();

// Initialize database connection
connectDB();

// ... rest of your middleware and routes

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
```

### 5. Verify Installation

Run the test suite:

```bash
cd server
node tests/orderAPI.test.js
```

You should see output like:
```
🚀 Starting Order API Tests...
📤 POST /orders
✅ Success (201)
Order ID: 607f1f77bcf86cd799439013
...
✅ All tests completed!
```

---

## File Structure

```
server/
├── models/
│   ├── Product.js          # Product schema
│   ├── Order.js            # Order schema
│   ├── User.js             # User schema
│   └── index.js            # Model exports
├── routes/
│   └── orders.js           # Order API endpoints
├── services/
│   └── orderService.js     # Order business logic
├── tests/
│   └── orderAPI.test.js    # API tests
├── mongodb.js              # MongoDB connection
├── ORDER_API.md            # API documentation
└── MONGOOSE_SETUP.md       # Schema documentation
```

---

## API Endpoints

### Create Order
```bash
POST /api/orders
```

### Get All Orders
```bash
GET /api/orders
GET /api/orders?page=1&limit=10&status=pending
```

### Get Order by ID
```bash
GET /api/orders/:id
```

### Update Payment Status
```bash
PUT /api/orders/:id/payment
```

### Update Order Status
```bash
PUT /api/orders/:id/status
```

### Cancel Order
```bash
PUT /api/orders/:id/cancel
```

### Get Statistics
```bash
GET /api/orders/stats/summary
```

---

## Integration with Existing Backend

If you have an existing PostgreSQL setup, you can run MongoDB alongside it:

1. **Keep PostgreSQL for existing data** (catalog, users, etc.)
2. **Use MongoDB for orders** (new feature)

### Example Integration:

```javascript
// server/db.js - Keep existing PostgreSQL connection
const { Pool } = require('pg');
const pool = new Pool(buildPgConfig());

module.exports = { pool };

// server/mongodb.js - Add MongoDB connection
const mongoose = require('mongoose');

async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI);
}

module.exports = connectDB;

// server/app.js - Initialize both
const connectDB = require('./mongodb');
const { pool } = require('./db');

app.use(async (req, res, next) => {
  // Both databases available
  req.pgPool = pool;
  req.mongooseConnection = mongoose.connection;
  next();
});

connectDB();
```

---

## Testing

### Run All Tests
```bash
cd server
node tests/orderAPI.test.js
```

### Run Specific Test
```bash
node -e "
const { runSpecificTest } = require('./tests/orderAPI.test.js');
runSpecificTest('testGetAllOrders');
"
```

### Manual Testing with cURL

```bash
# Create order
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "user": "USER_ID",
    "orderItems": [{
      "product": "PRODUCT_ID",
      "qty": 2,
      "price": 49.99,
      "name": "Product Name"
    }],
    "shippingAddress": {
      "fullName": "John Doe",
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "country": "USA"
    },
    "paymentMethod": "credit-card"
  }'

# Get all orders
curl http://localhost:3000/api/orders

# Get specific order
curl http://localhost:3000/api/orders/[ORDER_ID]
```

---

## MongoDB Installation

### Local MongoDB (Windows)

1. **Download**: https://www.mongodb.com/try/download/community
2. **Install**: Follow the installer
3. **Start Service**:
   ```bash
   net start MongoDB
   ```
4. **Connection String**:
   ```
   mongodb://localhost:27017/realcommerce
   ```

### MongoDB Atlas (Cloud)

1. **Create Account**: https://www.mongodb.com/cloud/atlas
2. **Create Cluster**: Free tier available
3. **Get Connection String**: 
   ```
   mongodb+srv://username:password@cluster.mongodb.net/realcommerce
   ```
4. **Update .env**:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/realcommerce
   ```

---

## Troubleshooting

### Connection Issues
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution**: Make sure MongoDB service is running
```bash
# Windows
net start MongoDB

# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

### Authentication Errors
```
Error: Authentication failed
```
**Solution**: Verify credentials in connection string

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3000
```
**Solution**: Change PORT in `.env` or kill process using the port

### Duplicate Key Error
```
MongoServerError: E11000 duplicate key error
```
**Solution**: For email unique constraint, drop the index:
```javascript
// In MongoDB shell
db.users.dropIndex('email_1');
```

---

## Performance Optimization

### Indexes
All models include optimized indexes. Check them:

```javascript
// In MongoDB shell
db.orders.getIndexes()
db.products.getIndexes()
db.users.getIndexes()
```

### Pagination
Always use pagination for large datasets:

```javascript
// Good
GET /api/orders?page=1&limit=10

// Bad
GET /api/orders  // Returns all orders
```

### Population
Use population only when needed:

```javascript
// Include product details
await order.populate('orderItems.product');

// Exclude unnecessary fields
await order.populate({
  path: 'user',
  select: 'email firstName lastName'
});
```

---

## Next Steps

1. ✅ Install dependencies
2. ✅ Configure MongoDB connection
3. ✅ Set up environment variables
4. ✅ Run tests
5. 📝 Create authentication middleware
6. 📝 Add request validation middleware
7. 📝 Implement frontend integration
8. 📝 Add logging and monitoring
9. 📝 Deploy to production

---

## Documentation References

- [Order API Documentation](./ORDER_API.md)
- [Mongoose Schema Documentation](./MONGOOSE_SETUP.md)
- [MongoDB Documentation](https://docs.mongodb.com)
- [Express.js Guide](https://expressjs.com)
