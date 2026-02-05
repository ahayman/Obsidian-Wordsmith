declare module "nspell" {
  interface NSpellOptions {
    aff: string | Buffer;
    dic?: string | Buffer;
  }

  interface NSpellInstance {
    correct(word: string): boolean;
    suggest(word: string): string[];
    spell(word: string): { correct: boolean; forbidden: boolean; warn: boolean };
    add(word: string, model?: string): NSpellInstance;
    remove(word: string): NSpellInstance;
    wordCharacters(): string | undefined;
    dictionary(dic: string | Buffer): NSpellInstance;
    personal(dic: string | Buffer): NSpellInstance;
  }

  function nspell(options: NSpellOptions): NSpellInstance;
  function nspell(aff: string | Buffer, dic?: string | Buffer): NSpellInstance;
  function nspell(dictionaries: NSpellOptions[]): NSpellInstance;

  export = nspell;
}
