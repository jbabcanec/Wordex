import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format WB (WordBucks) amounts with commas and 2 decimal places
export function formatWB(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

// Format percentage changes with + or - prefix
export function formatPercentage(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

// Normalize word text: ALL CAPS, no spaces
export function normalizeWord(text: string): string {
  return text.toUpperCase().replace(/\s+/g, '');
}

// Calculate buy/sell prices with platform spread (2% markup/markdown)
export function calculateTradePrice(currentPrice: number, isBuy: boolean): number {
  return isBuy ? currentPrice * 1.02 : currentPrice * 0.98;
}

// Calculate trading fee (0.5%)
export function calculateFee(amount: number): number {
  return amount * 0.005;
}

// Format date for receipts and timestamps
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d).replace(',', '');
}

// Generate unique transaction ID display
export function formatTransactionId(id: string): string {
  return `0x${id.slice(0, 8)}...`;
}
