// Testes das regras de negocio (src/services). Rodar com: npm test
// Usa uma pasta temporaria de dados, entao nao mexe nos arquivos de data/.
const fs = require('fs');
const os = require('os');
const path = require('path');

const PASTA_TESTE = fs.mkdtempSync(path.join(os.tmpdir(), 'lunar-intel-testes-'));
process.env.LUNAR_DATA_DIR = PASTA_TESTE;

const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');

const usuarioRepository = require('../src/repositories/UsuarioRepository');
const imovelRepository = require('../src/repositories/ImovelRepository');
const authService = require('../src/services/AuthService');
const imovelService = require('../src/services/ImovelService');
const agendamentoService = require('../src/services/AgendamentoService');
const simulacaoService = require('../src/services/SimulacaoService');
const favoritoService = require('../src/services/FavoritoService');
const adminService = require('../src/services/AdminService');
const notificacaoService = require('../src/services/NotificacaoService');
const auditoriaService = require('../src/services/AuditoriaService');
const {
  ValidationError, BusinessRuleError, ForbiddenError,
} = require('../src/errors/AppError');

const ARQUIVOS = ['usuarios', 'imoveis', 'simulacoes', 'agendamentos', 'favoritos', 'notificacoes', 'auditoria'];
const SENHA_HASH = bcrypt.hashSync('123456', 4);
const DATA_FUTURA = '2099-01-10T10:00';

let admin; let corretor; let outroCorretor; let cliente;

function criarImovel(corretorDono, dados = {}) {
  return imovelRepository.create({
    titulo: 'Imovel teste',
    preco: 250000,
    areaTotal: 50,
    quartos: 2,
    banheiros: 1,
    tipo: 'Apartamento',
    status: 'Disponivel',
    corretorId: corretorDono.id,
    endereco: { logradouro: 'Rua A', numero: '1', bairro: 'Centro', cidade: 'Sao Paulo', estado: 'SP', cep: '01000-000' },
    ...dados,
  });
}

beforeEach(() => {
  ARQUIVOS.forEach((nome) => fs.writeFileSync(path.join(PASTA_TESTE, `${nome}.json`), '[]'));
  admin = usuarioRepository.create({ tipo: 'ADMINISTRADOR', nome: 'Admin', email: 'admin@t.com', cpf: '12345678909', telefone: '1', senhaHash: SENHA_HASH });
  corretor = usuarioRepository.create({ tipo: 'CORRETOR', nome: 'Bruno', email: 'bruno@t.com', cpf: '23456789173', telefone: '1', senhaHash: SENHA_HASH, creci: '12345-F' });
  outroCorretor = usuarioRepository.create({ tipo: 'CORRETOR', nome: 'Jose', email: 'jose@t.com', cpf: '34567891228', telefone: '1', senhaHash: SENHA_HASH, creci: '54321-J' });
  cliente = usuarioRepository.create({ tipo: 'CLIENTE', nome: 'Carlos', email: 'carlos@t.com', cpf: '45678912364', telefone: '1', senhaHash: SENHA_HASH, rendaMensal: 8000, idade: 32, poupanca: 30000, fgts: 15000 });
});

after(() => fs.rmSync(PASTA_TESTE, { recursive: true, force: true }));

