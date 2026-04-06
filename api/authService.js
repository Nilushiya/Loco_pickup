import { ENDPOINTS } from '../constants/Config';
import { authFailure, authSuccess, startLoading } from '../redux/slices/authSlice';
import {
  decodeJwtPayload,
  getPickupPersonIdFromToken,
  persistPickupPersonSession,
} from './pickupPersonService';
import apiClient from './client';

const authService = {
  // LOGIN ACTION
  login: (email, password) => async (dispatch) => {
    dispatch(startLoading());

    try {
      const response = await apiClient.post(ENDPOINTS.RESTAURANT_LOGIN, { email, password });
      console.log("Login successful:", response.data);
      const token = response.data?.data;

      if (!token) {
        throw new Error('Token not found in login response.');
      }

      const decodedToken = decodeJwtPayload(token);
      const id = getPickupPersonIdFromToken(token);
      const role = decodedToken?.role || 'PICKUP_PERSON';

      console.log("Received token:", token);
      console.log("Decoded token payload:", decodedToken);
      console.log("Received id:", id);
      console.log("Received role:", role);

      // Save to Secure Storage so the session persists
      await persistPickupPersonSession({ token, role });

      //  Update Redux state
      dispatch(authSuccess({ token, id, role }));
      console.log("Auth state updated in Redux with token, id and role.", { token, id, role });
      return { token, id, role };

    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Login failed. Please try again.';
      dispatch(authFailure(errorMsg));
      throw error;
    }
  },

  // SIGNUP ACTION
  signup: (userData) => async (dispatch) => {
    dispatch(startLoading());

    try {
      const response = await apiClient.post(ENDPOINTS.SIGNUP, userData);
      const token = response.data?.token ?? response.data?.data;
      const decodedToken = token ? decodeJwtPayload(token) : null;
      const id =
        response.data?.id ??
        (token ? getPickupPersonIdFromToken(token) : null);
      const role = response.data?.role ?? decodedToken?.role ?? 'PICKUP_PERSON';

      if (!token) {
        throw new Error('Token not found in signup response.');
      }

      console.log("Received token:", token);
      console.log("Received id:", id);
      console.log("Received role:", role);
      await persistPickupPersonSession({ token, role });

      dispatch(authSuccess({ token, id, role }));
      return { token, id, role };

    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Signup failed.';
      dispatch(authFailure(errorMsg));
      throw error;
    }
  },
};

export default authService;
