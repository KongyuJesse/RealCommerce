const express = require('express');
const router = express.Router();
const orderService = require('../services/orderService');

/**
 * POST /api/orders
 * Create a new order
 */
router.post('/', async (req, res) => {
  try {
    const { user, orderItems, shippingAddress, paymentMethod, notes } = req.body;

    // Validate required fields
    if (!user) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ message: 'Order must contain at least one item' });
    }

    if (!shippingAddress) {
      return res.status(400).json({ message: 'Shipping address is required' });
    }

    // Create order
    const order = await orderService.createOrder({
      user,
      orderItems,
      shippingAddress,
      paymentMethod,
      notes,
    });

    res.status(201).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Error creating order:', error.message);

    // Handle specific errors
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }

    if (error.message.includes('Insufficient stock')) {
      return res.status(400).json({ message: error.message });
    }

    if (error.message.includes('must contain') || error.message.includes('cannot be')) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({
      message: 'Error creating order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/orders
 * Get all orders with pagination and filtering
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, userId, sortBy = '-createdAt' } = req.query;

    // Validate pagination params
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));

    const result = await orderService.getOrders({
      page: pageNum,
      limit: limitNum,
      status,
      userId,
      sortBy,
    });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error fetching orders:', error.message);
    res.status(500).json({
      message: 'Error fetching orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/orders/:id
 * Get order by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid order ID format' });
    }

    const order = await orderService.getOrderById(id);

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Error fetching order:', error.message);

    if (error.message === 'Order not found') {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.status(500).json({
      message: 'Error fetching order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * PUT /api/orders/:id/payment
 * Mark order as paid
 */
router.put('/:id/payment', async (req, res) => {
  try {
    const { id } = req.params;
    const { transactionId } = req.body;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid order ID format' });
    }

    const order = await orderService.updatePaymentStatus(id, { transactionId });

    res.status(200).json({
      success: true,
      message: 'Payment recorded successfully',
      data: order,
    });
  } catch (error) {
    console.error('Error updating payment:', error.message);

    if (error.message === 'Order not found') {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.status(500).json({
      message: 'Error updating payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * PUT /api/orders/:id/status
 * Update order status
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid order ID format' });
    }

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const order = await orderService.updateOrderStatus(id, status);

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      data: order,
    });
  } catch (error) {
    console.error('Error updating order status:', error.message);

    if (error.message === 'Order not found') {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (error.message.includes('Invalid status') || error.message.includes('Cannot transition')) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({
      message: 'Error updating order status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * PUT /api/orders/:id/cancel
 * Cancel order
 */
router.put('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid order ID format' });
    }

    const order = await orderService.cancelOrder(id);

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: order,
    });
  } catch (error) {
    console.error('Error cancelling order:', error.message);

    if (error.message === 'Order not found') {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (error.message.includes('Cannot cancel')) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({
      message: 'Error cancelling order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/orders/stats/summary
 * Get order statistics
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await orderService.getOrderStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching order stats:', error.message);
    res.status(500).json({
      message: 'Error fetching order statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

module.exports = router;
