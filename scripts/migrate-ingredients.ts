import { createClient } from '@supabase/supabase-js';

type CategoryRule = { category: string; words: string[] };

const supabaseUrl = 'https://ravdwfzyaqdjqqolkewr.supabase.co'; // ← Byt ut
const supabaseKey = 'sb_publishable_KGGroHpQgk8nXw2V0BH8_g_vhdSoeHu'; // ← Byt ut

const supabase = createClient(supabaseUrl, supabaseKey);

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: "Frukt & grönt",
    words: [
      "ananas",
    "apelsin",
    "blodapelsin",
    "aprikos",
    "aubergine",
    "avokado",
    "banan",
    "blekselleri",
    "stjälkselleri",
    "blomkål",
    "bondböna",
    "broccoli",
    "brysselkål",
    "rosenkål",
    "brytböna",
    "champinjon",
    "chili",
    "citron",
    "endiv",
    "fänkål",
    "granatäpple",
    "grapefrukt",
    "grönkål",
    "gul lök",
    "gurka",
    "ingefära",
    "jordärtskocka",
    "kaktusfikon",
    "kinakål",
    "salladskål",
    "kiwi",
    "klementin",
    "kronärtskocka",
    "kryddkrasse",
    "smörgåskrasse",
    "kålrabbi",
    "kålrot",
    "lime",
    "majrova",
    "majs",
    "mandarin",
    "mango",
    "mangold",
    "melon",
    "morot",
    "morötter",
    "nektarin",
    "pak choy",
    "palmkål",
    "svartkål",
    "palsternacka",
    "paprika",
    "pepparrot",
    "persika",
    "persilja",
    "potatis",
    "pumpa",
    "purjolök",
    "päron",
    "radicchio",
    "rosensallat",
    "ramiro",
    "romanesco",
    "rotpersilja",
    "persiljerot",
    "rotselleri",
    "rucola",
    "rädisa",
    "rödbeta",
    "rödkål",
    "rödlök",
    "salladslök",
    "piplök",
    "sallat",
    "savojkål",
    "schalottenlök",
    "skärböna",
    "sparris",
    "spenat",
    "spetskål",
    "sugar snaps",
    "svartrot",
    "sötpotatis",
    "timjan",
    "tomat",
    "vattenkrasse",
    "vaxböna",
    "vindruva",
    "vitkål",
    "vitlök",
    "zucchini",
    "äpple",
    ],
  },
  {
    category: "Mejeri & kylvaror",
    words: [
      "mjölk","laktosfri mjölk","fil","yoghurt","grekisk yoghurt","kvarg",
      "grädde","matlagningsgrädde","vispgrädde",
      "crème fraiche","creme fraiche","gräddfil","turkisk yoghurt",
      "smör","bregott","margarin",
      "ost","riven ost","mozzarella","feta","halloumi","parmesan","cheddar",
      "keso","ricotta",
      "ägg",
    ],
  },
  {
    category: "Kött",
    words: [
      "kött","nöt","nötkött","fläsk","fläskkött","lamm",
      "kyckling","kalkon",
      "färs","blandfärs","nötfärs","fläskfärs",
      "korv","falukorv","chorizo","prinskorv",
      "bacon","skinka","salami","pålägg",
      "köttbull","hamburg","biff","entrecote","kotlett","revben",
      "kycklingfilé","kycklingbröst","kycklinglår","kycklingvingar","kycklingfärs",
      "kalkonfilé","kalkonbröst",
      "fläskfilé","fläskkotlett","fläskkarré","grisfötter","fläsklägg","sidfläsk",
      "oxfilé","oxkött","högrev","rostbiff","fransyska","ryggbiff",
      "lamm","lammkotlett","lammfilé","lammfärs",
      "grillkorv","isterband","medvurst","leverkorv","blodkorv","bratwurst",
      "skivad skinka","rökt skinka","kokt skinka","lufttorkad skinka","serranoskinka",
      "köttfärs","strimlad skinka","parmaskinka",
      "fläskkarre","revbensspjäll","kycklingklubbor","schnitzel",
      "hamburgare","kycklingburger",
      "pulled pork","kycklinglever","kalvlever"
    ],
  },
  {
    category: "Fisk & skaldjur",
    words: [
      "fisk","lax","torsk","sej","kolja","makrill","sill","strömming",
      "tonfisk","räka","räkor","kräft","krabba","mussla",
      "fiskpinnar","surimi",
      "rom","kaviar", "laxfilé","regnbågslax","vildlax","gravad lax","rökt lax","laxsida",
      "torskfilé","torskrygg","skarpsill",
      "abborre","gädda","gös","öring","forell","harr",
      "hälleflundra","rödspätta","tonfisk på burk","tonfiskfilé",
      "handrensade räkor","cocktailräkor","jätteräkor","tiger räkor",
      "kräftor","hummer","langust","havskräfta",
      "musslor","blåmusslor","ostron","pilgrimsmusslor",
      "bläckfisk","tioarmad bläckfisk","bläckfiskringar","sepia",
      "fiskbullar","fiskgratäng","fiskfärsbiff","skaldjursmix",
      "löjrom","sikrom","forellrom","stenbitsrom",
      "ansjovis","sardiner","böckling","inkokta räkor"
    ],
  },
  {
    category: "Bröd & spannmål",
    words: [
      "bröd","limpa","fralla","bulle","baguette","pitabröd","tortilla","wrap",
      "korvbröd","hamburgerbröd",
      "knäckebröd","skorpor","kex",
      "pasta","spaghetti","makaron","penne","fusilli",
      "ris","basmatiris","jasminris","råris",
      "vetemjöl","rågmjöl","dinkel","havre",
      "gryn","havregryn","mannagryn",
      "couscous","bulgur","quinoa",
      "müsli","granola", "ciabatta","focaccia","naan","surdegsbröd","fullkornsbröd","grahamsbröd","formbröd",
      "rågbröd","rågkaka","hårt bröd","kavring","tunnbröd","polarkakor",
      "croissant","pain au chocolat","wienerbröd","kanelbulle","kardemummabulle","chokladboll",
      "toast","rostat bröd","rostat formbröd","frukostfralla",
      "brioche","bagel","pumpernickel","matbröd",
      "tagliatelle","lasagneplattor","ravioli","tortellini","farfalle","rigatoni","makaroner",
      "spaghettini","linguine","fettuccine","pappardelle",
      "risoni","orzo","fullkornsris","sushiris","arborio",
      "bovete","hirs","spelt","rågflingor","korngryn","bygg",
      "havrefras","välling",
      "nudlar","risnudlar","äggnudlar","ramennudlar","udon","soba",
      "majsmjöl","durumvete","sesamfrön","linfrön","solrosfrön","pumpafrön"
    ],
  },
  {
    category: "Konserver & torrvaror",
    words: [
      "krossade tomater","tomatpuré","passata",
      "bönor","kidneybönor","svarta bönor","kikärtor","linser",
      "majs på burk","tonfisk på burk",
      "buljong","fond",
      "mjöl","socker","salt","peppar",
      "bakpulver","vaniljsocker","jäst",
      "tacoskal", "hönsbuljong","köttbuljong","grönsaksbuljong","fiskbuljong","grönsaksfond","kalvfond",
      "burrito","tortillachips","nachochips",
      "strösocker","florsocker","farinsocker","muscovadosocker","pärlsocker","kandissocker",
      "havssalt","grovt salt","flingsalt","himalayasalt","örtsalt","vitpeppar","svartpeppar","peppar mald",
      "torrjäst","färsk jäst","bikarbonat","potatismjöl","majsstärkelse","fiberhusk",
      "russin","torkade aprikoser","torkade dadlar","torkade fikon","torkade plommon","torkade bär","torkade tranbär",
      "sesamfrön","solrosfrön","pumpafrön","chiafrön","vallmofrön",
      "riven kokos","kakao","mörk choklad","mjölkchoklad","chokladknappar","bakmix"
    ],
  },
  {
    category: "Kryddor & såser",
    words: [
      "ketchup","senap","majonnäs","aioli",
      "soja","teriyaki","sweet chili","chilisås",
      "sriracha","tabasco",
      "vinäger","balsamvinäger",
      "olja","olivolja","rapsolja",
      "dressing","pesto",
      "tacosås","salsa","tacokrydda","dijonsenap","grovkornig senap","honungssenap","amerikansk senap",
      "majonnäs lätt","vegan majonnäs","vitlöksaioli","chipotle aioli",
      "sojasås","ljus soja","mörk soja","tamari","fisksås","ostronsås",
      "hoisinsås","teriyakisås","sötsur sås","plommon sås",
      "sambal oelek","harissa","chipotle","jalapeño",
      "vinägrett","rödvinsvinäger","vitvinsvinäger","äppelcidervinäger","risvinäger",
      "sesamolja","kokosolja","solrosolja","majsolja","avokadoolja","tryffelolja",
      "basilika"
    ],
  },
  {
    category: "Snacks, godis & läsk",
    words: [
      "chips","cheez","ostbågar","snacks","nötter","mandel","cashew","jordnöt",
      "popcorn",
      "godis","choklad","kexchoklad","gele","lakrits","tablett",
      "glass","klubba",
      "läsk","cola","pepsi","coca-cola","fanta","sprite",
      "energydryck","red bull",
      "saft","juice","läskeblask",
    ],
  },
  {
    category: "Frys",
    words: [
      "fryst","frysta","djupfryst",
      "frysta grönsaker","frysta bär",
      "fryst pizza","fiskpinnar", "fryst kyckling","fryst kycklingfilé","fryst lax","fryst torsk","fryst fisk",
      "frysta räkor","frysta musslor","frysta skaldjur",
      "frysta ärtor","fryst broccoli","fryst blomkål","fryst spenat","fryst wokgrönsaker","fryst ratatouille","fryst grönsaksmix",
      "frysta hallon","frysta blåbär","frysta jordgubbar","frysta lingon","frysta blandade bär",
      "fryst pizza","fryst kebabpizza","fryst vesuvio",
      "frysta pommes frites","frysta klyftpotatis","frysta potatisbollar","frysta kroketter",
      "frysta pannkakor","frysta våfflor","fryst paj","fryst smördeg","fryst fyllningsdeg",
      "glasspinne","glassstrut","glassburk","frysta köttbullar",
      "frysta hamburgare","fryst lasagne","fryst gratäng","frysta korvar","frysta piroger"
    ],
  },
  {
    category: "Hygien & hushåll",
    words: [
      "toapapper","hushållspapper","papper",
      "diskmedel","tvättmedel","sköljmedel",
      "tandkräm","tandborste","schampo","balsam","tvål",
      "deodorant", "toalettpapper","köksrulle","näsdukar","pappersservetter","våtservetter",
      "diskborste","disktrasa","svamp","mikrofiberduk","städtrasa","golvmopp",
      "diskmaskin tabletter","diskmaskin salt","diskmaskin sköljmedel","maskinrent",
      "tvättpulver","flytande tvättmedel","färgtvättmedel","fintvätt","fläckborttagning",
      "sköljmedel","ylletvätt","sporttvättmedel",
      "tandtråd","munsköljning","tandpetare",
      "duschgel","duschkräm","bodylottion"
    ],
  },
];

async function migrateIngredients() {
  console.log('🚀 Startar migrering av ingredienser...');
  
  let total = 0;
  
  for (const rule of CATEGORY_RULES) {
    console.log(`📦 Migrerar kategori: ${rule.category}`);
    
    for (const word of rule.words) {
      const { error } = await supabase
        .from('ingredients')
        .upsert({ 
          name: word.toLowerCase(),
          category: rule.category,
          approved: true,
          times_used: 0
        }, { 
          onConflict: 'name'
        });
      
      if (error) {
        console.error(`❌ Fel vid: ${word}`, error);
      } else {
        total++;
      }
    }
  }
  
  console.log(`✅ Klart! Migrerade ${total} ingredienser.`);
}

migrateIngredients();