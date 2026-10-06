import type { ConversationWorkspace } from '@stackunseen/ui-core';

export interface ConversationStore {
  read: () => Promise<unknown>;
  transact: (update: (current: unknown) => ConversationWorkspace) => Promise<ConversationWorkspace>;
  close: () => void;
}
/** Optional actual browser persistence, opened only by an explicit host operation. */
export function indexedDBConversationStore(
  name = 'ai-interaction-conversation-example',
): ConversationStore {
  let database: IDBDatabase | undefined,
    opening: Promise<IDBDatabase> | undefined,
    closed = false;
  function open(): Promise<IDBDatabase> {
    if (closed) return Promise.reject(new Error('Conversation store closed.'));
    if (database) return Promise.resolve(database);
    if (opening) return opening;
    opening = new Promise((resolve, reject) => {
      const request = indexedDB.open(name, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('workspace'))
          request.result.createObjectStore('workspace');
      };
      request.onerror = () => reject(new Error('Conversation storage unavailable.'));
      request.onblocked = () => {
        closed = true;
        reject(new Error('Conversation storage upgrade blocked. Close older tabs.'));
      };
      request.onsuccess = () => {
        if (closed) {
          request.result.close();
          reject(new Error('Conversation store closed.'));
          return;
        }
        database = request.result;
        database.onversionchange = () => {
          database?.close();
          database = undefined;
          closed = true;
        };
        resolve(database);
      };
    });
    return opening;
  }
  return {
    async read() {
      const db = await open();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction('workspace', 'readonly'),
          request = transaction.objectStore('workspace').get('main');
        let value: unknown;
        request.onsuccess = () => {
          value = request.result;
        };
        transaction.oncomplete = () => resolve(value);
        transaction.onerror = transaction.onabort = () =>
          reject(new Error('Conversation read failed.'));
      });
    },
    async transact(update) {
      const db = await open();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction('workspace', 'readwrite'),
          store = transaction.objectStore('workspace'),
          request = store.get('main');
        let value: ConversationWorkspace, error: unknown;
        request.onsuccess = () => {
          try {
            value = update(request.result);
            store.put(value, 'main');
          } catch (cause) {
            error = cause;
            transaction.abort();
          }
        };
        transaction.oncomplete = () => resolve(value);
        transaction.onerror = transaction.onabort = () =>
          reject(error ?? new Error('Conversation transaction failed.'));
      });
    },
    close() {
      closed = true;
      database?.close();
      database = undefined;
    },
  };
}
