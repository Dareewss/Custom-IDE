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
