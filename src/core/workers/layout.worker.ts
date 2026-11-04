import { buildModelIndexes } from '../model/indexes';
import { hierarchicalLayout } from '../model/layout/hierarchy';
import type { CodeModel } from '../model/types';

self.onmessage = (event: MessageEvent<{ id: number; request: CodeModel }>) => {
  const { id, request } = event.data;
  try {
    const indexes = buildModelIndexes(request);
    self.postMessage({
      id,
      result: { layout: hierarchicalLayout(request), indexes },
    });
  } catch (error) {
    self.postMessage({ id, error: String(error) });
  }
};
