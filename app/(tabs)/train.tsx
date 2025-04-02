import React from 'react'
import { View, Text, StyleSheet, ScrollView, Image, Pressable } from 'react-native'
import { COLORS, FONTS } from '@/constants/theme'

// Placeholder data for workouts - replace with actual data later
const workouts = [
  {
    id: '1',
    name: 'Core',
    // image: require('@/assets/images/workout-core.png'), // Replace with actual image path
    image: undefined, // Placeholder
    rp: 100,
    difficulty: 1, // 1 dot
  },
  {
    id: '2',
    name: 'Lower Body',
    // image: require('@/assets/images/workout-lower.png'), // Replace with actual image path
    image: undefined, // Placeholder
    rp: 150,
    difficulty: 2, // 2 dots
  },
  {
    id: '3',
    name: 'Full Body',
    // image: require('@/assets/images/workout-full.png'), // Replace with actual image path
    image: undefined, // Placeholder
    rp: 200,
    difficulty: 3, // 3 dots
  },
  {
    id: '4',
    name: 'Upper Body',
    // image: require('@/assets/images/workout-upper.png'), // Replace with actual image path
    image: undefined, // Placeholder
    rp: 150,
    difficulty: 2, // 2 dots
  },
]

// Helper component for rendering difficulty dots
const DifficultyDots = ({ count }: { count: number }) => {
    const dots = []
    const dotColor = count === 1 ? COLORS.primary : count === 2 ? '#f0ad4e' : '#d9534f' // Example colors
    for (let i = 0; i < count; i++) {
        dots.push(<View key={i} style={[styles.difficultyDot, { backgroundColor: dotColor }]} />)
    }
    return <View style={styles.difficultyContainer}>{dots}</View>
}

export default function Train() {
  const [selectedWorkoutId, setSelectedWorkoutId] = React.useState<string | null>(null)

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Workout</Text>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {workouts.map((workout) => (
          <Pressable
            key={workout.id}
            style={[styles.card, selectedWorkoutId === workout.id && styles.selectedCard]}
            onPress={() => setSelectedWorkoutId(workout.id)}
          >
            <Image source={workout.image} style={styles.workoutImage} resizeMode="contain" />
            <View style={styles.cardTextContainer}>
              <Text style={styles.workoutName}>{workout.name}</Text>
              <View style={styles.rpContainer}>
                <Image source={require('@/assets/images/coin.png')} style={styles.coinIcon} />
                <Text style={styles.rpText}>{workout.rp}RP</Text>
              </View>
            </View>
            <DifficultyDots count={workout.difficulty} />
          </Pressable>
        ))}
      </ScrollView>
      <Pressable
        style={[styles.startButton, !selectedWorkoutId && styles.disabledButton]}
        disabled={!selectedWorkoutId}
        onPress={() => console.log('Start Workout Pressed! ID:', selectedWorkoutId)}
      >
        <Text style={styles.startButtonText}>Start</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa', // Light background matching Home
    paddingTop: 50, // Adjust as needed for status bar height
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold', // Using standard bold
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100, // Space for the fixed Start button
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef', // Light border for definition
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    // Shadow for Android
    elevation: 3,
  },
  selectedCard: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  workoutImage: {
    width: 80,
    height: 80,
    marginRight: 15,
  },
  cardTextContainer: {
    flex: 1, // Take remaining space
  },
  workoutName: {
    fontSize: 20,
    fontWeight: '600', // Semi-bold
    color: COLORS.text,
    marginBottom: 8,
  },
  rpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinIcon: {
    width: 20,
    height: 20,
    marginRight: 5,
  },
  rpText: {
    fontSize: 16,
    fontWeight: '500', // Medium weight
    color: COLORS.textLight,
  },
  difficultyContainer: {
    flexDirection: 'row',
    position: 'absolute',
    top: 15,
    right: 15,
  },
  difficultyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 5,
  },
  startButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: 'center',
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    // Shadow for Android
    elevation: 5,
  },
  disabledButton: {
      backgroundColor: COLORS.gray, // Grey out when disabled
      elevation: 0, // Remove shadow when disabled
      shadowOpacity: 0,
  },
  startButtonText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
})
