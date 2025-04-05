/**
 * Simple UI component to display the current rep count and exercise state.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme'; // Assuming theme constants exist
import type { ExerciseState } from '../types/poseTypes';

interface RepDisplayProps {
    count: number;
    state: ExerciseState;
}

export default function RepDisplay({ count, state }: RepDisplayProps) {
    const displayStateText = state === 'none' ? 'Starting...' : (state.charAt(0).toUpperCase() + state.slice(1));

    return (
        <View style={styles.repCounter}>
            <Text style={styles.repCount}>{count}</Text>
            <Text style={styles.repLabel}>Reps</Text>
            <Text style={styles.stateLabel}>
                State: {displayStateText}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    repCounter: {
        alignItems: 'center',
        marginVertical: 15,
    },
    repCount: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#FFF', // Assuming dark background from parent
    },
    repLabel: {
        fontSize: 18,
        color: '#FFF',
    },
    stateLabel: {
        fontSize: 16,
        color: '#DDD', // Lighter color for state
        marginTop: 5,
        fontStyle: 'italic',
    },
});