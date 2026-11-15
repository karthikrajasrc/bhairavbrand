import { contactInquirySchema, trackOrderSchema } from '../validation/schemas.js';

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
        const order = await Order.findOne({
          orderNumber: input.orderNumber.toUpperCase(),
          'customer.email': input.email.toLowerCase(),
        });
        if (!order) return res.status(404).json({ error: 'We could not find an order matching those details' });

        return res.json({
          order: {
            orderNumber: order.orderNumber,
            status: order.status,
            paymentStatus: order.paymentStatus,
            totalPaise: order.totalPaise,
            createdAt: order.createdAt,
            items: order.items.map(({ name, variantLabel, quantity }) => ({ name, variantLabel, quantity })),
          },
        });
      } catch (error) {
        return next(error);
      }
    },
  };
}
