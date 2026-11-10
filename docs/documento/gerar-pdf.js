// Gera docs/documento/LUNAR_INTEL_documento.pdf a partir de documento.html (usa o Edge ou o Chrome instalado).
// Uso: node docs/documento/gerar-pdf.js "<link do repositorio>" "<link da aplicacao>"
//
// O PDF e gerado duas vezes: na primeira, descobre em que pagina caiu cada titulo
// (lendo os destinos internos do PDF); na segunda, escreve esses numeros no sumario.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const [linkRepo = '(link do repositório)', linkApp = '(link da aplicação)'] = process.argv.slice(2);
const pasta = __dirname;
const saida = path.join(pasta, 'LUNAR_INTEL_documento.pdf');
const temporario = path.join(pasta, '_documento_preenchido.html');
const link = (url) => (url.startsWith('http') ? `<a href="${url}">${url}</a>` : url);

const navegador = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].find((n) => fs.existsSync(n));
if (!navegador) throw new Error('Edge ou Chrome nao encontrado.');

const modelo = fs.readFileSync(path.join(pasta, 'documento.html'), 'utf-8')
  .replaceAll('{{LINK_REPO}}', link(linkRepo))
  .replaceAll('{{LINK_APP}}', link(linkApp));

function gerar(paginas) {
  const html = modelo.replace('/*PAGINAS*/', `window.PAGINAS = ${JSON.stringify(paginas)};`);
  fs.writeFileSync(temporario, html, 'utf-8');
  execFileSync(navegador, [
    '--headless', '--disable-gpu', '--no-pdf-header-footer',
    `--print-to-pdf=${saida}`, `file:///${temporario.replace(/\\/g, '/')}`,
  ], { stdio: 'ignore' });
}

// le do PDF: ordem das paginas (arvore /Pages) e destino de cada titulo (/Dests)
function lerPaginasDosTitulos() {
  const pdf = fs.readFileSync(saida, 'latin1');
  const objeto = (num) => {
    const m = pdf.match(new RegExp(`(?:^|\\s)${num} 0 obj\\s*([\\s\\S]*?)endobj`));
    return m ? m[1] : '';
  };
  const ordem = [];
  const percorrer = (num) => {
    const corpo = objeto(num);
    if (/\/Type \/Pages/.test(corpo)) {
      const kids = corpo.match(/\/Kids \[([^\]]*)\]/)[1];
      for (const k of kids.matchAll(/(\d+) 0 R/g)) percorrer(k[1]);
    } else {
      ordem.push(num);
    }
  };
  const raiz = objeto(pdf.match(/\/Root (\d+) 0 R/)[1]).match(/\/Pages (\d+) 0 R/)[1];
  percorrer(raiz);
  const dests = objeto(pdf.match(/\/Dests (\d+) 0 R/)[1]);
  const paginas = {};
  for (const m of dests.matchAll(/\/(sec\d+) \[(\d+) 0 R/g)) paginas[m[1]] = ordem.indexOf(m[2]) + 1;
  return { paginas, total: ordem.length };
}

try {
  gerar({});
  const primeira = lerPaginasDosTitulos();
  gerar(primeira.paginas);
  const segunda = lerPaginasDosTitulos();
  const iguais = JSON.stringify(primeira.paginas) === JSON.stringify(segunda.paginas);
  console.log(`PDF gerado em ${saida} (${segunda.total} paginas, ${Object.keys(segunda.paginas).length} itens no sumario)`);
  if (!iguais) console.warn('ATENCAO: a paginacao mudou entre as duas passagens; rode de novo.');
} finally {
  fs.rmSync(temporario, { force: true });
}
