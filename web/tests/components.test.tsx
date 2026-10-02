import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { TicketPerforationDivider } from '@/components/TicketPerforationDivider';

describe('Web UI Components', () => {
  it('TicketPerforationDivider renders desktop and mobile notch elements', () => {
    const { container } = render(<TicketPerforationDivider color="rgba(0,0,0,0.5)" />);
    const lines = container.querySelectorAll('line');
    expect(lines.length).toBe(2);
    expect(lines[0]).toHaveAttribute('stroke', 'rgba(0,0,0,0.5)');
  });
});
