export interface SourceLocation {
  path: string;
  line: number;
  column: number;
}
export interface SerializedValue {
  type: string;
  value: string;
  children?: { name: string; value: SerializedValue }[];
  truncated?: boolean;
}
export interface StackFrame {
  name: string;
  location: SourceLocation;
}
export type VariableSnapshot = Extract<TraceEvent, { type: 'snapshot' }>;
export type TraceEvent = { timestamp: number; location: SourceLocation; frameId: number } & (
  | { type: 'line' }
  | { type: 'call'; functionName: string; parentFrameId: number | null }
  | { type: 'return'; value: SerializedValue }
  | { type: 'exception'; name: string; message: string }
  | {
      type: 'snapshot';
      locals: Record<string, SerializedValue>;
      globals: Record<string, SerializedValue>;
      stack: StackFrame[];
    }
);
