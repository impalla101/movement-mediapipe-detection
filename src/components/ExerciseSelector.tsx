/**
 * UI component for selecting the current exercise, typically used in Freestyle mode.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants/theme';
import type { ExerciseName, ExerciseRecipe } from '../types/poseTypes';

interface ExerciseSelectorProps {
    // Pass the whole recipes object or just the names/display names
    availableExercises: { [key in Exclude<ExerciseName, 'none'>]: ExerciseRecipe };
    selectedExercise: ExerciseName;
    onSelect: (exercise: ExerciseName) => void;
    disabled?: boolean;
}

export default function ExerciseSelector({
    availableExercises,
    selectedExercise,
    onSelect,
    disabled = false,
}: ExerciseSelectorProps) {

    const exerciseKeys = Object.keys(availableExercises) as Exclude<ExerciseName, 'none'>[];

    return (
        <View style={styles.exerciseSelector}>
            <Text style={styles.label}>Select Exercise:</Text>
            <View style={styles.buttonGroup}>
                {exerciseKeys.map((key) => (
                    <TouchableOpacity
                        key={key}
                        style={[
                            styles.exerciseButton,
                            selectedExercise === key && styles.activeButton,
                            disabled && styles.disabledButton // Add disabled style
                        ]}
                        onPress={() => onSelect(key)}
                        disabled={disabled} // Disable button interaction
                    >
                        <Text style={styles.buttonText}>{availableExercises[key].displayName}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    exerciseSelector: {
        marginBottom: 15,
    },
    label: {
        fontSize: 16,
        color: '#FFF', // Assuming dark background
        marginBottom: 8,
    },
    buttonGroup: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        flexWrap: 'wrap', // Allow wrapping if too many exercises
    },
    exerciseButton: {
        backgroundColor: '#444',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        // Adjust flex basis for wrapping
        // flex: 1, // Remove this if wrapping
        minWidth: '30%', // Ensure at least 3 fit per row roughly
        marginHorizontal: 5,
        marginBottom: 10, // Space for wrapped rows
        alignItems: 'center',
    },
    activeButton: {
        backgroundColor: COLORS.primary, // Use theme color
    },
    buttonText: {
        color: '#FFF',
        fontWeight: '600',
        textAlign: 'center',
    },
    disabledButton: {
        backgroundColor: '#6c757d',
        opacity: 0.7,
    },
});