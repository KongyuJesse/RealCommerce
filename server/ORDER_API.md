# Order Management API Documentation

## Overview
Complete REST API for managing e-commerce orders with support for creation, retrieval, payment tracking, and status management.

## API Endpoints

### 1. Create Order
**POST** `/api/orders`

Creates a new order with validation for products, stock availability, and user.

**Request Body:**
```json
{
  "user": "607f1f77bcf86cd799439011",
  "orderItems": [
    {
      "product": "607f1f77bcf86cd799439012",
      "qty": 2,
      "price": 49.99,
      "name": "Wireless Headphones"
    }
  ],
  "shippingAddress": {
    "fullName": "John Doe",
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "USA"
  },
  "paymentMethod": "credit-card",
  "notes": "Gift wrap please"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "_id": "607f1f77bcf86cd799439013",
    "user": {
      "_id": "607f1f77bcf86cd799439011",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "orderItems": [
      {
        "_id": "607f1f77bcf86cd799439014",
        "name": "Wireless Headphones",
        "qty": 2,
        "price": 49.99,
        "product": {
          "_id": "607f1f77bcf86cd799439012",
          "name": "Wireless Headphones",
          "price": 49.99,
          "image": "https://example.com/image.jpg"
        }
      }
    ],
    "totalPrice": 99.98,
    "status": "pending",
    "isPaid": false,
    "isDelivered": false,
    "shippingAddress": {
      "fullName": "John Doe",
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "country": "USA"
    },
    "paymentMethod": "credit-card",
    "createdAt": "2026-03-31T10:00:00.000Z",
    "updatedAt": "2026-03-31T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `400`: Invalid request data, insufficient stock, or validation failed
- `404`: User or product not found
- `500`: Server error

---

### 2. Get All Orders
**GET** `/api/orders`

Retrieve all orders with pagination, filtering, and sorting.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number for pagination |
| limit | number | 10 | Items per page (max 100) |
| status | string | null | Filter by status (pending, processing, shipped, delivered, cancelled) |
| userId | string | null | Filter orders by user ID |
| sortBy | string | -createdAt | Sort field (e.g., -createdAt, totalPrice, status) |

**Example Request:**
```bash
GET /api/orders?page=1&limit=10&status=processing&sortBy=-createdAt
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "607f1f77bcf86cd799439013",
      "user": {
        "_id": "607f1f77bcf86cd799439011",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe"
      },
      "orderItems": [
        {
          "_id": "607f1f77bcf86cd799439014",
          "name": "Wireless Headphones",
          "qty": 2,
          "price": 49.99,
          "product": {
            "_id": "607f1f77bcf86cd799439012",
            "name": "Wireless Headphones",
            "price": 49.99
          }
        }
      ],
      "totalPrice": 99.98,
      "status": "processing",
      "isPaid": true,
      "paidAt": "2026-03-31T11:00:00.000Z",
      "createdAt": "2026-03-31T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "pages": 5
  }
}
```

---

### 3. Get Order by ID
**GET** `/api/orders/:id`

Retrieve a specific order with all populated references.

**Path Parameters:**
- `id` (string, required): MongoDB ObjectId of the order

**Example Request:**
```bash
GET /api/orders/607f1f77bcf86cd799439013
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "607f1f77bcf86cd799439013",
    "user": {
      "_id": "607f1f77bcf86cd799439011",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+12015550123",
      "address": {
        "street": "123 Main St",
        "city": "New York"
      }
    },
    "orderItems": [
      {
        "_id": "607f1f77bcf86cd799439014",
        "name": "Wireless Headphones",
        "qty": 2,
        "price": 49.99,
        "product": {
          "_id": "607f1f77bcf86cd799439012",
          "name": "Wireless Headphones",
          "price": 49.99,
          "image": "https://example.com/image.jpg",
          "category": "electronics",
          "description": "High quality wireless headphones"
        }
      }
    ],
    "totalPrice": 99.98,
    "status": "processing",
    "isPaid": true,
    "paidAt": "2026-03-31T11:00:00.000Z",
    "isDelivered": false,
    "shippingAddress": {
      "fullName": "John Doe",
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "country": "USA"
    },
    "daysSinceOrder": 2,
    "createdAt": "2026-03-31T10:00:00.000Z",
    "updatedAt": "2026-03-31T11:30:00.000Z"
  }
}
```

---

### 4. Update Order Payment Status
**PUT** `/api/orders/:id/payment`

Mark an order as paid and update status to "processing".

**Path Parameters:**
- `id` (string, required): MongoDB ObjectId of the order

**Request Body:**
```json
{
  "transactionId": "TXN-123456789"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Payment recorded successfully",
  "data": {
    "_id": "607f1f77bcf86cd799439013",
    "status": "processing",
    "isPaid": true,
    "paidAt": "2026-03-31T11:45:00.000Z"
  }
}
```

---

### 5. Update Order Status
**PUT** `/api/orders/:id/status`

Update order status with lifecycle validation.

**Path Parameters:**
- `id` (string, required): MongoDB ObjectId of the order

**Request Body:**
```json
{
  "status": "shipped"
}
```

**Valid Status Transitions:**
- `pending` → `processing`, `cancelled`
- `processing` → `shipped`, `cancelled`
- `shipped` → `delivered`
- `delivered` → (no transitions)
- `cancelled` → (no transitions)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Order status updated to shipped",
  "data": {
    "_id": "607f1f77bcf86cd799439013",
    "status": "shipped",
    "updatedAt": "2026-03-31T12:00:00.000Z"
  }
}
```