describe('Cadastro e login (AuthService)', () => {
  const base = { nome: 'Novo', email: 'novo@t.com', cpf: '567.891.234-82', telefone: '1', senha: '123456' };

  test('nao permite se cadastrar como administrador', async () => {
    await assert.rejects(authService.cadastrar({ ...base, tipo: 'ADMINISTRADOR' }), ValidationError);
  });

  test('recusa CPF e e-mail invalidos', async () => {
    await assert.rejects(authService.cadastrar({ ...base, tipo: 'CLIENTE', idade: 30, cpf: '999' }), /CPF/);
    await assert.rejects(authService.cadastrar({ ...base, tipo: 'CLIENTE', idade: 30, email: 'x@' }), /E-mail/);
  });

  test('recusa CPF repetido mesmo com outra formatacao', async () => {
    await assert.rejects(authService.cadastrar({ ...base, tipo: 'CLIENTE', idade: 30, cpf: '456.789.123-64' }), /CPF/);
  });

  test('ignora campos que o usuario nao pode definir', async () => {
    const novo = await authService.cadastrar({
      ...base, tipo: 'CORRETOR', creci: '11111-sp', totalVendas: 99, ativo: false, senhaHash: 'x',
    });
    assert.equal(novo.totalVendas, 0);
    assert.equal(novo.ativo, true);
    assert.equal(novo.cpf, '56789123482');
    assert.equal(novo.creci, '11111-SP');
    assert.ok(await bcrypt.compare('123456', novo.senhaHash));
  });

  test('login com conta inativa e recusado', async () => {
    authService.inativarConta(cliente.id);
    await assert.rejects(authService.autenticar('carlos@t.com', '123456'), /inativa/);
  });

  test('recuperacao de senha por codigo', async () => {
    assert.equal(authService.solicitarRecuperacaoSenha('naoexiste@t.com'), null);

    const codigoOriginal = console.log;
    console.log = () => {}; // esconde o codigo impresso no console durante o teste
    const codigo = authService.solicitarRecuperacaoSenha('carlos@t.com');
    console.log = codigoOriginal;

    assert.match(codigo, /^\d{6}$/);
    await assert.rejects(authService.redefinirSenhaComCodigo('carlos@t.com', '000000', 'novaSenha'), /Codigo invalido/);
    await authService.redefinirSenhaComCodigo('carlos@t.com', codigo, 'novaSenha');
    await assert.doesNotReject(authService.autenticar('carlos@t.com', 'novaSenha'));
    // o codigo so funciona uma vez
    await assert.rejects(authService.redefinirSenhaComCodigo('carlos@t.com', codigo, 'outra1'), /Codigo invalido/);
  });
});

describe('Visitas (AgendamentoService)', () => {
  test('RN04: no maximo 3 visitas em andamento por cliente', () => {
    for (let i = 0; i < 3; i += 1) {
      agendamentoService.solicitar(cliente.id, { imovelId: criarImovel(corretor).id, dataVisita: DATA_FUTURA });
    }
    const quarto = criarImovel(corretor);
    assert.throws(() => agendamentoService.solicitar(cliente.id, { imovelId: quarto.id, dataVisita: DATA_FUTURA }), /3 visitas/);
  });

  test('RN09: nao pede de novo o mesmo imovel em 7 dias, mesmo apos cancelar', () => {
    const imovel = criarImovel(corretor);
    const visita = agendamentoService.solicitar(cliente.id, { imovelId: imovel.id, dataVisita: DATA_FUTURA });
    assert.throws(() => agendamentoService.solicitar(cliente.id, { imovelId: imovel.id, dataVisita: DATA_FUTURA }), /em aberto/);
    agendamentoService.cancelarPeloCliente(cliente.id, visita.id);
    assert.throws(() => agendamentoService.solicitar(cliente.id, { imovelId: imovel.id, dataVisita: DATA_FUTURA }), /7 dias/);
  });

  test('data da visita precisa ser valida e no futuro', () => {
    const imovel = criarImovel(corretor);
    assert.throws(() => agendamentoService.solicitar(cliente.id, { imovelId: imovel.id, dataVisita: 'banana' }), /invalida/);
    assert.throws(() => agendamentoService.solicitar(cliente.id, { imovelId: imovel.id, dataVisita: '2001-01-01T10:00' }), /futuro/);
  });

  test('RN03: nao confirma visita se o imovel deixou de estar disponivel', () => {
    const imovel = criarImovel(corretor);
    const visita = agendamentoService.solicitar(cliente.id, { imovelId: imovel.id, dataVisita: DATA_FUTURA });
    imovelService.inativar(corretor.id, imovel.id);
    assert.throws(() => agendamentoService.confirmar(corretor.id, visita.id), BusinessRuleError);
  });

  test('so o corretor do imovel gerencia a visita; so o cliente dono cancela', () => {
    const visita = agendamentoService.solicitar(cliente.id, { imovelId: criarImovel(corretor).id, dataVisita: DATA_FUTURA });
    assert.throws(() => agendamentoService.confirmar(outroCorretor.id, visita.id), ForbiddenError);
    assert.throws(() => agendamentoService.cancelarPeloCliente(999, visita.id), ForbiddenError);
  });

  test('reagendar exige data valida', () => {
    const visita = agendamentoService.solicitar(cliente.id, { imovelId: criarImovel(corretor).id, dataVisita: DATA_FUTURA });
    assert.throws(() => agendamentoService.reagendar(corretor.id, visita.id, undefined), ValidationError);
    assert.equal(agendamentoService.reagendar(corretor.id, visita.id, '2099-02-01T15:00').dataVisita, '2099-02-01T15:00');
  });

  test('RN10: cada mudanca de status avisa o cliente e o corretor', () => {
    const visita = agendamentoService.solicitar(cliente.id, { imovelId: criarImovel(corretor).id, dataVisita: DATA_FUTURA });
    agendamentoService.confirmar(corretor.id, visita.id);
    const doCliente = notificacaoService.listarPorUsuario(cliente.id).map((n) => n.titulo);
    const doCorretor = notificacaoService.listarPorUsuario(corretor.id).map((n) => n.titulo);
    for (const titulo of ['Nova solicitacao de visita', 'Visita confirmada']) {
      assert.ok(doCliente.includes(titulo), `cliente deveria receber "${titulo}"`);
      assert.ok(doCorretor.includes(titulo), `corretor deveria receber "${titulo}"`);
    }
  });
});

