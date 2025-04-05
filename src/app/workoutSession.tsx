/**
 * This screen manages the active workout session.
 * It orchestrates the camera, pose processing, rep counting, calibration,
 * and UI components based on the selected workout mode (freestyle, preset, custom).
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text, Button, Alert } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'; // Use router for params/navigation
import { COLORS } from '../constants/theme'; // Assuming theme constants exist

// Import Hooks
import { useCameraSetup } from '../hooks/useCameraSetup';
import { usePoseProcessor } from '../hooks/usePoseProcessor';
import { useRepCounter } from '../hooks/useRepCounter';
import { useCalibration } from '../hooks/useCalibration';

// Import Components
import CameraView from '../components/CameraView';
import ExerciseSelector from '../components/ExerciseSelector';
import RepDisplay from '../components/RepDisplay';
import CalibrationUI from '../components/CalibrationUI';
import ActionButtons from '../components/ActionButtons';
import WorkoutProgressDisplay from '../components/WorkoutProgressDisplay'; // New

// Import Constants & Types
import { EXERCISE_RECIPES } from '../constants/exerciseConfig';
import { fetchPresetWorkouts, fetchCustomWorkouts } from '../constants/workoutPresets'; // Placeholder fetchers
import type { ExerciseName, WorkoutMode, WorkoutPlan, AllThresholds, ExerciseThresholds } from '../types/poseTypes';

// --- Mock Auth Hook (Replace with Supabase later) ---
const useAuth = () => ({ userId: 'mock_user_123', isLoading: false });
// --- End Mock ---

export default function WorkoutSessionScreen() {
    const router = useRouter();
    // Get parameters passed from navigation (e.g., from train.tsx)
    const params = useLocalSearchParams<{ mode: WorkoutMode, planId?: string }>();
    const workoutMode = params.mode || 'freestyle'; // Default to freestyle if no mode passed
    const planId = params.planId;

    const { userId } = useAuth(); // Placeholder

    // --- State for the Workout Session ---
    const [sessionState, setSessionState] = useState<{
        plan: WorkoutPlan | null;
        currentStepIndex: number; // Index in plan.steps, -1 for freestyle
        currentExercise: ExerciseName; // The *actual* exercise being tracked now
        isLoadingPlan: boolean;
    }>({
        plan: null,
        currentStepIndex: -1,
        currentExercise: 'none',
        isLoadingPlan: true,
    });

    const [allThresholds, setAllThresholds] = useState<AllThresholds>({}); // Store calibrated thresholds for all exercises
    const [isCameraReady, setIsCameraReady] = useState(false); // Prevent processing until camera active

    // --- Load Workout Plan (if not freestyle) ---
    useEffect(() => {
        const loadPlan = async () => {
            setSessionState(prev => ({ ...prev, isLoadingPlan: true }));
            let loadedPlan: WorkoutPlan | null = null;
            try {
                if (workoutMode === 'preset' && planId) {
                    const presets = await fetchPresetWorkouts(); // Fetch all (or by ID later)
                    loadedPlan = presets.find(p => p.id === planId) || null;
                } else if (workoutMode === 'custom' && planId) {
                    // Need user ID to fetch custom plans
                    const customWorkouts = await fetchCustomWorkouts(userId);
                    loadedPlan = customWorkouts.find(p => p.id === planId) || null;
                }
                // For 'freestyle', loadedPlan remains null

                setSessionState({
                    plan: loadedPlan,
                    // Start at step 0 if a plan exists, otherwise -1
                    currentStepIndex: loadedPlan && loadedPlan.steps.length > 0 ? 0 : -1,
                    // Set initial exercise based on plan or 'none' for freestyle
                    currentExercise: loadedPlan && loadedPlan.steps.length > 0 ? loadedPlan.steps[0].exercise : 'none',
                    isLoadingPlan: false,
                });

            } catch (error) {
                console.error("Error loading workout plan:", error);
                // TODO: Show error message to user
                setSessionState(prev => ({ ...prev, isLoadingPlan: false, plan: null }));
            }
        };

        loadPlan();
    }, [workoutMode, planId, userId]); // Reload if mode/id/user changes


    // --- Setup Camera ---
    const { hasPermission, device, cameraPosition, toggleCamera, landmarks, frameProcessor, pixelFormat } = useCameraSetup();

    // Mark camera as ready once device is available
    useEffect(() => {
        if (device) {
            setIsCameraReady(true);
        }
    }, [device]);

    // --- Setup Calibration Hook ---
    const { isCalibrating, calibrationMessage, startCalibration, cancelCalibration } = useCalibration({
        landmarks,
        currentExercise: sessionState.currentExercise,
        initialThresholds: allThresholds, // Pass all known thresholds
        onCalibrationComplete: (exercise, newThresholds) => {
             console.log(`Calibration complete for ${exercise}, updating thresholds.`);
            setAllThresholds(prev => ({
                ...prev,
                [exercise]: newThresholds,
            }));
            // Maybe automatically start reps after calibration? Or require user action.
        },
    });

    // --- Setup Pose Processing Hook ---
    const { isVisible, calculatedState, primaryAngle, secondaryAngle } = usePoseProcessor({
        landmarks,
        currentExercise: sessionState.currentExercise,
        // Pass the specific thresholds for the *current* exercise
        thresholds: allThresholds[sessionState.currentExercise],
    });

    // --- Setup Rep Counting Hook ---
    const currentStepConfig = sessionState.plan && sessionState.currentStepIndex !== -1
        ? sessionState.plan.steps[sessionState.currentStepIndex]
        : undefined;

    const { repCount, displayState, resetCounter } = useRepCounter({
        processedState: calculatedState, // Feed state from pose processor
        isVisible,                     // Feed visibility from pose processor
        targetReps: currentStepConfig?.targetReps, // Pass target reps if in a plan
        onTargetMet: () => {
            // --- This is where workout progression logic happens ---
            console.log("Target reps met! Advancing workout...");
            if (sessionState.plan && sessionState.currentStepIndex !== -1) {
                const nextStepIndex = sessionState.currentStepIndex + 1;
                if (nextStepIndex < sessionState.plan.steps.length) {
                     // Move to next step
                     const nextExercise = sessionState.plan.steps[nextStepIndex].exercise;
                     console.log(`Moving to step ${nextStepIndex + 1}: ${nextExercise}`);
                     setSessionState(prev => ({
                         ...prev,
                         currentStepIndex: nextStepIndex,
                         currentExercise: nextExercise,
                     }));
                     resetCounter('up'); // Reset reps for the new exercise

                     // TODO: Check if calibration is needed for nextExercise?
                     // If (!allThresholds[nextExercise]) { trigger calibration? Or prompt user? }

                } else {
                    // Workout complete!
                    console.log("Workout Plan Complete!");
                    // TODO: Navigate to summary screen, save progress, etc.
                    Alert.alert("Workout Complete!", "Great job!", [{ text: "OK", onPress: () => router.back() }]);
                }
            }
        }
    });


    // --- UI State and Actions ---
    const [showLines, setShowLines] = useState(true);
    const [showCircles, setShowCircles] = useState(true);

    // Handler for Freestyle exercise selection
    const handleSelectFreestyleExercise = useCallback((exercise: ExerciseName) => {
        if (workoutMode !== 'freestyle' || isCalibrating) return;
        console.log("Freestyle: Selecting exercise", exercise);
        setSessionState(prev => ({ ...prev, currentExercise: exercise }));
        resetCounter('up'); // Reset reps when changing exercise

        // Trigger calibration if thresholds aren't set for this exercise yet
        if (!allThresholds[exercise]) {
             console.log(`Calibration needed for ${exercise}`);
             // Delay slightly to allow state update before starting calibration
             setTimeout(startCalibration, 100);
        }

    }, [workoutMode, isCalibrating, resetCounter, allThresholds, startCalibration]);

    // Handler for the main Reset button (behavior depends on mode)
    const handleReset = useCallback(() => {
        if (isCalibrating) return;

        if (workoutMode === 'freestyle') {
            console.log("Resetting freestyle reps.");
            resetCounter('up');
        } else {
            // Resetting in preset/custom might restart the current exercise? Or the whole workout?
            // For now, let's reset the current exercise reps.
            console.log(`Resetting reps for current step: ${sessionState.currentExercise}`);
            resetCounter('up');
            // TODO: Add option to restart entire workout?
        }
    }, [workoutMode, isCalibrating, resetCounter, sessionState.currentExercise]);


    // --- Render Logic ---
    if (sessionState.isLoadingPlan) {
        return <View style={styles.container}><Text style={styles.loadingText}>Loading Workout...</Text></View>; // Basic loading state
    }
    if (!hasPermission) {
        return <View style={styles.container}><Text style={styles.loadingText}>Camera permission needed.</Text></View>;
    }
    if (!device) {
        return <View style={styles.container}><Text style={styles.loadingText}>No camera device found.</Text></View>;
    }

    // Determine title based on mode/plan
    const screenTitle = sessionState.plan?.name || (workoutMode === 'freestyle' ? 'Freestyle Workout' : 'Workout');

    return (
        <>
            {/* Configure the header dynamically */}
            <Stack.Screen
                options={{
                    title: screenTitle,
                    headerShown: true, // Show header for workout session
                    headerStyle: { backgroundColor: COLORS.viewBG }, // Example style
                    headerTitleStyle: { color: COLORS.text },
                    headerTintColor: COLORS.primary, // Back arrow color
                    headerRight: () => (
                         // Add settings/controls relevant to workout? Maybe toggle camera?
                         <Button title={cameraPosition === 'front' ? 'Back Cam' : 'Front Cam'} onPress={toggleCamera} color={COLORS.primary}/>
                    ),
                }}
            />

            {/* Main Content Area */}
            <View style={styles.container}>
                {/* Camera View takes full background */}
                 <CameraView
                     cameraProps={{ device, isActive: true, pixelFormat: 'rgb' }}
                     frameProcessor={isCameraReady ? frameProcessor : undefined} // Only attach processor when ready
                     landmarks={landmarks}
                     showLines={showLines}
                     showCircles={showCircles}
                 />

                 {/* Controls Overlay */}
                 <View style={styles.controlsOverlay}>
                     {/* Show different controls based on mode */}
                     {workoutMode !== 'freestyle' && sessionState.plan && (
                         <WorkoutProgressDisplay
                             plan={sessionState.plan}
                             currentStepIndex={sessionState.currentStepIndex}
                         />
                     )}

                     {workoutMode === 'freestyle' && (
                         <ExerciseSelector
                             availableExercises={EXERCISE_RECIPES}
                             selectedExercise={sessionState.currentExercise}
                             onSelect={handleSelectFreestyleExercise}
                             disabled={isCalibrating}
                         />
                     )}

                     {/* Common Displays */}
                     {(sessionState.currentExercise !== 'none' || isCalibrating) && (
                        <RepDisplay count={repCount} state={displayState} />
                     )}

                     {/* Action Buttons */}
                     {sessionState.currentExercise !== 'none' && (
                          <ActionButtons
                              mode={workoutMode}
                              isCalibrating={isCalibrating}
                              onCalibratePress={startCalibration}
                              onResetPress={handleReset}
                          />
                     )}

                    {/* Debug/Temp Controls for Show/Hide Lines/Circles */}
                     <View style={styles.debugControls}>
                        <Button title={showLines ? "Hide Lines" : "Show Lines"} onPress={() => setShowLines(p => !p)} />
                        <Button title={showCircles ? "Hide Circles" : "Show Circles"} onPress={() => setShowCircles(p => !p)} />
                     </View>

                 </View>

                 {/* Calibration Overlay */}
                 <CalibrationUI isVisible={isCalibrating} message={calibrationMessage} />

            </View>
        </>
    );
}

// --- Styles ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.black, // Default dark background
    },
    loadingText: {
        color: COLORS.text || '#FFF',
        textAlign: 'center',
        marginTop: 50,
        fontSize: 18,
    },
    controlsOverlay: {
        position: 'absolute',
        bottom: 0, // Adjust as needed for safe areas
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.75)',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 15,
        paddingBottom: 30, // Extra padding at bottom
        zIndex: 10,
    },
    debugControls: { // Temporary placement for line/circle toggles
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 15,
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingVertical: 5,
        borderRadius: 5,
    }
});