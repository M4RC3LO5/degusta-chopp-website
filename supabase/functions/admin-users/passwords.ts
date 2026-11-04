// Senha provisória no formato palavra-palavra-NNNN.
// Lista de palavras simples do português, sem acento, só a-z. Aleatoriedade: crypto.getRandomValues
// com rejeição (sem viés de módulo).

export const WORDS: readonly string[] = [
  'abacate', 'abelha', 'aguia', 'alegria', 'amigo', 'andorinha', 'anel', 'arroz', 'areia', 'aroma',
  'arvore', 'aurora', 'aviao', 'azeite', 'balao', 'banana', 'banco', 'barco', 'barril', 'bola',
  'bolo', 'borboleta', 'brasa', 'brinde', 'bruxa', 'cabana', 'cacau', 'cafe', 'caixa', 'calor',
  'camelo', 'caminho', 'campo', 'caneca', 'canoa', 'capim', 'carro', 'casa', 'castelo', 'cavalo',
  'cebola', 'cenoura', 'cereja', 'cerveja', 'chave', 'chuva', 'cidade', 'cinza', 'circo', 'coelho',
  'colina', 'cometa', 'coral', 'coruja', 'coqueiro', 'copo', 'corrida', 'crepe', 'cristal', 'dado',
  'dedal', 'diamante', 'doce', 'dourado', 'dragao', 'duna', 'escada', 'escola', 'espelho', 'espuma',
  'estrela', 'estrada', 'fada', 'farol', 'feijao', 'festa', 'fita', 'flauta', 'flor', 'floresta',
  'fogueira', 'folha', 'fonte', 'forno', 'foguete', 'formiga', 'fruta', 'furacao', 'gaita', 'galo',
  'garfo', 'gelo', 'girafa', 'girassol', 'goiaba', 'gota', 'grama', 'grilo', 'guitarra', 'harpa',
  'hera', 'horta', 'ilha', 'ima', 'inverno', 'jabuti', 'jaguar', 'janela', 'jarra', 'jardim',
  'jangada', 'jogo', 'jornal', 'lago', 'lanterna', 'lapis', 'laranja', 'leao', 'lenha', 'leque',
  'limao', 'livro', 'lobo', 'lua', 'lupulo', 'macaco', 'maca', 'madeira', 'malte', 'mamao',
  'manga', 'mapa', 'mar', 'martelo', 'melao', 'mesa', 'milho', 'moeda', 'montanha', 'morango',
  'muralha', 'musica', 'navio', 'neve', 'nuvem', 'oceano', 'onda', 'ouro', 'ovelha', 'padaria',
  'palmeira', 'panela', 'papel', 'papagaio', 'passaro', 'pastel', 'pedra', 'peixe', 'pena', 'pera',
  'pescaria', 'pimenta', 'pinheiro', 'pipa', 'planeta', 'plumas', 'ponte', 'porta', 'praia', 'prato',
  'queijo', 'quintal', 'raio', 'raposa', 'relogio', 'remo', 'rio', 'roda', 'rosa', 'sabia',
  'sal', 'sapato', 'selva', 'serra', 'sino', 'sol', 'sorvete', 'tambor', 'tapete', 'tartaruga',
  'tempero', 'tigre', 'tinta', 'tomate', 'torre', 'trigo', 'trem', 'trovao', 'tucano', 'uva',
  'vaca', 'vale', 'vela', 'vento', 'verao', 'violao', 'vulcao', 'zebra'
].filter((w, i, a) => /^[a-z]+$/.test(w) && a.indexOf(w) === i);

function randomBelow(max: number): number {
  // rejeição para evitar viés
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  do { crypto.getRandomValues(buf); } while (buf[0] >= limit);
  return buf[0] % max;
}

export function generateTempPassword(): string {
  const a = WORDS[randomBelow(WORDS.length)];
  let b = WORDS[randomBelow(WORDS.length)];
  while (b === a) b = WORDS[randomBelow(WORDS.length)];
  const digits = String(1000 + randomBelow(9000)); // 1000-9999
  return `${a}-${b}-${digits}`;
}
