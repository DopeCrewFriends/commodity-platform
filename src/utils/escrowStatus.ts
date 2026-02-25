import { EscrowStatus, Escrow } from '../types';

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
      return 'Waiting for seller';
    case 'ongoing':
      return 'In progress';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

/**
 * For cancelled escrows, returns context-specific message for the current user.
 */
export function getCancelledDisplayMessage(escrow: Escrow, currentWallet: string): string {
  const me = currentWallet.trim();
  const seller = escrow.seller.trim();
  const cancelledBy = escrow.cancelled_by?.trim();
  if (cancelledBy === seller) {
    return me === seller ? 'You rejected this escrow' : 'Rejected by seller';
  }
  return 'Cancelled';
}

/**
 * Status label for UI: normal status text, or contextual message when cancelled/waiting.
 * Sellers see "New escrow request" when status is waiting; buyers see "Waiting for seller".
 */
export function getEscrowStatusDisplayLabel(escrow: Escrow, currentWallet: string): string {
  if (escrow.status === 'cancelled') {
    return getCancelledDisplayMessage(escrow, currentWallet);
  }
  if (escrow.status === 'waiting' && escrow.seller.trim() === currentWallet.trim()) {
    return 'New escrow request';
  }
  return getEscrowStatusDisplay(escrow.status);
}

/**
 * Label for a timeline step in context (e.g. seller sees "New escrow request" for waiting step).
 */
export function getEscrowStepDisplayLabel(step: EscrowStatus, escrow: Escrow, currentWallet: string): string {
  if (step === 'waiting' && escrow.seller.trim() === currentWallet.trim()) {
    return 'New escrow request';
  }
  if (step === 'cancelled' && escrow.status === 'cancelled') {
    return getCancelledDisplayMessage(escrow, currentWallet);
  }
  return getEscrowStatusDisplay(step);
}

