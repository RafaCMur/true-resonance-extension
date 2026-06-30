import { vi } from "vitest";

const chromeRuntimeListenerCallbacks: Array<
  (msg: unknown, sender: unknown, sendResponse: (r: unknown) => void) => void
> = [];

const chromeStorageData: Record<string, unknown> = {};
const chromeStorageChangeListeners: Array<
  (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>) => void
> = [];

let badgeText = "";
let badgeColor = "#c4b5fd";

const chromeMock = {
  runtime: {
    getURL: vi.fn((path: string) => `chrome-extension://test-id/${path}`),
    onMessage: {
      addListener: vi.fn(
        (
          cb: (
            msg: unknown,
            sender: unknown,
            sendResponse: (r: unknown) => void,
          ) => void,
        ) => {
          chromeRuntimeListenerCallbacks.push(cb);
        },
      ),
      removeListener: vi.fn(),
    },
    sendMessage: vi.fn(() => Promise.resolve({ success: true })),
    onInstalled: {
      addListener: vi.fn(),
    },
    onStartup: {
      addListener: vi.fn(),
    },
    lastError: undefined,
  },

  storage: {
    local: {
      get: vi.fn(
        (
          keys: string | string[] | Record<string, unknown>,
          callback?: (result: Record<string, unknown>) => void,
        ) => {
          const result: Record<string, unknown> = {};
          if (typeof keys === "string") {
            result[keys] = chromeStorageData[keys];
          } else if (Array.isArray(keys)) {
            for (const k of keys) result[k] = chromeStorageData[k];
          } else {
            for (const k of Object.keys(keys)) result[k] = chromeStorageData[k] ?? keys[k];
          }
          if (callback) callback(result);
          return Promise.resolve(result);
        },
      ),
      set: vi.fn(
        (
          items: Record<string, unknown>,
          callback?: () => void,
        ) => {
          for (const [k, v] of Object.entries(items)) {
            chromeStorageData[k] = v;
          }
          if (callback) callback();
          return Promise.resolve();
        },
      ),
      remove: vi.fn(
        (keys: string | string[], callback?: () => void) => {
          const arr = Array.isArray(keys) ? keys : [keys];
          for (const k of arr) delete chromeStorageData[k];
          if (callback) callback();
          return Promise.resolve();
        },
      ),
    },
    onChanged: {
      addListener: vi.fn(
        (
          cb: (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>) => void,
        ) => {
          chromeStorageChangeListeners.push(cb);
        },
      ),
    },
  },

  action: {
    setBadgeText: vi.fn((opts: { text: string }) => {
      badgeText = opts.text;
      return Promise.resolve();
    }),
    setBadgeBackgroundColor: vi.fn((opts: { color: string }) => {
      badgeColor = opts.color;
      return Promise.resolve();
    }),
  },

  tabs: {
    query: vi.fn(() => Promise.resolve([])),
    onActivated: { addListener: vi.fn() },
    onRemoved: { addListener: vi.fn() },
    create: vi.fn(() => Promise.resolve({ id: 1 })),
    sendMessage: vi.fn(() => Promise.resolve()),
  },

  tabCapture: {
    getMediaStreamId: vi.fn(
      (
        _opts: { targetTabId: number },
        callback: (id: string) => void,
      ) => {
        callback("fake-stream-id");
      },
    ),
  },

  offscreen: {
    hasDocument: vi.fn(() => Promise.resolve(true)),
    createDocument: vi.fn(() => Promise.resolve()),
  },

  scripting: {
    executeScript: vi.fn(() => Promise.resolve()),
  },
};

vi.stubGlobal("chrome", chromeMock);

export function __resetChromeMocks() {
  chromeRuntimeListenerCallbacks.length = 0;
  chromeStorageChangeListeners.length = 0;
  badgeText = "";
  badgeColor = "#c4b5fd";
  for (const key of Object.keys(chromeStorageData)) {
    delete chromeStorageData[key];
  }
  vi.clearAllMocks();
}

export function __fireChromeMessage(
  msg: unknown,
  sender?: unknown,
): Promise<unknown> {
  return new Promise((resolve) => {
    const cb = chromeRuntimeListenerCallbacks[0];
    if (!cb) {
      resolve(undefined);
      return;
    }
    cb(msg, sender ?? {}, (response) => {
      resolve(response);
    });
  });
}

export function __fireStorageChange(
  changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
) {
  for (const cb of chromeStorageChangeListeners) {
    cb(changes);
  }
}

export function __getChromeStorageData() {
  return { ...chromeStorageData };
}

export function __setChromeStorageData(data: Record<string, unknown>) {
  for (const [k, v] of Object.entries(data)) {
    chromeStorageData[k] = v;
  }
}

export function __getBadgeText() {
  return badgeText;
}
