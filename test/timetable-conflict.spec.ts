import { describe, it, expect } from 'vitest';
import {
  doIntervalsOverlap,
  timeStringToMinutes,
} from '../src/timetable/timetable-conflict.service.js';

describe('Timetable Conflict Logic', () => {
  describe('timeStringToMinutes', () => {
    it('converts HH:mm to minutes', () => {
      expect(timeStringToMinutes('00:00')).toBe(0);
      expect(timeStringToMinutes('09:30')).toBe(570);
      expect(timeStringToMinutes('14:45')).toBe(885);
      expect(timeStringToMinutes('23:59')).toBe(1439);
    });

    it('handles HH:mm:ss format', () => {
      expect(timeStringToMinutes('10:00:00')).toBe(600);
      expect(timeStringToMinutes('11:30:00')).toBe(690);
    });
  });

  describe('doIntervalsOverlap', () => {
    it('detects overlapping time intervals on the same day', () => {
      // Slot A: 10:00 - 12:00, Slot B: 11:00 - 13:00 -> Overlap
      expect(doIntervalsOverlap('10:00', '12:00', '11:00', '13:00')).toBe(true);
      // Slot A: 14:00 - 16:00, Slot B: 14:30 - 15:30 -> Subsumed overlap
      expect(doIntervalsOverlap('14:00', '16:00', '14:30', '15:30')).toBe(true);
      // Equal intervals -> Overlap
      expect(doIntervalsOverlap('10:00', '12:00', '10:00', '12:00')).toBe(true);
    });

    it('allows non-overlapping intervals separated in time', () => {
      // Slot A: 09:00 - 11:00, Slot B: 14:00 - 16:00 -> No overlap
      expect(doIntervalsOverlap('09:00', '11:00', '14:00', '16:00')).toBe(false);
      expect(doIntervalsOverlap('14:00', '16:00', '09:00', '11:00')).toBe(false);
    });

    it('allows back-to-back classes without false clash', () => {
      // Slot A: 10:00 - 12:00 ends exactly when Slot B: 12:00 - 14:00 begins
      expect(doIntervalsOverlap('10:00', '12:00', '12:00', '14:00')).toBe(false);
      expect(doIntervalsOverlap('12:00', '14:00', '10:00', '12:00')).toBe(false);
    });
  });
});
