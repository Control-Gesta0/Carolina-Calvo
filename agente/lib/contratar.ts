/** "quero fechar", "vou contratar", "assinar o contrato", "iniciar meu processo"… Puro (Dra., 22/10). */
const RX_CONTRATAR = /\b(fechar|contratar|contrato|assinar|assino|fechamos|fecho|fechei)\b|iniciar (o |meu )?processo|come[cç]ar (o |meu )?processo|dar entrada/i

export const querContratar = (texto?: string | null) => !!texto && RX_CONTRATAR.test(texto)
