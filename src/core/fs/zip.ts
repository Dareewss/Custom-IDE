import JSZip from 'jszip';
import { createNode, dirname, normalizePath, type FileTree } from './vfs';
const MAX_TOTAL = 20 * 1024 * 1024;
const MAX_FILE = 2 * 1024 * 1024;

export function inspectZip(bytes: ArrayBuffer) {
  if (bytes.byteLength > 25 * 1024 * 1024) throw new Error('ZIP must be smaller than 25 MiB.');
  const view = new DataView(bytes);
  let end = -1;
  for (
    let offset = bytes.byteLength - 22;
    offset >= Math.max(0, bytes.byteLength - 65_557);
    offset--
  ) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      end = offset;
      break;
    }
  }
  if (end < 0) throw new Error('Invalid ZIP archive.');
  if (view.getUint16(end + 4, true) || view.getUint16(end + 6, true))
    throw new Error('Multi-volume ZIP archives are unsupported.');
  const count = view.getUint16(end + 10, true);
  if (count > 2000) throw new Error('ZIP contains too many entries (maximum 2000).');
  let offset = view.getUint32(end + 16, true);
  let total = 0;
  const seen = new Set<string>();
  for (let index = 0; index < count; index++) {
    if (offset + 46 > end || view.getUint32(offset, true) !== 0x02014b50)
      throw new Error('Invalid ZIP directory.');
    const size = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const next =
      offset +
      46 +
      nameLength +
      view.getUint16(offset + 30, true) +
      view.getUint16(offset + 32, true);
    if (next > end || view.getUint16(offset + 8, true) & 1)
      throw new Error('Invalid or encrypted ZIP entry.');
    total += size;
    if (size > MAX_FILE || total > MAX_TOTAL)
      throw new Error('ZIP exceeds the 2 MiB per file or 20 MiB total limit.');
    const path = normalizePath(
      new TextDecoder('utf-8', { fatal: true }).decode(
        new Uint8Array(bytes, offset + 46, nameLength),
      ),
    );
    if (!path || seen.has(path)) throw new Error('ZIP has an empty or duplicate project path.');
    seen.add(path);
    offset = next;
  }
}
export async function importZip(bytes: ArrayBuffer): Promise<FileTree> {
  inspectZip(bytes);
  const zip = await JSZip.loadAsync(bytes, { checkCRC32: true });
  let tree: FileTree = {};
  let total = 0;
  const folder = (path: string) => {
    if (!path) return;
    folder(dirname(path));
    if (!tree[path]) tree = createNode(tree, path, { kind: 'folder' });
    else if (tree[path].kind !== 'folder')
      throw new Error('ZIP has conflicting files and folders.');
  };
  for (const file of Object.values(zip.files)) {
    const path = normalizePath(file.unsafeOriginalName ?? file.name);
    if (file.dir) {
      folder(path);
      continue;
    }
    const permissions = Number(file.unixPermissions ?? 0);
    if ((permissions & 0xf000) === 0xa000) throw new Error('Symbolic links are unsupported.');
    const data = await file.async('uint8array');
    total += data.length;
    if (data.length > MAX_FILE || total > MAX_TOTAL) throw new Error('ZIP exceeds import limits.');
    const content = new TextDecoder('utf-8', { fatal: true }).decode(data);
    if (content.includes('\0')) throw new Error(`Binary file is unsupported: ${path}`);
    folder(dirname(path));
    tree = createNode(tree, path, { kind: 'file', content });
  }
  return tree;
}
export async function exportZip(tree: FileTree): Promise<ArrayBuffer> {
  const zip = new JSZip();
  for (const [path, node] of Object.entries(tree)) {
    const safe = normalizePath(path);
    if (node.kind === 'folder') zip.folder(safe);
    else zip.file(safe, node.content);
  }
  const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  return bytes.buffer as ArrayBuffer;
}
