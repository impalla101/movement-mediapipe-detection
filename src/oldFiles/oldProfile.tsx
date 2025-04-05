import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import { COLORS, FONTS } from '../constants/theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

// --- Placeholder Data ---
const userName = 'andrew_s';
const userRP = 1470;
const avatarShopItems = [
  { id: '1', name: 'Headband', rp: 250, imagePlaceholderColor: '#ffcc00' }, // Yellow
  { id: '2', name: 'Sunglasses', rp: 400, imagePlaceholderColor: '#6c757d' }, // Gray
  { id: '3', name: 'Tank Top', rp: 600, imagePlaceholderColor: '#fd7e14' }, // Orange
  // Add more items
];
// --- End Placeholder Data ---

export default function Profile() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

      {/* User Info Section */}
      <View style={styles.userInfoSection}>
        <View style={styles.userInfoTextContainer}>
          <Text style={styles.username}>{userName}</Text>
          <View style={styles.rpContainer}>
            <Image source={require('@/assets/images/coin.png')} style={styles.coinIcon} />
            <Text style={styles.rpText}>{userRP.toLocaleString()} RP</Text>
          </View>
        </View>
        <Image source={require('@/assets/images/avatar.png')} style={styles.avatar} />
      </View>

      {/* Avatar Shop Section */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Avatar Shop</Text>
          <MaterialIcons name="arrow-forward-ios" size={18} color={COLORS.textLight} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shopScrollContainer}>
          {avatarShopItems.map((item) => (
            <View key={item.id} style={styles.shopItemCard}>
              <View style={[styles.itemImagePlaceholder, { backgroundColor: item.imagePlaceholderColor }]}>
                 {/* Placeholder View */}
              </View>
              <Text style={styles.itemName}>{item.name}</Text>
              <View style={styles.itemRpContainer}>
                <Image source={require('@/assets/images/coin.png')} style={styles.itemCoinIcon} />
                <Text style={styles.itemRpText}>{item.rp} RP</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Links Section */}
      <View style={styles.linksSectionContainer}>
        <Pressable style={styles.linkItem} onPress={() => console.log('Account Pressed')}>
          <Text style={styles.linkText}>Account</Text>
          <MaterialIcons name="arrow-forward-ios" size={18} color={COLORS.textLight} />
        </Pressable>
        <Pressable style={styles.linkItem} onPress={() => console.log('Settings Pressed')}>
          <Text style={styles.linkText}>Settings</Text>
          <MaterialIcons name="arrow-forward-ios" size={18} color={COLORS.textLight} />
        </Pressable>
        <Pressable style={styles.linkItem} onPress={() => console.log('Help & Support Pressed')}>
          <Text style={styles.linkText}>Help & Support</Text>
          <MaterialIcons name="arrow-forward-ios" size={18} color={COLORS.textLight} />
        </Pressable>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    paddingVertical: 30, // Add more padding at the top/bottom
  },
  // User Info Styles
  userInfoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  userInfoTextContainer: {
    // Takes space left by avatar
  },
  username: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
    marginLeft: 10,
  },
  rpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  coinIcon: {
    width: 24,
    height: 24,
    marginRight: 6,
  },
  rpText: {
    fontSize: 18,
    fontWeight: '600', // Semi-bold
    color: COLORS.textLight,
  },
  avatar: {
    width: 80, // Adjust size as needed
    height: 130,
    resizeMode: 'contain',
    marginLeft: 15, // Space between text and avatar
    marginRight: 50,
  },
  // Section Styles (used for Shop and Links)
  sectionContainer: {
    marginBottom: 30,
    paddingLeft: 20, // Start padding for horizontal scroll
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingRight: 20, // Padding for the arrow icon
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  // Avatar Shop Styles
  shopScrollContainer: {
     paddingRight: 20, // Padding at the end of the scroll
  },
  shopItemCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    marginRight: 15,
    width: 120, // Fixed width for cards
    // Shadows
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  itemImagePlaceholder: {
    width: 80,
    height: 60,
    borderRadius: 8,
    marginBottom: 10,
    // Background color set dynamically
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 5,
    textAlign: 'center',
  },
  itemRpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemCoinIcon: {
    width: 16,
    height: 16,
    marginRight: 4,
  },
  itemRpText: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  // Links Section Styles
  linksSectionContainer: {
      paddingHorizontal: 20,
  },
  linkItem: {
    backgroundColor: COLORS.white,
    paddingVertical: 18,
    paddingHorizontal: 15,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
     // Shadows
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  linkText: {
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.text,
  },
});