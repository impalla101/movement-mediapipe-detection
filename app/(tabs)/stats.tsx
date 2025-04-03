import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { COLORS, FONTS } from '@/constants/theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons'; // For arrow icon

// --- Placeholder Data ---
const fitnessLevels = {
  strength: 0.8, // 80%
  stamina: 0.6, // 60%
  speed: 0.7, // 70%
};

const achievements = [
  { id: '1', name: 'First Workout', date: 'Feb 11', iconPlaceholder: 'trophy' },
  { id: '2', name: '4-Day Streak', date: 'Feb 20', iconPlaceholder: 'calendar' },
  { id: '3', name: '1,000 Reps', date: 'Mar 5', iconPlaceholder: 'coin' }, // Using coin as placeholder
  // Add more achievements here
];

const weeklyProgressLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
// --- End Placeholder Data ---

// Simple Progress Bar Component
const StatProgressBar = ({ value, color }: { value: number; color: string }) => {
  return (
    <View style={styles.progressBarContainer}>
      <View style={[styles.progressBarFill, { width: `${value * 100}%`, backgroundColor: color }]} />
    </View>
  );
};

export default function Stats() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header Message */}
      <Text style={styles.headerMessage}>You crushed it this week!</Text>

      {/* Weekly Progress Section */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Weekly Progress</Text>
        <View style={styles.chartPlaceholder}>
          <Text style={styles.placeholderText}>Chart Placeholder</Text>
          {/* You would integrate a chart library here */}
        </View>
        <View style={styles.chartLabelsContainer}>
          {weeklyProgressLabels.map((label, index) => (
            <Text key={index} style={styles.chartLabel}>{label}</Text>
          ))}
        </View>
      </View>

      {/* Fitness Level Section */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Fitness Level</Text>
        <View style={styles.fitnessLevelContent}>
          <Image source={require('@/assets/images/avatar.png')} style={styles.avatar} />
          <View style={styles.statsBarsContainer}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Strength</Text>
              <Text style={styles.statEmoji}>💪</Text>
              <StatProgressBar value={fitnessLevels.strength} color={COLORS.primary} />
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Stamina</Text>
              <Text style={styles.statEmoji}>💨</Text>
              <StatProgressBar value={fitnessLevels.stamina} color={COLORS.primary} />
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Speed</Text>
              <Text style={styles.statEmoji}>⚡</Text>
              <StatProgressBar value={fitnessLevels.speed} color={COLORS.primary} />
            </View>
          </View>
        </View>
      </View>

      {/* Achievement Gallery Section */}
      <View style={styles.sectionContainer}>
        <View style={styles.achievementHeader}>
          <Text style={styles.sectionTitle}>Achievement Gallery</Text>
          <MaterialIcons name="arrow-forward-ios" size={18} color={COLORS.textLight} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.achievementScrollContainer}>
          {achievements.map((achievement) => (
            <View key={achievement.id} style={styles.achievementCard}>
              <View style={styles.achievementIconPlaceholder}>
                {achievement.iconPlaceholder === 'trophy' && <Text style={styles.placeholderEmoji}>🏆</Text>}
                {achievement.iconPlaceholder === 'calendar' && <Text style={styles.placeholderEmoji}>📅</Text>}
                {achievement.iconPlaceholder === 'coin' && <Image source={require('@/assets/images/coin.png')} style={styles.achievementCoinIcon} />}
              </View>
              <Text style={styles.achievementName}>{achievement.name}</Text>
              <Text style={styles.achievementDate}>{achievement.date}</Text>
            </View>
          ))}
        </ScrollView>
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
    padding: 20,
    paddingBottom: 40, // Add padding at the bottom
  },
  headerMessage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 25,
  },
  sectionContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600', // Semi-bold
    color: COLORS.text,
    marginBottom: 15,
  },
  // Chart Styles
  chartPlaceholder: {
    height: 150,
    backgroundColor: COLORS.viewBG, // Use a light background for placeholder
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  placeholderText: {
    color: COLORS.textLight,
    fontSize: 16,
  },
  chartLabelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 10, // Align labels roughly under chart area
  },
  chartLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  // Fitness Level Styles
  fitnessLevelContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white, // Card background
    padding: 15,
    borderRadius: 10,
    // Add shadows like Train cards
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  avatar: {
    width: 90, // Slightly larger avatar
    height: 150,
    resizeMode: 'contain',
    marginRight: 20,
  },
  statsBarsContainer: {
    flex: 1, // Take remaining space
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15, // Space between bars
  },
  statLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    width: 80, // Fixed width for alignment
  },
  statEmoji: {
      fontSize: 16,
      marginHorizontal: 5,
  },
  progressBarContainer: {
    flex: 1, // Take remaining horizontal space
    height: 10,
    backgroundColor: '#e0e0e0', // Light grey background for the bar
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  // Achievement Gallery Styles
  achievementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  achievementScrollContainer: {
    paddingRight: 20, // Ensure last item has padding
  },
  achievementCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginRight: 15,
    width: 110, // Fixed width for cards
    // Shadows
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  achievementIconPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: COLORS.viewBG, // Placeholder background
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  placeholderEmoji: {
      fontSize: 24,
  },
  achievementCoinIcon: {
      width: 30,
      height: 30,
      resizeMode: 'contain',
  },
  achievementName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 3,
  },
  achievementDate: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
  },
});