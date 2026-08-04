import React from 'react';
import { render } from '@testing-library/react-native';
import ProgressRing from '../src/components/ProgressRing';

describe('ProgressRing', () => {
  it('renders intake, target, and rounded percentage', () => {
    const screen = render(<ProgressRing percent={37.5} sizeMl={750} goalMl={2000} />);

    expect(screen.getByText('750ml')).toBeTruthy();
    expect(screen.getByText('of 2000ml')).toBeTruthy();
    expect(screen.getByText('38%')).toBeTruthy();
  });

  it('keeps the displayed percentage readable above the goal', () => {
    const screen = render(<ProgressRing percent={125} sizeMl={2500} goalMl={2000} />);
    expect(screen.getByText('125%')).toBeTruthy();
  });
});
