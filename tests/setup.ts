import { afterEach } from 'vitest';

/**
 * The jsdom-only setup is behind a guard because the same setup file runs for
 * specs that opt into the `node` environment — importing @testing-library/react
 * there would blow up on a missing `document`.
 */
if (typeof document !== 'undefined') {
  await import('@testing-library/jest-dom/vitest');
  const { cleanup } = await import('@testing-library/react');
  // `globals: false` disables RTL's automatic afterEach cleanup, so wire it up.
  afterEach(cleanup);
}
