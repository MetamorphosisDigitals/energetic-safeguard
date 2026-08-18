/**
 * The application content catalog is the extension point for future flows, symbolic
 * supports, and purchasable content packs. Add data here; screens stay unchanged.
 */
import type { FlowCategory, PracticeStyle } from "./practices";

export type IconKey = "sun" | "shield" | "compass" | "leaf" | "heart" | "bolt";

export interface SupportFlowDefinition {
  id: FlowCategory;
  title: string;
  description: string;
  dashboardLabel: string;
  iconKey: IconKey;
  tint: "rose" | "plum" | "lavender" | "green" | "gold";
  artworkKey?: "arrival" | "boundary";
  intake: { question: string; options: string[] };
  suggestedPracticeId?: string;
  showOnDashboard: boolean;
}

export const supportFlows: SupportFlowDefinition[] = [
  { id: "morning", title: "Morning Check-In", description: "Begin the day with a more honest sense of your energy and capacity.", dashboardLabel: "START YOUR DAY", iconKey: "sun", tint: "rose", artworkKey: "arrival", intake: { question: "How does your energy feel as you begin?", options: ["Scattered or foggy", "Low or depleted", "Steady, but protective", "Already carrying a lot"] }, suggestedPracticeId: "morning-arrival", showOnDashboard: true },
  { id: "protect", title: "Protect Before an Interaction", description: "Prepare for a conversation or space that may ask a lot of you.", dashboardLabel: "BEFORE YOU MEET", iconKey: "shield", tint: "plum", artworkKey: "boundary", intake: { question: "What kind of interaction are you preparing for?", options: ["A work meeting", "A difficult conversation", "Family or caregiving", "A crowded or demanding space"] }, showOnDashboard: true },
  { id: "reset", title: "Ground & Reset", description: "Find one gentle way to return to yourself right where you are.", dashboardLabel: "FOR RIGHT NOW", iconKey: "compass", tint: "lavender", intake: { question: "What is asking for support right now?", options: ["I feel overstimulated", "I feel emotionally full", "I feel scattered", "I feel low on energy"] }, showOnDashboard: true },
  { id: "hygiene", title: "Improve My Energy Hygiene", description: "Choose one small practice to carry with you for the next seven days.", dashboardLabel: "FOR A PATTERN", iconKey: "leaf", tint: "green", intake: { question: "What pattern would you like to meet differently?", options: ["I overextend myself", "I carry other people’s feelings", "I struggle to transition", "I forget to check my capacity"] }, showOnDashboard: true },
  { id: "prepare", title: "Prepare for a Stressful Situation", description: "Gather your attention before something difficult, uncertain, or visible.", dashboardLabel: "BEFORE A MOMENT", iconKey: "heart", tint: "gold", intake: { question: "What are you preparing for?", options: ["A difficult conversation", "Speaking or presenting", "An appointment or interview", "A family gathering"] }, showOnDashboard: true },
  { id: "emergency", title: "One-Minute Reset", description: "Take one small, eyes-open step toward steadiness.", dashboardLabel: "QUICK RESET", iconKey: "bolt", tint: "lavender", intake: { question: "What support feels most available?", options: ["A quiet reset", "Eyes-open grounding", "A little more space", "One small next step"] }, suggestedPracticeId: "one-minute-emergency-reset", showOnDashboard: false },
];

export const practiceStyleOptions: { id: PracticeStyle | "either" | "choose"; label: string; note: string }[] = [
  { id: "practical", label: "Practical & Grounded", note: "Sensory grounding, gentle movement, boundaries, and environmental support." },
  { id: "rose", label: "Rose Ray Support", note: "Optional symbolic Rose Ray imagery for gentle protection and reflection." },
  { id: "rose-crystal", label: "Rose + Crystal Support", note: "Optional Rose Ray and crystal symbolism. No physical crystal is required." },
  { id: "either", label: "Either is Fine", note: "Stay open to practical or symbolic support." },
  { id: "choose", label: "Choose for Me", note: "Let the practice library select what fits this moment." },
];

