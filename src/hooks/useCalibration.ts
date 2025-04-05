/**
 * This hook manages the state and logic for the exercise calibration process.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import type { ISharedValue } from 'react-native-worklets-core';
import type { KeypointsMap, ExerciseName, ExerciseThresholds, AllThresholds } from '../types/poseTypes';
import { EXERCISE_RECIPES, POSE_LANDMARKS, VISIBILITY_THRESHOLD, CALIBRATION_DELAY_MS } from '../constants/exerciseConfig';
import { calculateAngle } from '../utils/angleCalculator';

interface UseCalibrationProps {
    landmarks: ISharedValue<KeypointsMap>; // To read pose data during capture
    currentExercise: ExerciseName;       // Which exercise is being calibrated
    onCalibrationComplete: (exercise: ExerciseName, thresholds: ExerciseThresholds) => void; // Callback with results
    initialThresholds: AllThresholds;    // Pass existing thresholds to check against
}

interface CalibrationResult {
    isCalibrating: boolean;
    calibrationMessage: string;
    startCalibration: () => void; // Function to begin the process
    cancelCalibration: () => void; // Function to stop mid-process
}

export function useCalibration({
    landmarks,
    currentExercise,
    onCalibrationComplete,
    initialThresholds,
}: UseCalibrationProps): CalibrationResult {

    const [isCalibrating, setIsCalibrating] = useState(false);
    const [calibrationStep, setCalibrationStep] = useState<'up' | 'down' | 'idle'>('idle');
    const [calibrationMessage, setCalibrationMessage] = useState("");
    const [capturedUpAngle, setCapturedUpAngle] = useState<number | null>(null);

    // Ref to store interval IDs to clear them if cancelled
    const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
    const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

    // Function to stop any active timers/intervals
    const clearTimers = useCallback(() => {
        if (intervalIdRef.current) clearInterval(intervalIdRef.current);
        if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
        intervalIdRef.current = null;
        timeoutIdRef.current = null;
    }, []);

    // Function to capture the angle for the current exercise
    const captureAngle = useCallback((): { angle: number; visible: boolean } => {
        const currentLandmarks = landmarks.value;
        const recipe = currentExercise !== 'none' ? EXERCISE_RECIPES[currentExercise] : null;

        if (!recipe || !currentLandmarks || Object.keys(currentLandmarks).length === 0) {
            return { angle: 0, visible: false };
        }

        // For calibration, we usually just use the primary angle definition
        const [p1Name, p2Name, p3Name] = recipe.primaryAngleJoints;
        const p1 = currentLandmarks[POSE_LANDMARKS[p1Name as keyof typeof POSE_LANDMARKS]];
        const p2 = currentLandmarks[POSE_LANDMARKS[p2Name as keyof typeof POSE_LANDMARKS]];
        const p3 = currentLandmarks[POSE_LANDMARKS[p3Name as keyof typeof POSE_LANDMARKS]];

        // Check visibility of the specific joints needed for *this* angle
        const isVisible = !!(p1 && p2 && p3 &&
                             p1.visibility > VISIBILITY_THRESHOLD &&
                             p2.visibility > VISIBILITY_THRESHOLD &&
                             p3.visibility > VISIBILITY_THRESHOLD);

        if (!isVisible) {
            return { angle: 0, visible: false };
        }

        const angle = calculateAngle(p1, p2, p3);
        return { angle, visible: true };

    }, [landmarks, currentExercise]);

    // Function to start the 'down' pose capture process
    const startDownPoseCapture = useCallback((upAngle: number) => {
        setCalibrationStep("down");
        setCalibrationMessage(`Get ready for DOWN pose... 3`);
        let downCountdown = 3;

        intervalIdRef.current = setInterval(() => {
            downCountdown--;
            setCalibrationMessage(`Get ready for DOWN pose... ${downCountdown}`);
            if (downCountdown === 0) {
                clearTimers(); // Stop countdown interval
                setCalibrationMessage(`Capturing DOWN pose... HOLD!`);

                timeoutIdRef.current = setTimeout(() => { // Give a moment to capture
                    const { angle: downAngle, visible } = captureAngle();

                    if (visible && downAngle > 0) {
                        // --- Angle Sanity Check ---
                        const finalUpAngle = upAngle;
                        const finalDownAngle = downAngle;
                        const recipe = currentExercise !== 'none' ? EXERCISE_RECIPES[currentExercise] : null;

                        let sanityFail = false;
                        if (recipe?.upIsLarger && finalUpAngle <= finalDownAngle) {
                            Alert.alert("Calibration Issue", `Up pose angle (${finalUpAngle.toFixed(0)}°) must be greater than Down pose angle (${finalDownAngle.toFixed(0)}°). Please try calibration again.`);
                            sanityFail = true;
                        } else if (!recipe?.upIsLarger && finalUpAngle >= finalDownAngle) {
                            Alert.alert("Calibration Issue", `Down pose angle (${finalDownAngle.toFixed(0)}°) must be greater than Up pose angle (${finalUpAngle.toFixed(0)}°) for sit-ups. Please try calibration again.`);
                            sanityFail = true;
                        }

                        if (sanityFail) {
                            setIsCalibrating(false);
                            setCalibrationMessage("");
                            setCalibrationStep('idle');
                            setCapturedUpAngle(null);
                            clearTimers();
                            return;
                        }
                        // --- End Sanity Check ---

                        console.log(`Calibration Complete: ${currentExercise} UP=${finalUpAngle.toFixed(1)}, DOWN=${finalDownAngle.toFixed(1)}`);
                        setCalibrationMessage(`Calibration Complete!`);
                        onCalibrationComplete(currentExercise, { upAngle: finalUpAngle, downAngle: finalDownAngle });

                        timeoutIdRef.current = setTimeout(() => { // Clear message after a bit
                            setIsCalibrating(false);
                            setCalibrationMessage("");
                            setCalibrationStep('idle');
                            setCapturedUpAngle(null);
                        }, 2000);

                    } else {
                        Alert.alert("Calibration Failed", "Could not detect pose clearly for DOWN position. Please try again.");
                        setIsCalibrating(false);
                        setCalibrationMessage("");
                        setCalibrationStep('idle');
                        setCapturedUpAngle(null);
                        clearTimers();
                    }
                }, 500); // Short delay to capture pose
            }
        }, 1000); // 1 second interval for countdown

    }, [captureAngle, clearTimers, onCalibrationComplete, currentExercise]);


    // Main function to start the calibration flow
    const startCalibration = useCallback(() => {
        if (currentExercise === "none" || isCalibrating) return;

        console.log(`Starting calibration for ${currentExercise}`);
        setIsCalibrating(true);
        setCalibrationStep("up");
        setCalibrationMessage(`Get ready for UP pose... 3`);
        setCapturedUpAngle(null); // Reset captured angle
        clearTimers(); // Clear any previous timers

        let countdown = 3;
        intervalIdRef.current = setInterval(() => {
            countdown--;
            setCalibrationMessage(`Get ready for UP pose... ${countdown}`);
            if (countdown === 0) {
                clearTimers(); // Stop countdown interval
                setCalibrationMessage(`Capturing UP pose... HOLD!`);

                timeoutIdRef.current = setTimeout(() => { // Give a moment to capture
                    const { angle: upAngle, visible } = captureAngle();

                    if (visible && upAngle > 0) {
                         console.log(`Calibration: Captured UP angle ${upAngle.toFixed(1)}`);
                         setCapturedUpAngle(upAngle); // Store up angle
                         // Proceed to DOWN step after a short pause
                         timeoutIdRef.current = setTimeout(() => {
                              startDownPoseCapture(upAngle);
                         }, 500);

                    } else {
                        Alert.alert("Calibration Failed", "Could not detect pose clearly for UP position. Please try again.");
                        setIsCalibrating(false);
                        setCalibrationMessage("");
                        setCalibrationStep('idle');
                        clearTimers();
                    }
                 }, 500); // Short delay to capture pose
            }
        }, 1000); // 1 second interval for countdown

    }, [currentExercise, isCalibrating, clearTimers, captureAngle, startDownPoseCapture]);

    // Function to manually cancel calibration
    const cancelCalibration = useCallback(() => {
        if (!isCalibrating) return;
        console.log("Cancelling calibration...");
        clearTimers();
        setIsCalibrating(false);
        setCalibrationMessage("Calibration Cancelled");
        setCalibrationStep('idle');
        setCapturedUpAngle(null);
        // Optionally clear the message after a delay
        setTimeout(() => setCalibrationMessage(""), 1500);
    }, [isCalibrating, clearTimers]);

    // Effect to clean up timers when the component unmounts or calibration finishes/cancels
    useEffect(() => {
        return () => {
            clearTimers();
        };
    }, [clearTimers]);


    return {
        isCalibrating,
        calibrationMessage,
        startCalibration,
        cancelCalibration,
    };
}