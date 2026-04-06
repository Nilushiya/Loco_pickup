import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchPickupOrderDetails } from '../../../api/orderService';
import { Colors } from '../../../constants/theme';

export default function RiderOrderDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const orderId = Number(params.orderId);
  const pickupPersonId = Number(params.pickupPersonId);
  const [details, setDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDetails = async () => {
      try {
        setIsLoading(true);
        const nextDetails = await fetchPickupOrderDetails({
          orderId,
          pickupPersonId,
        });
        setDetails(nextDetails);
      } catch (error) {
        console.error('Failed to load order details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (orderId && pickupPersonId) {
      loadDetails();
    } else {
      setIsLoading(false);
    }
  }, [orderId, pickupPersonId]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Order Details</Text>
          <Text style={styles.subtitle}>Order #{orderId || '-'}</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={Colors.default.primary} />
        </View>
      ) : !details ? (
        <View style={styles.centerState}>
          <Text style={styles.emptyText}>Order details not available.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Restaurant</Text>
            <Text style={styles.valueTitle}>{details.restaurantName}</Text>
            <Text style={styles.valueSub}>{details.restaurantAddress}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery</Text>
            <Text style={styles.valueTitle}>{details.stationName}</Text>
            <Text style={styles.valueSub}>{details.stationAddress}</Text>
            <Text style={styles.inlineInfo}>Train: {details.trainName}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer</Text>
            <Text style={styles.valueTitle}>{details.userName}</Text>
            <Text style={styles.valueSub}>
              {details.userPhoneNumber || 'Phone not available'}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Items</Text>
            {details.items?.length ? (
              details.items.map((item: any) => (
                <View key={String(item.id)} style={styles.itemRow}>
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.itemImage} />
                  ) : (
                    <View style={styles.itemPlaceholder}>
                      <MaterialCommunityIcons
                        name="food-outline"
                        size={18}
                        color="#7D7D7D"
                      />
                    </View>
                  )}
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemMeta}>
                      Qty {item.quantity} x Rs. {Number(item.unitPrice || 0).toFixed(2)}
                    </Text>
                  </View>
                  <Text style={styles.itemTotal}>
                    Rs. {Number(item.total || 0).toFixed(2)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.valueSub}>No item details available.</Text>
            )}
          </View>

          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>
              Rs. {Number(details.totalAmount || 0).toFixed(2)}
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.default.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#222',
  },
  subtitle: {
    marginTop: 2,
    color: '#7A7A7A',
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#7A7A7A',
  },
  content: {
    padding: 20,
    paddingBottom: 24,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F0E3DC',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.default.primary,
    marginBottom: 8,
  },
  valueTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#242424',
  },
  valueSub: {
    marginTop: 6,
    color: '#6E6E6E',
    lineHeight: 20,
  },
  inlineInfo: {
    marginTop: 8,
    color: '#444',
    fontWeight: '600',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  itemImage: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#EAEAEA',
  },
  itemPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#ECECEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  itemMeta: {
    fontSize: 12,
    color: '#6F6F6F',
    marginTop: 3,
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.default.primary,
  },
  totalCard: {
    backgroundColor: '#FFF2EB',
    borderRadius: 18,
    padding: 18,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 13,
    color: '#8A5B48',
    fontWeight: '700',
  },
  totalValue: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: '800',
    color: Colors.default.primary,
  },
});
