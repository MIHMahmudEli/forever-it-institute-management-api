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
});
