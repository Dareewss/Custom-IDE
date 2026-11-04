import { emptyPythonFacts, type PythonFacts, type PythonImport, type PythonSymbol } from './facts';
import type { Node } from 'web-tree-sitter';
import { basename } from '../../fs/vfs';
import { stableNodeId } from '../identity';
import type {
  CodeIssue,
  CodeNode,
  NodeKind,
  NodeMetadata,
  Parameter,
  SourceRange,
  ValueKind,
} from '../types';

type SourceNode = Extract<CodeNode, { fileId: string }>;
export interface PythonFileAnalysis {
  facts: PythonFacts;
  fileId: string;
  nodes: SourceNode[];
  issues: CodeIssue[];
}
interface Frame {
  syntax: Node;
  parent: SourceNode;
  scope: SourceNode;
  scopeId: string;
  qualified: string;
  identity: string;
  branch?: 'true' | 'false' | 'elif';
}
export const syntaxRange = (node: Node): SourceRange => ({
  startLine: node.startPosition.row + 1,
  startCol: node.startPosition.column + 1,
  endLine: node.endPosition.row + 1,
  endCol: node.endPosition.column + 1,
});
const field = (node: Node, name: string) => node.childForFieldName(name);
const preview = (node: Node | null | undefined) => node?.text.slice(0, 100);
const collections: Record<string, NonNullable<NodeMetadata['collectionKind']>> = {
  list: 'list',
  tuple: 'tuple',
  expression_list: 'tuple',
  set: 'set',
  dictionary: 'dict',
  list_comprehension: 'list',
  set_comprehension: 'set',
  dictionary_comprehension: 'dict',
  generator_expression: 'generator',
};
function valueType(node?: Node | null, hint = ''): ValueKind {
  if (node?.type === 'integer' || node?.type === 'float' || /^(int|float|complex)$/.test(hint))
    return 'number';
  if (node?.type === 'string' || node?.type === 'concatenated_string' || hint === 'str')
    return 'string';
  if (node?.type === 'true' || node?.type === 'false' || hint === 'bool') return 'bool';
  return 'other';
}
function collectionMeta(node: Node): NodeMetadata {
  const dynamic =
    node.type.includes('comprehension') ||
    node.type === 'generator_expression' ||
    node.namedChildren.some((c) => c.type.includes('splat'));
  const elements = node.namedChildren.filter((c) => c.type !== 'comment');
  return {
    collectionKind: collections[node.type],
    ...(dynamic
      ? {}
      : {
          elementCount: elements.length,
          preview: elements.slice(0, 8).map((c) => c.text.slice(0, 100)),
          entries: elements.slice(0, 8).map((child) => {
            const key = field(child, 'key');
            const value = field(child, 'value') ?? child;
            return {
              ...(key ? { key: preview(key), keyType: valueType(key) } : {}),
              value: value.text.slice(0, 100),
              valueType: valueType(value),
            };
          }),
        }),
  };
}
function targets(root: Node | null): Node[] {
  const result: Node[] = [];
  const pending = root ? [root] : [];
  while (pending.length) {
    const node = pending.pop()!;
    if (['identifier', 'attribute', 'subscript'].includes(node.type)) result.push(node);
    else pending.push(...node.namedChildren.slice().reverse());
  }
  return result;
}
function parameters(root: Node | null): { syntax: Node; info: Parameter }[] {
  if (!root) return [];
  return root.namedChildren
    .filter(
      (n) =>
        n.type !== 'comment' && n.type !== 'positional_separator' && n.type !== 'keyword_separator',
    )
    .flatMap((syntax) => {
      const name =
        field(syntax, 'name') ??
        (syntax.type === 'identifier'
          ? syntax
          : syntax.namedChildren.find((n) => n.type === 'identifier'));
      return name
        ? [
            {
              syntax,
              info: {
                name: name.text,
                typeHint: preview(field(syntax, 'type')),
                defaultValue: preview(field(syntax, 'value')),
                variadic: syntax.type.includes('splat'),
              },
            },
          ]
        : [];
    });
}

