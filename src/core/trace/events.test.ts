import { expectTypeOf, it } from 'vitest';
import type { TraceEvent, VariableSnapshot, SerializedValue, StackFrame } from './events';
it('keeps trace contracts discriminated and reusable by future playback', () => {
  expectTypeOf<Extract<TraceEvent, { type: 'return' }>['value']>().toEqualTypeOf<SerializedValue>();
  expectTypeOf<VariableSnapshot['stack']>().toEqualTypeOf<StackFrame[]>();
  expectTypeOf<TraceEvent['type']>().toEqualTypeOf<
    'line' | 'call' | 'return' | 'exception' | 'snapshot'
  >();
});
