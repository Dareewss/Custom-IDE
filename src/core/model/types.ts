export const nodeKinds = [
  'file',
  'class',
  'function',
  'method',
  'variable',
  'collection',
  'loop',
  'condition',
  'import',
  'external',
] as const;
export type NodeKind = (typeof nodeKinds)[number];
export type EdgeKind = 'import' | 'call' | 'inherits';
export type ValueKind = 'number' | 'string' | 'bool' | 'other';
export interface CollectionEntry {
  key?: string;
  keyType?: ValueKind;
  value: string;
  valueType: ValueKind;
}

/** Monaco-compatible, 1-based UTF-16 coordinates; the end is exclusive. */
export interface SourceRange {
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
}
export interface Parameter {
  name: string;
  typeHint?: string;
  defaultValue?: string;
  variadic?: boolean;
}
export interface NodeMetadata {
  qualifiedName?: string;
  params?: Parameter[];
  typeHint?: string;
  returnType?: string;
  valueType?: ValueKind;
  role?: 'parameter' | 'attribute';
  collectionKind?: 'list' | 'tuple' | 'set' | 'dict' | 'generator';
  elementCount?: number;
  preview?: string[];
  entries?: CollectionEntry[];
  loopKind?: 'for' | 'async for' | 'while' | 'comprehension';
  branchCount?: number;
  branch?: 'true' | 'false' | 'elif';
  hasError?: boolean;
  externalKind?: 'module' | 'call' | 'base';
}
interface NodeBase {
  id: string;
  name: string;
  parentId: string | null;
  children: string[];
  meta: NodeMetadata;
}
export type CodeNode = NodeBase &
  (
    | { kind: Exclude<NodeKind, 'external'>; fileId: string; range: SourceRange }
    | { kind: 'external'; fileId: null; range: null }
  );
export interface CodeEdge {
  id: string;
  kind: EdgeKind;
  from: string;
  to: string;
  resolved: boolean;
  confidence: number;
  source?: { fileId: string; range: SourceRange };
}
export interface CodeIssue {
  fileId: string;
  range: SourceRange;
  message: string;
}
/** Plain structured-clone data, independent of parser, language and renderer. */
export interface CodeModel {
  schemaVersion: 1;
  languageId: string;
  nodes: CodeNode[];
  edges: CodeEdge[];
  issues: CodeIssue[];
}