export function analyzePythonStructure(fileId: string, root: Node): PythonFileAnalysis {
  const file: SourceNode = {
    id: stableNodeId(fileId, 'file', '<module>'),
    kind: 'file',
    name: basename(fileId),
    fileId,
    range: syntaxRange(root),
    parentId: null,
    children: [],
    meta: { qualifiedName: fileId, hasError: root.hasError },
  };
  const result: PythonFileAnalysis = {
    fileId,
    nodes: [file],
    issues: [],
    facts: emptyPythonFacts(fileId),
  };
  const errors = [root];
  while (errors.length && result.issues.length < 100) {
    const syntax = errors.pop()!;
    if (syntax.isError || syntax.isMissing) {
      const range = syntaxRange(syntax);
      if (range.startLine === range.endLine && range.startCol === range.endCol) range.endCol++;
      result.issues.push({
        fileId,
        range,
        message: syntax.isMissing
          ? `Expected ${syntax.type}.`
          : 'Incomplete or invalid Python syntax.',
      });
    } else if (syntax.hasError) {
      for (const child of syntax.children.slice().reverse()) errors.push(child);
    }
  }

  const counts = new Map<string, number>();
  const stack: Frame[] = root.namedChildren
    .slice()
    .reverse()
    .map((syntax) => ({
      syntax,
      parent: file,
      scope: file,
      scopeId: file.id,
      qualified: '',
      identity: '<module>',
    }));
  const add = (
    syntax: Node,
    kind: Exclude<NodeKind, 'external'>,
    name: string,
    frame: Frame,
    meta: NodeMetadata = {},
    identityName = name,
  ) => {
    const identity = `${frame.identity}.${identityName}`;
    const key = JSON.stringify([frame.parent.id, kind, identityName]);
    const occurrence = counts.get(key) ?? 0;
    counts.set(key, occurrence + 1);
    const node: SourceNode = {
      id: stableNodeId(fileId, kind, identity, occurrence),
      kind,
      name,
      fileId,
      range: syntaxRange(syntax),
      parentId: frame.parent.id,
      children: [],
      meta: {
        qualifiedName: [frame.qualified, identityName].filter(Boolean).join('.'),
        hasError: syntax.hasError,
        ...(frame.branch ? { branch: frame.branch } : {}),
        ...meta,
      },
    };
    frame.parent.children.push(node.id);
    result.nodes.push(node);
    return { node, identity: `${identity}#${occurrence}` };
  };
  const pushChildren = (syntax: Node, frame: Frame) => {
    for (const child of syntax.namedChildren.slice().reverse())
      stack.push({ ...frame, syntax: child });
  };
  const bind = (
    node: SourceNode,
    name: string,
    kind: PythonSymbol['kind'],
    frame: Frame,
    imported?: PythonImport,
  ) => {
    result.facts.symbols.push({
      name,
      nodeId: node.id,
      scopeId: frame.scopeId,
      kind,
      range: node.range,
      conditional: frame.branch !== undefined || frame.parent.kind === 'loop',
      ...(imported ? { imported } : {}),
    });
  };
  const collectionFrame = (syntax: Node, frame: Frame): Frame => {
    if (!syntax.type.includes('comprehension') && syntax.type !== 'generator_expression')
      return frame;
    const scopeId = `scope:${frame.parent.id}:${syntax.startIndex}`;
    result.facts.scopes.push({ id: scopeId, parentId: frame.scopeId, kind: 'comprehension' });
    return { ...frame, scopeId };
  };
  while (stack.length) {
    const frame = stack.pop()!;
    const syntax = frame.syntax;
    if (syntax.type === 'comment') continue;
    if (syntax.type === 'call') {
      const callee = field(syntax, 'function');
      if (callee)
        result.facts.calls.push({
          from: frame.scope.id,
          scopeId: frame.scopeId,
          name: callee.text,
          range: syntaxRange(syntax),
        });
    }
    if (syntax.type === 'import_statement' || syntax.type === 'import_from_statement') {
      const created = add(syntax, 'import', syntax.text.slice(0, 120), frame, {}, syntax.text);
      const moduleNode = field(syntax, 'module_name');
      const moduleName = moduleNode?.text ?? '';
      const level = moduleName.match(/^\.+/)?.[0].length ?? 0;
      const entries = syntax.namedChildren.filter(
        (child) => child.id !== moduleNode?.id && child.type !== 'comment',
      );
      for (const entry of entries) {
        const original = field(entry, 'name')?.text ?? entry.text;
        const alias = field(entry, 'alias')?.text;
        const imported: PythonImport =
          syntax.type === 'import_statement'
            ? { nodeId: created.node.id, scopeId: frame.scopeId, module: original, level: 0, alias }
            : {
                nodeId: created.node.id,
                scopeId: frame.scopeId,
                module: moduleName.slice(level),
                level,
                name: original,
                alias,
              };
        result.facts.imports.push(imported);
        if (original !== '*')
          bind(
            created.node,
            alias ?? (syntax.type === 'import_statement' ? original.split('.')[0] : original),
            'import',
            frame,
            imported,
          );
      }
      continue;
    }

    if (
      syntax.type === 'function_definition' ||
      syntax.type === 'class_definition' ||
      syntax.type === 'lambda'
    ) {
      const isClass = syntax.type === 'class_definition';
      const name =
        field(syntax, 'name')?.text ?? (syntax.type === 'lambda' ? '<lambda>' : '<incomplete>');
      const params = parameters(field(syntax, 'parameters'));
      const created = add(
        syntax,
        isClass
          ? 'class'
          : syntax.type !== 'lambda' && frame.scope.kind === 'class'
            ? 'method'
            : 'function',
        name,
        frame,
        isClass
          ? {}
          : {
              params: params.map((p) => p.info),
              returnType: preview(field(syntax, 'return_type')),
            },
      );
      bind(created.node, name, 'definition', frame);
      result.facts.scopes.push({
        id: created.node.id,
        parentId: frame.scopeId,
        kind: isClass ? 'class' : created.node.kind === 'method' ? 'method' : 'function',
      });
      if (isClass)
        for (const base of field(syntax, 'superclasses')?.namedChildren ?? []) {
          if (base.type !== 'keyword_argument' && base.type !== 'comment')
            result.facts.bases.push({
              from: created.node.id,
              scopeId: frame.scopeId,
              name: base.text,
              range: syntaxRange(base),
            });
        }
      const nested: Frame = {
        ...frame,
        parent: created.node,
        scope: created.node,
        scopeId: created.node.id,
        qualified: created.node.meta.qualifiedName!,
        identity: created.identity,
        branch: undefined,
      };
      for (const parameter of params) {
        const item = add(parameter.syntax, 'variable', parameter.info.name, nested, {
          role: 'parameter',
          typeHint: parameter.info.typeHint,
          valueType: valueType(null, parameter.info.typeHint),
        });
        bind(item.node, parameter.info.name, 'parameter', nested);
      }
      const body = field(syntax, 'body');
      if (body) stack.push({ ...nested, syntax: body });
      // Defaults/bases/annotations are evaluated in the containing lexical scope.
      for (const child of syntax.namedChildren.slice().reverse()) {
        if (child.id !== body?.id && child.id !== field(syntax, 'name')?.id)
          stack.push({ ...frame, parent: created.node, syntax: child });
      }
      continue;
    }
    if (
      syntax.type === 'assignment' ||
      syntax.type === 'augmented_assignment' ||
      syntax.type === 'named_expression'
    ) {
      const left = field(syntax, 'left') ?? field(syntax, 'name');
      const right = field(syntax, 'right') ?? field(syntax, 'value');
      const hint = preview(field(syntax, 'type'));
      const found = targets(left);
      let owner = frame;
      for (const target of found) {
        const collection = found.length === 1 && right && collections[right.type];
        const created = add(syntax, collection ? 'collection' : 'variable', target.text, frame, {
          typeHint: hint,
          valueType: valueType(right, hint),
          ...(target.type === 'attribute' ? { role: 'attribute' as const } : {}),
          ...(collection ? collectionMeta(right!) : {}),
        });
        if (target.type === 'identifier')
          bind(
            created.node,
            target.text,
            'variable',
            syntax.type === 'named_expression' ? { ...frame, scopeId: frame.scope.id } : frame,
          );
        if (found.length === 1)
          owner = { ...frame, parent: created.node, identity: created.identity };
      }
      if (right) {
        if (collections[right.type]) pushChildren(right, collectionFrame(right, owner));
        else stack.push({ ...owner, syntax: right });
      }
      continue;
    }
    if (
      syntax.type === 'for_statement' ||
      syntax.type === 'while_statement' ||
      syntax.type === 'for_in_clause'
    ) {
      const isWhile = syntax.type === 'while_statement';
      const asynchronous = syntax.children.some((n) => n.type === 'async');
      const loopKind =
        syntax.type === 'for_in_clause'
          ? 'comprehension'
          : isWhile
            ? 'while'
            : asynchronous
              ? 'async for'
              : 'for';
      const created = add(
        syntax,
        'loop',
        isWhile ? 'while' : `for ${preview(field(syntax, 'left')) ?? '…'}`,
        frame,
        { loopKind },
        isWhile ? 'while' : 'for',
      );
      const nested = { ...frame, parent: created.node, identity: created.identity };
      for (const target of targets(field(syntax, 'left'))) {
        const item = add(target, 'variable', target.text, nested, { valueType: 'other' });
        if (target.type === 'identifier') bind(item.node, target.text, 'variable', nested);
      }
      for (const child of syntax.namedChildren.slice().reverse())
        if (child.id !== field(syntax, 'left')?.id) stack.push({ ...nested, syntax: child });
      continue;
    }
    if (
      [
        'if_statement',
        'elif_clause',
        'conditional_expression',
        'match_statement',
        'if_clause',
      ].includes(syntax.type)
    ) {
      const ternary = syntax.type === 'conditional_expression';
      const alternatives = syntax.namedChildren.filter(
        (n) => n.type === 'elif_clause' || n.type === 'else_clause',
      );
      const name =
        syntax.type === 'match_statement' ? 'match' : syntax.type === 'elif_clause' ? 'elif' : 'if';
      const created = add(
        syntax,
        'condition',
        `${name} ${preview(field(syntax, 'condition')) ?? ''}`.trim(),
        frame,
        {
          conditionKind: ternary
            ? 'ternary'
            : name === 'match'
              ? 'match'
              : syntax.type === 'if_clause'
                ? 'filter'
                : 'if',
          branchCount: ternary
            ? 2
            : name === 'match'
              ? (field(syntax, 'body')?.namedChildren.length ?? 0)
              : 2 + alternatives.filter((n) => n.type === 'elif_clause').length,
        },
        name,
      );
      const nested = { ...frame, parent: created.node, identity: created.identity };
      const consequence = field(syntax, 'consequence');
      const ternaryParts = ternary ? syntax.namedChildren : [];
      for (const child of syntax.namedChildren.slice().reverse())
        stack.push({
          ...nested,
          syntax: child,
          branch:
            ternary && child.id === ternaryParts[0]?.id
              ? 'true'
              : ternary && child.id === ternaryParts[2]?.id
                ? 'false'
                : child.type === 'else_clause'
                  ? 'false'
                  : child.type === 'elif_clause'
                    ? 'elif'
                    : child.id === consequence?.id
                      ? 'true'
                      : undefined,
        });
      continue;
    }
    if (collections[syntax.type]) {
      const created = add(
        syntax,
        'collection',
        collections[syntax.type],
        frame,
        collectionMeta(syntax),
      );
      pushChildren(
        syntax,
        collectionFrame(syntax, { ...frame, parent: created.node, identity: created.identity }),
      );
      continue;
    }
    pushChildren(syntax, frame);
  }
  return result;
}
