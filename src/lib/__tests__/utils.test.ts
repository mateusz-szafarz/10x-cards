import { describe, it, expect } from 'vitest';
import { validateUUID, buildPaginationMetadata } from '../utils';

describe('validateUUID', () => {
  it('should accept valid UUID v4', () => {
    expect(validateUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('should reject non-v4 UUID', () => {
    expect(validateUUID('550e8400-e29b-11d4-a716-446655440000')).toBe(false);
  });

  it('should reject empty string', () => {
    expect(validateUUID('')).toBe(false);
  });
});

describe('buildPaginationMetadata', () => {
  it('should calculate total_pages correctly', () => {
    const result = buildPaginationMetadata(1, 20, 45);
    expect(result).toEqual({
      page: 1,
      limit: 20,
      total: 45,
      total_pages: 3,
    });
  });

  it('should handle zero total', () => {
    const result = buildPaginationMetadata(1, 20, 0);
    expect(result.total_pages).toBe(0);
  });
});
