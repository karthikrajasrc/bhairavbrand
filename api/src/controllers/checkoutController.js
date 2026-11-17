import { randomBytes } from 'node:crypto';
import { PaymentGatewayError } from '../services/razorpayService.js';
import { getDeliveryRates } from '../services/deliveryRates.js';
import {
  checkoutQuoteSchema,
  checkoutOrderSnapshotSchema,
  checkoutSchema,
  paymentVerificationSchema,
} from '../validation/schemas.js';

const paidOrderResponse = (order) => ({
  id: order._id.toString(),
  orderNumber: order.orderNumber,
  status: order.status,
  paymentStatus: order.paymentStatus,
  totalPaise: order.totalPaise,
});

export function createCheckoutController({ Product, StoreSettings, Order, razorpay }) {
  const requirePaymentConfiguration = (req, res, next) => {
    if (!razorpay.isConfigured) {
      return res.status(503).json({ error: 'Razorpay checkout is not configured' });
    }
    return next();
  };

  const quoteOrder = async (items, state) => {
    const productIds = [...new Set(items.map(({ productId }) => productId))];
    const [products, settings] = await Promise.all([
      Product.find({ _id: { $in: productIds } }),
      StoreSettings.findOne({ key: 'delivery' }),
    ]);
    const productsById = new Map(products.map((product) => [product._id.toString(), product]));
    const orderItems = [];

    for (const item of items) {
      const product = productsById.get(item.productId);
      if (!product) return { error: 'A product in your cart is no longer available' };

      const variants = Array.isArray(product.variants) ? product.variants : [];
      const variant = variants.length
        ? variants.find((candidate) => candidate._id?.toString() === item.variantId)
        : item.variantId === 'default'
          ? { price: product.price, amount: null, unit: null }
          : null;
      if (!variant) return { error: 'A product size in your cart is no longer available' };

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
    const deliveryRate = getDeliveryRates(settings)
      .find((rate) => rate.state === state && rate.enabled);
    if (!deliveryRate) return { error: `Delivery is not available in ${state}. Choose another state.` };
    const deliveryChargePaise = Math.round(deliveryRate.deliveryCharge * 100);
    return {
      items: orderItems,
      subtotalPaise,
      deliveryChargePaise,
      totalPaise: subtotalPaise + deliveryChargePaise,
    };
  };

  return {
    requirePaymentConfiguration,

    quote: async (req, res, next) => {
      try {
        const input = checkoutQuoteSchema.parse(req.body);
        const quote = await quoteOrder(input.items, input.state);
        if (quote.error) return res.status(400).json({ error: quote.error });
        return res.json({ quote });
      } catch (error) {
        return next(error);
      }
    },

    createOrder: async (req, res, next) => {
      try {
        const input = checkoutSchema.parse(req.body);
        const quote = await quoteOrder(input.items, input.customer.address.state);
        if (quote.error) return res.status(400).json({ error: quote.error });
        if (quote.totalPaise < 100) return res.status(400).json({ error: 'The minimum order total is ₹1' });

        const orderNumber = `BB-${randomBytes(8).toString('hex').toUpperCase()}`;
        const paymentOrder = await razorpay.createOrder({
          amount: quote.totalPaise,
          currency: 'INR',
          receipt: orderNumber,
          notes: { orderNumber },
        });
        if (
          !paymentOrder?.id
          || paymentOrder.amount !== quote.totalPaise
          || paymentOrder.currency !== 'INR'
        ) throw new PaymentGatewayError();

        const orderState = {
          orderNumber,
          razorpayOrderId: paymentOrder.id,
          customer: {
            ...input.customer,
            email: input.customer.email.toLowerCase(),
          },
          items: quote.items,
          subtotalPaise: quote.subtotalPaise,
          deliveryChargePaise: quote.deliveryChargePaise,
          totalPaise: quote.totalPaise,
          currency: 'INR',
        };
        const checkoutToken = razorpay.signCheckoutState(orderState);
        return res.status(201).json({
          order: {
            ...orderState,
            checkoutToken,
            keyId: razorpay.keyId,
          },
        });
      } catch (error) {
        return next(error);
      }
    },

    verifyPayment: async (req, res, next) => {
      try {
        const razorpayOrderId = paymentVerificationSchema.shape.razorpay_order_id.parse(req.params.id);
        const input = paymentVerificationSchema.parse(req.body);
        if (input.razorpay_order_id !== razorpayOrderId) {
          return res.status(400).json({ error: 'Payment does not match this order' });
        }
        if (!razorpay.verifySignature(
          input.razorpay_order_id,
          input.razorpay_payment_id,
          input.razorpay_signature,
        )) return res.status(400).json({ error: 'Payment could not be verified' });

        let order = await Order.findOne({ razorpayOrderId });
        if (order?.paymentStatus === 'paid') {
          if (order.razorpayPaymentId !== input.razorpay_payment_id) {
            return res.status(409).json({ error: 'This order has already been paid' });
          }
          return res.json({ order: paidOrderResponse(order) });
        }

        let orderState;
        if (order) {
          orderState = {
            orderNumber: order.orderNumber,
            razorpayOrderId: order.razorpayOrderId,
            customer: order.customer,
            items: order.items,
            subtotalPaise: order.subtotalPaise,
            deliveryChargePaise: order.deliveryChargePaise,
            totalPaise: order.totalPaise,
            currency: order.currency,
          };
        } else {
          const checkoutState = input.checkoutToken
            ? razorpay.verifyCheckoutState(input.checkoutToken)
            : null;
          const parsedCheckoutState = checkoutOrderSnapshotSchema.safeParse(checkoutState);
          if (!parsedCheckoutState.success) {
            return res.status(400).json({ error: 'Checkout details could not be verified' });
          }
          orderState = parsedCheckoutState.data;
          if (orderState.razorpayOrderId !== razorpayOrderId) {
            return res.status(400).json({ error: 'Checkout details do not match this payment' });
          }
        }

        let payment = await razorpay.fetchPayment(input.razorpay_payment_id);
        if (
          payment.id !== input.razorpay_payment_id
          || payment.order_id !== razorpayOrderId
          || payment.amount !== orderState.totalPaise
          || payment.currency !== orderState.currency
        ) return res.status(400).json({ error: 'Payment details do not match this order' });

        if (payment.status === 'authorized') {
          payment = await razorpay.capturePayment(input.razorpay_payment_id, orderState.totalPaise);
        }
        if (
          payment.status !== 'captured'
          || payment.id !== input.razorpay_payment_id
          || payment.order_id !== razorpayOrderId
          || payment.amount !== orderState.totalPaise
          || payment.currency !== orderState.currency
        ) return res.status(409).json({ error: 'Payment has not been captured yet. Please try again.' });

        if (order) {
          order.paymentStatus = 'paid';
          order.status = 'new';
          order.razorpayPaymentId = input.razorpay_payment_id;
          order.paidAt = new Date();
          await order.save();
        } else {
          try {
            order = await Order.create({
              ...orderState,
              paymentStatus: 'paid',
              status: 'new',
              razorpayPaymentId: input.razorpay_payment_id,
              paidAt: new Date(),
            });
          } catch (error) {
            if (error.code !== 11000) throw error;
            order = await Order.findOne({ razorpayOrderId });
            if (!order || order.razorpayPaymentId !== input.razorpay_payment_id) throw error;
          }
        }
        return res.json({ order: paidOrderResponse(order) });
      } catch (error) {
        return next(error);
      }
    },
  };
}
