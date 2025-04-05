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
function calculateAngle(a: KeypointData, b: KeypointData, c: KeypointData): number {
    // Basic null/undefined check for input points
    if (!a || !b || !c) {
        console.warn("calculateAngle received invalid KeypointData:", a, b, c);
        return 0; // Return 0 or throw error? Returning 0 might be safer.
    }
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
const HYSTERESIS_MARGIN = 5; // Degrees - Increased margin slightly for multi-joint check
const VISIBILITY_THRESHOLD = 0.5; // Minimum visibility score for a landmark

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
  const previousStateRef = useRef<ExerciseState>("up");
  const downStateAchievedInCycle = useRef(false);
  
  // Thresholds
  const [thresholds, setThresholds] = useState({
    "push-up": { upAngle: 160, downAngle: 100 },
    "squat": { upAngle: 160, downAngle: 110 }, // Default/initial squat thresholds
    "sit-up": { upAngle: 80, downAngle: 160 }
  });
  
  // Calibration
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationStep, setCalibrationStep] = useState<"up" | "down">("up");
  const [calibrationMessage, setCalibrationMessage] = useState(""); 

  // Use refs to hold latest state values for use in the callback
  const stateRef = useRef({
    currentExercise,
    exerciseState,
    repCount,
    thresholds,
    isCalibrating,
    calibrationStep,
    previousState: previousStateRef.current, 
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
      previousState: previousStateRef.current, 
    };
  }, [currentExercise, exerciseState, repCount, thresholds, isCalibrating, calibrationStep, previousStateRef.current]); 

  // --- Process Landmarks Callback ---
  const processLandmarks = useCallback((body: KeypointsMap) => {
    const currentState = stateRef.current; 

    if (currentState.currentExercise === "none" || !body || Object.keys(body).length === 0) return;
    if (currentState.isCalibrating) return; // Prevent normal processing during calibration

    const { upAngle, downAngle } = currentState.thresholds[currentState.currentExercise as keyof typeof currentState.thresholds];
    let newState: ExerciseState = currentState.exerciseState;
    let angleInfo = { valid: false, rAngle: 0, lAngle: 0, primaryAngle: 0 }; // Store relevant angles

    // --- EXERCISE SPECIFIC LOGIC ---
    
    if (currentState.currentExercise === "push-up") {
      // ** Push-up Logic (Single Angle - Right Elbow) **
      const rShoulder = body[POSE_LANDMARKS.RIGHT_SHOULDER];
      const rElbow = body[POSE_LANDMARKS.RIGHT_ELBOW];
      const rWrist = body[POSE_LANDMARKS.RIGHT_WRIST];
      
      const visibilityValid = !!(rShoulder && rElbow && rWrist && 
                                  rShoulder.visibility > VISIBILITY_THRESHOLD && 
                                  rElbow.visibility > VISIBILITY_THRESHOLD && 
                                  rWrist.visibility > VISIBILITY_THRESHOLD);
      
      if (visibilityValid) {
          angleInfo.primaryAngle = calculateAngle(rShoulder, rElbow, rWrist);
          angleInfo.valid = true;
          // console.log(`Push-up Angle: ${angleInfo.primaryAngle.toFixed(1)}`); // Debug log if needed
      } else {
          // console.log("Push-up visibility low");
      }
      
      // State transition logic (using angleInfo.primaryAngle)
      if (angleInfo.valid) {
        if (currentState.exerciseState !== "up" && angleInfo.primaryAngle >= upAngle) {
          newState = "up";
        } else if (currentState.exerciseState !== "down" && angleInfo.primaryAngle <= downAngle) {
          newState = "down";
        } else if (currentState.exerciseState === "up" && angleInfo.primaryAngle < upAngle - HYSTERESIS_MARGIN) {
          newState = "transitioning";
        } else if (currentState.exerciseState === "down" && angleInfo.primaryAngle > downAngle + HYSTERESIS_MARGIN) {
           newState = "transitioning";
        } else if (currentState.exerciseState === "transitioning") {
            if (angleInfo.primaryAngle >= upAngle) newState = "up";
            else if (angleInfo.primaryAngle <= downAngle) newState = "down";
        }
      }
    } 
    else if (currentState.currentExercise === "squat") {
      // ** Squat Logic (Multi-Joint - Both Knees) **
      const rHip = body[POSE_LANDMARKS.RIGHT_HIP];
      const rKnee = body[POSE_LANDMARKS.RIGHT_KNEE];
      const rAnkle = body[POSE_LANDMARKS.RIGHT_ANKLE];
      const lHip = body[POSE_LANDMARKS.LEFT_HIP];
      const lKnee = body[POSE_LANDMARKS.LEFT_KNEE];
      const lAnkle = body[POSE_LANDMARKS.LEFT_ANKLE];

      // Check visibility for BOTH sides
      const rVisValid = !!(rHip && rKnee && rAnkle && 
                           rHip.visibility > VISIBILITY_THRESHOLD && 
                           rKnee.visibility > VISIBILITY_THRESHOLD && 
                           rAnkle.visibility > VISIBILITY_THRESHOLD);
      const lVisValid = !!(lHip && lKnee && lAnkle && 
                           lHip.visibility > VISIBILITY_THRESHOLD && 
                           lKnee.visibility > VISIBILITY_THRESHOLD && 
                           lAnkle.visibility > VISIBILITY_THRESHOLD);

      // Calculate angles only if landmarks are visible
      if (rVisValid) angleInfo.rAngle = calculateAngle(rHip, rKnee, rAnkle);
      if (lVisValid) angleInfo.lAngle = calculateAngle(lHip, lKnee, lAnkle);

      angleInfo.valid = rVisValid && lVisValid; // Require BOTH sides to be visible for state changes

      if (angleInfo.valid) {
        console.log(`Squat Angles - R: ${angleInfo.rAngle.toFixed(1)}, L: ${angleInfo.lAngle.toFixed(1)} (UpThr: ${upAngle}, DownThr: ${downAngle})`);

        // State transition logic (Requires BOTH knees to meet criteria)
        if (currentState.exerciseState !== "up" && angleInfo.rAngle >= upAngle && angleInfo.lAngle >= upAngle) {
            console.log(`Checking UP state: R(${angleInfo.rAngle.toFixed(1)})>=${upAngle} && L(${angleInfo.lAngle.toFixed(1)})>=${upAngle} -> YES`);
            newState = "up";
        } else if (currentState.exerciseState !== "down" && angleInfo.rAngle <= downAngle && angleInfo.lAngle <= downAngle) {
            console.log(`Checking DOWN state: R(${angleInfo.rAngle.toFixed(1)})<=${downAngle} && L(${angleInfo.lAngle.toFixed(1)})<=${downAngle} -> YES`);
            newState = "down";
        } 
        // Hysteresis: Leaving stable states (Requires EITHER knee to cross margin)
        else if (currentState.exerciseState === "up" && (angleInfo.rAngle < upAngle - HYSTERESIS_MARGIN || angleInfo.lAngle < upAngle - HYSTERESIS_MARGIN)) {
            console.log(`Leaving UP state: R(${angleInfo.rAngle.toFixed(1)})<${upAngle - HYSTERESIS_MARGIN} || L(${angleInfo.lAngle.toFixed(1)})<${upAngle - HYSTERESIS_MARGIN} -> YES`);
            newState = "transitioning";
        } else if (currentState.exerciseState === "down" && (angleInfo.rAngle > downAngle + HYSTERESIS_MARGIN || angleInfo.lAngle > downAngle + HYSTERESIS_MARGIN)) {
            console.log(`Leaving DOWN state: R(${angleInfo.rAngle.toFixed(1)})>${downAngle + HYSTERESIS_MARGIN} || L(${angleInfo.lAngle.toFixed(1)})>${downAngle + HYSTERESIS_MARGIN} -> YES`);
            newState = "transitioning";
        } 
        // Transitioning state logic (Requires BOTH knees to meet criteria to settle)
        else if (currentState.exerciseState === "transitioning") {
            if (angleInfo.rAngle >= upAngle && angleInfo.lAngle >= upAngle) {
                console.log(`Transitioning -> UP: R(${angleInfo.rAngle.toFixed(1)})>=${upAngle} && L(${angleInfo.lAngle.toFixed(1)})>=${upAngle} -> YES`);
                newState = "up";
            } else if (angleInfo.rAngle <= downAngle && angleInfo.lAngle <= downAngle) {
                 console.log(`Transitioning -> DOWN: R(${angleInfo.rAngle.toFixed(1)})<=${downAngle} && L(${angleInfo.lAngle.toFixed(1)})<=${downAngle} -> YES`);
                newState = "down";
            }
            // else remain transitioning
        } else {
             // Log if no state change condition was met but angles were valid
             // console.log(`Squat: No state change condition met. Current: ${currentState.exerciseState}, R: ${angleInfo.rAngle.toFixed(1)}, L: ${angleInfo.lAngle.toFixed(1)}`);
        }
      } else {
          // Log visibility issues
          let reason = "Visibility low:";
          if (!rVisValid) reason += " Right side.";
          if (!lVisValid) reason += " Left side.";
          console.log(`Squat: State change blocked due to ${reason}`);
      }
    } 
    else if (currentState.currentExercise === "sit-up") {
      // ** Sit-up Logic (Single Angle - Right Hip) **
      const rShoulder = body[POSE_LANDMARKS.RIGHT_SHOULDER];
      const rHip = body[POSE_LANDMARKS.RIGHT_HIP];
      const rKnee = body[POSE_LANDMARKS.RIGHT_KNEE];
      
      const visibilityValid = !!(rShoulder && rHip && rKnee && 
                                  rShoulder.visibility > VISIBILITY_THRESHOLD && 
                                  rHip.visibility > VISIBILITY_THRESHOLD && 
                                  rKnee.visibility > VISIBILITY_THRESHOLD);
                                  
      if (visibilityValid) {
          angleInfo.primaryAngle = calculateAngle(rShoulder, rHip, rKnee);
          angleInfo.valid = true;
          // console.log(`Sit-up Angle: ${angleInfo.primaryAngle.toFixed(1)}`); // Debug log if needed
      } else {
          // console.log("Sit-up visibility low");
      }

      // State transition logic (using angleInfo.primaryAngle) - Remember sit-up angles are inverted
      if (angleInfo.valid) {
        if (currentState.exerciseState !== "up" && angleInfo.primaryAngle <= upAngle) { // UP = Smaller angle
          newState = "up";
        } else if (currentState.exerciseState !== "down" && angleInfo.primaryAngle >= downAngle) { // DOWN = Larger angle
          newState = "down";
        } else if (currentState.exerciseState === "up" && angleInfo.primaryAngle > upAngle + HYSTERESIS_MARGIN) {
          newState = "transitioning";
        } else if (currentState.exerciseState === "down" && angleInfo.primaryAngle < downAngle - HYSTERESIS_MARGIN) {
           newState = "transitioning";
        } else if (currentState.exerciseState === "transitioning") {
            if (angleInfo.primaryAngle <= upAngle) newState = "up";
            else if (angleInfo.primaryAngle >= downAngle) newState = "down";
        }
      }
    }

    // --- COMMON STATE UPDATE & REP COUNTING ---
    if (newState !== currentState.exerciseState) {
      // Log state changes only if visibility was valid for the checks performed
      if (angleInfo.valid) { 
          console.log(`State Change: ${currentState.exerciseState} -> ${newState} (Exercise: ${currentState.currentExercise})`);
          setExerciseState(newState); 
      
          if (newState === "down") {
              console.log("--- Down state achieved in cycle ---");
              downStateAchievedInCycle.current = true;
          }

          if (newState === "up" && downStateAchievedInCycle.current) {
             console.log(`REP COUNTED! Down achieved: ${downStateAchievedInCycle.current}, New State: ${newState}. Reps: ${currentState.repCount + 1}`);
             setRepCount(prev => prev + 1);
             downStateAchievedInCycle.current = false;
             console.log("--- Resetting down achieved flag ---");
          }

          if (newState === "up" || newState === "down") {
              previousStateRef.current = newState; 
          }
      } else {
          // Log why state didn't change if it was due to visibility (already logged in squat section)
          // console.log(`State change from ${currentState.exerciseState} to ${newState} blocked due to low visibility for ${currentState.currentExercise}`);
      }
    }
  }, []); // Empty dependency array ensures stability

  // --- Event Listener useEffect ---
  useEffect(() => {
    const subscription = poseLandmarksEmitter.addListener(
      "onPoseLandmarksDetected",
      (event) => {
        if (event.landmarks && event.landmarks.length > 0 && event.landmarks[0]) {
            landmarks.value = event.landmarks[0]; 
            processLandmarks(event.landmarks[0]); 
        } 
      }
    );
    console.log("PoseLandmarks listener ADDED"); 
    return () => {
      console.log("PoseLandmarks listener REMOVING"); 
      subscription.remove();
    };
  }, [processLandmarks]); // Dependency is stable

  // --- Permission Request useEffect ---
  useEffect(() => {
    requestPermission().catch((error) => console.log(error));
  }, [requestPermission]);

  // --- Frame Processor ---
  const frameProcessor = useSkiaFrameProcessor(
    (frame) => {
      "worklet";
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
        // Drawing logic remains the same
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
    },
    [showLines, showCircles] 
  );
  
  // --- Calibration Function ---
  // Calibration currently only considers the RIGHT side landmarks for setting thresholds.
  // We apply these thresholds symmetrically to the left side for squats.
  const startCalibration = () => {
    if (currentExercise === "none" || isCalibrating) return; 
    
    console.log(`Starting calibration for ${currentExercise}`);
    setIsCalibrating(true);
    setCalibrationStep("up");
    setCalibrationMessage(`Get ready for UP pose... 3`); 
    
    let countdown = 3;
    const intervalId = setInterval(() => {
        countdown--;
        setCalibrationMessage(`Get ready for UP pose... ${countdown}`);
        if (countdown === 0) {
            clearInterval(intervalId);
            setCalibrationMessage(`Capturing UP pose... HOLD!`);
            
            const currentLandmarks = landmarks.value; 
            if (currentLandmarks && Object.keys(currentLandmarks).length > 0) {
                let angle = 0;
                let visibilityValid = false;
                
                // Calculate angle based on RIGHT side landmarks only
                if (currentExercise === "push-up") {
                    const s = currentLandmarks[POSE_LANDMARKS.RIGHT_SHOULDER], e = currentLandmarks[POSE_LANDMARKS.RIGHT_ELBOW], w = currentLandmarks[POSE_LANDMARKS.RIGHT_WRIST];
                    visibilityValid = !!(s && e && w && s.visibility > VISIBILITY_THRESHOLD && e.visibility > VISIBILITY_THRESHOLD && w.visibility > VISIBILITY_THRESHOLD);
                    if (visibilityValid) angle = calculateAngle(s, e, w);
                } else if (currentExercise === "squat") {
                    const h = currentLandmarks[POSE_LANDMARKS.RIGHT_HIP], k = currentLandmarks[POSE_LANDMARKS.RIGHT_KNEE], a = currentLandmarks[POSE_LANDMARKS.RIGHT_ANKLE];
                    visibilityValid = !!(h && k && a && h.visibility > VISIBILITY_THRESHOLD && k.visibility > VISIBILITY_THRESHOLD && a.visibility > VISIBILITY_THRESHOLD);
                    if (visibilityValid) angle = calculateAngle(h, k, a);
                } else if (currentExercise === "sit-up") {
                    const s = currentLandmarks[POSE_LANDMARKS.RIGHT_SHOULDER], h = currentLandmarks[POSE_LANDMARKS.RIGHT_HIP], k = currentLandmarks[POSE_LANDMARKS.RIGHT_KNEE];
                    visibilityValid = !!(s && h && k && s.visibility > VISIBILITY_THRESHOLD && h.visibility > VISIBILITY_THRESHOLD && k.visibility > VISIBILITY_THRESHOLD);
                    if (visibilityValid) angle = calculateAngle(s, h, k);
                }

                if (visibilityValid && angle > 0) {
                    console.log(`Calibration: Setting UP angle for ${currentExercise} to ${angle.toFixed(1)} (based on right side)`);
                    setThresholds(prev => ({ ...prev, [currentExercise]: { ...prev[currentExercise as keyof typeof prev], upAngle: angle } }));
                    
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

                                const downLandmarks = landmarks.value; 
                                if (downLandmarks && Object.keys(downLandmarks).length > 0) {
                                    let downAngle = 0;
                                    let downVisibilityValid = false;
                                    
                                    // Calculate angle based on RIGHT side landmarks only
                                    if (currentExercise === "push-up") {
                                        const s = downLandmarks[POSE_LANDMARKS.RIGHT_SHOULDER], e = downLandmarks[POSE_LANDMARKS.RIGHT_ELBOW], w = downLandmarks[POSE_LANDMARKS.RIGHT_WRIST];
                                        downVisibilityValid = !!(s && e && w && s.visibility > VISIBILITY_THRESHOLD && e.visibility > VISIBILITY_THRESHOLD && w.visibility > VISIBILITY_THRESHOLD);
                                        if (downVisibilityValid) downAngle = calculateAngle(s, e, w);
                                    } else if (currentExercise === "squat") {
                                        const h = downLandmarks[POSE_LANDMARKS.RIGHT_HIP], k = downLandmarks[POSE_LANDMARKS.RIGHT_KNEE], a = downLandmarks[POSE_LANDMARKS.RIGHT_ANKLE];
                                        downVisibilityValid = !!(h && k && a && h.visibility > VISIBILITY_THRESHOLD && k.visibility > VISIBILITY_THRESHOLD && a.visibility > VISIBILITY_THRESHOLD);
                                        if (downVisibilityValid) downAngle = calculateAngle(h, k, a);
                                    } else if (currentExercise === "sit-up") {
                                        const s = downLandmarks[POSE_LANDMARKS.RIGHT_SHOULDER], h = downLandmarks[POSE_LANDMARKS.RIGHT_HIP], k = downLandmarks[POSE_LANDMARKS.RIGHT_KNEE];
                                        downVisibilityValid = !!(s && h && k && s.visibility > VISIBILITY_THRESHOLD && h.visibility > VISIBILITY_THRESHOLD && k.visibility > VISIBILITY_THRESHOLD);
                                        if (downVisibilityValid) downAngle = calculateAngle(s, h, k);
                                    }

                                    if (downVisibilityValid && downAngle > 0) {
                                        console.log(`Calibration: Setting DOWN angle for ${currentExercise} to ${downAngle.toFixed(1)} (based on right side)`);
                                        
                                        // --- Angle Sanity Check ---
                                        // Ensure down angle isn't higher than up angle (or vice-versa for sit-ups)
                                        let finalUpAngle = thresholds[currentExercise as keyof typeof thresholds].upAngle; // Get the already set upAngle
                                        let finalDownAngle = downAngle;
                                        
                                        if (currentExercise === "sit-up") {
                                           // For sit-ups, UP angle should be SMALLER than DOWN angle
                                           if (finalUpAngle >= finalDownAngle) {
                                                Alert.alert("Calibration Issue", `Down pose angle (${finalDownAngle.toFixed(0)}°) must be greater than Up pose angle (${finalUpAngle.toFixed(0)}°) for sit-ups. Please try calibration again.`);
                                                setIsCalibrating(false);
                                                setCalibrationMessage("");
                                                return; // Exit calibration early
                                           }
                                        } else {
                                            // For push-ups/squats, UP angle should be LARGER than DOWN angle
                                            if (finalUpAngle <= finalDownAngle) {
                                                Alert.alert("Calibration Issue", `Up pose angle (${finalUpAngle.toFixed(0)}°) must be greater than Down pose angle (${finalDownAngle.toFixed(0)}°). Please try calibration again.`);
                                                setIsCalibrating(false);
                                                setCalibrationMessage("");
                                                return; // Exit calibration early
                                            }
                                        }
                                        // --- End Sanity Check ---


                                        setThresholds(prev => ({ ...prev, [currentExercise]: { ...prev[currentExercise as keyof typeof prev], downAngle: finalDownAngle } }));
                                        
                                        setCalibrationMessage(`Calibration Complete!`);
                                        setTimeout(() => { 
                                             setIsCalibrating(false);
                                             setCalibrationMessage("");
                                             setCalibrationStep("up"); 
                                             // Reset exercise state after calibration?
                                             resetExercise(); // Start fresh with new thresholds
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
                    }, 500); 

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
    }, 1000); 
  };
  
  // --- Reset Function ---
  const resetExercise = () => {
     console.log(`Resetting exercise. Current: ${currentExercise}, Reps before reset: ${stateRef.current.repCount}`); // Log stateRef value
    setRepCount(0);
    setExerciseState("up"); // Default to up state
    previousStateRef.current = "up"; 
    downStateAchievedInCycle.current = false;
    setIsCalibrating(false); 
    setCalibrationMessage("");
    // Maybe reset thresholds to default here if desired? For now, keep calibrated ones.
  };

  // --- Permission/Device Checks ---
   if (!hasPermission) {
    return <Text>No permission</Text>;
  }
  if (device == null) {
    return <Text>No device</Text>;
  }
  const pixelFormat = Platform.OS === "ios" ? "rgb" : "yuv";
  // --- End Checks ---

  // --- Render ---
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
        fps={30} // Keep FPS reasonable
      />
      
      {/* Exercise controls overlay */}
      <View style={styles.exerciseControls}>
        <Text style={styles.heading}>FitRep</Text> {/* Updated Name */}
        
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
              disabled={isCalibrating} 
            >
              <Text style={styles.buttonText}>Push-up</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ styles.exerciseButton, currentExercise === "squat" && styles.activeButton ]}
              onPress={() => { setCurrentExercise("squat"); resetExercise(); }}
               disabled={isCalibrating} 
            >
              <Text style={styles.buttonText}>Squat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ styles.exerciseButton, currentExercise === "sit-up" && styles.activeButton ]}
              onPress={() => { setCurrentExercise("sit-up"); resetExercise(); }}
               disabled={isCalibrating} 
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
               {/* Display thresholds for debugging */}
              {/* <Text style={styles.debugText}>
                Thresh: Up {thresholds[currentExercise]?.upAngle?.toFixed(0) ?? 'N/A'}, 
                Down {thresholds[currentExercise]?.downAngle?.toFixed(0) ?? 'N/A'}
              </Text> */}
            </View>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, isCalibrating && styles.disabledButton]} 
                onPress={startCalibration}
                disabled={isCalibrating}
              >
                <Text style={styles.buttonText}>
                  Calibrate 
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, isCalibrating && styles.disabledButton]} 
                onPress={resetExercise}
                disabled={isCalibrating} 
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

// --- Styles (Added debugText style) ---
const styles = StyleSheet.create({
  drawControl: {
    position: "absolute",
    top: 0, 
    left: 0,
    right: 0,
    zIndex: 20, 
    backgroundColor: "rgba(255, 255, 255, 0.7)", 
    flexDirection: "row",
    justifyContent: "space-around", 
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  exerciseControls: {
    position: "absolute",
    bottom: 30, 
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
    fontStyle: 'italic', 
  },
  // Optional: Style for debug text
  // debugText: {
  //   fontSize: 10,
  //   color: '#CCC',
  //   marginTop: 3,
  // },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginTop: 10, 
  },
  actionButton: {
    backgroundColor: "#28a745", 
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    minWidth: 100, 
    alignItems: 'center',
  },
  disabledButton: {
      backgroundColor: "#6c757d", 
      opacity: 0.7,
  },
  calibrationOverlay: {
      position: 'absolute', 
      top: 0, 
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)', 
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 50, 
      borderRadius: 15, 
  },
  calibrationText: {
      fontSize: 28,
      fontWeight: 'bold',
      color: '#FFF',
      textAlign: 'center',
      padding: 20,
  }
});