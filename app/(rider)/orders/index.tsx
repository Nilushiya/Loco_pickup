import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import {
  categorizePickupOrderStatus,
  fetchPickupOrdersForPerson,
} from '../../../api/orderService';
import { getStoredPickupPersonId } from '../../../api/pickupPersonService';
import { Colors } from '../../../constants/theme';

const FILTERS = ['ACCEPTED', 'PICKEDUP', 'COMPLETED', 'CANCEL'] as const;
type OrderFilter = (typeof FILTERS)[number];

const FILTER_LABELS: Record<OrderFilter, string> = {
  ACCEPTED: 'ACCEPTED',
  PICKEDUP: 'PICKEDUP',
  COMPLETED: 'COMPLETED',
  CANCEL: 'CANCEL',
};

export default function RiderOrdersScreen() {
  const router = useRouter();
  const { id, token } = useSelector((state: any) => state.auth);
  const [pickupPersonId, setPickupPersonId] = useState<number | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<OrderFilter>('ACCEPTED');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadOrders = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const resolvedPickupPersonId = await getStoredPickupPersonId(id, token);

      if (!resolvedPickupPersonId) {
        setPickupPersonId(null);
        setOrders([]);
        return;
      }

      setPickupPersonId(resolvedPickupPersonId);
      const nextOrders = await fetchPickupOrdersForPerson({
        pickupPersonId: resolvedPickupPersonId,
      });
      setOrders(nextOrders);
    } catch (error) {
      console.error('Failed to load pickup orders:', error);
      setOrders([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [id, token]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const category = categorizePickupOrderStatus(
        order?.category || order?.status
      );
      return category === activeFilter;
    });
  }, [activeFilter, orders]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Orders</Text>
        <Text style={styles.subtitle}>
          View pickup orders by status
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((filter) => {
          const isActive = activeFilter === filter;

          return (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isActive && styles.filterChipTextActive,
                ]}
              >
                {FILTER_LABELS[filter]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadOrders(true)}
            tintColor={Colors.default.primary}
          />
        }
      >
        {isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={Colors.default.primary} />
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.centerState}>
            <MaterialCommunityIcons
              name="package-variant-closed"
              size={54}
              color="#B3B3B3"
            />
            <Text style={styles.emptyTitle}>No orders found</Text>
            <Text style={styles.emptyText}>
              No pickup orders are available in {FILTER_LABELS[activeFilter]}.
            </Text>
          </View>
        ) : (
          filteredOrders.map((order) => (
            <TouchableOpacity
              key={String(order.id)}
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: '/(rider)/orders/[orderId]',
                  params: {
                    orderId: String(order.id),
                    pickupPersonId: String(pickupPersonId || ''),
                  },
                } as any)
              }
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>
                  {order.restaurantName || 'Restaurant'}
                </Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>
                    {categorizePickupOrderStatus(order.status)}
                  </Text>
                </View>
              </View>

              <Text style={styles.cardSub}>{order.pickupLocation}</Text>

              <View style={styles.infoRow}>
                <MaterialIcons
                  name="train"
                  size={18}
                  color={Colors.default.primary}
                />
                <Text style={styles.infoText}>
                  {order.stationName || 'Station'} • {order.trainName || 'Train'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <MaterialIcons
                  name="person"
                  size={18}
                  color={Colors.default.primary}
                />
                <Text style={styles.infoText}>
                  {order.userName || 'Customer'} • {order.userPhoneNumber || 'No phone'}
                </Text>
              </View>

              <View style={styles.cardBottom}>
                <Text style={styles.amountText}>
                  Rs. {Number(order.deliveryFee || 0).toFixed(2)}
                </Text>
                <Text style={styles.detailsLink}>View details</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.default.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1F1F1F',
  },
  subtitle: {
    marginTop: 4,
    color: '#707070',
  },
  filterRow: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFF0E8',
  },
  filterChipActive: {
    backgroundColor: Colors.default.primary,
  },
  filterChipText: {
    fontWeight: '700',
    color: Colors.default.primary,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    flexGrow: 1,
  },
  centerState: {
    flex: 1,
    minHeight: 320,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  emptyText: {
    marginTop: 6,
    color: '#777',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EFE2DC',
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#232323',
    marginRight: 12,
  },
  statusBadge: {
    backgroundColor: '#FFF1EA',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.default.primary,
  },
  cardSub: {
    marginTop: 8,
    color: '#727272',
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  infoText: {
    marginLeft: 8,
    color: '#454545',
    flex: 1,
  },
  cardBottom: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.default.primary,
  },
  detailsLink: {
    fontWeight: '700',
    color: '#444',
  },
});
