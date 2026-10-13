/**
 * TRAVAS DA ANNA (patch do cliente). O que é regra de negócio, ética ou jurídica
 * vira CÓDIGO: a resposta livre que casar com uma destas não sai. O intérprete
 * pede uma correção; se insistir, a resposta é descartada e sai a pergunta pendente.
 * Toda regra tem um caso que bloqueia e um que passa em scripts/test.ts.
 */
export const REGRAS_CLIENTE: Array<{ regra: string; re: RegExp }> = [
  { regra: 'disse que é IA', re: /(?:^|\s)(sou|é) (uma? )?(intelig[eê]ncia artificial|ia\b|rob[oô]|assistente virtual|bot\b|sistema autom)/i },
  { regra: 'pediu documento', re: /(?<!n[aã]o\s(?:precisa(?:\sme)?|[eé]\snecess[aá]rio|tem\sque|precisa\sde)\s)\b(envi[ae]|mand[ae]|encaminh[ae])\w*\b[^.?!]{0,40}\b(contracheque|extrato|documento|print|foto|comprovante|holerite)/i },
  { regra: 'falou de honorários', re: /honor[aá]rios?[^.?!]{0,40}(r\$|\d)|\bparcela(s|do|mos)? de r\$|\bentrada de r\$|\d+ ?%|\bproveito econ[oô]mico/i },
  { regra: 'prometeu resultado', re: /\bgarant(o|imos|ido|ida|ia)\b|\bcom certeza (vai|vamos|conseguimos)|\bchances? de (sucesso|proced[eê]ncia)/i },
  { regra: 'emoji', re: /\p{Extended_Pictographic}/u },
]
