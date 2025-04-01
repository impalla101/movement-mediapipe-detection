import { Skia } from "@shopify/react-native-skia";
import { Stack } from "expo-router";
import React, { useEffect, useState, useRef } from "react";
import {
  Button,
  NativeEventEmitter,
  NativeModules,
  Platform,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
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
linePaint.setStrokeWidth(30);

const circlePaint = Skia.Paint();
circlePaint.setColor(Skia.Color("green"));
circlePaint.setStrokeWidth(10);

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
  
  // Calculate angle in radians
  const angleRad = Math.acos(dot / (magAB * magCB));
  
  // Convert to degrees
  return (angleRad * 180) / Math.PI;
}

export default function Exercise() {
  const landmarks = useSharedValue<KeypointsMap>({});
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
  
  // Angle thresholds for exercises
  // These values can be adjusted based on testing
  const [thresholds, setThresholds] = useState({
    "push-up": {
      upAngle: 160, // Arm almost straight
      downAngle: 100, // Arm bent
    },
    "squat": {
      upAngle: 160, // Legs almost straight
      downAngle: 110, // Legs bent
    },
    "sit-up": {
      upAngle: 80,  // Torso raised
      downAngle: 160, // Torso flat
    }
  });
  
  // Calibration
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationStep, setCalibrationStep] = useState<"up" | "down">("up");
  
  useEffect(() => {
    // Set up the event listener to listen for pose landmarks detection results
    const subscription = poseLandmarksEmitter.addListener(
      "onPoseLandmarksDetected",
      (event) => {
        // Update the landmarks shared value to paint them on the screen
        /*
          The event contains values for landmarks and pose.
          These values are defined in the PoseLandmarkerResultProcessor class
          found in the PoseLandmarks.swift file.
        */
        landmarks.value = event.landmarks[0];
        
        // Process landmarks for exercise detection when not in frame processor
        if (event.landmarks[0] && Object.keys(event.landmarks[0]).length > 0) {
          processLandmarks(event.landmarks[0]);
        }
      }
    );
    
    // Clean up the event listener when the component is unmounted
    return () => {
      subscription.remove();
    };
  }, [currentExercise, exerciseState, thresholds, isCalibrating, calibrationStep]);

  useEffect(() => {
    requestPermission().catch((error) => console.log(error));
  }, [requestPermission]);

  // Process landmarks for exercise counting
  const processLandmarks = (body: KeypointsMap) => {
    if (currentExercise === "none" || !body || Object.keys(body).length === 0) return;
    
    let angle = 0;
    
    // Calculate relevant angle based on exercise type
    if (currentExercise === "push-up") {
      // For push-up, we measure the angle at the elbow (shoulder-elbow-wrist)
      // Using right arm for demonstration
      const shoulder = body[POSE_LANDMARKS.RIGHT_SHOULDER];
      const elbow = body[POSE_LANDMARKS.RIGHT_ELBOW];
      const wrist = body[POSE_LANDMARKS.RIGHT_WRIST];
      
      if (shoulder && elbow && wrist && 
          shoulder.visibility > 0.5 && 
          elbow.visibility > 0.5 && 
          wrist.visibility > 0.5) {
        angle = calculateAngle(shoulder, elbow, wrist);
      }
    } 
    else if (currentExercise === "squat") {
      // For squat, we measure the angle at the knee (hip-knee-ankle)
      // Using right leg for demonstration
      const hip = body[POSE_LANDMARKS.RIGHT_HIP];
      const knee = body[POSE_LANDMARKS.RIGHT_KNEE];
      const ankle = body[POSE_LANDMARKS.RIGHT_ANKLE];
      
      if (hip && knee && ankle && 
          hip.visibility > 0.5 && 
          knee.visibility > 0.5 && 
          ankle.visibility > 0.5) {
        angle = calculateAngle(hip, knee, ankle);
      }
    } 
    else if (currentExercise === "sit-up") {
      // For sit-up, we measure the angle between shoulders, hips, and knees
      // Using right side for demonstration
      const shoulder = body[POSE_LANDMARKS.RIGHT_SHOULDER];
      const hip = body[POSE_LANDMARKS.RIGHT_HIP];
      const knee = body[POSE_LANDMARKS.RIGHT_KNEE];
      
      if (shoulder && hip && knee && 
          shoulder.visibility > 0.5 && 
          hip.visibility > 0.5 && 
          knee.visibility > 0.5) {
        angle = calculateAngle(shoulder, hip, knee);
      }
    }
    
    // Handle calibration if active
    if (isCalibrating && angle > 0) {
      if (calibrationStep === "up") {
        // Store the "up" position angle
        setThresholds(prev => ({
          ...prev,
          [currentExercise]: {
            ...prev[currentExercise as keyof typeof prev],
            upAngle: angle
          }
        }));
        setCalibrationStep("down");
      } else if (calibrationStep === "down") {
        // Store the "down" position angle
        setThresholds(prev => ({
          ...prev,
          [currentExercise]: {
            ...prev[currentExercise as keyof typeof prev],
            downAngle: angle
          }
        }));
        setIsCalibrating(false);
        setCalibrationStep("up");
      }
      return;
    }
    
    // Determine exercise state based on the angle
    if (angle > 0) {
      const { upAngle, downAngle } = thresholds[currentExercise as keyof typeof thresholds];
      
      let newState: ExerciseState = exerciseState;
      
      // For push-ups and squats, up means a larger angle
      if (currentExercise === "push-up" || currentExercise === "squat") {
        if (angle >= upAngle) {
          newState = "up";
        } else if (angle <= downAngle) {
          newState = "down";
        } else {
          newState = "transitioning";
        }
      } 
      // For sit-ups, up means a smaller angle (torso more vertical)
      else if (currentExercise === "sit-up") {
        if (angle <= upAngle) {
          newState = "up";
        } else if (angle >= downAngle) {
          newState = "down";
        } else {
          newState = "transitioning";
        }
      }
      
      // Count a rep when transitioning from down to up
      if (previousStateRef.current === "down" && newState === "up") {
        setRepCount(prev => prev + 1);
      }
      
      previousStateRef.current = newState;
      setExerciseState(newState);
    }
  };

  const frameProcessor = useSkiaFrameProcessor(
    (frame) => {
      "worklet";
      // Process the frame using the 'poseLandmarks' function
      frame.render();
      poseLandmarks(frame);
      
      if (
        landmarks?.value !== undefined &&
        Object.keys(landmarks?.value).length > 0
      ) {
        let body = landmarks?.value;
        let frameWidth = frame.width;
        let frameHeight = frame.height;
        
        // Draw line on landmarks
        if (showLines) {
          for (let [from, to] of LINES) {
            frame.drawLine(
              body[from].x * Number(frameWidth),
              body[from].y * Number(frameHeight),
              body[to].x * Number(frameWidth),
              body[to].y * Number(frameHeight),
              linePaint
            );
          }
        } 
        
        // Draw circles on landmarks
        if (showCircles) {
          for (let mark of Object.values(body)) {
            frame.drawCircle(
              mark.x * Number(frameWidth),
              mark.y * Number(frameHeight),
              6,
              circlePaint
            );
          }
        }
      }
    },
    [showLines, showCircles]
  );
  
  const startCalibration = () => {
    if (currentExercise === "none") return;
    
    setIsCalibrating(true);
    setCalibrationStep("up");
    alert(`Please assume the UP position for your ${currentExercise} and hold.`);
  };
  
  const resetExercise = () => {
    setRepCount(0);
    setExerciseState("up");
    previousStateRef.current = "up";
  };

  if (!hasPermission) {
    return <Text>No permission</Text>;
  }
  
  if (device == null) {
    return <Text>No device</Text>;
  }
  
  const pixelFormat = Platform.OS === "ios" ? "rgb" : "yuv";

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
        fps={30}
      />
      
      {/* Exercise controls overlay */}
      <View style={styles.exerciseControls}>
        <Text style={styles.heading}>FitQuest</Text>
        
        <View style={styles.exerciseSelector}>
          <Text style={styles.label}>Select Exercise:</Text>
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[
                styles.exerciseButton,
                currentExercise === "push-up" && styles.activeButton
              ]}
              onPress={() => {
                setCurrentExercise("push-up");
                resetExercise();
              }}
            >
              <Text style={styles.buttonText}>Push-up</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.exerciseButton,
                currentExercise === "squat" && styles.activeButton
              ]}
              onPress={() => {
                setCurrentExercise("squat");
                resetExercise();
              }}
            >
              <Text style={styles.buttonText}>Squat</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.exerciseButton,
                currentExercise === "sit-up" && styles.activeButton
              ]}
              onPress={() => {
                setCurrentExercise("sit-up");
                resetExercise();
              }}
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
                style={styles.actionButton}
                onPress={startCalibration}
                disabled={isCalibrating}
              >
                <Text style={styles.buttonText}>
                  {isCalibrating 
                    ? `Hold ${calibrationStep.toUpperCase()} Position` 
                    : "Calibrate"}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={resetExercise}
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
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "#FFF",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
  },
  exerciseControls: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.7)",
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
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-evenly",
  },
  actionButton: {
    backgroundColor: "#28a745",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
});