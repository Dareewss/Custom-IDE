import { stableNodeId } from '../identity';
import type { SourceRange } from '../types';

export interface PythonScope {
  id: string;
  parentId: string | null;
  kind: 'file' | 'class' | 'function' | 'method' | 'comprehension';
}
export interface PythonImport {
  nodeId: string;
  scopeId: string;
  module: string;
  level: number;
  name?: string;
  alias?: string;
}
export interface PythonSymbol {
  name: string;
  nodeId: string;
  scopeId: string;
  kind: 'definition' | 'variable' | 'parameter' | 'import';
  range: SourceRange;
  conditional: boolean;
  imported?: PythonImport;
}
export interface PythonReference {
  from: string;
  scopeId: string;
  name: string;
  range: SourceRange;
}
export interface PythonFacts {
  scopes: PythonScope[];
  symbols: PythonSymbol[];
  imports: PythonImport[];
  calls: PythonReference[];
  bases: PythonReference[];
}

export function emptyPythonFacts(fileId: string): PythonFacts {
  return {
    scopes: [{ id: stableNodeId(fileId, 'file', '<module>'), parentId: null, kind: 'file' }],
    symbols: [],
    imports: [],
    calls: [],
    bases: [],
  };
}
