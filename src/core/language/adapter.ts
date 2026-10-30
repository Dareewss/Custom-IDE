import type { FileTree } from '../fs/vfs';
export interface Diagnostic {
  path: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  message: string;
  source: string;
}
export interface Completion {
  label: string;
  insertText: string;
  detail: string;
  kind: string;
}
export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  tree: FileTree;
  entry: string;
}
export interface LanguageAdapter {
  id: string;
  extensions: readonly string[];
  monacoLanguage: string;
  runner?: (path: string, tree: FileTree) => Promise<void>;
  diagnostics?: (path: string, content: string) => Promise<Diagnostic[]>;
  completion?: (
    path: string,
    content: string,
    line: number,
    column: number,
  ) => Promise<Completion[]>;
  formatter?: (content: string) => Promise<string>;
  templates: readonly ProjectTemplate[];
}
export const python: LanguageAdapter = {
  id: 'python',
  extensions: ['.py', '.pyw'],
  monacoLanguage: 'python',
  templates: [],
};
const adapters: LanguageAdapter[] = [python];
export function registerLanguage(adapter: LanguageAdapter) {
  if (adapters.some((a) => a.id === adapter.id))
    throw new Error(`Language ${adapter.id} is already registered.`);
  adapters.push(adapter);
}
export function languageForPath(path: string): LanguageAdapter | undefined {
  return adapters.find((adapter) =>
    adapter.extensions.some((extension) => path.endsWith(extension)),
  );
}
