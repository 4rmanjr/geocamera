
import { DATE_FORMAT_OPTIONS } from '../constants';

/**
 * Format GPS Accuracy to satisfy the "Max 4 characters" requirement.
 * Logic:
 * - If accuracy < 100m: Show 1 decimal place (e.g., "12,5").
 * - If accuracy >= 100m: Show integer only (e.g., "120").
 * - Returns string using Indonesian comma format.
 */
export const formatGpsAccuracy = (accuracy: number | null): string => {
  if (accuracy === null) return '-';

  if (accuracy >= 100) {
    return Math.round(accuracy).toString();
  }
  
  // 1 decimal place, replace dot with comma
  return accuracy.toFixed(1).replace('.', ',');
};

export const formatCoordinates = (lat: number | null, lng: number | null): string => {
  if (lat === null || lng === null) return '';
  return `Lat: ${lat.toFixed(6)} | Long: ${lng.toFixed(6)}`;
};

export const formatCurrentDate = (): string => {
  return new Date().toLocaleDateString('id-ID', DATE_FORMAT_OPTIONS);
};
