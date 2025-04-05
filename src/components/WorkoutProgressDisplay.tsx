/**
 * UI component to show progress within a structured workout (preset/custom).
 * Displays current/next exercise, set number, etc.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';
import type { WorkoutPlan, WorkoutStep, ExerciseName } from '../types/poseTypes';
import { EXERCISE_RECIPES } from '../constants/exerciseConfig'; // To get display names

interface WorkoutProgressDisplayProps {
    plan: WorkoutPlan | null | undefined;
    currentStepIndex: number;
}

export default function WorkoutProgressDisplay({ plan, currentStepIndex }: WorkoutProgressDisplayProps) {
    if (!plan || currentStepIndex < 0 || currentStepIndex >= plan.steps.length) {
        return null; // Hide if no plan or index is invalid
    }

    const currentStep = plan.steps[currentStepIndex];
    const nextStep = currentStepIndex + 1 < plan.steps.length ? plan.steps[currentStepIndex + 1] : null;

    const currentExerciseName = EXERCISE_RECIPES[currentStep.exercise]?.displayName ?? currentStep.exercise;
    const nextExerciseName = nextStep ? (EXERCISE_RECIPES[nextStep.exercise]?.displayName ?? nextStep.exercise) : 'Finish!';

    return (
        <View style={styles.progressContainer}>
            <Text style={styles.stepCounter}>
                Step {currentStepIndex + 1} of {plan.steps.length}
            </Text>
            <Text style={styles.currentExercise}>
                Current: {currentExerciseName} {currentStep.targetReps ? `(${currentStep.targetReps} reps)` : ''}
            </Text>
            <Text style={styles.nextExercise}>
                Next: {nextExerciseName}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    progressContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)', // Subtle background
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 8,
        marginBottom: 15,
        alignItems: 'center',
    },
    stepCounter: {
        fontSize: 14,
        color: '#CCC',
        fontWeight: 'bold',
        marginBottom: 4,
    },
    currentExercise: {
        fontSize: 18,
        color: '#FFF',
        fontWeight: '600',
        textAlign: 'center',
    },
    nextExercise: {
        fontSize: 14,
        color: '#AAA',
        marginTop: 4,
        fontStyle: 'italic',
    },
});