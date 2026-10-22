import { describe, it, expect } from 'vitest';
import { startOfMonth, addMonths, isAfter, isBefore, format, endOfMonth, startOfWeek } from 'date-fns';

describe('Calendar View 3-Month Range Logic', () => {
  it('displays current month and next two months including year rollover (November -> Dec, Jan)', () => {
    // Simulate current date in November 2026
    const todayDate = new Date(2026, 10, 15); // Month index 10 is November
    const minMonth = startOfMonth(todayDate);
    const maxMonth = addMonths(minMonth, 2);

    const availableMonths = [
      minMonth,
      addMonths(minMonth, 1),
      maxMonth,
    ];

    expect(availableMonths.map(m => format(m, 'MMMM yyyy'))).toEqual([
      'November 2026',
      'December 2026',
      'January 2027',
    ]);

    // Navigation checks
    // From November: cannot go previous
    expect(isAfter(startOfMonth(minMonth), minMonth)).toBe(false);
    // Can go next to December
    expect(isBefore(startOfMonth(minMonth), maxMonth)).toBe(true);

    // At January 2027: can go previous
    expect(isAfter(startOfMonth(maxMonth), minMonth)).toBe(true);
    // Cannot go next beyond January 2027
    expect(isBefore(startOfMonth(maxMonth), maxMonth)).toBe(false);
  });

  it('displays current month and next two months for December (December -> Jan, Feb)', () => {
    const todayDate = new Date(2026, 11, 5); // Month index 11 is December
    const minMonth = startOfMonth(todayDate);
    const maxMonth = addMonths(minMonth, 2);

    const availableMonths = [
      minMonth,
      addMonths(minMonth, 1),
      maxMonth,
    ];

    expect(availableMonths.map(m => format(m, 'MMMM yyyy'))).toEqual([
      'December 2026',
      'January 2027',
      'February 2027',
    ]);

    const maxWeekStart = startOfWeek(endOfMonth(maxMonth), { weekStartsOn: 1 });
    expect(format(maxWeekStart, 'yyyy-MM-dd')).toBe('2027-02-22');
  });
});
