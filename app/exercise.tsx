import { Skia } from "@shopify/react-native-skia";
import { Stack } from "expo-router";
import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Button,
  NativeEventEmitter,
  NativeModules,
  Platform,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
} from "react-native";
import {
  Camera,
  CameraPosition,
  Frame,
  useCameraDevice,
  useCameraPermission,
  useSkiaFrameProcessor,
  VisionCameraProxy,
} from "react-native-vision-camera";
import { useSharedValue } from "react-native-worklets-core";

// Native module imports
const { PoseLandmarks } = NativeModules;
const poseLandmarksEmitter = new NativeEventEmitter(PoseLandmarks);

// Initialize the frame processor plugin 'poseLandmarks'
const poseLandMarkPlugin = VisionCameraProxy.initFrameProcessorPlugin(
  "poseLandmarks",
  {}
);

function poseLandmarks(frame: Frame) {
  "worklet";
  if (poseLandMarkPlugin == null) {
    throw new Error("Failed to load Frame Processor Plugin!");
  }
  return poseLandMarkPlugin.call(frame);
}

type KeypointData = {
  keypoint: number;
  x: number;
  y: number;
  z: number;
  visibility: number;
  presence: number;
};

type KeypointsMap = { [key: string]: KeypointData };

// Exercise types
type ExerciseType = "push-up" | "squat" | "sit-up" | "none";

// Exercise state
type ExerciseState = "up" | "down" | "transitioning";

// Connection lines for pose drawing
const LINES = [
  [0, 1],
  [0, 4],
  [1, 2],
  [2, 3],
  [3, 7],
  [4, 5],
  [5, 6],
  [6, 8],
  [9, 10],
  [11, 12],
  [11, 13],
  [11, 23],
  [12, 14],
  [12, 24],
  [13, 15],
  [15, 17],
  [15, 19],
  [15, 21],
  [17, 19],
  [14, 16],
  [16, 18],
  [16, 20],
  [16, 22],
  [18, 20],
  [23, 24],
  [23, 25],
  [24, 26],
  [25, 27],
  [26, 28],
  [27, 29],
  [27, 31],
  [29, 31],
  [28, 30],
  [28, 32],
  [30, 32],
];

// Style settings
const linePaint = Skia.Paint();
linePaint.setColor(Skia.Color("red"));
linePaint.setStrokeWidth(15);

const circlePaint = Skia.Paint();
circlePaint.setColor(Skia.Color("green"));
circlePaint.setStrokeWidth(5);

// MediaPipe pose landmark indices for reference
// These are the indices for the landmarks returned by MediaPipe
const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
};

// Helper function to calculate angle between three points
function calculateAngle(a: KeypointData, b: KeypointData, c: KeypointData) {
  // Convert to vectors
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  
  // Calculate dot product
  const dot = ab.x * cb.x + ab.y * cb.y;
  
  // Calculate magnitudes
  const magAB = Math.sqrt(ab.x * ab.x + ab.y * ab.y);
  const magCB = Math.sqrt(cb.x * cb.x + cb.y * cb.y);
  
  // Prevent division by zero
  if (magAB === 0 || magCB === 0) return 0;
  
  // Calculate angle in radians, clamping the value to [-1, 1] to avoid NaN from floating point errors
  const cosTheta = Math.max(-1, Math.min(1, dot / (magAB * magCB)));
  const angleRad = Math.acos(cosTheta);
  
  // Convert to degrees
  return (angleRad * 180) / Math.PI;
}

// Configuration
const CALIBRATION_DELAY_MS = 3000; // 3 seconds delay for calibration
const HYSTERESIS_MARGIN = 3; // Degrees - Adjust this value based on testing!

