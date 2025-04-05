/**
 * UI component to display calibration messages as an overlay.
 */
import React from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';

interface CalibrationUIProps {
    isVisible: boolean;
    message: string;
}

export default function CalibrationUI({ isVisible, message }: CalibrationUIProps) {
    if (!isVisible || !message) {
        return null; // Don't render anything if not calibrating or no message
    }

    return (
        // Using Modal might be better for overlay behavior if needed
        // Or just absolutely positioned View as before
        <View style={styles.calibrationOverlay}>
            <Text style={styles.calibrationText}>{message}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    calibrationOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)', // Darker overlay
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 50, // Ensure it's on top
        // If inside a container with borderRadius, match it or remove it
        // borderRadius: 15,
    },
    calibrationText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFF',
        textAlign: 'center',
        padding: 20,
    },
});