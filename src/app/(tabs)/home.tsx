import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { COLORS } from '../../constants/theme';
import { Link } from 'expo-router';

// Placeholder data - eventually this will come from your app's state or API
const userName = "Andrew";
const userLevel = 4;
const userRP = 2155;
const progress = 0.75; // Example: 75% progress
const tipText = "Engage your core mucles for better balance";

export default function Home() {
  return (
    // Use ScrollView to allow content to scroll if it exceeds screen height
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

      {/* Greeting */}
      <Text style={styles.greeting}>Hello {userName}!</Text>

      {/* Progress Section */}
      <View style={styles.progressSection}>
        {/* TODO: Implement Progress Arc Component here */}
        <View style={styles.progressArcPlaceholder}>
           {/* Avatar positioned inside, but overflow is removed so it won't be clipped */}
        </View>
        {/* Avatar is now outside the arc's clipping bounds but positioned visually below it */}
        <View style={styles.avatarPlaceholder} >
         <Image source={require('../../assets/images/avatar.png')} style={styles.avatar} />
        </View>


        {/* Level */}
        <Text style={styles.levelText}>LEVEL {userLevel}</Text>

        {/* RP */}
        <View style={styles.rpContainer}>
          <Text style={styles.rpText}>{userRP.toLocaleString()}</Text>
          {/* TODO: Add Coin Image */}
          <Image source={require('../../assets/images/coin.png')} style={styles.coinIcon} />
          {/* <View style={styles.coinIconPlaceholder}><Text>Coin</Text></View> */}
          <Text style={styles.rpLabel}>RP</Text>
        </View>
      </View>

      {/* Daily Challenge Button */}
      <Link href="/workoutSession" asChild>
        <Pressable style={styles.dailyChallengeButton} >
          <Text style={styles.dailyChallengeButtonText}>Daily Challenge</Text>
        </Pressable>
      </Link>

      {/* Tips & Form Guide Section */}
      <View style={styles.tipsSection}>
        <View style={styles.tipsHeader}>
          <Text style={styles.tipsTitle}>Tips & Form Guide</Text>
          {/* TODO: Add Arrow Icon */}
          <Text style={styles.arrowIcon}>{'>'}</Text>
        </View>

        {/* Tip Card */}
        <View style={styles.tipCard}>
          <View style={styles.lightbulbIconPlaceholder}>
            <MaterialIcons name="lightbulb-outline" size={28} color={COLORS.primary} />
          </View>
          <Text style={styles.tipText}>{tipText}</Text>
        </View>
        {/* Add more tip cards here if needed, maybe in a horizontal ScrollView */}
      </View>

    </ScrollView>
  );
}

// Basic StyleSheet - We'll need to flesh this out significantly
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa', // A light background color
  },
  contentContainer: {
    padding: 20,
    alignItems: 'center', // Center items horizontally
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#343a40',
  },
  progressSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  progressArcPlaceholder: {
    width: 200,
    height: 100, // Half circle roughly
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
    borderWidth: 10,
    borderColor: '#e0e0e0', // Placeholder border
    borderBottomWidth: 0,
    alignItems: 'center',
    justifyContent: 'flex-end', // Position avatar towards the bottom
    marginBottom: 10, // Keep a small margin below the arc itself
    // overflow: 'hidden', // REMOVED: Allows avatar to show outside bounds
  },
  avatarPlaceholder: {
     width: 100,
     height: 175,
     borderRadius: 0,
    //  backgroundColor: '#cccccc', // Can remove if image always loads
     justifyContent: 'center',
     alignItems: 'center',
     marginTop: -70, // Pull the avatar up visually to overlap the arc bottom slightly
     marginBottom: 20, // Add space below the avatar before the Level text
  },
  avatar: { // Style for the actual image when added
     width: '100%', // Make image fill the placeholder
     height: '100%', // Make image fill the placeholder
     borderRadius: 0, // Ensure image corners are rounded if placeholder is round
  },
  levelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    letterSpacing: 1,
    marginBottom: 10,
    // marginTop: 10, // REMOVED: Use avatar's marginBottom instead
  },
  rpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  rpText: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.text,
    marginRight: 5,
  },
  coinIcon: { // Style for the actual coin image
    width: 24,
    height: 24,
    marginRight: 5,
  },
  rpLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  dailyChallengeButton: {
    backgroundColor: COLORS.primary, // Teal color from mockup
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginBottom: 30,
    width: '90%', // Make button wider
    alignItems: 'center',
  },
  dailyChallengeButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  tipsSection: {
    width: '100%',
    marginBottom: 20,
  },
  tipsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  tipsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  arrowIcon: {
    fontSize: 20,
    color: COLORS.text,
  },
  tipCard: {
    backgroundColor: COLORS.viewBG, // Light teal background
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%', // Make card full width relative to padding
  },
  lightbulbIconPlaceholder: {
     width: 30,
     height: 30,
     // backgroundColor: '#17a2b8', // Teal color
     // borderRadius: 15,
     justifyContent: 'center',
     alignItems: 'center',
     marginRight: 15
  },
  tipText: {
    fontSize: 16,
    color: COLORS.text, // Darker teal text
    flex: 1, // Allow text to take remaining space
  },
});