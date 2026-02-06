import { APIServiceConfig, APIServiceType } from "../../types/types";
import { SynonymService, API_SERVICE_INFO } from "../SynonymService";
import { FreeDictionaryService } from "./FreeDictionaryService";
import { MerriamWebsterService } from "./MerriamWebsterService";
import { BigHugeThesaurusService } from "./BigHugeThesaurusService";
import { WordsAPIService } from "./WordsAPIService";
import { APINinjasService } from "./APINinjasService";
import { AltervistaService } from "./AltervistaService";
import { LexicalaService } from "./LexicalaService";
import { WiktionaryService } from "./WiktionaryService";
import { YandexDictionaryService } from "./YandexDictionaryService";

export function createAPIService(config: APIServiceConfig): SynonymService {
  switch (config.type) {
    case "free-dictionary":
      return new FreeDictionaryService(config.id);
    case "merriam-webster":
      return new MerriamWebsterService(config.id, config.apiKey);
    case "big-huge-thesaurus":
      return new BigHugeThesaurusService(config.id, config.apiKey);
    case "words-api":
      return new WordsAPIService(config.id, config.apiKey);
    case "api-ninjas":
      return new APINinjasService(config.id, config.apiKey);
    case "altervista":
      return new AltervistaService(config.id, config.apiKey);
    case "lexicala":
      return new LexicalaService(config.id, config.apiKey);
    case "wiktionary":
      return new WiktionaryService(config.id);
    case "yandex-dictionary":
      return new YandexDictionaryService(config.id, config.apiKey);
  }
}

export function createAPIServiceForValidation(
  type: APIServiceType,
  apiKey: string
): SynonymService {
  const tempId = "validation-temp";
  return createAPIService({ id: tempId, type, apiKey, enabled: true });
}

export function getServiceName(type: APIServiceType): string {
  return API_SERVICE_INFO[type].name;
}

export {
  FreeDictionaryService,
  MerriamWebsterService,
  BigHugeThesaurusService,
  WordsAPIService,
  APINinjasService,
  AltervistaService,
  LexicalaService,
  WiktionaryService,
  YandexDictionaryService,
};
