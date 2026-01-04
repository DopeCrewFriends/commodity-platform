import { EscrowStatus } from '../types';

/**
 * Maps old status values to new standardized status values
 * This ensures backward compatibility with existing data
 */
export function normalizeEscrowStatus(status: string): EscrowStatus {
  const normalized = status.toLowerCase().trim();
  
  // Map old statuses to new standardized ones
  switch (normalized) {
    case 'waiting':
      return 'waiting';
    case 'pending':
      return 'waiting';
    case 'ongoing':
      return 'ongoing';
    case 'confirmed':
      return 'ongoing';
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    case 'rejected':
      // Map rejected to cancelled for consistency
      return 'cancelled';
    default:
      // Default to waiting for unknown statuses
      console.warn(`Unknown escrow status: "${status}", defaulting to "waiting"`);
      return 'waiting';
  }
}

/**
 * Checks if a status represents an active escrow (not cancelled/rejected)
 * Note: Cancelled is now a valid status, so we only filter out rejected
 */
export function isActiveEscrowStatus(status: string): boolean {
  const normalized = status.toLowerCase().trim();
  return normalized !== 'rejected';
}

/**
 * Gets display text for escrow status
 */
export function getEscrowStatusDisplay(status: EscrowStatus): string {
  switch (status) {
    case 'waiting':
      return 'Waiting for Confirmation';
    case 'ongoing':
      return 'Ongoing';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

