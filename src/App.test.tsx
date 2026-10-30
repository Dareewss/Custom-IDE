import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('workspace', () => {
  it('provides a named main landmark', () => {
    render(<App />);
    expect(screen.getByRole('main', { name: 'Code Atlas workspace' })).toBeInTheDocument();
  });
});
