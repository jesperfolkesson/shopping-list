import fs from "fs";

const input = fs.readFileSync("foods.txt", "utf8");

// dela upp rader, trimma, ta bort tomma
const lines = input
  .split(/\r?\n/)
  .map((s) => s.trim())
  .filter(Boolean);

// Regler: ord som oftast betyder “maträtt / rätt”
const dishKeywords = [
  "bagel",
  "baguette",
  "bakad potatis",
  "biff",
  "biryani",
  "blåbärspaj",
  "bondomelett",
  "borsjtj",
  "brownie",
  "börek",
  "caesarsallad",
  "caprese",
  "carbonara",
  "cheesecake",
  "chili con carne",
  "chili sin carne",
  "coleslaw",
  "cowboysoppa",
  "crêpe",
  "dolma",
  "fatteh",
  "fattiga riddare",
  "falafel m.",
  "fiskgratäng",
  "fisksoppa",
  "flygande jakob",
  "fransk bondsoppa",
  "gulaschsoppa",
  "gratäng",
  "grekisk sallad",
  "gryta",
  "hamburgare",
  "janssons frestelse",
  "järpar",
  "kebab",
  "kebabtallrik",
  "korv stroganoff",
  "kroppkakor",
  "lasagne",
  "moussaka",
  "nasi goreng",
  "nudelsoppa",
  "omelett",
  "osso buco",
  "paella",
  "paj",
  "pannbiff",
  "pannkaka",
  "pastagratäng",
  "pepparrotskött",
  "pirog",
  "pizza",
  "potatisgratäng",
  "potatissallad",
  "pytt i panna",
  "raggmunk",
  "ravioli",
  "risotto",
  "sandwich",
  "schnitzel",
  "sjömansbiff",
  "smörgåstårta",
  "sushi",
  "soppa",
  "taco ",
  "tiramisu",
  "toast m.",
  "tortellini",
  "tunnbrödrulle",
  "vårrulle",
  "wrap",
];

// Extra signaler
const dishSignals = [
  " tillagad på restaurang",
  " m. ", // “med”
  "fylld",
  "värmd",
];

// Undantag: saker som inte är maträtt fast de kan se “rättiga” ut
const keepExceptions = [
  "ketchup",
  "majonnäs",
  "aioli",
  "dressing",
  "senap",
  "sylt",
  "marmelad",
  "sås",
];

function isDish(line) {
  const s = line.toLowerCase();

  if (keepExceptions.some((k) => s.includes(k))) return false;
  if (dishSignals.some((sig) => s.includes(sig))) return true;
  if (dishKeywords.some((k) => s.includes(k))) return true;

  return false;
}
const removeWords = [
  "rå",
  "kokt",
  "stekt",
  "friterad",
  "värmd",
  "tillagad",
  "tillagad på restaurang",
  "ugn",
  "ugnsstekt",
  "panerad",
  "tacokryddad",
  "kryddad",
];

function cleanName(line) {
  let s = line;

  // Ta bort extra detaljer som ofta är tillagnings-/smak-varianter
  for (const w of removeWords) {
    s = s.replaceAll(new RegExp(`\\b${w}\\b`, "gi"), "");
  }

  // Special: blanda 50/50 eller 70/30
  // (enkel regel: om raden innehåller "nöt 50% gris 50%" osv)
  const low = line.toLowerCase();
  if (low.startsWith("blandfärs") && low.includes("%")) {
    const match = low.match(/nöt\s*(\d+)%\s*gris\s*(\d+)%/);
    if (match) {
      return `Blandfärs ${match[1]}/${match[2]}`.trim();
    }
    return "Blandfärs";
  }

  // Städa whitespace
  s = s.replace(/\s+/g, " ").trim();

  // Ta bort avslutande punkter/kommatecken om något blivit kvar
  s = s.replace(/[.,;:]+$/g, "").trim();

  // Om det blev tomt, fallback
  return s || line;
}
const notDishes = [];
const dishes = [];

for (const line of lines) {
  const low = line.toLowerCase();

  // skippa sidtext/rubriker
  if (
    low.startsWith("livsmedel") ||
    low.startsWith("ladda ner") ||
    low.startsWith("använd gärna") ||
    low.startsWith("livsmedelsverket")
  ) {
    continue;
  }

  (isDish(line) ? dishes : notDishes).push(line);
}

fs.writeFileSync("not_matratter.txt", notDishes.join("\n"), "utf8");
fs.writeFileSync("matratter.txt", dishes.join("\n"), "utf8");
// --- Skapa superenkel baslista för autocomplete/kategorisering ---
function baseName(line) {
  let s = line.trim();

  // Ta bort "typ ..." och allt efter (ofta närings-/variantinfo)
  s = s.replace(/\btyp\b.*$/i, "").trim();

  // Ta bort "m. ..." och allt efter (med ...)
  s = s.replace(/\sm\.\s.*$/i, "").trim();

  // Ta bort vanligt tillagnings-/format-ord och allt efter
  s = s.replace(
    /\b(rå|kokt|stekt|friterad|värmd|tillagad|ugnsstekt|panerad|wokad|grillad|inlagd|konserv\.)\b.*$/i,
    (match) => ""
  ).trim();

  // Ta bort procent, “fett”, “socker”, “fibrer” etc om de står kvar
  s = s.replace(/\b(fett|socker|fibrer)\b.*$/i, "").trim();
  s = s.replace(/\d+%.*$/i, "").trim();

  // Som sista steg: ta bara första “delen” innan kommatecken eller extra beskrivning
  // Ex: "Bröd fullkorn korn ..." -> "Bröd"
  // Ex: "Drickyoghurt smaksatt ..." -> "Drickyoghurt"
  
  const words = s.split(/\s+/).filter(Boolean);
if (words.length === 0) return line;

const first = words[0].toLowerCase();

// Om första ordet är en “förled” → ta två ord
const twoWordLeads = new Set([
  "flytande",
  "extra",
  "stark",
  "mild",
  "lätt",
  "mellan",
  "mini",
  "glutenfri",
  "laktosfri",
  "alkoholfri",
]);

if (twoWordLeads.has(first) && words.length >= 2) {
  return `${words[0]} ${words[1]}`;
}

return words[0];
}

const baseSet = new Set(notDishes.map(baseName));
const baseSuggestions = Array.from(baseSet).sort((a, b) =>
  a.localeCompare(b, "sv")
);

fs.writeFileSync("suggestions.txt", baseSuggestions.join("\n"), "utf8");

// skapa “förslagslista” med unika clean-namn
const suggestionsSet = new Set(notDishes.map(cleanName));
const suggestions = Array.from(suggestionsSet).sort((a, b) => a.localeCompare(b, "sv"));

fs.writeFileSync("suggestions.txt", suggestions.join("\n"), "utf8");
console.log("Klart!");
console.log("Inte maträtter:", notDishes.length);
console.log("Maträtter:", dishes.length);
console.log("Filer skapade: not_matratter.txt och matratter.txt");