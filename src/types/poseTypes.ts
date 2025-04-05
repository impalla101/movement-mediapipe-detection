/**
 * This file defines the common shapes (types) of data used throughout
 * the pose detection and exercise tracking parts of the app.
 * Using shared types helps prevent errors and makes code easier to understand.
 */

// Represents a single point detected by the pose model
export type KeypointData = {
    keypoint: number; // The index ID of the landmark
    x: number;        // Normalized horizontal position (0.0 to 1.0)
    y: number;        // Normalized vertical position (0.0 to 1.0)
    z: number;        // Depth (distance from camera, experimental)
    visibility: number; // How confident the model is that this point is visible (0.0 to 1.0)
    presence: number;   // How confident the model is that this point is within the frame (0.0 to 1.0)
  };
  
  // Represents all the keypoints detected for a single person in a frame
  // It's a map where the key is the landmark index (as a string)
  export type KeypointsMap = { [key: string]: KeypointData };
  
  // The different types of exercises the app knows about
  export type ExerciseName = "push-up" | "squat" | "sit-up" | "none"; // Add future exercises here
  
  // The possible states during an exercise rep
  export type ExerciseState = "up" | "down" | "transitioning" | "none"; // "none" added for initial state
  
  // Configuration for a single exercise "recipe"
  export type ExerciseRecipe = {
    displayName: string;            // Name shown in UI (e.g., "Push-up")
    keyJoints: string[];            // Landmark names needed for visibility checks
    primaryAngleJoints: string[];   // 3 landmark names defining the main angle
    secondaryAngleJoints?: string[]; // Optional: 3 landmark names for a second angle check (like left knee for squat)
    defaultUp: number;              // Default "up" angle threshold
    defaultDown: number;            // Default "down" angle threshold
    upIsLarger: boolean;            // True if the "up" angle value is numerically larger than "down" (e.g., push-up, squat)
    // Add future properties like form correction rules here
  };
  
  // Structure for calibrated thresholds for a specific exercise
  export type ExerciseThresholds = {
      upAngle: number;
      downAngle: number;
  };
  
  // Structure for the entire set of thresholds for all exercises
  export type AllThresholds = {
      [key in ExerciseName]?: ExerciseThresholds; // Use ExerciseName as key
  };
  
  // Possible workout modes
  export type WorkoutMode = 'freestyle' | 'preset' | 'custom';
  
  // Basic structure for a step in a preset/custom workout
  export type WorkoutStep = {
      exercise: PerformableExerciseName; // Use the restricted type
      targetReps?: number;    // How many reps (optional, could be time-based later)
      // Add targetTime, restPeriod etc. later
  };
  
  // Structure for a complete workout plan (preset or custom)
  export type WorkoutPlan = {
      id: string;
      name: string;
      steps: WorkoutStep[];
      // Add estimated time, difficulty etc. later
  };
  
  // Represents the overall state of the workout session
  export type WorkoutSessionState = {
      mode: WorkoutMode;
      currentExercise: ExerciseName; // The exercise being tracked *right now*
      currentStepIndex: number; // Index in the plan (-1 for freestyle)
      plan?: WorkoutPlan | null; // The loaded plan (null for freestyle)
  };

  // Represents only the exercise names that can be part of a workout plan step
  export type PerformableExerciseName = Exclude<ExerciseName, 'none'>;