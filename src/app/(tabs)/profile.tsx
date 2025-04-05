import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import { useRouter } from 'expo-router'; // Import useRouter
import { COLORS, FONTS } from '../../constants/theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

// --- Placeholder Data & Auth ---
const userName = 'andrew_s'; // Replace with actual user data later
const userRP = 1470;
const isLoggedIn = true; // Placeholder - use actual auth state later
const useAuth = () => ({ userId: isLoggedIn ? 'mock_user_123' : null, isLoading: false });
// --- End Placeholders ---


const avatarShopItems = [
  { id: '1', name: 'Headband', rp: 250, imagePlaceholderColor: '#ffcc00' },
  { id: '2', name: 'Sunglasses', rp: 400, imagePlaceholderColor: '#6c757d' },
  { id: '3', name: 'Tank Top', rp: 600, imagePlaceholderColor: '#fd7e14' },
];


export default function Profile() {
  const router = useRouter();
  const { userId } = useAuth(); // Get user ID for conditional rendering/navigation

  const navigateToAccount = () => {
      // Later, this might go to /account or /login depending on auth state
      if (userId) {
          console.log("Navigate to Account Details page (not implemented)");
          // router.push('/accountDetails'); // Example future path
      } else {
           console.log("Navigate to Login/Signup page (not implemented)");
          // router.push('/auth'); // Example future path for login/signup flow
      }
  };

  const navigateToSettings = () => {
      console.log("Navigate to Settings page (not implemented)");
      // router.push('/settings'); // Example future path
  };

  const navigateToHelp = () => {
      console.log("Navigate to Help page (not implemented)");
      // router.push('/help'); // Example future path
  };

  const navigateToWorkoutBuilder = () => {
       console.log("Navigate to Workout Builder page (not implemented)");
       // router.push('/workoutBuilder'); // Example future path
  };


  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

      {/* User Info Section */}
      <View style={styles.userInfoSection}>
        <View style={styles.userInfoTextContainer}>
          {/* Conditionally show username or login prompt? */}
          <Text style={styles.username}>{userId ? userName : 'Guest'}</Text>
          {userId && (
            <View style={styles.rpContainer}>
              <Image source={require('@/assets/images/coin.png')} style={styles.coinIcon} />
              <Text style={styles.rpText}>{userRP.toLocaleString()} RP</Text>
            </View>
          )}
        </View>
        {/* Conditionally show avatar or placeholder? */}
        <Image source={require('@/assets/images/avatar.png')} style={styles.avatar} />
      </View>

      {/* --- Workout Builder Link (Only if logged in?) --- */}
      {userId && (
        <View style={styles.sectionContainer}>
          <Pressable style={[styles.linkItem, styles.builderLink]} onPress={navigateToWorkoutBuilder}>
                <View>
                    <Text style={styles.linkText}>Workout Builder</Text>
                    <Text style={styles.linkSubText}>Create your custom routines</Text>
                </View>
                <MaterialIcons name="add-circle-outline" size={24} color={COLORS.primary} />
          </Pressable>
        </View>
      )}

      {/* Avatar Shop Section */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Avatar Shop</Text>
          {/* Link to full shop page? */}
          {/* <MaterialIcons name="arrow-forward-ios" size={18} color={COLORS.textLight} /> */}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shopScrollContainer}>
          {avatarShopItems.map((item) => (
            <View key={item.id} style={styles.shopItemCard}>
              <View style={[styles.itemImagePlaceholder, { backgroundColor: item.imagePlaceholderColor }]}>
                 {/* Placeholder */}
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
        <Pressable style={styles.linkItem} onPress={navigateToAccount}>
          <Text style={styles.linkText}>{userId ? 'Account' : 'Login / Sign Up'}</Text>
          <MaterialIcons name="arrow-forward-ios" size={18} color={COLORS.textLight} />
        </Pressable>
        <Pressable style={styles.linkItem} onPress={navigateToSettings}>
          <Text style={styles.linkText}>Settings</Text>
          <MaterialIcons name="arrow-forward-ios" size={18} color={COLORS.textLight} />
        </Pressable>
        <Pressable style={styles.linkItem} onPress={navigateToHelp}>
          <Text style={styles.linkText}>Help & Support</Text>
          <MaterialIcons name="arrow-forward-ios" size={18} color={COLORS.textLight} />
        </Pressable>
      </View>

    </ScrollView>
  );
}

// --- Styles --- (Add builderLink and linkSubText styles)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    paddingVertical: 30,
    paddingBottom: 50, // Ensure space at bottom
  },
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
    fontWeight: '600',
    color: COLORS.textLight,
  },
  avatar: {
    width: 80,
    height: 130,
    resizeMode: 'contain',
    marginLeft: 15,
    marginRight: 50,
  },
  sectionContainer: {
    marginBottom: 30,
    paddingLeft: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingRight: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  shopScrollContainer: {
     paddingRight: 20,
  },
  shopItemCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    marginRight: 15,
    width: 120,
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
  linksSectionContainer: {
      paddingHorizontal: 20,
       marginTop: 10, // Add space above links if builder is present
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
   builderLink: { // Style for the builder link specifically
       borderColor: COLORS.primary,
       borderWidth: 1,
       paddingVertical: 12, // Slightly less padding
   },
  linkText: {
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.text,
  },
  linkSubText: { // Style for the subtext in builder link
      fontSize: 14,
      color: COLORS.textLight,
      marginTop: 2,
  },
});