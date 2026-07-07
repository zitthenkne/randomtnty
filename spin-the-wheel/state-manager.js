import { DEFAULT_STATE, SCHEMA_VERSION } from "./defaults.js";
import { debounce, deepClone, safeLocalStorageGet, safeLocalStorageSet } from "./utils.js";

const CHANGE_EVENT = "change";

export class StateManager {
  constructor({ storageKey = "wheel_spinner_state_v2" } = {}) {
    this.storageKey = storageKey;
    this.listeners = new Map();
    this.state = deepClone(DEFAULT_STATE);
    this.undoStack = [];
    this.redoStack = [];
    this.historyLimit = 80;
    this.saveDebounced = debounce(() => this.persist(), 500);
  }

  initialize(decodedState = null) {
    const persistedState = this.loadFromStorage();
    this.undoStack = [];
    this.redoStack = [];
    if (decodedState) {
      this.state = this.migrateState(decodedState);
      this.emit(CHANGE_EVENT, this.getState(), "hydrate-share", this.getHistoryInfo());
      this.saveDebounced();
      return this.getState();
    }

    if (persistedState) {
      this.state = persistedState;
    }
    this.emit(CHANGE_EVENT, this.getState(), "initialize", this.getHistoryInfo());
    return this.getState();
  }

  getState() {
    return deepClone(this.state);
  }

  setState(nextState, { skipSave = false, reason = "manual", skipHistory = false } = {}) {
    const migrated = this.migrateState(nextState);
    if (!skipHistory) {
      this.undoStack.push(this.getState());
      if (this.undoStack.length > this.historyLimit) {
        this.undoStack.splice(0, this.undoStack.length - this.historyLimit);
      }
      this.redoStack = [];
    }
    this.state = migrated;
    this.emit(CHANGE_EVENT, this.getState(), reason, this.getHistoryInfo());
    if (!skipSave) this.saveDebounced();
  }

  update(recipe, options = {}) {
    const draft = this.getState();
    recipe(draft);
    this.setState(draft, options);
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  getHistoryInfo() {
    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoDepth: this.undoStack.length,
      redoDepth: this.redoStack.length
    };
  }

  undo() {
    if (!this.canUndo()) return false;
    const previous = this.undoStack.pop();
    this.redoStack.push(this.getState());
    this.state = this.migrateState(previous);
    this.emit(CHANGE_EVENT, this.getState(), "undo", this.getHistoryInfo());
    this.saveDebounced();
    return true;
  }

  redo() {
    if (!this.canRedo()) return false;
    const next = this.redoStack.pop();
    this.undoStack.push(this.getState());
    this.state = this.migrateState(next);
    this.emit(CHANGE_EVENT, this.getState(), "redo", this.getHistoryInfo());
    this.saveDebounced();
    return true;
  }

  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName).add(callback);
    return () => this.listeners.get(eventName)?.delete(callback);
  }

  emit(eventName, ...args) {
    const set = this.listeners.get(eventName);
    if (!set) return;
    set.forEach((callback) => callback(...args));
  }

  persist() {
    safeLocalStorageSet(this.storageKey, JSON.stringify(this.state));
  }

  loadFromStorage() {
    const raw = safeLocalStorageGet(this.storageKey);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return this.migrateState(parsed);
    } catch {
      return null;
    }
  }

  hydrateFromShare(shareState) {
    this.setState(shareState, { reason: "hydrate-share" });
  }

  migrateState(input) {
    const base = deepClone(DEFAULT_STATE);
    const merged = deepMerge(base, input || {});
    merged.schemaVersion = SCHEMA_VERSION;
    if (!Array.isArray(merged.entries)) merged.entries = [];
    if (!Array.isArray(merged.results)) merged.results = [];
    if (!merged.settings || typeof merged.settings !== "object") {
      merged.settings = {};
    }
    delete merged.settings.workspaceMode;
    delete merged.workspace;

    merged.entries = merged.entries.map((entry) => ({
      ...base.entries[0],
      ...entry
    }));

    return merged;
  }
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge(target, source) {
  if (!isPlainObject(source)) return target;
  Object.keys(source).forEach((key) => {
    const incoming = source[key];
    if (Array.isArray(incoming)) {
      target[key] = deepClone(incoming);
      return;
    }
    if (isPlainObject(incoming)) {
      const base = isPlainObject(target[key]) ? target[key] : {};
      target[key] = deepMerge(base, incoming);
      return;
    }
    target[key] = incoming;
  });
  return target;
}

export const STATE_EVENTS = {
  change: CHANGE_EVENT
};
