/**
 * Renders the main action buttons like Calibrate, Reset, Pause, etc.
 * The specific buttons shown can depend on the workout mode.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants/theme';
import type { WorkoutMode } from '../types/poseTypes'; // If needed to vary buttons

interface ActionButtonsProps {
    mode: WorkoutMode; // To potentially change buttons based on mode
    isCalibrating: boolean;
    onCalibratePress: () => void;
    onResetPress: () => void; // Might reset exercise or workout depending on mode
    // Add other potential actions: onPausePress, onSkipPress, onEndPress
}

export default function ActionButtons({
    mode,
    isCalibrating,
    onCalibratePress,
    onResetPress,
    // ...other press handlers
}: ActionButtonsProps) {

    // Example: Conditionally render buttons based on mode
    // This is simplified, real logic might be more complex

    return (
        <View style={styles.actionButtons}>
            {/* Calibrate Button (Always show unless calibrating?) */}
            <TouchableOpacity
                style={[styles.actionButton, styles.calibrateButton, isCalibrating && styles.disabledButton]}
                onPress={onCalibratePress}
                disabled={isCalibrating}
            >
                <Text style={styles.buttonText}>Calibrate</Text>
            </TouchableOpacity>

            {/* Reset Button (Text might change based on mode) */}
            <TouchableOpacity
                style={[styles.actionButton, styles.resetButton, isCalibrating && styles.disabledButton]}
                onPress={onResetPress}
                disabled={isCalibrating}
            >
                <Text style={styles.buttonText}>
                    {mode === 'freestyle' ? 'Reset Reps' : 'Reset'}
                </Text>
            </TouchableOpacity>

            {/* Add other buttons for Preset/Custom modes here */}
            {/* e.g., Pause, Skip, End */}

        </View>
    );
}

const styles = StyleSheet.create({
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        marginTop: 10,
        paddingHorizontal: 10, // Add some padding
    },
    actionButton: {
        paddingVertical: 12,
        paddingHorizontal: 20, // Adjust padding
        borderRadius: 8,
        minWidth: 100,
        alignItems: 'center',
        marginHorizontal: 5, // Space between buttons
    },
    calibrateButton: {
        backgroundColor: '#ffc107', // Yellowish for Calibrate
    },
    resetButton: {
         backgroundColor: '#dc3545', // Reddish for Reset
    },
    buttonText: {
        color: COLORS.white,
        fontWeight: '600',
        textAlign: 'center',
    },
    disabledButton: {
        backgroundColor: '#6c757d',
        opacity: 0.7,
    },
});