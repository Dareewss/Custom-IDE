import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { vi } from 'vitest';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

afterEach(cleanup);
vi.stubGlobal('matchMedia', (media: string) => ({
  media,
  matches: false,
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

if (typeof HTMLDialogElement !== 'undefined')
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      value() {
        this.setAttribute('open', '');
      },
    },
    close: {
      value() {
        this.removeAttribute('open');
      },
    },
  });
