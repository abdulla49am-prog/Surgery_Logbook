/* Surgical Logbook — OPFS storage worker.
 *
 * All Origin Private File System reads and writes happen here, never on the
 * main thread. iOS Safari only supports createSyncAccessHandle() inside a
 * dedicated worker, and does not support the main-thread createWritable()
 * stream at all, so this worker is the single path to OPFS on every platform.
 *
 * Messages in:  { id, type: 'probe' | 'read' | 'write', payload }
 * Messages out: { id, ok: true, result } or { id, ok: false, error }
 */
'use strict';

const FILE_NAME = 'surgical-logbook.json';

// Operations are queued so only one sync access handle is ever open at a time.
let queue = Promise.resolve();

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getFileHandle() {
  const root = await navigator.storage.getDirectory();
  return root.getFileHandle(FILE_NAME, { create: true });
}

// A sync access handle takes an exclusive lock. If another tab holds it,
// retry briefly before giving up (the main thread then falls back to IndexedDB).
async function openAccessHandle(fileHandle) {
  let lastError = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await fileHandle.createSyncAccessHandle();
    } catch (err) {
      lastError = err;
      await wait(120 * (attempt + 1));
    }
  }
  throw lastError || new Error('Could not open the logbook file.');
}

// Older Safari versions (15.2–16.3) return promises from the access-handle
// methods; newer engines return values synchronously. Awaiting covers both.
async function readFile() {
  const fileHandle = await getFileHandle();
  const access = await openAccessHandle(fileHandle);
  try {
    const size = await access.getSize();
    if (!size) return '';
    const buffer = new Uint8Array(size);
    await access.read(buffer, { at: 0 });
    return new TextDecoder().decode(buffer);
  } finally {
    await access.close();
  }
}

async function writeFile(text) {
  if (typeof text !== 'string') throw new Error('Nothing to write.');
  const bytes = new TextEncoder().encode(text);
  const fileHandle = await getFileHandle();
  const access = await openAccessHandle(fileHandle);
  try {
    await access.truncate(0);
    let written = 0;
    while (written < bytes.length) {
      const count = await access.write(bytes.subarray(written), { at: written });
      if (!count) throw new Error('The logbook file could not be written.');
      written += count;
    }
    await access.flush();
    return written;
  } finally {
    await access.close();
  }
}

async function probe() {
  if (!self.navigator || !navigator.storage || typeof navigator.storage.getDirectory !== 'function') {
    return { supported: false };
  }
  if (typeof FileSystemFileHandle === 'undefined' ||
      !('createSyncAccessHandle' in FileSystemFileHandle.prototype)) {
    return { supported: false };
  }
  // Prove the whole path works by opening and closing a real handle.
  const fileHandle = await getFileHandle();
  const access = await openAccessHandle(fileHandle);
  await access.close();
  return { supported: true };
}

self.onmessage = (event) => {
  const message = event.data || {};
  const { id, type, payload } = message;
  queue = queue.then(async () => {
    try {
      let result;
      if (type === 'probe') result = await probe();
      else if (type === 'read') result = await readFile();
      else if (type === 'write') result = await writeFile(payload);
      else throw new Error('Unknown storage request: ' + type);
      self.postMessage({ id, ok: true, result });
    } catch (err) {
      const name = err && err.name ? err.name + ': ' : '';
      const text = err && err.message ? err.message : String(err);
      self.postMessage({ id, ok: false, error: name + text });
    }
  });
};
