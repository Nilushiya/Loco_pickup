import * as SecureStore from 'expo-secure-store';
import { ENDPOINTS } from '../constants/Config';
import apiClient from './client';

const decodeBase64Url = (value) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');

  if (typeof globalThis.atob === 'function') {
    return globalThis.atob(padded);
  }

  throw new Error('Base64 decoding is not available in this environment.');
};

export const decodeJwtPayload = (token) => {
  const parts = token?.split('.');

  if (!parts || parts.length < 2) {
    throw new Error('Invalid token format.');
  }

  const decodedPayload = decodeBase64Url(parts[1]);
  return JSON.parse(decodedPayload);
};

export const getPickupPersonIdFromToken = (token) => {
  const decodedToken = decodeJwtPayload(token);
  const rawId = decodedToken?.id ?? decodedToken?.pickupPersonId ?? decodedToken?.sub;

  if (rawId === null || rawId === undefined || rawId === '') {
    return null;
  }

  const numericId = Number(rawId);
  return Number.isNaN(numericId) ? null : numericId;
};

export const persistPickupPersonSession = async ({ token, role }) => {
  const decodedToken = decodeJwtPayload(token);
  const id = getPickupPersonIdFromToken(token);
  const resolvedRole = role || decodedToken?.role || 'PICKUP_PERSON';

  await SecureStore.setItemAsync('userToken', token);

  if (id !== null) {
    await SecureStore.setItemAsync('userId', String(id));
  }

  await SecureStore.setItemAsync('userRole', resolvedRole);

  return { id, role: resolvedRole, decodedToken };
};

export const getStoredPickupPersonId = async (fallbackId, token) => {
  const storedId = await SecureStore.getItemAsync('userId');
  const resolvedId =
    fallbackId ??
    (storedId ? Number(storedId) : null) ??
    (token ? getPickupPersonIdFromToken(token) : null);

  if (resolvedId !== null && !storedId) {
    await SecureStore.setItemAsync('userId', String(resolvedId));
  }

  return resolvedId;
};

export const fetchPickupPersonDetails = async (pickupPersonId) => {
  const response = await apiClient.get(
    ENDPOINTS.PICKUP_PERSON_DETAILS(pickupPersonId)
  );

  return response?.data?.data ?? null;
};
