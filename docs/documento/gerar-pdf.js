// Gera docs/documento/LUNAR_INTEL_documento.pdf a partir de documento.html (usa o Edge ou o Chrome instalado).
// Uso: node docs/documento/gerar-pdf.js "<link do repositorio>" "<link da aplicacao>"
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const [linkRepo = '(link do repositório)', linkApp = '(link da aplicação)'] = process.argv.slice(2);
const pasta = __dirname;
const link = (url) => (url.startsWith('http') ? `<a href="${url}">${url}</a>` : url);

const html = fs.readFileSync(path.join(pasta, 'documento.html'), 'utf-8')
  .replaceAll('{{LINK_REPO}}', link(linkRepo))
  .replaceAll('{{LINK_APP}}', link(linkApp));
const temporario = path.join(pasta, '_documento_preenchido.html');
fs.writeFileSync(temporario, html, 'utf-8');

const navegadores = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
];
const navegador = navegadores.find((n) => fs.existsSync(n));
if (!navegador) throw new Error('Edge ou Chrome nao encontrado.');

const saida = path.join(pasta, 'LUNAR_INTEL_documento.pdf');
try {
  execFileSync(navegador, [
    '--headless', '--disable-gpu', '--no-pdf-header-footer',
    `--print-to-pdf=${saida}`, `file:///${temporario.replace(/\\/g, '/')}`,
  ], { stdio: 'ignore' });
} finally {
  fs.rmSync(temporario, { force: true });
}
console.log('PDF gerado em', saida);
