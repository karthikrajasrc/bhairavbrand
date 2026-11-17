import { contactInquirySchema, trackOrderSchema } from '../validation/schemas.js';

const trackedOrderDetails = (order) => ({
  orderNumber: order.orderNumber,
  status: order.status,
  paymentStatus: order.paymentStatus,
  totalPaise: order.totalPaise,
  createdAt: order.createdAt,
  trackingId: order.trackingId || '',
  trackingUrl: order.trackingUrl || '',
  items: order.items.map(({ name, variantLabel, quantity }) => ({ name, variantLabel, quantity })),
});

export function createContactController({ ContactInquiry, Order }) {
  return {
    submitInquiry: async (req, res, next) => {
      try {
        const input = contactInquirySchema.parse(req.body);
        const inquiry = await ContactInquiry.create({
          ...input,
          email: input.email.toLowerCase(),
        });
        return res.status(201).json({ message: 'Your message has been received', id: inquiry._id.toString() });
      } catch (error) {
        return next(error);
      }
    },

    trackOrder: async (req, res, next) => {
      try {
        const input = trackOrderSchema.parse(req.body);
        if (!input.orderNumber) {
          const digits = input.phone.replace(/\D/g, '');
          const phonePattern = new RegExp(`^[^0-9]*${digits.split('').join('[^0-9]*')}[^0-9]*$`);
          const matchingOrders = await Order.find({
            paymentStatus: 'paid',
            'customer.phone': { $regex: phonePattern },
          }).sort({ createdAt: -1 }).limit(20);
          if (!matchingOrders.length) {
            return res.status(404).json({ error: 'We could not find any orders matching that phone number' });
          }
          return res.json({ orders: matchingOrders.map(trackedOrderDetails) });
        }

        const order = await Order.findOne({
          orderNumber: input.orderNumber.toUpperCase(),
          paymentStatus: 'paid',
        });
        const matchesEmail = input.email && order?.customer.email === input.email.toLowerCase();
        const matchesPhone = input.phone
          && order?.customer.phone.replace(/\D/g, '') === input.phone.replace(/\D/g, '');
        if (!order || (!matchesEmail && !matchesPhone)) {
          return res.status(404).json({ error: 'We could not find an order matching those details' });
        }

        return res.json({ order: trackedOrderDetails(order) });
      } catch (error) {
        return next(error);
      }
    },
  };
}
