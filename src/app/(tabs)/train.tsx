import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import { Link, useRouter } from 'expo-router'; // Import Link and useRouter
import { COLORS, FONTS } from '../../constants/theme';
import type { WorkoutPlan } from '../../types/poseTypes'; // Import types
import { fetchPresetWorkouts, fetchCustomWorkouts } from '../../constants/workoutPresets'; // Import fetchers

// Placeholder auth hook (Replace with Supabase later)
const useAuth = () => ({ userId: 'mock_user_123', isLoading: false });


// Helper component for rendering difficulty dots (Keep as is)
const DifficultyDots = ({ count }: { count: number }) => {
    // ... (same as before)
    const dots = []
    const dotColor = count === 1 ? COLORS.primary : count === 2 ? '#f0ad4e' : '#d9534f' // Example colors
    for (let i = 0; i < count; i++) {
        dots.push(<View key={i} style={[styles.difficultyDot, { backgroundColor: dotColor }]} />)
    }
    return <View style={styles.difficultyContainer}>{dots}</View>
};

export default function Train() {
  const router = useRouter(); // Hook for navigation
  const { userId } = useAuth();
  const [selectedWorkoutId, setSelectedWorkoutId] = React.useState<string | null>(null);
  const [selectedMode, setSelectedMode] = React.useState<'preset' | 'custom' | 'freestyle' | null>(null);

  // --- State for workouts ---
  const [presetWorkouts, setPresetWorkouts] = React.useState<WorkoutPlan[]>([]);
  const [customWorkouts, setCustomWorkouts] = React.useState<WorkoutPlan[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // --- Fetch workouts on mount ---
  React.useEffect(() => {
      const loadWorkouts = async () => {
          setIsLoading(true);
          try {
              const [presets, customs] = await Promise.all([
                  fetchPresetWorkouts(),
                  fetchCustomWorkouts(userId)
              ]);
              setPresetWorkouts(presets);
              setCustomWorkouts(customs);
          } catch (error) {
              console.error("Failed to load workouts:", error);
              // TODO: Show error message
          } finally {
              setIsLoading(false);
          }
      };
      loadWorkouts();
  }, [userId]);

  // --- Handle selection ---
  const handleSelectWorkout = (id: string, mode: 'preset' | 'custom') => {
      setSelectedWorkoutId(id);
      setSelectedMode(mode);
  };

  const handleSelectFreestyle = () => {
      setSelectedWorkoutId('freestyle'); // Use a special ID or just the mode
      setSelectedMode('freestyle');
  };

  // --- Handle Start Button ---
  const handleStartWorkout = () => {
    if (!selectedMode || !selectedWorkoutId) return;

    // Navigate to the workout session screen with parameters
    router.push({
        pathname: './workoutSession', // Navigate to the new screen
        params: {
            mode: selectedMode,
            planId: selectedMode !== 'freestyle' ? selectedWorkoutId : undefined, // Only pass planId if not freestyle
        }
    });
  };


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Workout</Text>

      {isLoading ? (
          <Text style={styles.loadingText}>Loading Workouts...</Text>
      ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
              {/* --- Freestyle Option --- */}
              <Pressable
                  style={[styles.card, styles.freestyleCard, selectedWorkoutId === 'freestyle' && styles.selectedCard]}
                  onPress={handleSelectFreestyle}
              >
                   {/* Add an icon or specific styling? */}
                  <View style={styles.cardTextContainer}>
                      <Text style={styles.workoutName}>Freestyle Workout</Text>
                      <Text style={styles.rpText}>Choose exercises on the fly</Text>
                  </View>
                  {/* Maybe add a unique icon? */}
              </Pressable>

               {/* --- Custom Workouts (if any) --- */}
               {customWorkouts.length > 0 && (
                  <>
                    <Text style={styles.sectionHeader}>Your Workouts</Text>
                    {customWorkouts.map((workout) => (
                      <Pressable
                        key={workout.id}
                        style={[styles.card, selectedWorkoutId === workout.id && styles.selectedCard]}
                        onPress={() => handleSelectWorkout(workout.id, 'custom')}
                      >
                        {/* <Image source={workout.image} style={styles.workoutImage} resizeMode="contain" /> */}
                        <View style={styles.cardTextContainer}>
                          <Text style={styles.workoutName}>{workout.name}</Text>
                          {/* Add other details like estimated time? */}
                        </View>
                        {/* <DifficultyDots count={workout.difficulty || 1} /> */}
                      </Pressable>
                    ))}
                  </>
               )}


              {/* --- Preset Workouts --- */}
              <Text style={styles.sectionHeader}>FitRep Workouts</Text>
              {presetWorkouts.map((workout) => (
                <Pressable
                  key={workout.id}
                  style={[styles.card, selectedWorkoutId === workout.id && styles.selectedCard]}
                   onPress={() => handleSelectWorkout(workout.id, 'preset')}
                >
                  {/* <Image source={workout.image} style={styles.workoutImage} resizeMode="contain" /> */}
                  <View style={styles.cardTextContainer}>
                    <Text style={styles.workoutName}>{workout.name}</Text>
                    {/* Display RP if available in plan data */}
                    {/* <View style={styles.rpContainer}>
                      <Image source={require('@/assets/images/coin.png')} style={styles.coinIcon} />
                      <Text style={styles.rpText}>{workout.rp}RP</Text>
                    </View> */}
                  </View>
                  {/* Display difficulty if available */}
                  {/* <DifficultyDots count={workout.difficulty || 1} /> */}
                </Pressable>
              ))}

          </ScrollView>
      )}

      {/* --- Start Button --- */}
      <Pressable
        style={[styles.startButton, !selectedWorkoutId && styles.disabledButton]}
        disabled={!selectedWorkoutId || isLoading}
        onPress={handleStartWorkout} // Call the navigation function
      >
        <Text style={styles.startButtonText}>Start Workout</Text>
      </Pressable>
    </View>
  )
}

// --- Styles --- (Add styles for freestyleCard, sectionHeader, loadingText)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 20,
  },
   loadingText: {
        color: COLORS.textLight,
        textAlign: 'center',
        marginTop: 30,
        fontSize: 16,
    },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
   sectionHeader: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textLight,
        marginTop: 20,
        marginBottom: 10,
        paddingLeft: 5, // Slight indent
    },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
   freestyleCard: {
       borderColor: COLORS.secondary, // Different border for freestyle?
       borderWidth: 1.5,
   },
  selectedCard: {
    borderColor: COLORS.primary,
    borderWidth: 2.5, // Make selection more prominent
  },
  workoutImage: { // Keep if you add images later
    width: 80,
    height: 80,
    marginRight: 15,
  },
  cardTextContainer: {
    flex: 1,
  },
  workoutName: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  rpContainer: { // Keep if you add RP to presets
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinIcon: { // Keep if you add RP
    width: 20,
    height: 20,
    marginRight: 5,
  },
  rpText: { // Keep if you add RP
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textLight,
  },
  difficultyContainer: { // Keep if you add difficulty
    flexDirection: 'row',
    position: 'absolute',
    top: 15,
    right: 15,
  },
  difficultyDot: { // Keep if you add difficulty
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  disabledButton: {
      backgroundColor: COLORS.gray,
      elevation: 0,
      shadowOpacity: 0,
  },
  startButtonText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
});
