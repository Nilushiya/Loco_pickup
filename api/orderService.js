import { ENDPOINTS } from '../constants/Config';
import apiClient from './client';

const toNullableNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numericValue = Number(value);
  return Number.isNaN(numericValue) ? null : numericValue;
};

const normalizePickupRequest = (order) => {
  if (!order?.id) {
    return null;
  }

  const restaurantAddress =
    order?.restaurant?.address ||
    order?.restaurantAddress ||
    order?.pickupLocation ||
    'Restaurant location not available';

  const stationAddress =
    order?.station?.address ||
    order?.station?.name ||
    order?.dropLocation ||
    order?.dropoffLocation ||
    'Station location not available';

  const deliveryFee =
    order?.deliveryFee ??
    order?.fee ??
    order?.amount ??
    0;

  return {
    id: order.id,
    deliveryFee: Number(deliveryFee) || 0,
    pickupLocation: restaurantAddress,
    dropLocation: stationAddress,
    userPhoneNumber:
      order?.user?.phoneNumber ||
      order?.userPhoneNumber ||
      order?.customerPhoneNumber ||
      '',
    status: order.status,
    createdAt: order.createdAt || new Date().toISOString(),
    restaurantId: toNullableNumber(order?.restaurant?.id ?? order?.restaurantId),
    trainId: toNullableNumber(order?.train?.id ?? order?.trainId),
    stationId: toNullableNumber(order?.station?.id ?? order?.stationId),
    restaurant: order.restaurant
      ? {
          id: order.restaurant.id,
          name: order.restaurant.name,
          address: restaurantAddress,
        }
      : null,
    station: order.station
      ? {
          id: order.station.id,
          name: order.station.name,
          address: stationAddress,
        }
      : null,
    raw: order,
  };
};

export const fetchOrdersByStatus = async (status) => {
  const response = await apiClient.get(ENDPOINTS.GET_ORDERS_BY_STATUS(status));

  const source = Array.isArray(response?.data?.data)
    ? response.data.data
    : Array.isArray(response?.data)
      ? response.data
      : [];

  return source
    .map(normalizePickupRequest)
    .filter(Boolean);
};

export const buildPickupClaimPayload = (request, pickupPersonId) => {
  return {
    orderId: toNullableNumber(request?.id) ?? 0,
    pickupPersonId: toNullableNumber(pickupPersonId) ?? 0,
    restaurantId: toNullableNumber(request?.restaurantId) ?? 0,
    trainId: toNullableNumber(request?.trainId) ?? 0,
    stationId: toNullableNumber(request?.stationId) ?? 0,
  };
};

export const claimPickupOrder = async (payload) => {
  const res = await apiClient.put(ENDPOINTS.CLAIM_PICKUP_ORDER, payload);
  console.log('Claim pickup order response:', res?.data, payload);
  return res;
};

export const cancelPickupOrder = async (payload) => {
  return apiClient.put(ENDPOINTS.CANCEL_PICKUP_ORDER, payload);
};
