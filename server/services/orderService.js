const { Order, Product, User } = require('../models');

/**
 * Create a new order
 * @param {Object} orderData - Order details
 * @returns {Promise<Object>} Created order with populated references
 */
async function createOrder(orderData) {
  // Validate that user exists
  const user = await User.findById(orderData.user);
  if (!user) {
    throw new Error('User not found');
  }

  // Validate and fetch all products in order items
  if (!orderData.orderItems || orderData.orderItems.length === 0) {
    throw new Error('Order must contain at least one item');
  }

  // Validate each product exists and calculate total
  let calculatedTotal = 0;
  const validatedItems = [];

  for (const item of orderData.orderItems) {
    const product = await Product.findById(item.product);
    if (!product) {
      throw new Error(`Product with ID ${item.product} not found`);
    }

    // Check stock availability
    if (product.countInStock < item.qty) {
      throw new Error(
        `Insufficient stock for ${product.name}. Available: ${product.countInStock}, Requested: ${item.qty}`
      );
    }

    // Validate item data
    if (!item.qty || item.qty < 1) {
      throw new Error('Item quantity must be at least 1');
    }

    if (!item.price || item.price < 0) {
      throw new Error('Item price cannot be negative');
    }

    validatedItems.push({
      name: product.name,
      qty: item.qty,
      price: item.price,
      product: product._id,
    });

    calculatedTotal += item.price * item.qty;
  }

  // Create order
  const order = new Order({
    user: orderData.user,
    orderItems: validatedItems,
    totalPrice: Math.round(calculatedTotal * 100) / 100,
    status: 'pending',
    shippingAddress: orderData.shippingAddress,
    paymentMethod: orderData.paymentMethod,
    notes: orderData.notes,
  });

  // Save and populate
  await order.save();
  await order.populate('user');
  await order.populate('orderItems.product');

  return order;
}

/**
 * Get all orders with pagination and filtering
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Orders with metadata
 */
async function getOrders(options = {}) {
  const {
    page = 1,
    limit = 10,
    status = null,
    userId = null,
    sortBy = '-createdAt',
  } = options;

  // Build filter
  const filter = {};
  if (status) filter.status = status;
  if (userId) filter.user = userId;

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Fetch orders
  const orders = await Order.find(filter)
    .populate({
      path: 'user',
      select: 'email firstName lastName phone',
    })
    .populate({
      path: 'orderItems.product',
      select: 'name price image category',
    })
    .sort(sortBy)
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count for pagination
  const total = await Order.countDocuments(filter);

  return {
    data: orders,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get order by ID
 * @param {String} orderId - Order ID
 * @returns {Promise<Object>} Order with populated references
 */
async function getOrderById(orderId) {
  const order = await Order.findById(orderId)
    .populate({
      path: 'user',
      select: 'email firstName lastName phone address',
    })
    .populate({
      path: 'orderItems.product',
      select: 'name price image category description',
    });

  if (!order) {
    throw new Error('Order not found');
  }

  return order;
}

/**
 * Update order payment status
 * @param {String} orderId - Order ID
 * @param {Object} paymentData - Payment details
 * @returns {Promise<Object>} Updated order
 */
async function updatePaymentStatus(orderId, paymentData) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  order.isPaid = true;
  order.paidAt = new Date();
  order.status = 'processing';

  await order.save();
  await order.populate('user');
  await order.populate('orderItems.product');

  return order;
}

/**
 * Update order status
 * @param {String} orderId - Order ID
 * @param {String} newStatus - New status
 * @returns {Promise<Object>} Updated order
 */
async function updateOrderStatus(orderId, newStatus) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  const validStatuses = [
    'pending',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
  ];
  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  // Validate status transitions
  const statusTransitions = {
    pending: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['delivered'],
    delivered: [],
    cancelled: [],
  };

  if (!statusTransitions[order.status].includes(newStatus)) {
    throw new Error(
      `Cannot transition from ${order.status} to ${newStatus}`
    );
  }

  order.status = newStatus;

  if (newStatus === 'delivered') {
    order.isDelivered = true;
    order.deliveredAt = new Date();
  }

  await order.save();
  await order.populate('user');
  await order.populate('orderItems.product');

  return order;
}

/**
 * Get order statistics
 * @returns {Promise<Object>} Order statistics
 */
async function getOrderStats() {
  const stats = await Order.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$totalPrice' },
        avgOrderValue: { $avg: '$totalPrice' },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  const totalOrders = await Order.countDocuments();
  const totalRevenue = await Order.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: '$totalPrice' },
      },
    },
  ]);

  return {
    totalOrders,
    totalRevenue: totalRevenue[0]?.total || 0,
    byStatus: stats,
  };
}

/**
 * Cancel order
 * @param {String} orderId - Order ID
 * @returns {Promise<Object>} Cancelled order
 */
async function cancelOrder(orderId) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  if (!order.canBeCancelled()) {
    throw new Error(
      `Cannot cancel order with status: ${order.status}`
    );
  }

  order.status = 'cancelled';
  await order.save();
  await order.populate('user');
  await order.populate('orderItems.product');

  return order;
}

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updatePaymentStatus,
  updateOrderStatus,
  getOrderStats,
  cancelOrder,
};
