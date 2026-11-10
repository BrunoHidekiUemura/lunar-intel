const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, 'data');
const ARQUIVOS = [
  'usuarios.json', 'imoveis.json', 'simulacoes.json',
  'agendamentos.json', 'favoritos.json', 'notificacoes.json', 'auditoria.json',
];

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
ARQUIVOS.forEach((arquivo) => fs.writeFileSync(path.join(DATA_DIR, arquivo), '[]', 'utf-8'));

const usuarioRepository = require('./src/repositories/UsuarioRepository');
const imovelRepository = require('./src/repositories/ImovelRepository');

const SENHA_PADRAO = bcrypt.hashSync('123456', 10);

console.log('Semeando usuarios...');

const admin = usuarioRepository.create({
  tipo: 'ADMINISTRADOR',
  nome: 'Ana Gestora',
  email: 'admin@lunarintel.com',
  cpf: '12345678909',
  telefone: '(11) 90000-0000',
  senhaHash: SENHA_PADRAO,
  nivelAcesso: 'SUPER',
});

const corretor1 = usuarioRepository.create({
  tipo: 'CORRETOR',
  nome: 'Bruno Hideki',
  email: 'bruno@lunarintel.com',
  cpf: '23456789173',
  telefone: '(11) 91111-1111',
  senhaHash: SENHA_PADRAO,
  creci: '12345-F',
  especialidade: 'Residencial',
});

const corretor2 = usuarioRepository.create({
  tipo: 'CORRETOR',
  nome: 'Jose Henrique',
  email: 'jose@lunarintel.com',
  cpf: '34567891228',
  telefone: '(11) 92222-2222',
  senhaHash: SENHA_PADRAO,
  creci: '54321-J',
  especialidade: 'Comercial',
});

usuarioRepository.create({
  tipo: 'CLIENTE',
  nome: 'Carlos Comprador',
  email: 'cliente@lunarintel.com',
  cpf: '45678912364',
  telefone: '(11) 93333-3333',
  senhaHash: SENHA_PADRAO,
  rendaMensal: 8000,
  idade: 32,
  poupanca: 30000,
  fgts: 15000,
  profissao: 'Engenheiro',
});

usuarioRepository.create({
  tipo: 'CLIENTE',
  nome: 'Marina Souza',
  email: 'marina@lunarintel.com',
  cpf: '56789123482',
  telefone: '(11) 94444-4444',
  senhaHash: SENHA_PADRAO,
  rendaMensal: 4500,
  idade: 27,
  poupanca: 8000,
  fgts: 6000,
  profissao: 'Designer',
});

console.log('Semeando imoveis...');

const imoveisDemo = [
  { titulo: 'Apartamento Jardins', tipo: 'Apartamento', preco: 480000, areaTotal: 75, quartos: 2, banheiros: 2, corretor: corretor1, cidade: 'Sao Paulo', bairro: 'Jardins' },
  { titulo: 'Casa Alphaville', tipo: 'Casa', preco: 950000, areaTotal: 220, quartos: 4, banheiros: 3, corretor: corretor1, cidade: 'Barueri', bairro: 'Alphaville' },
  { titulo: 'Loft Vila Madalena', tipo: 'Loft', preco: 390000, areaTotal: 55, quartos: 1, banheiros: 1, corretor: corretor1, cidade: 'Sao Paulo', bairro: 'Vila Madalena' },
  { titulo: 'Apartamento Moema', tipo: 'Apartamento', preco: 620000, areaTotal: 90, quartos: 3, banheiros: 2, corretor: corretor1, cidade: 'Sao Paulo', bairro: 'Moema' },
  { titulo: 'Casa Granja Viana', tipo: 'Casa', preco: 1250000, areaTotal: 300, quartos: 4, banheiros: 4, corretor: corretor2, cidade: 'Cotia', bairro: 'Granja Viana' },
  { titulo: 'Apartamento Tatuape', tipo: 'Apartamento', preco: 310000, areaTotal: 60, quartos: 2, banheiros: 1, corretor: corretor2, cidade: 'Sao Paulo', bairro: 'Tatuape' },
  { titulo: 'Studio Pinheiros', tipo: 'Apartamento', preco: 270000, areaTotal: 35, quartos: 1, banheiros: 1, corretor: corretor2, cidade: 'Sao Paulo', bairro: 'Pinheiros' },
  { titulo: 'Casa Condominio Fechado', tipo: 'Casa', preco: 780000, areaTotal: 180, quartos: 3, banheiros: 3, corretor: corretor2, cidade: 'Sao Paulo', bairro: 'Santo Amaro' },
  { titulo: 'Apartamento Perdizes', tipo: 'Apartamento', preco: 540000, areaTotal: 80, quartos: 2, banheiros: 2, corretor: corretor1, cidade: 'Sao Paulo', bairro: 'Perdizes' },
  { titulo: 'Loft Itaim Bibi', tipo: 'Loft', preco: 460000, areaTotal: 48, quartos: 1, banheiros: 1, corretor: corretor2, cidade: 'Sao Paulo', bairro: 'Itaim Bibi' },
];

imoveisDemo.forEach((dados, indice) => {
  imovelRepository.create({
    titulo: dados.titulo,
    descricao: `Excelente imovel do tipo ${dados.tipo.toLowerCase()} em ${dados.bairro}, ${dados.cidade}.`,
    preco: dados.preco,
    areaTotal: dados.areaTotal,
    quartos: dados.quartos,
    banheiros: dados.banheiros,
    tipo: dados.tipo,
    status: 'Disponivel',
    corretorId: dados.corretor.id,
    imagens: [0, 1, 2].map((foto) => `https://picsum.photos/seed/lunarintel${indice}-${foto}/800/500`),
    endereco: {
      logradouro: `Rua das Flores, ${100 + indice}`,
      numero: String(100 + indice),
      complemento: '',
      bairro: dados.bairro,
      cidade: dados.cidade,
      estado: 'SP',
      cep: '01000-000',
    },
  });
});

console.log('Carga concluida.');
console.log('Login de demonstracao (senha para todos: 123456):');
console.log(`  Administrador: ${admin.email}`);
console.log(`  Corretor:      ${corretor1.email}`);
console.log(`  Corretor:      ${corretor2.email}`);
console.log('  Cliente:       cliente@lunarintel.com');
console.log('  Cliente:       marina@lunarintel.com');
