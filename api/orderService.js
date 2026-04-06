import { ENDPOINTS } from '../constants/Config';
import apiClient from './client';

const toNullableNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numericValue = Number(value);
  return Number.isNaN(numericValue) ? null : numericValue;
};

const normalizePickupOrderItems = (sourceItems = []) => {
  if (!Array.isArray(sourceItems)) {
    return [];
  }

  return sourceItems.map((item, index) => {
    const quantity = Number(
      item?.quantity ?? item?.qty ?? item?.count ?? 1
    ) || 1;
    const unitPrice = Number(
      item?.price ?? item?.unitPrice ?? item?.amount ?? 0
    ) || 0;

    return {
      id: item?.id ?? index,
      name:
        item?.name ||
        item?.itemName ||
        item?.menuItem?.name ||
        'Order Item',
      image:
        item?.image ||
        item?.imageUrl ||
        item?.photo ||
        item?.menuItem?.image ||
        item?.menuItem?.imageUrl ||
        '',
      quantity,
      unitPrice,
      total: Number(item?.total ?? quantity * unitPrice) || 0,
    };
  });
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
    restaurantName:
      order?.restaurant?.name ||
      order?.restaurantName ||
      'Restaurant',
    stationName:
      order?.station?.name ||
      order?.stationName ||
      'Station',
    trainName:
      order?.train?.name ||
      order?.train?.trainName ||
      order?.trainName ||
      'Train not available',
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

export const fetchPickupOrderDetails = async ({ orderId, pickupPersonId }) => {
  const response = await apiClient.get(ENDPOINTS.GET_PICKUP_ORDER_DETAILS(orderId), {
    params: {
      pickupPersonId,
    },
  });

  const source = response?.data?.data ?? response?.data ?? {};
  const items = normalizePickupOrderItems(
    source?.items || source?.orderItems || source?.products || []
  );

  return {
    id: source?.id ?? orderId,
    totalAmount:
      Number(
        source?.totalAmount ??
          source?.amount ??
          source?.deliveryFee ??
          items.reduce((sum, item) => sum + item.total, 0)
      ) || 0,
    userName:
      source?.user?.firstname && source?.user?.lastname
        ? `${source.user.firstname} ${source.user.lastname}`
        : source?.user?.name ||
          source?.customerName ||
          source?.userName ||
          'Customer',
    userPhoneNumber:
      source?.user?.phoneNumber ||
      source?.userPhoneNumber ||
      source?.customerPhoneNumber ||
      '',
    trainName:
      source?.train?.name ||
      source?.train?.trainName ||
      source?.trainName ||
      'Train not available',
    stationName:
      source?.station?.name ||
      source?.stationName ||
      'Station',
    stationAddress:
      source?.station?.address ||
      source?.dropLocation ||
      source?.dropoffLocation ||
      '',
    restaurantName:
      source?.restaurant?.name ||
      source?.restaurantName ||
      'Restaurant',
    restaurantAddress:
      source?.restaurant?.address ||
      source?.pickupLocation ||
      '',
    items,
  };
};

export const claimPickupOrder = async (payload) => {
  const res = await apiClient.put(ENDPOINTS.CLAIM_PICKUP_ORDER, payload);
  console.log('Claim pickup order response:', res?.data, payload);
  return res;
};

export const pickupOrder = async (payload) => {
  const res = await apiClient.put(ENDPOINTS.PICKUP_ORDER, payload);
  console.log('Pickup order response:', res?.data, payload);
  return res;
};

export const handoverOrder = async (payload) => {
  const res = await apiClient.put(ENDPOINTS.HANDOVER_ORDER, payload);
  console.log('Handover order response:', res?.data, payload);
  return res;
};

export const cancelPickupOrder = async (payload) => {
  const res = await apiClient.put(ENDPOINTS.CANCEL_PICKUP_ORDER, payload);
  console.log('Cancel pickup order response:', res?.data, payload);
  return res;
};
