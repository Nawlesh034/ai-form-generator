import assert from 'node:assert';
import { pathToFileURL } from 'node:url';

export function shouldBlockFormCreation(plan, formCount) {
  return plan !== 'paid' && formCount >= 3;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  assert.strictEqual(shouldBlockFormCreation('free', 0), false);
  assert.strictEqual(shouldBlockFormCreation('free', 2), false);
  assert.strictEqual(shouldBlockFormCreation('free', 3), true);
  assert.strictEqual(shouldBlockFormCreation('free', 10), true);
  assert.strictEqual(shouldBlockFormCreation(undefined, 3), true);
  assert.strictEqual(shouldBlockFormCreation('paid', 10), false);
  console.log('planLimit self-check passed');
}
