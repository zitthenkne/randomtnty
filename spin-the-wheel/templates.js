import { createEntry, TEAM_PICKER_NAMES } from "./defaults.js";
import { templateEntries, templateLabel } from "./i18n.js";

const ICEBREAKERS_EN = [
  "What hobby would you start this month?",
  "What is one skill you want to learn next?",
  "Coffee or tea?",
  "Morning person or night owl?",
  "What song do you replay the most?",
  "What place do you want to visit next?",
  "What makes a great teammate?",
  "What is your comfort food?",
  "What app can you not live without?",
  "What was your first job?",
  "What superpower would you pick?",
  "If you could meet anyone, who?",
  "Favorite way to relax after work?",
  "What is one thing that made you smile this week?",
  "What movie can you watch repeatedly?",
  "What was your favorite class in school?",
  "What book changed your perspective?",
  "What motivates you most?",
  "What weekend activity recharges you?",
  "What is your hidden talent?"
];

const LUNCH_EN = [
  "Vietnamese",
  "Japanese",
  "Korean BBQ",
  "Thai",
  "Pizza",
  "Burgers",
  "Sushi",
  "Salad Bar",
  "Mexican",
  "Indian",
  "Sandwiches",
  "Noodles",
  "BBQ",
  "Seafood",
  "Street Food"
];

const CHORES_EN = [
  "Wash dishes",
  "Vacuum",
  "Take out trash",
  "Laundry",
  "Mop floor",
  "Clean bathroom",
  "Dust shelves",
  "Water plants",
  "Wipe kitchen counters",
  "Organize desk",
  "Clean windows",
  "Feed pets"
];

export const TEMPLATE_DEFINITIONS = [
  { key: "yes_no", theme: "rainbow", entries: ["Yes", "No"] },
  { key: "yes_no_maybe", theme: "pastel", entries: ["Yes", "No", "Maybe"] },
  { key: "numbers_1_10", theme: "retro", entries: Array.from({ length: 10 }, (_, i) => String(i + 1)) },
  { key: "numbers_1_20", theme: "retro", entries: Array.from({ length: 20 }, (_, i) => String(i + 1)) },
  { key: "alphabet", theme: "ocean", entries: Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)) },
  { key: "days_week", theme: "winter", entries: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] },
  { key: "coin_flip", theme: "elegant", entries: ["Heads", "Tails"] },
  { key: "rps", theme: "neon", entries: ["Rock", "Paper", "Scissors"] },
  {
    key: "colors",
    theme: "candy",
    entries: ["Red", "Blue", "Green", "Yellow", "Purple", "Orange", "Pink", "Cyan"],
    sliceColors: ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#f97316", "#ec4899", "#06b6d4"]
  },
  { key: "truth_dare", theme: "sunset", entries: ["Truth", "Dare"] },
  { key: "icebreakers", theme: "pastel", entries: ICEBREAKERS_EN },
  { key: "lunch_picker", theme: "earth", entries: LUNCH_EN },
  { key: "chore_wheel", theme: "autumn", entries: CHORES_EN },
  { key: "team_picker", theme: "forest", entries: TEAM_PICKER_NAMES },
  { key: "raffle", theme: "casino", entries: ["Ticket 001", "Ticket 002", "Ticket 003", "Ticket 004", "Ticket 005"] }
];

export function getTemplatesForCurrentLanguage() {
  return TEMPLATE_DEFINITIONS.map((template) => {
    const localizedEntries = templateEntries(template.key);
    return {
      ...template,
      label: templateLabel(template.key),
      entries: Array.isArray(localizedEntries) && localizedEntries.length ? localizedEntries : template.entries
    };
  });
}

export function buildTemplateEntries(template) {
  return template.entries.map((label, index) => {
    const sliceColor = template.sliceColors?.[index] || null;
    return createEntry(label, { sliceColor });
  });
}