describe('Auditoria (RNF07)', () => {
  test('registra data, autor e acao, do mais recente para o mais antigo', () => {
    auditoriaService.registrar({ usuarioId: corretor.id, acao: 'Imovel cadastrado', sucesso: true });
    auditoriaService.registrar({ usuarioId: null, acao: 'Login (falhou)', detalhe: 'e-mail: x@t.com', sucesso: false });
    const [ultimo, primeiro] = auditoriaService.listar();
    assert.equal(ultimo.acao, 'Login (falhou)');
    assert.equal(ultimo.usuarioNome, '-');
    assert.equal(primeiro.usuarioNome, 'Bruno');
    assert.ok(!Number.isNaN(new Date(primeiro.dataHora).getTime()));
  });
});

describe('Imoveis (ImovelService)', () => {
  test('RN02: so vende sem visitas em aberto, e conta a venda para o corretor', () => {
    const imovel = criarImovel(corretor);
    const visita = agendamentoService.solicitar(cliente.id, { imovelId: imovel.id, dataVisita: DATA_FUTURA });
    assert.throws(() => imovelService.marcarComoVendido(corretor.id, imovel.id, 240000), /visitas pendentes/);

    agendamentoService.confirmar(corretor.id, visita.id);
    agendamentoService.realizar(corretor.id, visita.id);
    const vendido = imovelService.marcarComoVendido(corretor.id, imovel.id, 240000);
    assert.equal(vendido.status, 'Vendido');
    assert.equal(vendido.preco, 240000);
    assert.equal(usuarioRepository.findById(corretor.id).totalVendas, 1);
  });

  test('RN06: corretor so altera o proprio portfolio', () => {
    const imovel = criarImovel(outroCorretor);
    assert.throws(() => imovelService.atualizar(corretor.id, imovel.id, { preco: 1 }), ForbiddenError);
  });

  test('imovel vendido fica congelado: nao edita nem inativa', () => {
    const imovel = criarImovel(corretor);
    imovelService.marcarComoVendido(corretor.id, imovel.id);
    assert.throws(() => imovelService.atualizar(corretor.id, imovel.id, { preco: 1 }), /vendido/);
    assert.throws(() => imovelService.inativar(corretor.id, imovel.id), /vendido/);
  });

  test('inativar e reativar', () => {
    const imovel = criarImovel(corretor);
    imovelService.inativar(corretor.id, imovel.id);
    assert.equal(imovelService.listarDisponiveis().length, 0); // RN12
    imovelService.reativar(corretor.id, imovel.id);
    assert.equal(imovelService.listarDisponiveis().length, 1);
  });

  test('cadastro e edicao validam os dados', () => {
    const dados = {
      titulo: 'Casa', preco: 300000, quartos: 3, banheiros: 2, areaTotal: 100,
      endereco: { cidade: 'Sao Paulo', cep: '01000-000' },
    };
    assert.throws(() => imovelService.cadastrar(corretor.id, { ...dados, quartos: -1 }), ValidationError);
    const imovel = imovelService.cadastrar(corretor.id, dados);
    assert.throws(() => imovelService.atualizar(corretor.id, imovel.id, { titulo: '' }), /titulo/);
    assert.equal(imovelService.atualizar(corretor.id, imovel.id, { quartos: '4' }).quartos, 4);
  });
});

