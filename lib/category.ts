import { CATEGORY_RULES } from "./categoryRules";

export function detectCategory(name: string): string {
  const n = name.toLowerCase();

  for (const rule of CATEGORY_RULES) {
    if (rule.words.some((w) => n.includes(w))) {
      return rule.category;
    }
  }
  return "Övrigt";
}

export function normalizeName(s: string) {
  return s.trim().toLowerCase();
}