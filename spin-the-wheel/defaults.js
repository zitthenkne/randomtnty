import { makeId } from "./utils.js";

export const SCHEMA_VERSION = 2;

export function createEntry(label, overrides = {}) {
  return {
    id: makeId(),
    label,
    subtitle: "",
    weight: 1,
    sliceColor: null,
    textColor: null,
    image: null,
    imageMode: "image-text",
    enabled: true,
    eliminated: false,
    winCount: 0,
    meta: {},
    ...overrides
  };
}

export const TEAM_PICKER_NAMES = [
  "Noah",
  "Olivia",
  "Sofia",
  "Isla",
  "Hugo",
  "Lucía",
  "Yi-seo",
  "Minato",
  "Liam"
];

export const DEFAULT_ENTRIES = [];

export const DEFAULT_STATE = {
  schemaVersion: SCHEMA_VERSION,
  title: "My Wheel",
  description: "",
  entries: DEFAULT_ENTRIES,
  tournament: {
    rounds: [],
    winnerId: null,
    winnerLabel: "",
    generatedAt: 0
  },
  results: [],
  settings: {
    mode: "normal",
    spinDuration: 5,
    spinTurns: 8,
    easingCurve: "cubic-out",
    manualStop: false,
    randomInitialAngle: true,
    showWeights: false,
    mysteryWheel: false,
    teamCount: 2,
    numberMin: 1,
    numberMax: 20,
    numberStep: 1,
    numberCount: 3,
    seedEnabled: false,
    seedValue: "",
    seedCursor: 0,
    celebrationMode: "confetti",
    cinematicMode: false,
    hapticsEnabled: true,
    idleAnimationEnabled: true,
    tournamentMode: false,
    performanceModeAuto: true,
    performanceOverview: false,
    confettiEnabled: true,
    reduceMotionOverride: false
  },
  theme: {
    preset: "tnty",
    sliceColors: [],
    backgroundColor: "#2b0a0d",
    borderColor: "#ffffff22",
    borderWidth: 2,
    pointerStyle: "classic",
    centerStyle: "image",
    centerImage: "logo_clb.png",
    centerText: "",
    centerColor: null,
    fontFamily: "auto",
    pageTheme: "light",
    backgroundType: "default",
    backgroundSolid: "#2b0a0d",
    backgroundGradientFrom: "#2b0a0d",
    backgroundGradientTo: "#6f1d27",
    backgroundGradientAngle: 150,
    backgroundImage: null,
    eventPreset: "default"
  },
  audio: {
    tickSound: "click",
    winSound: "fanfare",
    spinSound: "whoosh",
    masterVolume: 0.7,
    tickEnabled: true,
    winEnabled: true,
    spinEnabled: false
  },
  ui: {
    language: "en",
    activeTab: "entries",
    firstRunHintDismissed: false
  }
};

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "es", label: "Español" },
  { code: "pt", label: "Português" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "zh", label: "简体中文" },
  { code: "id", label: "Bahasa Indonesia" }
];

export const HREFLANG_CODES = ["en", "vi", "es", "pt", "fr", "de", "ja", "ko", "zh", "id"];