export default function Exercise() {
  const landmarks = useSharedValue<KeypointsMap>({});
  const frameSkipCounter = useSharedValue(0);
  const PROCESS_EVERY_NTH_FRAME = 1;
  const { hasPermission, requestPermission } = useCameraPermission();
  const [cameraPosition, setCameraPosition] = useState<CameraPosition>("front");
  const [showLines, setShowLines] = useState(true);
  const [showCircles, setShowCircles] = useState(true);
  const device = useCameraDevice(cameraPosition);
  
  // Exercise state tracking
  const [currentExercise, setCurrentExercise] = useState<ExerciseType>("none");
  const [repCount, setRepCount] = useState(0);
  const [exerciseState, setExerciseState] = useState<ExerciseState>("up");
  // Use useRef to hold the *previous stable* state for rep counting logic
  const previousStateRef = useRef<ExerciseState>("up");
  // **** NEW: Flag to track if 'down' state was hit during the current rep cycle ****
  const downStateAchievedInCycle = useRef(false);
  
  // Thresholds
  const [thresholds, setThresholds] = useState({
    "push-up": { upAngle: 160, downAngle: 100 },
    "squat": { upAngle: 160, downAngle: 110 },
    "sit-up": { upAngle: 80, downAngle: 160 }
  });
  
  // Calibration
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationStep, setCalibrationStep] = useState<"up" | "down">("up");
  const [calibrationMessage, setCalibrationMessage] = useState(""); // Message during calibration delay

  // Use refs to hold latest state values for use in the callback
  // This prevents the useEffect listener from needing these states as dependencies
  const stateRef = useRef({
    currentExercise,
    exerciseState,
    repCount,
    thresholds,
    isCalibrating,
    calibrationStep,
    previousState: previousStateRef.current, // Keep track of previous state inside ref too
    // **** NEW: Include the flag in the ref if needed, though modifying it directly might be okay ****
    // downAchieved: downStateAchievedInCycle.current
  });

  // Update refs whenever state changes
  useEffect(() => {
    stateRef.current = {
      currentExercise,
      exerciseState,
      repCount,
      thresholds,
      isCalibrating,
      calibrationStep,
      previousState: previousStateRef.current, // Update previous state ref value
      // downAchieved: downStateAchievedInCycle.current
    };
  }, [currentExercise, exerciseState, repCount, thresholds, isCalibrating, calibrationStep, previousStateRef.current]); // Include previousStateRef.current if it changes

   // Define processLandmarks using useCallback to ensure stability if needed as dependency
   // Note: It now reads state from stateRef.current
  const processLandmarks = useCallback((body: KeypointsMap) => {
    const currentState = stateRef.current; // Read state from ref

    if (currentState.currentExercise === "none" || !body || Object.keys(body).length === 0) return;
    
    let angle = 0;
    let visibilityInfo = { joint1: 0, joint2: 0, joint3: 0, valid: false };
    
    // Calculate relevant angle based on exercise type
    if (currentState.currentExercise === "push-up") {
      const shoulder = body[POSE_LANDMARKS.RIGHT_SHOULDER];
      const elbow = body[POSE_LANDMARKS.RIGHT_ELBOW];
      const wrist = body[POSE_LANDMARKS.RIGHT_WRIST];
      
      if (shoulder && elbow && wrist) { // Check existence first
          visibilityInfo = { 
            joint1: shoulder.visibility, joint2: elbow.visibility, joint3: wrist.visibility, 
            valid: shoulder.visibility > 0.5 && elbow.visibility > 0.5 && wrist.visibility > 0.5 
          };
          if (visibilityInfo.valid) angle = calculateAngle(shoulder, elbow, wrist);
      }
    } 
    else if (currentState.currentExercise === "squat") {
      const hip = body[POSE_LANDMARKS.RIGHT_HIP];
      const knee = body[POSE_LANDMARKS.RIGHT_KNEE];
      const ankle = body[POSE_LANDMARKS.RIGHT_ANKLE];
      
      if (hip && knee && ankle) {
          visibilityInfo = { 
            joint1: hip.visibility, joint2: knee.visibility, joint3: ankle.visibility, 
            valid: hip.visibility > 0.5 && knee.visibility > 0.5 && ankle.visibility > 0.5 
          };
          if (visibilityInfo.valid) angle = calculateAngle(hip, knee, ankle);
      }
    } 
    else if (currentState.currentExercise === "sit-up") {
      const shoulder = body[POSE_LANDMARKS.RIGHT_SHOULDER];
      const hip = body[POSE_LANDMARKS.RIGHT_HIP];
      const knee = body[POSE_LANDMARKS.RIGHT_KNEE];
       if (shoulder && hip && knee) {
          visibilityInfo = { 
            joint1: shoulder.visibility, joint2: hip.visibility, joint3: knee.visibility, 
            valid: shoulder.visibility > 0.5 && hip.visibility > 0.5 && knee.visibility > 0.5 
          };
          if (visibilityInfo.valid) angle = calculateAngle(shoulder, hip, knee);
      }
    }

    // Handle CALIBRATION (Only check angle during the capture phase, not during delay)
    // Calibration logic is now primarily driven by timeouts set in startCalibration
    if (currentState.isCalibrating) {
        // The angle capture happens inside the timeout callback in startCalibration now
        return; // Prevent normal rep processing during calibration
    }
    
    // Determine exercise state based on the angle only if visibility was good
    if (visibilityInfo.valid && angle > 0) {
      const { upAngle, downAngle } = currentState.thresholds[currentState.currentExercise as keyof typeof currentState.thresholds];
      
      let newState: ExerciseState = currentState.exerciseState;
      
      // For push-ups and squats, up means a larger angle
      if (currentState.currentExercise === "push-up" || currentState.currentExercise === "squat") {
        // Check for transitions INTO stable states
        if (currentState.exerciseState !== "up" && angle >= upAngle) { // Enter UP state by reaching threshold
          newState = "up";
        } else if (currentState.exerciseState !== "down" && angle <= downAngle) { // Enter DOWN state by reaching threshold
          newState = "down";
        }
        // Check for transitions OUT OF stable states (using margin)
        else if (currentState.exerciseState === "up" && angle < upAngle - HYSTERESIS_MARGIN) { // Leave UP state only if angle drops significantly
          newState = "transitioning";
        } else if (currentState.exerciseState === "down" && angle > downAngle + HYSTERESIS_MARGIN) { // Leave DOWN state only if angle rises significantly
           newState = "transitioning";
        }
        // If currently transitioning, check if we should settle into a state
        else if (currentState.exerciseState === "transitioning") {
            if (angle >= upAngle) newState = "up";
            else if (angle <= downAngle) newState = "down";
            // else remain transitioning
        }
      } 
      // For sit-ups, up means a smaller angle (torso more vertical)
      else if (currentState.currentExercise === "sit-up") {
        // Check for transitions INTO stable states
        if (currentState.exerciseState !== "up" && angle <= upAngle) { // Enter UP state (smaller angle)
          newState = "up";
        } else if (currentState.exerciseState !== "down" && angle >= downAngle) { // Enter DOWN state (larger angle)
          newState = "down";
        }
         // Check for transitions OUT OF stable states (using margin)
        else if (currentState.exerciseState === "up" && angle > upAngle + HYSTERESIS_MARGIN) { // Leave UP state only if angle rises significantly
          newState = "transitioning";
        } else if (currentState.exerciseState === "down" && angle < downAngle - HYSTERESIS_MARGIN) { // Leave DOWN state only if angle drops significantly
           newState = "transitioning";
        }
        // If currently transitioning, check if we should settle into a state
        else if (currentState.exerciseState === "transitioning") {
            if (angle <= upAngle) newState = "up";
            else if (angle >= downAngle) newState = "down";
             // else remain transitioning
        }
      }

      // Log state changes for debugging
      if (newState !== currentState.exerciseState) {
          console.log(`State Change: ${currentState.exerciseState} -> ${newState} (Angle: ${angle.toFixed(1)}, UpThr: ${upAngle.toFixed(1)}, DownThr: ${downAngle.toFixed(1)}, Margin: ${HYSTERESIS_MARGIN})`);
          // Update the actual state
          setExerciseState(newState); 
      
          // **** NEW: Set the flag when 'down' state is achieved ****
          if (newState === "down") {
              console.log("--- Down state achieved in cycle ---");
              downStateAchievedInCycle.current = true;
          }

          // **** MODIFIED: Count rep if 'up' is reached AND 'down' was achieved this cycle ****
          if (newState === "up" && downStateAchievedInCycle.current) {
             console.log(`REP COUNTED! Down achieved: ${downStateAchievedInCycle.current}, New: ${newState}. Reps: ${currentState.repCount + 1}`);
             setRepCount(prev => prev + 1);
             // **** NEW: Reset the flag after counting the rep ****
             downStateAchievedInCycle.current = false;
             console.log("--- Resetting down achieved flag ---");
          }

          // Update the stable previous state ref *only* when the state actually settles into 'up' or 'down'
          if (newState === "up" || newState === "down") {
              // console.log(`Updating previousStateRef from ${currentState.previousState} to ${newState}`);
              previousStateRef.current = newState; 
          }
      }
    } else if (!visibilityInfo.valid) {
      // Log when landmarks are not reliably visible
      // console.log(`Skipping state update due to low visibility for ${currentState.currentExercise}`);
      // Optionally: revert to a 'neutral' or 'unknown' state? Or just hold the last known state?
      // For now, we just don't update state if visibility is bad.
    }
  }, []); // Empty dependency array - processLandmarks definition is stable

  useEffect(() => {
    // Setup the listener
    const subscription = poseLandmarksEmitter.addListener(
      "onPoseLandmarksDetected",
      (event) => {
        if (event.landmarks && event.landmarks.length > 0 && event.landmarks[0]) {
            landmarks.value = event.landmarks[0]; // Update shared value for drawing
            processLandmarks(event.landmarks[0]); // Process the landmarks
        } else {
            // console.log("Received event with no landmarks[0]");
        }
      }
    );
    
    console.log("PoseLandmarks listener ADDED"); 

    // Cleanup function
    return () => {
      console.log("PoseLandmarks listener REMOVING"); 
      subscription.remove();
    };
  }, [processLandmarks]); // Re-run only if processLandmarks definition changes (it won't due to useCallback)


  useEffect(() => {
    requestPermission().catch((error) => console.log(error));
  }, [requestPermission]);


  const frameProcessor = useSkiaFrameProcessor(
    (frame) => {
      "worklet";
      // --- Frame processor logic remains the same ---
      frameSkipCounter.value++;
      const shouldProcess = frameSkipCounter.value >= PROCESS_EVERY_NTH_FRAME;
      if (shouldProcess) {
        frameSkipCounter.value = 0;
        poseLandmarks(frame);
      }
      frame.render();
      if ( landmarks?.value != null && typeof landmarks.value === 'object' && Object.keys(landmarks.value).length > 0 ) {
        let body = landmarks.value;
        let frameWidth = frame.width;
        let frameHeight = frame.height;
        if (showLines) {
          for (let [from, to] of LINES) {
            const fromPoint = body[from];
            const toPoint = body[to];
            if (fromPoint && toPoint) {
              frame.drawLine( fromPoint.x * Number(frameWidth), fromPoint.y * Number(frameHeight), toPoint.x * Number(frameWidth), toPoint.y * Number(frameHeight), linePaint );
            }
          }
        }
        if (showCircles) {
          for (let mark of Object.values(body)) {
            if (mark) {
              frame.drawCircle( mark.x * Number(frameWidth), mark.y * Number(frameHeight), 6, circlePaint );
            }
          }
        }
      }
      // --- End Frame processor logic ---
    },
    [showLines, showCircles] // Dependencies remain the same
  );
  
  // Calibration function with delay timer
  const startCalibration = () => {
    if (currentExercise === "none" || isCalibrating) return; // Prevent starting if none selected or already calibrating
    
    console.log(`Starting calibration for ${currentExercise}`);
    setIsCalibrating(true);
    setCalibrationStep("up");
    setCalibrationMessage(`Get ready for UP pose... 3`); // Initial message
    
    // Countdown timer
    let countdown = 3;
    const intervalId = setInterval(() => {
        countdown--;
        setCalibrationMessage(`Get ready for UP pose... ${countdown}`);
        if (countdown === 0) {
            clearInterval(intervalId);
            setCalibrationMessage(`Capturing UP pose... HOLD!`);
            
            // --- Capture UP Angle ---
            // Read landmarks directly from shared value *at the moment of capture*
            const currentLandmarks = landmarks.value; 
            if (currentLandmarks && Object.keys(currentLandmarks).length > 0) {
                let angle = 0;
                let visibilityValid = false;
                // Calculate angle based on current exercise (similar logic as processLandmarks)
                if (currentExercise === "push-up") {
                    const s = currentLandmarks[POSE_LANDMARKS.RIGHT_SHOULDER], e = currentLandmarks[POSE_LANDMARKS.RIGHT_ELBOW], w = currentLandmarks[POSE_LANDMARKS.RIGHT_WRIST];
                    visibilityValid = !!(s && e && w && s.visibility > 0.5 && e.visibility > 0.5 && w.visibility > 0.5);
                    if (visibilityValid) angle = calculateAngle(s, e, w);
                } else if (currentExercise === "squat") {
                    const h = currentLandmarks[POSE_LANDMARKS.RIGHT_HIP], k = currentLandmarks[POSE_LANDMARKS.RIGHT_KNEE], a = currentLandmarks[POSE_LANDMARKS.RIGHT_ANKLE];
                    visibilityValid = !!(h && k && a && h.visibility > 0.5 && k.visibility > 0.5 && a.visibility > 0.5);
                    if (visibilityValid) angle = calculateAngle(h, k, a);
                } else if (currentExercise === "sit-up") {
                    const s = currentLandmarks[POSE_LANDMARKS.RIGHT_SHOULDER], h = currentLandmarks[POSE_LANDMARKS.RIGHT_HIP], k = currentLandmarks[POSE_LANDMARKS.RIGHT_KNEE];
                    visibilityValid = !!(s && h && k && s.visibility > 0.5 && h.visibility > 0.5 && k.visibility > 0.5);
                    if (visibilityValid) angle = calculateAngle(s, h, k);
                }

                if (visibilityValid && angle > 0) {
                    console.log(`Calibration: Setting UP angle for ${currentExercise} to ${angle.toFixed(1)}`);
                    setThresholds(prev => ({ ...prev, [currentExercise]: { ...prev[currentExercise as keyof typeof prev], upAngle: angle } }));
                    
                    // Proceed to DOWN step after a short pause
                    setTimeout(() => {
                        setCalibrationStep("down");
                        setCalibrationMessage(`Get ready for DOWN pose... 3`);
                        let downCountdown = 3;
                        const downIntervalId = setInterval(() => {
                            downCountdown--;
                            setCalibrationMessage(`Get ready for DOWN pose... ${downCountdown}`);
                            if (downCountdown === 0) {
                                clearInterval(downIntervalId);
                                setCalibrationMessage(`Capturing DOWN pose... HOLD!`);

                                // --- Capture DOWN Angle ---
                                const downLandmarks = landmarks.value; // Read landmarks again
                                if (downLandmarks && Object.keys(downLandmarks).length > 0) {
                                    let downAngle = 0;
                                    let downVisibilityValid = false;
                                    // Calculate angle again
                                      if (currentExercise === "push-up") {
                                          const s = downLandmarks[POSE_LANDMARKS.RIGHT_SHOULDER], e = downLandmarks[POSE_LANDMARKS.RIGHT_ELBOW], w = downLandmarks[POSE_LANDMARKS.RIGHT_WRIST];
                                          downVisibilityValid = !!(s && e && w && s.visibility > 0.5 && e.visibility > 0.5 && w.visibility > 0.5);
                                          if (downVisibilityValid) downAngle = calculateAngle(s, e, w);
                                      } else if (currentExercise === "squat") {
                                          const h = downLandmarks[POSE_LANDMARKS.RIGHT_HIP], k = downLandmarks[POSE_LANDMARKS.RIGHT_KNEE], a = downLandmarks[POSE_LANDMARKS.RIGHT_ANKLE];
                                          downVisibilityValid = !!(h && k && a && h.visibility > 0.5 && k.visibility > 0.5 && a.visibility > 0.5);
                                          if (downVisibilityValid) downAngle = calculateAngle(h, k, a);
                                      } else if (currentExercise === "sit-up") {
                                          const s = downLandmarks[POSE_LANDMARKS.RIGHT_SHOULDER], h = downLandmarks[POSE_LANDMARKS.RIGHT_HIP], k = downLandmarks[POSE_LANDMARKS.RIGHT_KNEE];
                                          downVisibilityValid = !!(s && h && k && s.visibility > 0.5 && h.visibility > 0.5 && k.visibility > 0.5);
                                          if (downVisibilityValid) downAngle = calculateAngle(s, h, k);
                                      }

                                    if (downVisibilityValid && downAngle > 0) {
                                        console.log(`Calibration: Setting DOWN angle for ${currentExercise} to ${downAngle.toFixed(1)}`);
                                        setThresholds(prev => ({ ...prev, [currentExercise]: { ...prev[currentExercise as keyof typeof prev], downAngle: downAngle } }));
                                        
                                        // Finish calibration
                                        setCalibrationMessage(`Calibration Complete!`);
                                        setTimeout(() => { // Clear message after a bit
                                             setIsCalibrating(false);
                                             setCalibrationMessage("");
                                             setCalibrationStep("up"); // Reset for next time
                                        }, 2000);
                                    } else {
                                        Alert.alert("Calibration Failed", "Could not detect pose clearly for DOWN position. Please try again.");
                                        setIsCalibrating(false);
                                        setCalibrationMessage("");
                                    }
                                } else {
                                     Alert.alert("Calibration Failed", "Could not see you clearly for DOWN position. Please try again.");
                                     setIsCalibrating(false);
                                     setCalibrationMessage("");
                                }
                            }
                        }, 1000);
                    }, 500); // Short pause before starting down countdown

                } else {
                    Alert.alert("Calibration Failed", "Could not detect pose clearly for UP position. Please try again.");
                    setIsCalibrating(false);
                    setCalibrationMessage("");
                }
            } else {
                 Alert.alert("Calibration Failed", "Could not see you clearly for UP position. Please try again.");
                 setIsCalibrating(false);
                 setCalibrationMessage("");
            }
        }
    }, 1000); // 1 second interval for countdown
  };
  
  // Reset function remains the same
  const resetExercise = () => {
     console.log(`Resetting exercise. Exercise: ${currentExercise}, Reps: ${repCount}`);
    setRepCount(0);
    setExerciseState("up");
    previousStateRef.current = "up"; // Reset stable previous state too
    // **** NEW: Reset the flag on exercise reset ****
    downStateAchievedInCycle.current = false;
    setIsCalibrating(false); // Ensure calibration is cancelled
    setCalibrationMessage("");
  };

  // --- Permission/Device Checks (remain the same) ---
   if (!hasPermission) {
    return <Text>No permission</Text>;
  }
  if (device == null) {
    return <Text>No device</Text>;
  }
  const pixelFormat = Platform.OS === "ios" ? "rgb" : "yuv";
  // --- End Checks ---

  return (
    <>
      <Stack.Screen
        name="exercise"
        options={{
          title: "Exercise",
          headerRight: () => (
            <>
              <Button
                title="Change camera"
                onPress={() =>
                  setCameraPosition((prev) =>
                    prev === "front" ? "back" : "front"
                  )
                }
              />
            </>
          ),
        }}
      />
      
      <View style={styles.drawControl}>
        <Button
          title={showLines ? "Hide lines" : "Show lines"}
          onPress={() => setShowLines(!showLines)}
        />
        <Button
          title={showCircles ? "Hide circles" : "Show circles"}
          onPress={() => setShowCircles(!showCircles)}
        />
      </View>
      
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
        pixelFormat={pixelFormat}
        videoHdr={false}
        enableBufferCompression={true}
        photo={false}
        fps={30} // Consider if 30fps is needed or if lower is okay
      />
      
      {/* Exercise controls overlay */}
      <View style={styles.exerciseControls}>
        <Text style={styles.heading}>FitQuest</Text>
        
        {/* Calibration Message Overlay */}
        {isCalibrating && calibrationMessage && (
            <View style={styles.calibrationOverlay}>
                <Text style={styles.calibrationText}>{calibrationMessage}</Text>
            </View>
        )}

        <View style={styles.exerciseSelector}>
          <Text style={styles.label}>Select Exercise:</Text>
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[ styles.exerciseButton, currentExercise === "push-up" && styles.activeButton ]}
              onPress={() => { setCurrentExercise("push-up"); resetExercise(); }}
              disabled={isCalibrating} // Disable during calibration
            >
              <Text style={styles.buttonText}>Push-up</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ styles.exerciseButton, currentExercise === "squat" && styles.activeButton ]}
              onPress={() => { setCurrentExercise("squat"); resetExercise(); }}
               disabled={isCalibrating} // Disable during calibration
            >
              <Text style={styles.buttonText}>Squat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ styles.exerciseButton, currentExercise === "sit-up" && styles.activeButton ]}
              onPress={() => { setCurrentExercise("sit-up"); resetExercise(); }}
               disabled={isCalibrating} // Disable during calibration
            >
              <Text style={styles.buttonText}>Sit-up</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {currentExercise !== "none" && (
          <>
            <View style={styles.repCounter}>
              <Text style={styles.repCount}>{repCount}</Text>
              <Text style={styles.repLabel}>Reps</Text>
              <Text style={styles.stateLabel}>
                State: {exerciseState.charAt(0).toUpperCase() + exerciseState.slice(1)}
              </Text>
            </View>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, isCalibrating && styles.disabledButton]} // Style when disabled
                onPress={startCalibration}
                disabled={isCalibrating} // Disable button itself
              >
                <Text style={styles.buttonText}>
                   {/* Keep button text simple */}
                  Calibrate 
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, isCalibrating && styles.disabledButton]} // Style when disabled
                onPress={resetExercise}
                disabled={isCalibrating} // Disable during calibration
              >
                <Text style={styles.buttonText}>Reset</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  drawControl: {
    position: "absolute",
    top: 0, // Adjust if needed based on safe areas/notch
    left: 0,
    right: 0,
    zIndex: 20, // Ensure above camera but potentially below calibration message
    backgroundColor: "rgba(255, 255, 255, 0.7)", // Slightly transparent
    flexDirection: "row",
    justifyContent: "space-around", // Space out buttons
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  exerciseControls: {
    position: "absolute",
    bottom: 30, // Adjust for safe areas if needed
    left: 15,
    right: 15,
    backgroundColor: "rgba(0,0,0,0.75)",
    borderRadius: 15,
    padding: 15,
    zIndex: 10,
  },
  heading: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFF",
    textAlign: "center",
    marginBottom: 10,
  },
  exerciseSelector: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    color: "#FFF",
    marginBottom: 8,
  },
  buttonGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  exerciseButton: {
    backgroundColor: "#444",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: "center",
  },
  activeButton: {
    backgroundColor: "#007BFF",
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "600",
    textAlign: "center",
  },
  repCounter: {
    alignItems: "center",
    marginVertical: 15,
  },
  repCount: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#FFF",
  },
  repLabel: {
    fontSize: 18,
    color: "#FFF",
  },
  stateLabel: {
    fontSize: 16,
    color: "#FFF",
    marginTop: 5,
    fontStyle: 'italic', // Differentiate state label
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginTop: 10, // Add some space above action buttons
  },
  actionButton: {
    backgroundColor: "#28a745", // Green for calibrate/reset
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    minWidth: 100, // Ensure buttons have some minimum width
    alignItems: 'center',
  },
  disabledButton: {
      backgroundColor: "#6c757d", // Gray out when disabled
      opacity: 0.7,
  },
  // --- New styles for calibration overlay ---
  calibrationOverlay: {
      position: 'absolute', // Position it over the controls or screen center
      top: 0, // Adjust as needed - maybe center it?
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)', // Dark overlay
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 50, // Make sure it's on top
      borderRadius: 15, // Match controls panel if desired
  },
  calibrationText: {
      fontSize: 28,
      fontWeight: 'bold',
      color: '#FFF',
      textAlign: 'center',
      padding: 20,
  }
});