---

### 6. Cancel Order
**PUT** `/api/orders/:id/cancel`

Cancel an order (only pending or processing orders can be cancelled).

**Path Parameters:**
- `id` (string, required): MongoDB ObjectId of the order

**Example Request:**
```bash
PUT /api/orders/607f1f77bcf86cd799439013/cancel
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Order cancelled successfully",
  "data": {
    "_id": "607f1f77bcf86cd799439013",
    "status": "cancelled",
    "updatedAt": "2026-03-31T12:15:00.000Z"
  }
}
```

---

### 7. Get Order Statistics
**GET** `/api/orders/stats/summary`

Retrieve aggregated order statistics for analytics.

**Example Request:**
```bash
GET /api/orders/stats/summary
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalOrders": 156,
    "totalRevenue": 15234.56,
    "byStatus": [
      {
        "_id": "pending",
        "count": 23,
        "totalRevenue": 1234.56,
        "avgOrderValue": 53.68
      },
      {
        "_id": "processing",
        "count": 45,
        "totalRevenue": 4567.89,
        "avgOrderValue": 101.51
      },
      {
        "_id": "shipped",
        "count": 62,
        "totalRevenue": 7234.23,
        "avgOrderValue": 116.68
      },
      {
        "_id": "delivered",
        "count": 25,
        "totalRevenue": 2197.88,
        "avgOrderValue": 87.92
      },
      {
        "_id": "cancelled",
        "count": 1,
        "totalRevenue": 0,
        "avgOrderValue": 0
      }
    ]
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "message": "Order must contain at least one item"
}
```

### 404 Not Found
```json
{
  "message": "Order not found"
}
```

### 500 Internal Server Error
```json
{
  "message": "Error creating order",
  "error": "Error details (development only)"
}
```

---

## Code Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

// Create order
async function createOrder() {
  try {
    const response = await axios.post(`${API_BASE}/orders`, {
      user: '607f1f77bcf86cd799439011',
      orderItems: [
        {
          product: '607f1f77bcf86cd799439012',
          qty: 2,
          price: 49.99,
          name: 'Wireless Headphones'
        }
      ],
      shippingAddress: {
        fullName: 'John Doe',
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA'
      },
      paymentMethod: 'credit-card'
    });

    console.log('Order created:', response.data.data);
  } catch (error) {
    console.error('Error:', error.response.data.message);
  }
}

