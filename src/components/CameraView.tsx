/**
 * This component handles rendering the actual camera feed and drawing
 * the pose landmarks and connections on top of it using Skia.
 */
import React from 'react';
import { StyleSheet, View, Button } from 'react-native';
import { Camera, CameraProps } from 'react-native-vision-camera';
import { Skia, Canvas, Path, SkPath, Circle, Line, PaintStyle } from '@shopify/react-native-skia';
import type { ISharedValue } from 'react-native-worklets-core';
import type { KeypointsMap } from '../types/poseTypes';
import { POSE_CONNECTIONS } from '../constants/exerciseConfig';

// Skia paint objects for drawing
const linePaint = Skia.Paint();
linePaint.setColor(Skia.Color("red"));
linePaint.setStrokeWidth(3); // Thinner lines
linePaint.setStyle(PaintStyle.Stroke);

const circlePaint = Skia.Paint();
circlePaint.setColor(Skia.Color("lime")); // Brighter green
circlePaint.setStrokeWidth(2);
circlePaint.setStyle(PaintStyle.Stroke);

const circleFillPaint = Skia.Paint();
circleFillPaint.setColor(Skia.Color("white"));
circleFillPaint.setStyle(PaintStyle.Fill);


interface CameraViewProps {
    cameraProps: Omit<CameraProps, 'style' | 'frameProcessor'> & { // Pass relevant Camera props down
        device: CameraProps['device'];
        isActive: boolean;
        pixelFormat: CameraProps['pixelFormat'];
        // Add others as needed: photo, video, audio, fps, etc.
    };
    frameProcessor: CameraProps['frameProcessor'];
    landmarks: ISharedValue<KeypointsMap>; // Shared value holding the pose data
    showLines: boolean;
    showCircles: boolean;
}

export default function CameraView({
    cameraProps,
    frameProcessor,
    landmarks,
    showLines,
    showCircles,
}: CameraViewProps) {

    // This component focuses solely on displaying the camera and drawing.
    // The frame processor logic itself (calling the native module) is handled
    // by the useCameraSetup hook and passed in via props.

    return (
        <View style={StyleSheet.absoluteFill}>
            <Camera
                style={StyleSheet.absoluteFill}
                {...cameraProps} // Spread the rest of the camera props
                frameProcessor={frameProcessor} // Attach the frame processor from the hook
            />
            {/* Skia Canvas for drawing overlays */}
            <View style={StyleSheet.absoluteFill}>
                <Canvas style={StyleSheet.absoluteFill}>
                    {/* Draw Lines (Connections) */}
                    {showLines && Object.values(landmarks.value).length > 0 && POSE_CONNECTIONS.map(([fromIndex, toIndex], i) => {
                         const fromKp = landmarks.value[fromIndex];
                         const toKp = landmarks.value[toIndex];
                         // TODO: Get frame dimensions to scale normalized coords
                         // Need to pass frame width/height or use absolute coords if available
                         const frameWidth = 360; // Placeholder - GET ACTUAL
                         const frameHeight = 640; // Placeholder - GET ACTUAL
                         if (fromKp && toKp && fromKp.visibility > 0.3 && toKp.visibility > 0.3) { // Only draw if somewhat visible
                            return (
                                <Line
                                    key={`line-${i}`}
                                    p1={Skia.Point(fromKp.x * frameWidth, fromKp.y * frameHeight)}
                                    p2={Skia.Point(toKp.x * frameWidth, toKp.y * frameHeight)}
                                    paint={linePaint}
                                />
                            );
                         }
                         return null;
                    })}
                    {/* Draw Circles (Landmarks) */}
                    {showCircles && Object.values(landmarks.value).map((kp, i) => {
                         // TODO: Get frame dimensions to scale normalized coords
                         const frameWidth = 360; // Placeholder - GET ACTUAL
                         const frameHeight = 640; // Placeholder - GET ACTUAL
                         if (kp && kp.visibility > 0.3) { // Only draw if somewhat visible
                            const cx = kp.x * frameWidth;
                            const cy = kp.y * frameHeight;
                            return (
                                <React.Fragment key={`circle-${i}`}>
                                    <Circle cx={cx} cy={cy} r={4} paint={circleFillPaint} />
                                    <Circle cx={cx} cy={cy} r={4} paint={circlePaint} />
                                </React.Fragment>
                            );
                         }
                         return null;
                    })}
                </Canvas>
            </View>
        </View>
    );
}

// Add styles if needed, though most are inline or absolute fills