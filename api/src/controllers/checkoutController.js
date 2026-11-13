import { randomBytes } from 'node:crypto';
import { PaymentGatewayError } from '../services/razorpayService.js';
import { checkoutSchema, objectIdSchema, paymentVerificationSchema } from '../validation/schemas.js';

export function createCheckoutController({ Product, StoreSettings, Order, razorpay }) {
  const requirePaymentConfiguration = (req, res, next) => {
    if (!razorpay.isConfigured) {
      return res.status(503).json({ error: 'Razorpay checkout is not configured' });
    }
    return next();
  };

  return {
    requirePaymentConfiguration,

    createOrder: async (req, res, next) => {
      try {
        const input = checkoutSchema.parse(req.body);
        const productIds = [...new Set(input.items.map(({ productId }) => productId))];
        const products = await Product.find({ _id: { $in: productIds } });
        const productsById = new Map(products.map((product) => [product._id.toString(), product]));
        const orderItems = [];

        for (const item of input.items) {
          const product = productsById.get(item.productId);
          if (!product) return res.status(400).json({ error: 'A product in your cart is no longer available' });

          const variants = Array.isArray(product.variants) ? product.variants : [];
          const variant = variants.length
            ? variants.find((candidate) => candidate._id?.toString() === item.variantId)
            : item.variantId === 'default'
              ? { price: product.price, amount: null, unit: null }
              : null;
          if (!variant) return res.status(400).json({ error: 'A product size in your cart is no longer available' });

          const unitPricePaise = Math.round(Number(variant.price) * 100);
          orderItems.push({
            productId: product._id,
            name: product.name,
            imageUrl: product.imageUrl,
            variantId: item.variantId,
            variantLabel: variant.amount
              ? `${Number(variant.amount).toLocaleString('en-IN')} ${variant.unit === 'l' ? 'L' : variant.unit}`
              : '',
            quantity: item.quantity,
            unitPricePaise,
            lineTotalPaise: unitPricePaise * item.quantity,
          });
        }

        const subtotalPaise = orderItems.reduce((total, item) => total + item.lineTotalPaise, 0);
        const settings = await StoreSettings.findOne({ key: 'delivery' });
        const freeShippingThresholdPaise = Math.round((settings?.freeShippingThreshold ?? 999) * 100);
        const deliveryChargePaise = subtotalPaise >= freeShippingThresholdPaise
          ? 0
          : Math.round((settings?.deliveryCharge ?? 0) * 100);
        const totalPaise = subtotalPaise + deliveryChargePaise;
        if (totalPaise < 100) return res.status(400).json({ error: 'The minimum order total is ₹1' });

        const orderNumber = `BB-${randomBytes(8).toString('hex').toUpperCase()}`;
        const paymentOrder = await razorpay.createOrder({
          amount: totalPaise,
          currency: 'INR',
          receipt: orderNumber,
          notes: { orderNumber },
        });
        if (
          !paymentOrder?.id
          || paymentOrder.amount !== totalPaise
          || paymentOrder.currency !== 'INR'
        ) throw new PaymentGatewayError();

        const order = await Order.create({
          orderNumber,
          customer: {
            ...input.customer,
            email: input.customer.email.toLowerCase(),
          },
          items: orderItems,
          subtotalPaise,
          deliveryChargePaise,
          totalPaise,
          currency: 'INR',
          razorpayOrderId: paymentOrder.id,
          paymentStatus: 'pending',
          status: 'pending_payment',
        });
        return res.status(201).json({
          order: {
            id: order._id.toString(),
            orderNumber: order.orderNumber,
            razorpayOrderId: order.razorpayOrderId,
            keyId: razorpay.keyId,
            currency: order.currency,
            subtotalPaise: order.subtotalPaise,
            deliveryChargePaise: order.deliveryChargePaise,
            totalPaise: order.totalPaise,
          },
        });
      } catch (error) {
        return next(error);
      }
    },

    verifyPayment: async (req, res, next) => {
      try {
        const id = objectIdSchema.parse(req.params.id);
        const input = paymentVerificationSchema.parse(req.body);
        const order = await Order.findById(id);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        if (order.razorpayOrderId !== input.razorpay_order_id) {
          return res.status(400).json({ error: 'Payment does not match this order' });
        }
        if (!razorpay.verifySignature(
          input.razorpay_order_id,
          input.razorpay_payment_id,
          input.razorpay_signature,
        )) return res.status(400).json({ error: 'Payment could not be verified' });

        if (order.paymentStatus === 'paid') {
          if (order.razorpayPaymentId !== input.razorpay_payment_id) {
            return res.status(409).json({ error: 'This order has already been paid' });
          }
          return res.json({
            order: {
              id: order._id.toString(),
              orderNumber: order.orderNumber,
              status: order.status,
              paymentStatus: order.paymentStatus,
              totalPaise: order.totalPaise,
            },
          });
        }

        let payment = await razorpay.fetchPayment(input.razorpay_payment_id);
        if (
          payment.id !== input.razorpay_payment_id
          || payment.order_id !== order.razorpayOrderId
          || payment.amount !== order.totalPaise
          || payment.currency !== 'INR'
        ) return res.status(400).json({ error: 'Payment details do not match this order' });

        if (payment.status === 'authorized') {
          payment = await razorpay.capturePayment(input.razorpay_payment_id, order.totalPaise);
        }
        if (
          payment.status !== 'captured'
          || payment.id !== input.razorpay_payment_id
          || payment.order_id !== order.razorpayOrderId
          || payment.amount !== order.totalPaise
          || payment.currency !== 'INR'
        ) return res.status(409).json({ error: 'Payment has not been captured yet. Please try again.' });

        order.paymentStatus = 'paid';
        order.status = 'new';
        order.razorpayPaymentId = input.razorpay_payment_id;
        order.paidAt = new Date();
        await order.save();
        return res.json({
          order: {
            id: order._id.toString(),
            orderNumber: order.orderNumber,
            status: order.status,
            paymentStatus: order.paymentStatus,
            totalPaise: order.totalPaise,
          },
        });
      } catch (error) {
        return next(error);
      }
    },
  };
}
