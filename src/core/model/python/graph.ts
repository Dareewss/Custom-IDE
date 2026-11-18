import { dirname } from '../../fs/vfs';
import { stableEdgeId, stableNodeId } from '../identity';
import { rangeContains } from '../indexes';
import type { CodeEdge, CodeModel, CodeNode, EdgeKind, SourceRange } from '../types';
import type { PythonImport, PythonReference, PythonScope, PythonSymbol } from './facts';
import type { PythonFileAnalysis } from './structure';

interface Scope extends PythonScope {
  fileId: string;
}
interface Target {
  node?: CodeNode;
  moduleFile?: string;
  prefix?: string[];
  confidence: number;
}
const unknown = (): Target => ({ confidence: 0 });
const before = (a: SourceRange, b: SourceRange) =>
  a.startLine < b.startLine || (a.startLine === b.startLine && a.startCol <= b.startCol);
const key = (scope: string, name: string) => JSON.stringify([scope, name]);

/** Resolves named project evidence only; callable values and dynamic receivers remain uncertain. */
export function buildPythonGraph(files: readonly PythonFileAnalysis[]): CodeModel {
  const nodes: CodeNode[] = files.flatMap((file) => file.nodes);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const scopes = new Map<string, Scope>();
  const symbols = new Map<string, PythonSymbol[]>();
  const fileRoots = new Map<string, string>();
  const wildcards = new Map<string, SourceRange[]>();
  const parents = new Map(nodes.map((node) => [node.id, node.parentId]));
  for (const file of files) {
    const root = file.nodes.find((node) => node.kind === 'file');
    if (root) fileRoots.set(file.fileId, root.id);
    for (const scope of file.facts.scopes) scopes.set(scope.id, { ...scope, fileId: file.fileId });
    for (const imported of file.facts.imports)
      if (imported.name === '*') {
        const ranges = wildcards.get(imported.scopeId) ?? [];
        ranges.push(nodeById.get(imported.nodeId)!.range!);
        wildcards.set(imported.scopeId, ranges);
      }
    for (const symbol of file.facts.symbols) {
      const bucket = symbols.get(key(symbol.scopeId, symbol.name)) ?? [];
      bucket.push(symbol);
      symbols.set(key(symbol.scopeId, symbol.name), bucket);
    }
  }
  for (const bucket of symbols.values())
    bucket.sort(
      (a, b) => a.range.startLine - b.range.startLine || a.range.startCol - b.range.startCol,
    );

  const moduleFile = (module: string, importer: string, level: number): string | undefined => {
    const folder = dirname(importer).split('/').filter(Boolean);
    if (level > folder.length) return;
    const prefix = level ? folder.slice(0, folder.length - level + 1) : [];
    const path = [...prefix, ...module.split('.').filter(Boolean)].join('/');
    const candidates = (
      module ? [`${path}.py`, `${path}/__init__.py`] : [`${path}/__init__.py`]
    ).filter((name) => fileRoots.has(name));
    // An ambiguous module/package is left unresolved instead of guessing import precedence.
    return candidates.length === 1 ? candidates[0] : undefined;
  };
  const baseClasses = new Map<string, string[]>();
  const own = (
    scopeId: string,
    name: string,
    reference: PythonReference | undefined,
    guard: Set<string>,
  ): Target => {
    const bucket = symbols.get(key(scopeId, name));
    if (!bucket?.length) return unknown();
    const scope = scopes.get(scopeId)!;
    let origin = reference ? scopes.get(reference.scopeId) : undefined;
    let insideFunction = false;
    while (origin) {
      if (origin.kind === 'function' || origin.kind === 'method') {
        insideFunction = true;
        break;
      }
      origin = origin.parentId ? scopes.get(origin.parentId) : undefined;
    }
    const deferred = scope.kind === 'file' && insideFunction;
    const candidates =
      !reference || deferred
        ? bucket
        : bucket.filter(
            (symbol) =>
              before(symbol.range, reference.range) &&
              !(
                symbol.kind === 'definition' &&
                rangeContains(symbol.range, reference.range.startLine, reference.range.startCol)
              ),
          );
    const symbol = candidates.at(-1);
    if (!symbol) return unknown();
    if (
      (wildcards.get(scopeId) ?? []).some(
        (range) =>
          !before(range, symbol.range) &&
          (!reference || deferred || before(range, reference.range)),
      )
    )
      return unknown();
    const target = nodeById.get(symbol.nodeId);
    if (target?.meta.hasError) return unknown();
    if (symbol.kind === 'import' && symbol.imported) {
      const imported = resolveImport(symbol.imported, guard);
      return { ...imported, confidence: imported.confidence * (symbol.conditional ? 0.6 : 0.9) };
    }
    if (symbol.kind !== 'definition') return unknown();
    return { node: target, confidence: symbol.conditional ? 0.6 : 0.95 };
  };
  const lookup = (
    name: string,
    scopeId: string,
    reference: PythonReference | undefined,
    guard: Set<string>,
  ): Target => {
    const stamp = key(scopeId, name);
    if (guard.has(stamp)) return unknown();
    const visited = new Set(guard);
    visited.add(stamp);
    const origin = scopes.get(scopeId);
    const skipClasses =
      origin?.kind === 'function' || origin?.kind === 'method' || origin?.kind === 'comprehension';
    let scope = scopes.get(scopeId);
    while (scope) {
      if (!(skipClasses && scope.kind === 'class') && symbols.has(key(scope.id, name)))
        return own(scope.id, name, reference, visited);
      scope = scope.parentId ? scopes.get(scope.parentId) : undefined;
    }
    return unknown();
  };
  const resolveImport = (imported: PythonImport, guard: Set<string>): Target => {
    const importer = scopes.get(imported.scopeId)?.fileId;
    if (!importer || imported.name === '*') return unknown();
    const base = moduleFile(imported.module, importer, imported.level);
    if (!imported.name)
      return base
        ? {
            moduleFile: base,
            prefix: imported.alias ? [] : imported.module.split('.').slice(1),
            confidence: 1,
          }
        : unknown();
    const child = moduleFile(
      [imported.module, imported.name].filter(Boolean).join('.'),
      importer,
      imported.level,
    );
    const exported = base
      ? lookup(imported.name, fileRoots.get(base)!, undefined, guard)
      : unknown();
    if (child && (exported.node || exported.moduleFile)) return unknown();
    if (exported.node || exported.moduleFile)
      return { ...exported, confidence: exported.confidence * 0.9 };
    return child ? { moduleFile: child, prefix: [], confidence: 0.95 } : unknown();
  };
  const containingClass = (nodeId: string): string | undefined => {
    let current: string | null | undefined = nodeId;
    while (current) {
      if (nodeById.get(current)?.kind === 'class') return current;
      current = parents.get(current);
    }
    return undefined;
  };
  const attributeWrites = new Set<string>();
  for (const node of nodes)
    if (node.meta.role === 'attribute') {
      const classId = containingClass(node.id);
      if (classId) attributeWrites.add(key(classId, node.name.split('.').at(-1)!));
    }
  const member = (classId: string, name: string, guard = new Set<string>()): Target => {
    if (guard.has(classId) || attributeWrites.has(key(classId, name))) return unknown();
    const seen = new Set(guard);
    seen.add(classId);
    if (symbols.has(key(classId, name))) return own(classId, name, undefined, new Set());
    const inherited = (baseClasses.get(classId) ?? [])
      .map((base) => member(base, name, seen))
      .filter((target) => target.node);
    const unique = new Map(inherited.map((target) => [target.node!.id, target]));
    return unique.size === 1 ? { ...[...unique.values()][0], confidence: 0.75 } : unknown();
  };
  const resolveReference = (reference: PythonReference): Target => {
    const parts = reference.name.split('.');
    if (parts.some((part) => !/^[\p{L}\p{Nl}_][\p{L}\p{Nl}\p{N}\p{M}_]*$/u.test(part)))
      return unknown();
    let target: Target | undefined;
    if (parts.length > 1) {
      let scope = scopes.get(reference.scopeId);
      while (scope) {
        const method = nodeById.get(scope.id);
        if (scope.kind === 'method' && method?.meta.params?.[0]?.name === parts[0]) {
          const bindings = symbols.get(key(scope.id, parts[0])) ?? [];
          if (
            bindings.some(
              (symbol) => symbol.kind !== 'parameter' && before(symbol.range, reference.range),
            )
          )
            return unknown();
          const classScope = scope.parentId && scopes.get(scope.parentId);
          if (classScope && classScope.kind === 'class')
            target = { node: nodeById.get(classScope.id), confidence: 0.85 };
          break;
        }
        if (symbols.has(key(scope.id, parts[0]))) break;
        scope = scope.parentId ? scopes.get(scope.parentId) : undefined;
      }
    }
    target ??= lookup(parts[0], reference.scopeId, reference, new Set());
    let remaining = parts.slice(1);
    if (target.prefix?.length) {
      if (!target.prefix.every((part, i) => remaining[i] === part)) return unknown();
      remaining = remaining.slice(target.prefix.length);
    }
    for (const name of remaining) {
      let next: Target;
      if (target.moduleFile)
        next = lookup(name, fileRoots.get(target.moduleFile)!, undefined, new Set());
      else if (target.node?.kind === 'class') next = member(target.node.id, name);
      else return unknown();
      target = { ...next, confidence: Math.min(target.confidence, next.confidence) };
    }
    return target;
  };
  const external = new Map<string, CodeNode>();
  const edges: CodeEdge[] = [];
  const occurrences = new Map<string, number>();
  const connect = (
    kind: EdgeKind,
    from: string,
    target: Target,
    label: string,
    category: 'module' | 'call' | 'base',
    fileId: string,
    range: SourceRange,
  ) => {
    let to = target.node;
    if (!to && target.moduleFile) to = nodeById.get(fileRoots.get(target.moduleFile)!);
    const resolved = Boolean(to);
    if (!to) {
      const id = stableNodeId('<external>', 'external', `${category}:${label}`);
      to = external.get(id);
      if (!to) {
        to = {
          id,
          kind: 'external',
          name: label,
          fileId: null,
          range: null,
          parentId: null,
          children: [],
          meta: { externalKind: category },
        };
        external.set(id, to);
      }
    }
    const stamp = JSON.stringify([kind, from, to.id]);
    const occurrence = occurrences.get(stamp) ?? 0;
    occurrences.set(stamp, occurrence + 1);
    edges.push({
      id: stableEdgeId(kind, from, to.id, occurrence),
      kind,
      from,
      to: to.id,
      resolved,
      confidence: resolved ? target.confidence : 0,
      source: { fileId, range },
    });
  };
  for (const file of files)
    for (const imported of file.facts.imports) {
      const base = moduleFile(imported.module, file.fileId, imported.level);
      const target = resolveImport(imported, new Set());
      const dependency = new Set(
        [base, target.moduleFile, target.node?.fileId ?? undefined].filter((path): path is string =>
          Boolean(path),
        ),
      );
      const range = nodeById.get(imported.nodeId)!.range!;
      for (const path of dependency)
        connect(
          'import',
          imported.nodeId,
          { moduleFile: path, confidence: 1 },
          path,
          'module',
          file.fileId,
          range,
        );
      if (!dependency.size)
        connect(
          'import',
          imported.nodeId,
          unknown(),
          '.'.repeat(imported.level) + imported.module || imported.name || '<incomplete import>',
          'module',
          file.fileId,
          range,
        );
    }
  for (const file of files)
    for (const base of file.facts.bases) {
      const target = resolveReference(base);
      if (target.node?.kind === 'class') {
        const list = baseClasses.get(base.from) ?? [];
        list.push(target.node.id);
        baseClasses.set(base.from, list);
        connect('inherits', base.from, target, base.name, 'base', file.fileId, base.range);
      } else connect('inherits', base.from, unknown(), base.name, 'base', file.fileId, base.range);
    }
  const mutatedTargets = new Set<string>();
  for (const node of nodes)
    if (node.meta.role === 'attribute' && node.range) {
      let owner = node.parentId ? nodeById.get(node.parentId) : undefined;
      while (owner && !['file', 'class', 'function', 'method'].includes(owner.kind))
        owner = owner.parentId ? nodeById.get(owner.parentId) : undefined;
      if (owner) {
        const written = resolveReference({
          from: owner.id,
          scopeId: owner.id,
          name: node.name,
          range: node.range,
        });
        if (written.node) mutatedTargets.add(written.node.id);
      }
    }
  for (const file of files)
    for (const call of file.facts.calls) {
      const target = resolveReference(call);
      const callable =
        target.node &&
        !mutatedTargets.has(target.node.id) &&
        ['function', 'method', 'class'].includes(target.node.kind);
      connect(
        'call',
        call.from,
        callable ? target : unknown(),
        call.name,
        'call',
        file.fileId,
        call.range,
      );
    }
  return {
    schemaVersion: 1,
    languageId: 'python',
    nodes: [...nodes, ...external.values()],
    edges,
    issues: files.flatMap((file) => file.issues),
  };
}
