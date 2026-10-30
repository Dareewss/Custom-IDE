// @vitest-environment node
import { expect, it } from 'vitest';
import JSZip from 'jszip';
import { exportZip, importZip } from './zip';
import type { FileTree } from './vfs';
it('round-trips text files, nested and empty folders', async () => {
  const tree: FileTree = {
    lib: { kind: 'folder' },
    empty: { kind: 'folder' },
    'lib/code.py': { kind: 'file', content: 'print("Bună")\n' },
  };
  expect(await importZip(await exportZip(tree))).toEqual(tree);
});
it('rejects invalid and traversal archives', async () => {
  await expect(importZip(new ArrayBuffer(5))).rejects.toThrow();
  const zip = new JSZip();
  zip.file('../secret.py', 'private');
  await expect(
    importZip((await zip.generateAsync({ type: 'uint8array' })).buffer as ArrayBuffer),
  ).rejects.toThrow();
});
it('rejects declared oversized files before decompression', async () => {
  const buffer = await exportZip({ 'a.py': { kind: 'file', content: 'x' } });
  const data = new DataView(buffer);
  for (let i = 0; i < buffer.byteLength - 46; i++)
    if (data.getUint32(i, true) === 0x02014b50) {
      data.setUint32(i + 24, 3 * 1024 * 1024, true);
      break;
    }
  await expect(importZip(buffer)).rejects.toThrow('limit');
});
