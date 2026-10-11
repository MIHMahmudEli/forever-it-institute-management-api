import { describe, it, expect } from 'vitest';
import { numberToWordsBDT } from '../src/common/utils/amount-in-words.util.js';

describe('Amount in Words (BDT Convention)', () => {
  it('should convert 0 to Zero Taka Only', () => {
    expect(numberToWordsBDT(0)).toBe('Zero Taka Only');
  });

  it('should convert 4000 to Four Thousand Taka Only', () => {
    expect(numberToWordsBDT(4000)).toBe('Four Thousand Taka Only');
  });

  it('should convert 15000 to Fifteen Thousand Taka Only', () => {
    expect(numberToWordsBDT(15000)).toBe('Fifteen Thousand Taka Only');
  });

  it('should convert 12500 to Twelve Thousand Five Hundred Taka Only', () => {
    expect(numberToWordsBDT(12500)).toBe('Twelve Thousand Five Hundred Taka Only');
  });

  it('should convert 100000 to One Lakh Taka Only', () => {
    expect(numberToWordsBDT(100000)).toBe('One Lakh Taka Only');
  });

  it('should convert 125500 to One Lakh Twenty Five Thousand Five Hundred Taka Only', () => {
    expect(numberToWordsBDT(125500)).toBe('One Lakh Twenty Five Thousand Five Hundred Taka Only');
  });

  it('should handle decimal paisa amounts', () => {
    expect(numberToWordsBDT(500.5)).toBe('Five Hundred Taka And Fifty Paisa Only');
  });
});
