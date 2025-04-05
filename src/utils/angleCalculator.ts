/**
 * This file contains utility functions, like calculating angles,
 * that are pure logic and can be reused anywhere.
 */
import type { KeypointData } from '../types/poseTypes';

/**
 * Calculates the angle (in degrees) between three points, using point 'b' as the vertex.
 */
export function calculateAngle(a: KeypointData | undefined, b: KeypointData | undefined, c: KeypointData | undefined): number {
    // Basic null/undefined check for input points
    if (!a || !b || !c) {
        // console.warn("calculateAngle received invalid KeypointData");
        return 0; // Return 0 if any point is missing
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

// Add other pure utility functions here later if needed