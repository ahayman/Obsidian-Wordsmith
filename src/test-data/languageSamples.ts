/**
 * Sample texts in various languages for testing language detection
 * and multilingual thesaurus functionality.
 *
 * Each sample includes:
 * - text: A paragraph of natural text (>20 chars for detection)
 * - shortText: A shorter phrase for edge case testing
 * - testWord: A word that should have synonyms in the language
 * - expectedSynonyms: Known synonyms for verification (from OMW data)
 */

export interface LanguageSample {
  code: string;
  name: string;
  text: string;
  shortText: string;
  testWord: string;
  expectedSynonyms?: string[];
}

/**
 * Sample texts for language detection testing.
 * These are natural language paragraphs that should be reliably detected.
 */
export const LANGUAGE_SAMPLES: LanguageSample[] = [
  // English
  {
    code: "en",
    name: "English",
    text: "The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet and is commonly used for font testing and typing practice.",
    shortText: "Hello world",
    testWord: "happy",
    expectedSynonyms: ["glad", "joyful", "content", "pleased"],
  },

  // Spanish
  {
    code: "es",
    name: "Spanish",
    text: "El español es una lengua romance que se originó en la península ibérica. Hoy en día es uno de los idiomas más hablados del mundo, con millones de hablantes nativos.",
    shortText: "Hola mundo",
    testWord: "feliz",
    expectedSynonyms: ["contento", "alegre", "dichoso"],
  },

  // French
  {
    code: "fr",
    name: "French",
    text: "La langue française est une langue romane parlée principalement en France, mais également dans de nombreux autres pays à travers le monde. Elle est connue pour sa beauté et sa précision.",
    shortText: "Bonjour le monde",
    testWord: "heureux",
    expectedSynonyms: ["content", "joyeux", "satisfait"],
  },

  // German
  {
    code: "de",
    name: "German",
    text: "Die deutsche Sprache ist eine westgermanische Sprache, die vor allem in Deutschland, Österreich und der Schweiz gesprochen wird. Sie ist für ihre langen zusammengesetzten Wörter bekannt.",
    shortText: "Hallo Welt",
    testWord: "glücklich",
    expectedSynonyms: ["froh", "zufrieden", "fröhlich"],
  },

  // Italian
  {
    code: "it",
    name: "Italian",
    text: "La lingua italiana è una lingua romanza parlata principalmente in Italia. È considerata una delle lingue più belle del mondo per la sua musicalità e melodia.",
    shortText: "Ciao mondo",
    testWord: "felice",
    expectedSynonyms: ["contento", "lieto", "allegro"],
  },

  // Portuguese (Brazilian)
  {
    code: "pt-BR",
    name: "Portuguese",
    text: "A língua portuguesa é uma língua românica que surgiu na região da Galiza. Hoje é falada em Portugal, Brasil e vários países africanos, sendo uma das línguas mais faladas do mundo.",
    shortText: "Olá mundo",
    testWord: "feliz",
    expectedSynonyms: ["contente", "alegre", "satisfeito"],
  },

  // Japanese
  {
    code: "ja",
    name: "Japanese",
    text: "日本語は日本で主に使用されている言語です。ひらがな、カタカナ、漢字という三つの文字体系を使用する独特な言語です。",
    shortText: "こんにちは",
    testWord: "嬉しい",
    expectedSynonyms: ["喜ばしい", "楽しい"],
  },

  // Korean
  {
    code: "ko",
    name: "Korean",
    text: "한국어는 대한민국과 조선민주주의인민공화국의 공용어입니다. 한글이라는 독자적인 문자 체계를 가지고 있으며, 매우 과학적인 언어로 알려져 있습니다.",
    shortText: "안녕하세요",
    testWord: "행복",
    expectedSynonyms: ["기쁨", "즐거움"],
  },

  // Russian
  {
    code: "ru",
    name: "Russian",
    text: "Русский язык является одним из наиболее распространённых языков мира. Он принадлежит к восточнославянской группе языков и использует кириллический алфавит.",
    shortText: "Привет мир",
    testWord: "счастливый",
    expectedSynonyms: ["радостный", "довольный"],
  },

  // Arabic
  {
    code: "ar",
    name: "Arabic",
    text: "اللغة العربية هي إحدى أكثر اللغات انتشاراً في العالم. يتحدث بها الملايين من الناس في الشرق الأوسط وشمال أفريقيا وهي لغة القرآن الكريم.",
    shortText: "مرحبا بالعالم",
    testWord: "سعيد",
    expectedSynonyms: ["فرح", "مسرور"],
  },

  // Turkish
  {
    code: "tr",
    name: "Turkish",
    text: "Türkçe, Türkiye ve Kıbrıs'ın resmi dilidir. Ural-Altay dil ailesinin Türk dilleri grubuna aittir ve dünyada yaklaşık seksen milyon kişi tarafından konuşulmaktadır.",
    shortText: "Merhaba dünya",
    testWord: "mutlu",
    expectedSynonyms: ["sevinçli", "mesut"],
  },

  // Polish
  {
    code: "pl",
    name: "Polish",
    text: "Język polski jest językiem zachodniosłowiańskim, używanym głównie w Polsce. Jest to jeden z trudniejszych języków europejskich do nauki ze względu na złożoną gramatykę.",
    shortText: "Witaj świecie",
    testWord: "szczęśliwy",
    expectedSynonyms: ["radosny", "zadowolony"],
  },

  // Dutch
  {
    code: "nl",
    name: "Dutch",
    text: "Het Nederlands is een West-Germaanse taal die wordt gesproken in Nederland, België en Suriname. Het is nauw verwant aan het Duits en het Engels.",
    shortText: "Hallo wereld",
    testWord: "gelukkig",
    expectedSynonyms: ["blij", "tevreden"],
  },

  // Greek
  {
    code: "el",
    name: "Greek",
    text: "Η ελληνική γλώσσα είναι μια από τις αρχαιότερες γλώσσες του κόσμου. Έχει μια ιστορία που εκτείνεται σε περισσότερα από τρεις χιλιάδες χρόνια.",
    shortText: "Γειά σου κόσμε",
    testWord: "ευτυχισμένος",
    expectedSynonyms: ["χαρούμενος"],
  },

  // Hungarian
  {
    code: "hu",
    name: "Hungarian",
    text: "A magyar nyelv a finnugor nyelvcsalád uráli ágához tartozik. Magyarországon kívül Romániában, Szlovákiában és Szerbiában is beszélik jelentős számban.",
    shortText: "Helló világ",
    testWord: "boldog",
    expectedSynonyms: ["vidám", "örömteli"],
  },

  // Czech
  {
    code: "cs",
    name: "Czech",
    text: "Čeština je západoslovanský jazyk, kterým se mluví především v České republice. Je známá svými složitými pádovými koncovkami a měkkými souhláskami.",
    shortText: "Ahoj světe",
    testWord: "šťastný",
    expectedSynonyms: ["radostný", "spokojený"],
  },

  // Romanian
  {
    code: "ro",
    name: "Romanian",
    text: "Limba română este o limbă romanică vorbită de aproximativ douăzeci și cinci de milioane de oameni. Este limba oficială a României și a Republicii Moldova.",
    shortText: "Salut lume",
    testWord: "fericit",
    expectedSynonyms: ["bucuros", "vesel"],
  },

  // Danish
  {
    code: "da",
    name: "Danish",
    text: "Dansk er et nordgermansk sprog, der tales af omkring seks millioner mennesker. Det er det officielle sprog i Danmark og er tæt beslægtet med svensk og norsk.",
    shortText: "Hej verden",
    testWord: "lykkelig",
    expectedSynonyms: ["glad", "tilfreds"],
  },

  // Norwegian
  {
    code: "no",
    name: "Norwegian",
    text: "Norsk er et nordgermansk språk som tales hovedsakelig i Norge. Det finnes to offisielle skriftspråk: bokmål og nynorsk, som begge brukes i offentlige dokumenter.",
    shortText: "Hei verden",
    testWord: "lykkelig",
    expectedSynonyms: ["glad", "fornøyd"],
  },

  // Swedish
  {
    code: "sv",
    name: "Swedish",
    text: "Svenska är ett nordgermanskt språk som talas av cirka tio miljoner människor. Det är det officiella språket i Sverige och ett av de officiella språken i Finland.",
    shortText: "Hej världen",
    testWord: "lycklig",
    expectedSynonyms: ["glad", "nöjd"],
  },

  // Finnish
  {
    code: "fi",
    name: "Finnish",
    text: "Suomen kieli on suomalais-ugrilainen kieli, jota puhuu äidinkielenään noin viisi miljoonaa ihmistä. Se on Suomen toinen virallinen kieli ruotsin ohella.",
    shortText: "Hei maailma",
    testWord: "onnellinen",
    expectedSynonyms: ["iloinen", "tyytyväinen"],
  },

  // Hindi
  {
    code: "hi",
    name: "Hindi",
    text: "हिंदी भारत की राजभाषा और सबसे अधिक बोली जाने वाली भाषाओं में से एक है। यह देवनागरी लिपि में लिखी जाती है और संस्कृत से विकसित हुई है।",
    shortText: "नमस्ते दुनिया",
    testWord: "खुश",
    expectedSynonyms: ["प्रसन्न", "आनंदित"],
  },

  // Chinese (Mandarin)
  {
    code: "zh",
    name: "Chinese",
    text: "中文是世界上使用人数最多的语言之一。它有着悠久的历史和丰富的文化遗产。汉字是中文书写系统的基础。",
    shortText: "你好世界",
    testWord: "快乐",
    expectedSynonyms: ["高兴", "愉快", "欢乐"],
  },

  // Thai
  {
    code: "th",
    name: "Thai",
    text: "ภาษาไทยเป็นภาษาราชการของประเทศไทย มีผู้พูดประมาณหกสิบล้านคน ภาษาไทยมีระบบการเขียนที่เป็นเอกลักษณ์และมีวรรณยุกต์ห้าเสียง",
    shortText: "สวัสดีโลก",
    testWord: "มีความสุข",
    expectedSynonyms: ["ยินดี", "เบิกบาน"],
  },

  // Indonesian
  {
    code: "id",
    name: "Indonesian",
    text: "Bahasa Indonesia adalah bahasa resmi Republik Indonesia. Bahasa ini digunakan oleh lebih dari dua ratus juta orang dan merupakan salah satu bahasa yang paling banyak dituturkan di dunia.",
    shortText: "Halo dunia",
    testWord: "bahagia",
    expectedSynonyms: ["senang", "gembira"],
  },

  // Vietnamese
  {
    code: "vi",
    name: "Vietnamese",
    text: "Tiếng Việt là ngôn ngữ chính thức của Việt Nam với khoảng chín mươi triệu người sử dụng. Đây là một ngôn ngữ thanh điệu với sáu thanh khác nhau.",
    shortText: "Xin chào thế giới",
    testWord: "hạnh phúc",
    expectedSynonyms: ["vui vẻ", "sung sướng"],
  },
];

/**
 * Get sample by language code
 */
export function getSampleByCode(code: string): LanguageSample | undefined {
  return LANGUAGE_SAMPLES.find((s) => s.code === code);
}

/**
 * Get all supported language codes that have samples
 */
export function getSampleLanguageCodes(): string[] {
  return LANGUAGE_SAMPLES.map((s) => s.code);
}

/**
 * ISO 639-3 to ISO 639-1 mapping for testing the detection service
 */
export const ISO639_3_MAPPING: Record<string, string> = {
  eng: "en",
  spa: "es",
  fra: "fr",
  deu: "de",
  ita: "it",
  por: "pt-BR",
  jpn: "ja",
  kor: "ko",
  ara: "ar",
  rus: "ru",
  hin: "hi",
  tur: "tr",
  ces: "cs",
  dan: "da",
  ell: "el",
  hun: "hu",
  nor: "no",
  nob: "no",
  nno: "no",
  pol: "pl",
  ron: "ro",
  slk: "sk",
  nld: "nl",
  swe: "sv",
  fin: "fi",
  zho: "zh",
  cmn: "zh",
  tha: "th",
  ind: "id",
  vie: "vi",
};
