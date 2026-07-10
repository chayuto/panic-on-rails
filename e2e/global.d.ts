/**
 * Makes the app's debug-bridge Window augmentation (`__PANIC_STORES__`,
 * `__PANIC_STAGE__`) visible to the e2e project (tsconfig.node.json).
 *
 * Type-only: pulls `src/utils/debugBridge.ts` into the compilation so its
 * `declare global` applies, without any runtime import of app code.
 */
export type { PanicStoreBridge } from '../src/utils/debugBridge';
