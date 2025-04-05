/**
 * This hook takes the latest pose landmarks, the current exercise configuration,
 * and calibrated thresholds, then calculates the current exercise state ('up', 'down', etc.)
 * and relevant joint angles.
 */
import { useState, useEffect, useMemo } from 'react';
import type { ISharedValue } from 'react-native-worklets-core';
import type { KeypointsMap, ExerciseName, ExerciseState, ExerciseThresholds, ExerciseRecipe } from '../types/poseTypes';
import { EXERCISE_RECIPES, POSE_LANDMARKS, VISIBILITY_THRESHOLD, HYSTERESIS_MARGIN } from '../constants/exerciseConfig';
import { calculateAngle } from '../utils/angleCalculator';

// Input arguments for the hook
interface UsePoseProcessorProps {
  landmarks: ISharedValue<KeypointsMap>;
  currentExercise: ExerciseName;
  thresholds: ExerciseThresholds | undefined; // Calibrated thresholds for the current exercise
}

// Values returned by the hook
interface PoseProcessorResult {
  isVisible: boolean;             // Are the key joints for the current exercise visible?
  calculatedState: ExerciseState; // The determined state ('up', 'down', 'transitioning', 'none')
  primaryAngle: number;           // The main angle calculated for the exercise
  secondaryAngle?: number;         // Optional second angle (e.g., left knee for squat)
}

