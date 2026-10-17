import { describe, it, expect } from 'vitest';
import { calculateGradeAndGpa } from '../src/gradebook/gradebook.service.js';
import {
  doIntervalsOverlap,
  timeStringToMinutes,
} from '../src/timetable/timetable-conflict.service.js';

describe('Academic Management System Suite', () => {
  describe('Grading Policy & GPA Calculation', () => {
    it('calculates A+ (4.00) for marks >= 80%', () => {
      expect(calculateGradeAndGpa(85)).toEqual({ letterGrade: 'A+', gpa: 4.0 });
      expect(calculateGradeAndGpa(80)).toEqual({ letterGrade: 'A+', gpa: 4.0 });
      expect(calculateGradeAndGpa(100)).toEqual({ letterGrade: 'A+', gpa: 4.0 });
    });

    it('calculates A (3.75) for 75% to 79.9%', () => {
      expect(calculateGradeAndGpa(78)).toEqual({ letterGrade: 'A', gpa: 3.75 });
      expect(calculateGradeAndGpa(75)).toEqual({ letterGrade: 'A', gpa: 3.75 });
    });

    it('calculates A- (3.50) for 70% to 74.9%', () => {
      expect(calculateGradeAndGpa(72.5)).toEqual({ letterGrade: 'A-', gpa: 3.5 });
    });

    it('calculates B+ (3.25) for 65% to 69.9%', () => {
      expect(calculateGradeAndGpa(67)).toEqual({ letterGrade: 'B+', gpa: 3.25 });
    });

    it('calculates B (3.00) for 60% to 64.9%', () => {
      expect(calculateGradeAndGpa(62)).toEqual({ letterGrade: 'B', gpa: 3.0 });
    });

    it('calculates B- (2.75) for 55% to 59.9%', () => {
      expect(calculateGradeAndGpa(58)).toEqual({ letterGrade: 'B-', gpa: 2.75 });
    });

    it('calculates C+ (2.50) for 50% to 54.9%', () => {
      expect(calculateGradeAndGpa(52)).toEqual({ letterGrade: 'C+', gpa: 2.5 });
    });

    it('calculates C (2.25) for 45% to 49.9%', () => {
      expect(calculateGradeAndGpa(48)).toEqual({ letterGrade: 'C', gpa: 2.25 });
    });

    it('calculates D (2.00) for 40% to 44.9%', () => {
      expect(calculateGradeAndGpa(42)).toEqual({ letterGrade: 'D', gpa: 2.0 });
    });

    it('calculates F (0.00) for marks < 40%', () => {
      expect(calculateGradeAndGpa(39)).toEqual({ letterGrade: 'F', gpa: 0.0 });
      expect(calculateGradeAndGpa(0)).toEqual({ letterGrade: 'F', gpa: 0.0 });
    });
  });

  describe('Timetable Conflict Detection Interval Overlap', () => {
    it('correctly converts 24h clock strings to minutes', () => {
      expect(timeStringToMinutes('08:00')).toBe(480);
      expect(timeStringToMinutes('17:45')).toBe(1065);
    });

    it('identifies exact overlap when intervals are identical', () => {
      expect(doIntervalsOverlap('10:00', '12:00', '10:00', '12:00')).toBe(true);
    });

    it('identifies partial head-and-tail overlap', () => {
      // 09:30-11:00 and 10:30-12:00
      expect(doIntervalsOverlap('09:30', '11:00', '10:30', '12:00')).toBe(true);
    });

    it('identifies interior contained interval', () => {
      // 09:00-13:00 and 10:00-11:00
      expect(doIntervalsOverlap('09:00', '13:00', '10:00', '11:00')).toBe(true);
    });

    it('allows disjoint time slots', () => {
      // 08:00-10:00 and 14:00-16:00
      expect(doIntervalsOverlap('08:00', '10:00', '14:00', '16:00')).toBe(false);
    });

    it('allows adjacent consecutive classes without false conflict', () => {
      // 10:00-12:00 and 12:00-14:00
      expect(doIntervalsOverlap('10:00', '12:00', '12:00', '14:00')).toBe(false);
    });
  });
});