export const roseRays = {
  "pink-rose": { id: "pink-rose", name: "Pink Rose", symbolicTheme: "self-worth, softness, receiving" },
  "opalescent-aqua-rose": { id: "opalescent-aqua-rose", name: "Opalescent Aqua Rose", symbolicTheme: "emotional replenishment and gentleness" },
  "blue-rose": { id: "blue-rose", name: "Blue Rose", symbolicTheme: "truth, expression, discernment" },
  "copper-rose": { id: "copper-rose", name: "Copper Rose", symbolicTheme: "transformation and emotional sovereignty" },
  "golden-rose": { id: "golden-rose", name: "Golden Rose", symbolicTheme: "sovereignty, confidence, visibility, leadership" },
  "red-rose": { id: "red-rose", name: "Red Rose", symbolicTheme: "passion, creativity, devotion" },
  "pearl-white-rose": { id: "pearl-white-rose", name: "Pearl-White Rose", symbolicTheme: "compassion and mercy" },
  "violet-rose": { id: "violet-rose", name: "Violet Rose", symbolicTheme: "symbolic transmutation, completion, alignment" },
  "emerald-rose": { id: "emerald-rose", name: "Emerald Rose", symbolicTheme: "grounding, embodiment, wholeness" },
  "black-rose": { id: "black-rose", name: "Black Rose", symbolicTheme: "protection, privacy, boundaries" },
} as const;
export type RoseRayId = keyof typeof roseRays;

export const crystals = {
  "rose-quartz": { id: "rose-quartz", name: "Rose Quartz", symbolicTheme: "softness and receiving" },
  "black-tourmaline": { id: "black-tourmaline", name: "Black Tourmaline", symbolicTheme: "grounding and boundaries" },
  amethyst: { id: "amethyst", name: "Amethyst", symbolicTheme: "quiet reflection" },
  "lapis-lazuli": { id: "lapis-lazuli", name: "Lapis Lazuli", symbolicTheme: "discernment and expression" },
  citrine: { id: "citrine", name: "Citrine", symbolicTheme: "confidence and warmth" },
  "red-jasper": { id: "red-jasper", name: "Red Jasper", symbolicTheme: "embodiment and steadiness" },
  selenite: { id: "selenite", name: "Selenite", symbolicTheme: "clarity and spaciousness" },
  "golden-obsidian": { id: "golden-obsidian", name: "Golden Obsidian", symbolicTheme: "self-knowledge and boundaries" },
  carnelian: { id: "carnelian", name: "Carnelian", symbolicTheme: "creativity and vitality" },
  "orange-moonstone": { id: "orange-moonstone", name: "Orange Moonstone", symbolicTheme: "gentle transition" },
  "lemurian-seed-crystal": { id: "lemurian-seed-crystal", name: "Lemurian Seed Crystal", symbolicTheme: "personal meaning and intention" },
} as const;
export type CrystalId = keyof typeof crystals;

export const expansionPacks = {
  foundation: { id: "foundation", name: "Foundation Library", status: "active", access: "included", description: "The initial curated grounding, boundary, preparation, and reset practices." },
  "rose-ray-library": { id: "rose-ray-library", name: "Rose Ray Library", status: "planned", access: "future-updates", description: "Additional optional symbolic Rose Ray practices." },
  "rest-and-transition": { id: "rest-and-transition", name: "Rest & Transition", status: "planned", access: "future-updates", description: "Future practices for travel, grief, caregiving, transitions, and recovery." },
} as const;
export type ContentPackId = keyof typeof expansionPacks;

export const dailyAffirmations = [
  "I only need to meet this moment.",
  "My energy belongs to me.",
  "I can care without carrying everything.",
  "Rest is productive.",
  "I choose steadiness over urgency.",
] as const;

export function getFlow(flowId: FlowCategory) {
  return supportFlows.find((flow) => flow.id === flowId);
}
