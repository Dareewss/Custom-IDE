import type { Parser, Tree } from 'web-tree-sitter';
import { normalizePath, type FileTree } from '../../fs/vfs';
import { stableNodeId } from '../identity';
import type { CodeModel } from '../types';
import { analyzePythonStructure, type PythonFileAnalysis } from './structure';
import { sourceEdit, sourcePoint } from './source-edit';

interface CachedFile {
  source: string;
  tree: Tree;
  analysis: PythonFileAnalysis;
}

/** Owns its parser and trees; only plain analysis data leaves this worker-side cache. */
export class IncrementalPythonAnalyzer {
  private readonly cache = new Map<string, CachedFile>();
  private disposed = false;
  private parsed = 0;
  private reused = 0;
  constructor(private readonly parser: Parser) {}
  get stats() {
    return { parsed: this.parsed, reused: this.reused, cached: this.cache.size };
  }

  analyze(files: FileTree): CodeModel {
    if (this.disposed) throw new Error('Analyzer is disposed.');
    const paths = Object.keys(files)
      .filter((path) => files[path].kind === 'file' && /\.pyw?$/.test(path))
      .sort();
    const keep = new Set(paths);
    for (const [path, entry] of this.cache)
      if (!keep.has(path)) {
        entry.tree.delete();
        this.cache.delete(path);
      }
    const analyzed: PythonFileAnalysis[] = [];
    for (const path of paths) {
      if (normalizePath(path) !== path)
        throw new Error('Analysis requires normalized project paths.');
      const file = files[path];
      if (file.kind !== 'file') continue;
      const old = this.cache.get(path);
      if (old?.source === file.content) {
        this.reused++;
        analyzed.push(old.analysis);
        continue;
      }
      let tree: Tree | null = null;
      try {
        const edit = old && sourceEdit(old.source, file.content);
        if (old && edit) old.tree.edit(edit);
        tree = this.parser.parse(file.content, old?.tree);
        if (!tree) throw new Error('Parser could not finish this file.');
        this.parsed++;
        const analysis = analyzePythonStructure(path, tree.rootNode);
        this.cache.set(path, { source: file.content, tree, analysis });
        analyzed.push(analysis);
      } catch (error) {
        tree?.delete();
        this.cache.delete(path);
        const end = sourcePoint(file.content, file.content.length);
        const range = { startLine: 1, startCol: 1, endLine: end.row + 1, endCol: end.column + 1 };
        analyzed.push({
          fileId: path,
          nodes: [
            {
              id: stableNodeId(path, 'file', '<module>'),
              kind: 'file',
              name: path,
              fileId: path,
              range,
              parentId: null,
              children: [],
              meta: { hasError: true },
            },
          ],
          issues: [{ fileId: path, range, message: `Analysis failed: ${String(error)}` }],
        });
      } finally {
        old?.tree.delete();
      }
    }
    return {
      schemaVersion: 1,
      languageId: 'python',
      nodes: analyzed.flatMap((f) => f.nodes),
      edges: [],
      issues: analyzed.flatMap((f) => f.issues),
    };
  }
  dispose(): void {
    for (const entry of this.cache.values()) entry.tree.delete();
    this.cache.clear();
    if (!this.disposed) this.parser.delete();
    this.disposed = true;
  }
}
