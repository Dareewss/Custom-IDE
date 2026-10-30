import { expect, it } from 'vitest';
import { languageForPath } from './adapter';

it('resolves file languages without UI-specific branches', () => {
  expect(languageForPath('lib/math.py')?.monacoLanguage).toBe('python');
  expect(languageForPath('readme.txt')).toBeUndefined();
});
