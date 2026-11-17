import { INDIAN_STATES } from '../indianStates.js';

export function getDeliveryRates(settings) {
  const savedRates = new Map(
    (Array.isArray(settings?.deliveryRates) ? settings.deliveryRates : [])
      .map((rate) => [rate.state, rate]),
  );

  return INDIAN_STATES.map((state) => {
    const savedRate = savedRates.get(state);
    return {
      state,
      deliveryCharge: savedRate?.deliveryCharge ?? 0,
      enabled: savedRate?.enabled === true,
    };
  });
}
