import { describe, it, expect } from 'vitest';

describe('Financial Calculations and Balance Invariants', () => {
  it('calculates total payable correctly from multiple course enrollments and discounts', () => {
    const enrollments = [
      { agreedFee: 15000, discount: 2000, status: 'ACTIVE' }, // 13000
      { agreedFee: 8000, discount: 500, status: 'ACTIVE' },   // 7500
      { agreedFee: 4000, discount: 0, status: 'CANCELLED' },   // Cancelled should be excluded
    ];

    const totalPayable = enrollments.reduce((sum, e) => {
      if (e.status === 'CANCELLED') return sum;
      return sum + (e.agreedFee - e.discount);
    }, 0);

    expect(totalPayable).toBe(20500);
  });

  it('calculates total paid and outstanding due accurately with multiple payments', () => {
    const totalPayable = 20000;
    const payments = [
      { amount: 5000, status: 'COMPLETED' },
      { amount: 7000, status: 'COMPLETED' },
      { amount: 3000, status: 'REVERSED' }, // Reversed should NOT be counted as paid
    ];

    const totalPaid = payments
      .filter((p) => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + p.amount, 0);

    const outstandingDue = Math.max(0, totalPayable - totalPaid);

    expect(totalPaid).toBe(12000);
    expect(outstandingDue).toBe(8000);
  });

  it('does not allow outstanding due to be negative if advance exceeds (clamps to 0)', () => {
    const totalPayable = 10000;
    const totalPaid = 12000;
    const outstandingDue = Math.max(0, totalPayable - totalPaid);

    expect(outstandingDue).toBe(0);
  });

  it('rejects recording payment when Total Payable Fee and Total Paid to Date are equal (due is 0)', () => {
    const totalPayable = 15000;
    const totalPaid = 15000;
    const outstandingDue = Math.max(0, totalPayable - totalPaid);

    const isFullyPaid = totalPayable > 0 && totalPaid >= totalPayable;
    expect(isFullyPaid).toBe(true);
    expect(outstandingDue).toBe(0);

    // Rule: Attempting to record payment when already fully paid must throw error
    const validatePayment = (amount: number) => {
      if (totalPaid >= totalPayable) {
        throw new Error('Total Payable Fee and Total Paid to Date are equal. No outstanding due exists.');
      }
    };

    expect(() => validatePayment(1000)).toThrowError(/equal/);
  });

  it('rejects payment amount that exceeds remaining outstanding due (Total Paid <= Total Payable Fee)', () => {
    const totalPayable = 20000;
    const totalPaid = 15000;
    const outstandingDue = Math.max(0, totalPayable - totalPaid); // 5000

    const validatePayment = (amount: number) => {
      if (amount > outstandingDue) {
        throw new Error(`Payment amount of ${amount} exceeds remaining outstanding due of ${outstandingDue}`);
      }
    };

    expect(() => validatePayment(5000)).not.toThrow();
    expect(() => validatePayment(5001)).toThrowError(/exceeds remaining outstanding due/);
    expect(() => validatePayment(10000)).toThrowError(/exceeds remaining outstanding due/);
  });

  it('rejects course-level payment when course is dropped, cancelled, or amount exceeds course balance', () => {
    const courseFee = 10000;
    const coursePaid = 7000;
    const courseDue = courseFee - coursePaid; // 3000

    const validateCoursePayment = (status: string, amount: number) => {
      if (status === 'DROPPED') throw new Error('Cannot record payment for a DROPPED course');
      if (status === 'CANCELLED') throw new Error('Cannot record payment for a CANCELLED course');
      if (amount > courseDue) throw new Error('Payment amount exceeds remaining course due');
    };

    expect(() => validateCoursePayment('DROPPED', 500)).toThrow(/DROPPED/);
    expect(() => validateCoursePayment('CANCELLED', 500)).toThrow(/CANCELLED/);
    expect(() => validateCoursePayment('ACTIVE', 3500)).toThrow(/exceeds/);
    expect(() => validateCoursePayment('ACTIVE', 3000)).not.toThrow();
  });
});
