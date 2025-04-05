/**
 * This hook manages the repetition count based on the calculated exercise state
 * from the usePoseProcessor hook. It also handles the 'down state achieved' logic.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import type { ExerciseState } from '../types/poseTypes';

interface UseRepCounterProps {
    processedState: ExerciseState; // The state ('up', 'down', etc.) from usePoseProcessor
    isVisible: boolean;          // Are the key joints currently visible?
    targetReps?: number;         // Optional target reps for the current set/exercise
    onRepComplete?: () => void;     // Optional callback when a rep is counted
    onTargetMet?: () => void;       // Optional callback when targetReps is reached
}

interface RepCounterResult {
    repCount: number;
    displayState: ExerciseState; // The state to show in the UI
    resetCounter: (startState?: ExerciseState) => void; // Function to reset the counter
}

export function useRepCounter({
    processedState,
    isVisible,
    targetReps,
    onRepComplete,
    onTargetMet,
}: UseRepCounterProps): RepCounterResult {

    const [repCount, setRepCount] = useState(0);
    // Use a ref for the 'down achieved' flag to avoid triggering re-renders on its change
    const downStateAchievedInCycle = useRef(false);
    // Store the *previous stable* state ('up' or 'down') to detect transitions
    const previousStableState = useRef<ExerciseState>('up'); // Assume starting up

    useEffect(() => {
        // Ignore state changes if joints aren't visible
        if (!isVisible) {
            // console.log("RepCounter ignoring state change due to low visibility");
            return;
        }

        // Only process stable states ('up', 'down') coming from the processor
        if (processedState === 'up' || processedState === 'down') {

            const previousState = previousStableState.current;

            // --- Logic for counting reps ---
            // Condition: Transitioning from 'down' state back to 'up' state
            //            AND the 'down' state flag was set during this cycle.
            if (processedState === 'up' && previousState === 'down' && downStateAchievedInCycle.current) {
                const newRepCount = repCount + 1;
                setRepCount(newRepCount);
                console.log(`REP COUNTED! Reps: ${newRepCount}`);
                downStateAchievedInCycle.current = false; // Reset flag for the next rep
                console.log("--- Resetting down achieved flag ---");

                // Callbacks
                onRepComplete?.();
                if (targetReps && newRepCount >= targetReps) {
                    console.log(`TARGET REPS (${targetReps}) MET!`);
                    onTargetMet?.();
                }
            }

            // --- Logic for setting the 'down achieved' flag ---
            // Set the flag when entering the 'down' state
            if (processedState === 'down') {
                if (!downStateAchievedInCycle.current) {
                     console.log("--- Down state achieved in cycle ---");
                     downStateAchievedInCycle.current = true;
                }
            }

            // Update the previous stable state ref *after* processing logic
            previousStableState.current = processedState;
        }
         // If processedState is 'transitioning' or 'none', we don't update previousStableState
         // or change the rep count logic based on it directly.

    }, [processedState, isVisible, repCount, targetReps, onRepComplete, onTargetMet]); // Rerun when the input state or visibility changes

    const resetCounter = useCallback((startState: ExerciseState = 'up') => {
        console.log('Resetting Rep Counter...');
        setRepCount(0);
        downStateAchievedInCycle.current = false;
        // Reset previous stable state, usually to 'up' unless specified otherwise
        previousStableState.current = (startState === 'up' || startState === 'down') ? startState : 'up';
         console.log(`Counter reset. Previous state set to: ${previousStableState.current}`);
    }, []);

    return {
        repCount,
        // Return the processed state directly for UI display, as it reflects the pose processor's output
        displayState: processedState,
        resetCounter,
    };
}