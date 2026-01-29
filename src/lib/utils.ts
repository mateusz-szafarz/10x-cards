import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { PaginationDTO } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Validates if a string is a valid UUID v4 format.
 * @param id - The string to validate
 * @returns true if valid UUID v4, false otherwise
 */
export function validateUUID(id: string): boolean {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return UUID_REGEX.test(id);
}

/**
 * Builds pagination metadata for API responses.
 * @param page - Current page number (1-indexed)
 * @param limit - Number of items per page
 * @param total - Total number of items
 * @returns Pagination metadata object
 */
export function buildPaginationMetadata(page: number, limit: number, total: number): PaginationDTO {
  return {
    page,
    limit,
    total,
    total_pages: Math.ceil(total / limit),
  };
}