export function usePoseProcessor({
  landmarks,
  currentExercise,
  thresholds,
}: UsePoseProcessorProps): PoseProcessorResult {

  // Internal state for this hook
  const [internalState, setInternalState] = useState<ExerciseState>('none'); // Start as 'none' until first calculation
  const [angles, setAngles] = useState<{ primary: number, secondary?: number }>({ primary: 0 });
  const [isVisible, setIsVisible] = useState(false);

  // Get the recipe for the current exercise
  const recipe = useMemo(() => {
      return currentExercise !== 'none' ? EXERCISE_RECIPES[currentExercise] : null;
  }, [currentExercise]);

  // Get the actual thresholds to use (calibrated or default)
  const activeThresholds = useMemo(() => {
      if (thresholds) return thresholds;
      if (recipe) return { upAngle: recipe.defaultUp, downAngle: recipe.defaultDown };
      return undefined; // No thresholds if no recipe
  }, [thresholds, recipe]);


  // Effect to process landmarks whenever they change or the exercise/thresholds change
  useEffect(() => {
    // Read the latest landmarks from the shared value
    const currentLandmarks = landmarks.value;

    // Guard clauses: exit if no recipe, thresholds, or landmarks
    if (!recipe || !activeThresholds || !currentLandmarks || Object.keys(currentLandmarks).length === 0) {
      setInternalState('none');
      setIsVisible(false);
      setAngles({ primary: 0 });
      return;
    }

    // --- Visibility Check ---
    let allKeyJointsVisible = true;
    for (const jointName of recipe.keyJoints) {
      const landmarkIndex = POSE_LANDMARKS[jointName as keyof typeof POSE_LANDMARKS];
      const landmark = currentLandmarks[landmarkIndex];
      if (!landmark || landmark.visibility < VISIBILITY_THRESHOLD) {
        allKeyJointsVisible = false;
        // console.log(`Visibility low for ${jointName}`); // Debug log
        break;
      }
    }
    setIsVisible(allKeyJointsVisible);

    // --- Angle Calculation ---
    let primaryAngle = 0;
    let secondaryAngle: number | undefined = undefined;
    let anglesCalculated = false;

    if (allKeyJointsVisible) { // Only calculate if visible
        const [p1Name, p2Name, p3Name] = recipe.primaryAngleJoints;
        const p1 = currentLandmarks[POSE_LANDMARKS[p1Name as keyof typeof POSE_LANDMARKS]];
        const p2 = currentLandmarks[POSE_LANDMARKS[p2Name as keyof typeof POSE_LANDMARKS]];
        const p3 = currentLandmarks[POSE_LANDMARKS[p3Name as keyof typeof POSE_LANDMARKS]];
        primaryAngle = calculateAngle(p1, p2, p3);

        if (recipe.secondaryAngleJoints) {
            const [s1Name, s2Name, s3Name] = recipe.secondaryAngleJoints;
            const s1 = currentLandmarks[POSE_LANDMARKS[s1Name as keyof typeof POSE_LANDMARKS]];
            const s2 = currentLandmarks[POSE_LANDMARKS[s2Name as keyof typeof POSE_LANDMARKS]];
            const s3 = currentLandmarks[POSE_LANDMARKS[s3Name as keyof typeof POSE_LANDMARKS]];
            secondaryAngle = calculateAngle(s1, s2, s3);
        }
        anglesCalculated = true;
        setAngles({ primary: primaryAngle, secondary: secondaryAngle });
    } else {
        setAngles({ primary: 0 }); // Reset angles if not visible
    }


    // --- State Transition Logic ---
    if (!allKeyJointsVisible || !anglesCalculated) {
        // If joints aren't visible or angles couldn't be calculated, revert to 'none' or keep previous stable state?
        // Keeping previous state might be better than flapping to 'none' briefly.
        // For simplicity now, let's just not update if not visible.
         console.log(`State update skipped: Visibility=${allKeyJointsVisible}, Angles Calculated=${anglesCalculated}`);
        return;
    }

    // Use local variables for calculation clarity
    const currentInternalState = internalState; // Read the *previous* internal state for comparison
    let newInternalState: ExerciseState = currentInternalState; // Start assuming no change
    const { upAngle, downAngle } = activeThresholds;
    const upThr = upAngle;
    const downThr = downAngle;
    const upMargin = upAngle - HYSTERESIS_MARGIN;
    const downMargin = downAngle + HYSTERESIS_MARGIN;
    const upCheck = recipe.upIsLarger ? (angle: number) => angle >= upThr : (angle: number) => angle <= upThr;
    const downCheck = recipe.upIsLarger ? (angle: number) => angle <= downThr : (angle: number) => angle >= downThr;
    const leaveUpCheck = recipe.upIsLarger ? (angle: number) => angle < upMargin : (angle: number) => angle > upMargin + (2*HYSTERESIS_MARGIN); // Adjust margin for inverted check
    const leaveDownCheck = recipe.upIsLarger ? (angle: number) => angle > downMargin : (angle: number) => angle < downMargin - (2*HYSTERESIS_MARGIN); // Adjust margin for inverted check

    // Multi-angle check helper (true if *all* angles meet the check)
    const checkAllAngles = (checkFn: (angle: number) => boolean): boolean => {
        if (!checkFn(primaryAngle)) return false;
        if (secondaryAngle !== undefined && !checkFn(secondaryAngle)) return false;
        // Add checks for more angles here if needed later
        return true;
    }
    // Multi-angle check helper (true if *any* angle meets the check) - Used for leaving states
    const checkAnyAngle = (checkFn: (angle: number) => boolean): boolean => {
        if (checkFn(primaryAngle)) return true;
        if (secondaryAngle !== undefined && checkFn(secondaryAngle)) return true;
        // Add checks for more angles here if needed later
        return false;
    }

    // Determine the new state based on angles and current state
    if (currentInternalState === 'none' || currentInternalState === 'transitioning') {
      if (checkAllAngles(upCheck)) {
        newInternalState = 'up';
      } else if (checkAllAngles(downCheck)) {
        newInternalState = 'down';
      } else {
        newInternalState = 'transitioning'; // Stay transitioning if neither threshold met
      }
    } else if (currentInternalState === 'up') {
      if (checkAnyAngle(leaveUpCheck)) { // If *any* angle leaves the up state (with margin)
        newInternalState = 'transitioning';
      }
      // else stay 'up'
    } else if (currentInternalState === 'down') {
       if (checkAnyAngle(leaveDownCheck)) { // If *any* angle leaves the down state (with margin)
         newInternalState = 'transitioning';
       }
       // else stay 'down'
    }

    // Update the internal state if it changed
    if (newInternalState !== currentInternalState) {
       console.log(`PoseProcessor State Change: ${currentInternalState} -> ${newInternalState} (Angles: P=${primaryAngle.toFixed(1)}${secondaryAngle ? `, S=${secondaryAngle.toFixed(1)}` : ''})`);
      setInternalState(newInternalState);
    }

  // Dependencies: Rerun when landmarks change, or when the exercise/thresholds change
  }, [landmarks.value, currentExercise, recipe, activeThresholds, internalState]); // Include internalState to use previous value correctly

  return {
    isVisible,
    calculatedState: internalState,
    primaryAngle: angles.primary,
    secondaryAngle: angles.secondary,
  };
}