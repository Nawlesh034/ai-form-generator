import assert from 'node:assert';
import { pathToFileURL } from 'node:url';

export function shouldBlockFormCreation(limit, formCount) {
  return formCount >= limit;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  assert.strictEqual(shouldBlockFormCreation(3, 0), false);
  assert.strictEqual(shouldBlockFormCreation(3, 2), false);
  assert.strictEqual(shouldBlockFormCreation(3, 3), true);
  assert.strictEqual(shouldBlockFormCreation(3, 10), true);
  assert.strictEqual(shouldBlockFormCreation(100, 45), false);
  assert.strictEqual(shouldBlockFormCreation(100, 100), true);
  assert.strictEqual(shouldBlockFormCreation(1000, 999), false);
  console.log('planLimit self-check passed');
}
