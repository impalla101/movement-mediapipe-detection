/**
 * This file will hold definitions for the pre-made workouts designed by FitRep.
 * Later, this data might come from Supabase instead.
 */
import type { WorkoutPlan } from '../types/poseTypes';

export const PRESET_WORKOUTS: WorkoutPlan[] = [
    {
        id: 'preset-core-1',
        name: 'Beginner Core Blast',
        steps: [
            { exercise: 'sit-up', targetReps: 10 },
            // Add rest step? { type: 'rest', duration: 30 }
            { exercise: 'sit-up', targetReps: 10 },
        ]
    },
    {
        id: 'preset-legs-1',
        name: 'Quick Squat Burner',
        steps: [
            { exercise: 'squat', targetReps: 15 },
            { exercise: 'squat', targetReps: 15 },
        ]
    },
    // Add more preset workouts
];

// Placeholder function to simulate fetching workouts (replace with Supabase later)
export const fetchPresetWorkouts = async (): Promise<WorkoutPlan[]> => {
    console.log("Placeholder: Fetching preset workouts...");
    // In future: await supabase.from('presets').select('*');
    return new Promise(resolve => setTimeout(() => resolve(PRESET_WORKOUTS), 500));
};

// Placeholder function to simulate fetching user-specific custom workouts
export const fetchCustomWorkouts = async (userId: string | null): Promise<WorkoutPlan[]> => {
     console.log(`Placeholder: Fetching custom workouts for user: ${userId}...`);
     if (!userId) return []; // Need user ID
    // In future: await supabase.from('custom_workouts').select('*').eq('user_id', userId);
    return new Promise(resolve => setTimeout(() => resolve([]), 500)); // Return empty for now
};