// Get all orders
async function getOrders() {
  try {
    const response = await axios.get(`${API_BASE}/orders`, {
      params: {
        page: 1,
        limit: 10,
        status: 'processing',
        sortBy: '-createdAt'
      }
    });

    console.log('Orders:', response.data.data);
    console.log('Pagination:', response.data.pagination);
  } catch (error) {
    console.error('Error:', error.response.data.message);
  }
}

// Update payment status
async function markOrderAsPaid(orderId) {
  try {
    const response = await axios.put(
      `${API_BASE}/orders/${orderId}/payment`,
      { transactionId: 'TXN-123456' }
    );

    console.log('Payment recorded:', response.data.data);
  } catch (error) {
    console.error('Error:', error.response.data.message);
  }
}

// Update order status
async function updateOrderStatus(orderId, status) {
  try {
    const response = await axios.put(
      `${API_BASE}/orders/${orderId}/status`,
      { status }
    );

    console.log('Status updated:', response.data.data);
  } catch (error) {
    console.error('Error:', error.response.data.message);
  }
}

// Cancel order
async function cancelOrder(orderId) {
  try {
    const response = await axios.put(
      `${API_BASE}/orders/${orderId}/cancel`
    );

    console.log('Order cancelled:', response.data.data);
  } catch (error) {
    console.error('Error:', error.response.data.message);
  }
}

// Get order statistics
async function getOrderStats() {
  try {
    const response = await axios.get(`${API_BASE}/orders/stats/summary`);

    console.log('Statistics:', response.data.data);
  } catch (error) {
    console.error('Error:', error.response.data.message);
  }
}
```

### cURL Examples

```bash
# Create order
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "user": "607f1f77bcf86cd799439011",
    "orderItems": [{
      "product": "607f1f77bcf86cd799439012",
      "qty": 2,
      "price": 49.99,
      "name": "Wireless Headphones"
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
curl -X GET "http://localhost:3000/api/orders?page=1&limit=10&status=processing"

# Get specific order
curl -X GET http://localhost:3000/api/orders/607f1f77bcf86cd799439013

# Mark order as paid
curl -X PUT http://localhost:3000/api/orders/607f1f77bcf86cd799439013/payment \
  -H "Content-Type: application/json" \
  -d '{"transactionId": "TXN-123456"}'

# Update order status
curl -X PUT http://localhost:3000/api/orders/607f1f77bcf86cd799439013/status \
  -H "Content-Type: application/json" \
  -d '{"status": "shipped"}'

# Cancel order
curl -X PUT http://localhost:3000/api/orders/607f1f77bcf86cd799439013/cancel

# Get order statistics
curl -X GET http://localhost:3000/api/orders/stats/summary
```

---

## Features

✅ **Product Validation**: Verifies product existence and stock availability  
✅ **Automatic Total Calculation**: Calculates total price from order items  
✅ **Populate References**: Includes full product and user details  
✅ **Stock Checking**: Prevents over-selling with inventory validation  
✅ **Status Workflow**: Enforces valid status transitions  
✅ **Pagination**: Efficient retrieval of large order lists  
✅ **Filtering**: Filter by status, user, or other fields  
✅ **Error Handling**: Comprehensive error messages and proper HTTP status codes  
✅ **Timestamps**: Automatic createdAt and updatedAt fields  
✅ **Analytics**: Order statistics and revenue tracking  

---

## Best Practices

1. **Always validate user ID** before creating orders
2. **Check product availability** before adding to cart
3. **Populate references** to get full product/user details
4. **Handle status transitions** correctly (don't skip states)
5. **Use pagination** for large result sets
6. **Track payment status** separately from order status
7. **Log errors** for debugging and monitoring
8. **Use proper HTTP methods** (POST create, GET read, PUT update)