describe('Simulacao, favoritos e relatorio', () => {
  test('simulacao valida nao altera o perfil quando os dados sao invalidos', () => {
    assert.throws(() => simulacaoService.simular(cliente.id, { rendaMensal: 4500, idade: 90 }), ValidationError);
    assert.equal(usuarioRepository.findById(cliente.id).idade, 32);
  });

  test('simulacao devolve so imoveis que cabem no orcamento', () => {
    criarImovel(corretor, { titulo: 'Barato', preco: 270000 });
    criarImovel(corretor, { titulo: 'Caro', preco: 900000 });
    const { simulacao, imoveisCompativeis } = simulacaoService.simular(cliente.id, {
      rendaMensal: 8000, idade: 32, poupanca: 30000, fgts: 15000,
    });
    assert.equal(simulacao.capacidadeCompra.toFixed(2), '278323.99');
    assert.deepEqual(imoveisCompativeis.map((i) => i.titulo), ['Barato']);
  });

  test('nao favorita imovel indisponivel nem repete favorito', () => {
    const disponivel = criarImovel(corretor);
    const vendido = criarImovel(corretor, { status: 'Vendido' });
    favoritoService.adicionar(cliente.id, disponivel.id);
    assert.throws(() => favoritoService.adicionar(cliente.id, disponivel.id), ValidationError);
    assert.throws(() => favoritoService.adicionar(cliente.id, vendido.id), BusinessRuleError);
  });

  test('admin nao bloqueia a si mesmo', () => {
    assert.throws(() => adminService.alterarStatusUsuario(admin.id, admin.id, false), BusinessRuleError);
    assert.throws(() => adminService.alterarStatusUsuario(admin.id, cliente.id, 'false'), ValidationError);
    assert.equal(adminService.alterarStatusUsuario(admin.id, cliente.id, false).ativo, false);
  });

  test('taxa de conversao fica entre 0% e 100%', () => {
    // dois imoveis vendidos sem visita e um com visita realizada
    imovelService.marcarComoVendido(corretor.id, criarImovel(corretor).id);
    imovelService.marcarComoVendido(corretor.id, criarImovel(corretor).id);
    const imovel = criarImovel(corretor);
    const visita = agendamentoService.solicitar(cliente.id, { imovelId: imovel.id, dataVisita: DATA_FUTURA });
    agendamentoService.confirmar(corretor.id, visita.id);
    agendamentoService.realizar(corretor.id, visita.id);
    imovelService.marcarComoVendido(corretor.id, imovel.id);

    const relatorio = adminService.gerarRelatorio();
    assert.equal(relatorio.imoveisVendidos, 3);
    assert.equal(relatorio.taxaConversaoPercentual, 100);
  });
});
