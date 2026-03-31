/**
 * Order API Test Examples
 * Run these tests after setting up MongoDB and the backend
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

// Test configuration
const config = {
  userId: '607f1f77bcf86cd799439011', // Replace with actual user ID
  productId: '607f1f77bcf86cd799439012', // Replace with actual product ID
  timeout: 5000,
};

/**
 * Helper to make API calls with error handling
 */
async function apiCall(method, endpoint, data = null) {
  try {
    const url = `${API_BASE}${endpoint}`;
    console.log(`\n📤 ${method} ${endpoint}`);

    const response = await axios({
      method,
      url,
      data,
      timeout: config.timeout,
    });

    console.log(`✅ Success (${response.status})`);
    return response.data;
  } catch (error) {
    console.log(`❌ Error (${error.response?.status || 'Network'})`);
    console.error(error.response?.data?.message || error.message);
    throw error;
  }
}

/**
 * Test Suite
 */
const tests = {
  /**
   * Test 1: Create a valid order
   */
  async testCreateValidOrder() {
    console.log('\n========== TEST 1: Create Valid Order ==========');

    const result = await apiCall('POST', '/orders', {
      user: config.userId,
      orderItems: [
        {
          product: config.productId,
          qty: 2,
          price: 49.99,
          name: 'Test Product',
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
      notes: 'Test order',
    });

    console.log('Order ID:', result.data._id);
    console.log('Total Price:', result.data.totalPrice);
    console.log('Status:', result.data.status);

    return result.data._id;
  },

  /**
   * Test 2: Create order with missing user
   */
  async testCreateOrderMissingUser() {
    console.log('\n========== TEST 2: Create Order with Missing User (Should Fail) ==========');

    try {
      await apiCall('POST', '/orders', {
        user: null,
        orderItems: [
          {
            product: config.productId,
            qty: 1,
            price: 49.99,
            name: 'Test Product',
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
      });
    } catch (error) {
      console.log('Expected error caught ✓');
    }
  },

  /**
   * Test 3: Create order with empty items
   */
  async testCreateOrderEmptyItems() {
    console.log('\n========== TEST 3: Create Order with Empty Items (Should Fail) ==========');

    try {
      await apiCall('POST', '/orders', {
        user: config.userId,
        orderItems: [],
        shippingAddress: {
          fullName: 'John Doe',
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'USA',
        },
      });
    } catch (error) {
      console.log('Expected error caught ✓');
    }
  },

  /**
   * Test 4: Get all orders with pagination
   */
  async testGetAllOrders() {
    console.log('\n========== TEST 4: Get All Orders with Pagination ==========');

    const result = await apiCall('GET', '/orders?page=1&limit=5&sortBy=-createdAt');

    console.log(`Total Orders: ${result.pagination.total}`);
    console.log(`Page: ${result.pagination.page}/${result.pagination.pages}`);
    console.log(`Items Retrieved: ${result.data.length}`);

    if (result.data.length > 0) {
      const order = result.data[0];
      console.log(`Sample Order ID: ${order._id}`);
      console.log(`Sample Order Status: ${order.status}`);
      console.log(`Sample Order Total: $${order.totalPrice}`);
    }
  },

  /**
   * Test 5: Get orders filtered by status
   */
  async testGetOrdersByStatus() {
    console.log('\n========== TEST 5: Get Orders Filtered by Status ==========');

    const result = await apiCall('GET', '/orders?status=pending&limit=5');

    console.log(`Pending Orders: ${result.pagination.total}`);
    if (result.data.length > 0) {
      result.data.forEach((order, i) => {
        console.log(`  ${i + 1}. Order ${order._id} - $${order.totalPrice}`);
      });
    }
  },

  /**
   * Test 6: Get specific order by ID
   */
  async testGetOrderById(orderId) {
    console.log('\n========== TEST 6: Get Specific Order by ID ==========');

    const result = await apiCall('GET', `/orders/${orderId}`);

    console.log('Order Details:');
    console.log(`  ID: ${result.data._id}`);
    console.log(`  User: ${result.data.user?.email}`);
    console.log(`  Total: $${result.data.totalPrice}`);
    console.log(`  Status: ${result.data.status}`);
    console.log(`  Items: ${result.data.orderItems.length}`);
    console.log(`  Days Since Order: ${result.data.daysSinceOrder}`);
  },

  /**
   * Test 7: Mark order as paid
   */
  async testUpdatePaymentStatus(orderId) {
    console.log('\n========== TEST 7: Mark Order as Paid ==========');

    const result = await apiCall('PUT', `/orders/${orderId}/payment`, {
      transactionId: 'TXN-' + Date.now(),
    });

    console.log('Payment Updated:');
    console.log(`  Status: ${result.data.status}`);
    console.log(`  Is Paid: ${result.data.isPaid}`);
    console.log(`  Paid At: ${result.data.paidAt}`);
  },

  /**
   * Test 8: Update order status
   */
  async testUpdateOrderStatus(orderId, newStatus) {
    console.log(`\n========== TEST 8: Update Order Status to "${newStatus}" ==========`);

    const result = await apiCall('PUT', `/orders/${orderId}/status`, {
      status: newStatus,
    });

    console.log(`Order Status Updated: ${result.data.status}`);
  },

  /**
   * Test 9: Invalid status transition (should fail)
   */
  async testInvalidStatusTransition(orderId) {
    console.log('\n========== TEST 9: Invalid Status Transition (Should Fail) ==========');

    try {
      // Try to transition from delivered directly to pending (invalid)
      await apiCall('PUT', `/orders/${orderId}/status`, {
        status: 'pending',
      });
    } catch (error) {
      console.log('Expected error caught ✓');
    }
  },

  /**
   * Test 10: Cancel order
   */
  async testCancelOrder(orderId) {
    console.log('\n========== TEST 10: Cancel Order ==========');

    const result = await apiCall('PUT', `/orders/${orderId}/cancel`);

    console.log(`Order Cancelled: ${result.data.status}`);
  },

  /**
   * Test 11: Get invalid order ID (should fail)
   */
  async testGetInvalidOrderId() {
    console.log('\n========== TEST 11: Get Invalid Order ID (Should Fail) ==========');

    try {
      await apiCall('GET', '/orders/invalid-id');
    } catch (error) {
      console.log('Expected error caught ✓');
    }
  },

  /**
   * Test 12: Get order statistics
   */
  async testGetOrderStats() {
    console.log('\n========== TEST 12: Get Order Statistics ==========');

    const result = await apiCall('GET', '/orders/stats/summary');

    console.log('Order Statistics:');
    console.log(`  Total Orders: ${result.data.totalOrders}`);
    console.log(`  Total Revenue: $${result.data.totalRevenue.toFixed(2)}`);
    console.log('\nBreakdown by Status:');

    result.data.byStatus.forEach((stat) => {
      console.log(
        `  ${stat._id}: ${stat.count} orders, $${stat.totalRevenue.toFixed(2)} revenue, avg $${stat.avgOrderValue.toFixed(2)}`
      );
    });
  },
};

/**
 * Run all tests in sequence
 */
async function runAllTests() {
  console.log('🚀 Starting Order API Tests...');
  console.log(`API Base: ${API_BASE}`);

  try {
    // Test basic CRUD operations
    const orderId = await tests.testCreateValidOrder();

    await tests.testCreateOrderMissingUser();
    await tests.testCreateOrderEmptyItems();
    await tests.testGetAllOrders();
    await tests.testGetOrdersByStatus();
    await tests.testGetOrderById(orderId);

    // Test payment and status updates
    await tests.testUpdatePaymentStatus(orderId);
    await tests.testUpdateOrderStatus(orderId, 'shipped');
    await tests.testUpdateOrderStatus(orderId, 'delivered');

    // Test invalid operations
    await tests.testInvalidStatusTransition(orderId);
    await tests.testGetInvalidOrderId();

    // Test analytics
    await tests.testGetOrderStats();

    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.log('\n❌ Test suite failed');
  }
}

/**
 * Run specific test
 */
async function runSpecificTest(testName) {
  console.log(`🚀 Running test: ${testName}`);

  try {
    if (tests[testName]) {
      await tests[testName]();
      console.log('\n✅ Test completed!');
    } else {
      console.log(`❌ Test "${testName}" not found`);
      console.log('Available tests:');
      Object.keys(tests).forEach((key) => console.log(`  - ${key}`));
    }
  } catch (error) {
    console.log(`\n❌ Test failed: ${error.message}`);
  }
}

// Export for use in other scripts
module.exports = {
  tests,
  runAllTests,
  runSpecificTest,
  apiCall,
};

// Run tests if executed directly
if (require.main === module) {
  runAllTests();
}
