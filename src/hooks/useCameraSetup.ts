/**
 * This hook encapsulates the logic for setting up the camera,
 * handling permissions, and managing the pose landmark detection stream.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { CameraPosition, Frame, useCameraDevice, useCameraPermission, useSkiaFrameProcessor, VisionCameraProxy } from 'react-native-vision-camera';
import type { DependencyList } from 'react';
import type { KeypointsMap, KeypointData } from '../types/poseTypes';
import { useSharedValue } from 'react-native-worklets-core';

// Native module imports
const { PoseLandmarks } = NativeModules; // Assuming this is your native module bridge
const poseLandmarksEmitter = PoseLandmarks ? new NativeEventEmitter(PoseLandmarks) : null;

// Initialize the frame processor plugin 'poseLandmarks'
const poseLandMarkPlugin = VisionCameraProxy.initFrameProcessorPlugin('poseLandmarks', {});

// --- Frame Processor Worklet ---
// This function runs on a separate thread for performance.
// It receives camera frames and calls the native pose detection.
function poseLandmarksWorklet(frame: Frame) {
  'worklet';
  if (poseLandMarkPlugin == null) {
    // Cannot throw errors that cross threads easily, console log might not appear either
    // console.error("Frame Processor Plugin not loaded!");
    return; // Exit gracefully
  }
  // Call the native module's frame processing method
  try {
      // The plugin call here likely triggers the native side to process and eventually emit an event
      const result = poseLandMarkPlugin.call(frame);
      // We don't directly use the 'result' here if events are used for landmarks
      // console.log('Worklet result:', result); // Careful logging here
  } catch (e) {
      // console.error('Error calling poseLandmarkPlugin:', e);
  }
}
// --- End Worklet ---


export function useCameraSetup() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [cameraPosition, setCameraPosition] = useState<CameraPosition>("front");
  const device = useCameraDevice(cameraPosition);

  // Shared value to store the latest detected landmarks for drawing purposes
  const landmarks = useSharedValue<KeypointsMap>({});

  // Request permission on mount
  useEffect(() => {
    if (!hasPermission) {
      requestPermission().catch(console.error);
    }
  }, [hasPermission, requestPermission]);

  // Setup listener for landmarks detected by the native module
  useEffect(() => {
    if (!poseLandmarksEmitter) {
        console.warn("PoseLandmarks EventEmitter not available.");
        return;
    }
    console.log("Setting up PoseLandmarks listener...");
    const subscription = poseLandmarksEmitter.addListener(
      "onPoseLandmarksDetected",
      (event) => {
        // Update the shared value with the latest landmarks
        // Assuming event.landmarks[0] contains the KeypointsMap
        if (event.landmarks && event.landmarks.length > 0 && event.landmarks[0]) {
            // Convert array of objects to the map format if necessary
            // If event.landmarks[0] is already the map, just assign it.
            // If it's an array like [{keypoint: 0, x: ...}, ...], convert it:
            if (Array.isArray(event.landmarks[0])) {
                 const landmarksMap: KeypointsMap = {};
                 event.landmarks[0].forEach((kp: any) => {
                     if (kp && typeof kp.keypoint === 'number') {
                         landmarksMap[kp.keypoint.toString()] = kp as KeypointData;
                     }
                 });
                 landmarks.value = landmarksMap;
            } else if (typeof event.landmarks[0] === 'object') {
                 // Assume it's already KeypointsMap
                 landmarks.value = event.landmarks[0];
            }
        } else {
            // No landmarks detected or empty data, clear the shared value
            landmarks.value = {};
        }
      }
    );

    // Listener for errors from the native module
    const errorSubscription = poseLandmarksEmitter.addListener(
        "onPoseLandmarksError",
        (error) => {
            console.error("Native PoseLandmarks Error:", error);
            // TODO: Handle error appropriately (e.g., show message to user)
        }
    );

     console.log("PoseLandmarks listener ADDED");

    // Cleanup listener on unmount
    return () => {
      console.log("PoseLandmarks listener REMOVING");
      subscription?.remove();
      errorSubscription?.remove();
    };
  }, []); // Run only once on mount

  // Define the frame processor using the worklet
  // It depends on `poseLandMarkPlugin` being loaded.
  const frameProcessor = useSkiaFrameProcessor((frame) => {
          'worklet';
          // Optionally add frame skipping logic here if needed
          poseLandmarksWorklet(frame);
      }, []
  );

  const pixelFormat = Platform.OS === "ios" ? "rgb" : "yuv";

  const toggleCamera = useCallback(() => {
    setCameraPosition(prev => prev === 'front' ? 'back' : 'front');
  }, []);

  return {
    hasPermission,
    device,
    cameraPosition,
    toggleCamera,
    landmarks, // The shared value containing latest landmarks
    frameProcessor, // The processor to pass to the Camera component
    pixelFormat,
  };
}
