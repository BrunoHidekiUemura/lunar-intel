// Testes das classes de dominio (src/models). Rodar com: npm test
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const Usuario = require('../src/models/Usuario');
const Cliente = require('../src/models/Cliente');
const Corretor = require('../src/models/Corretor');
const Administrador = require('../src/models/Administrador');
const Endereco = require('../src/models/Endereco');
const Imovel = require('../src/models/Imovel');
const Agendamento = require('../src/models/Agendamento');
const Simulacao = require('../src/models/Simulacao');
const { ValidationError, BusinessRuleError } = require('../src/errors/AppError');

function novoImovel(dados = {}) {
  return new Imovel({
    id: 1,
    titulo: 'Apartamento Teste',
    preco: 300000,
    areaTotal: 60,
    quartos: 2,
    banheiros: 1,
    tipo: 'Apartamento',
    endereco: { logradouro: 'Rua A', numero: '10', bairro: 'Centro', cidade: 'Sao Paulo', estado: 'SP', cep: '01000-000' },
    ...dados,
  });
}

describe('Usuario (classe abstrata) e heranca', () => {
  test('nao pode ser instanciada diretamente', () => {
    assert.throws(() => new Usuario({ nome: 'X' }), /abstrata/);
  });

  test('subclasses herdam de Usuario', () => {
    assert.ok(new Cliente({ nome: 'A' }) instanceof Usuario);
    assert.ok(new Corretor({ nome: 'B' }) instanceof Usuario);
    assert.ok(new Administrador({ nome: 'C' }) instanceof Usuario);
  });

  test('polimorfismo: getResumoPerfil muda conforme a classe', () => {
    const usuarios = [
      new Cliente({ nome: 'Ana', rendaMensal: 5000 }),
      new Corretor({ nome: 'Bia', creci: '12345-F', totalVendas: 2 }),
      new Administrador({ nome: 'Caio', nivelAcesso: 'SUPER' }),
    ];
    const resumos = usuarios.map((u) => u.getResumoPerfil());
    assert.equal(resumos[0], 'Ana | Renda mensal: R$ 5000.00');
    assert.equal(resumos[1], 'Bia | CRECI 12345-F | 2 venda(s)');
    assert.equal(resumos[2], 'Caio (Administrador, nível SUPER)');
  });

  test('paraDadosPublicos esconde o hash da senha', () => {
    const dados = new Cliente({ nome: 'Ana', senhaHash: 'segredo' }).paraDadosPublicos();
    assert.equal(dados.senhaHash, undefined);
    assert.equal(dados.nome, 'Ana');
    assert.ok(dados.resumoPerfil);
  });

  test('validarCPF confere os digitos verificadores', () => {
    assert.equal(Usuario.validarCPF('123.456.789-09'), true);
    assert.equal(Usuario.validarCPF('12345678909'), true);
    assert.equal(Usuario.validarCPF('12345678900'), false);
    assert.equal(Usuario.validarCPF('11111111111'), false);
    assert.equal(Usuario.validarCPF('999'), false);
  });

  test('validarEmail', () => {
    assert.equal(Usuario.validarEmail('ana@lunarintel.com'), true);
    assert.equal(Usuario.validarEmail('ana@'), false);
    assert.equal(Usuario.validarEmail('sem arroba.com'), false);
  });

  test('atualizarDados nao aceita nome vazio', () => {
    const cliente = new Cliente({ nome: 'Ana' });
    assert.throws(() => cliente.atualizarDados({ nome: '   ' }), ValidationError);
  });
});

describe('Cliente (RN01 e RN05)', () => {
  test('capacidade de compra = valor financiavel (Price) + entrada', () => {
    const cliente = new Cliente({ nome: 'Carlos', rendaMensal: 8000, idade: 32, poupanca: 30000, fgts: 15000 });
    assert.equal(cliente.obterParcelaMaxima(), 2400); // 30% de 8000
    assert.equal(cliente.getValorEntradaTotal(), 45000);
    assert.equal(cliente.calcularCapacidadeCompra().toFixed(2), '278323.99');
  });

  test('idade fora de 18 a 70 anos impede a simulacao', () => {
    assert.throws(() => new Cliente({ rendaMensal: 5000, idade: 17 }).calcularCapacidadeCompra(), ValidationError);
    assert.throws(() => new Cliente({ rendaMensal: 5000, idade: 71 }).calcularCapacidadeCompra(), ValidationError);
  });

  test('renda zero impede a simulacao', () => {
    assert.throws(() => new Cliente({ rendaMensal: 0, idade: 30 }).calcularCapacidadeCompra(), ValidationError);
  });

  test('valores em texto viram numero (nao concatena poupanca + fgts)', () => {
    const cliente = new Cliente({ rendaMensal: '5000', idade: '30', poupanca: '1000', fgts: '2000' });
    assert.equal(cliente.getValorEntradaTotal(), 3000);
  });
});

describe('Corretor e Endereco (metodos estaticos)', () => {
  test('validarCRECI (RN11)', () => {
    assert.equal(Corretor.validarCRECI('12345-F'), true);
    assert.equal(Corretor.validarCRECI('1234-sp'), true);
    assert.equal(Corretor.validarCRECI('ABC'), false);
    assert.equal(Corretor.validarCRECI(undefined), false);
  });

  test('registrarVenda soma uma venda', () => {
    const corretor = new Corretor({ nome: 'Bia', creci: '12345-F' });
    corretor.registrarVenda();
    assert.equal(corretor.totalVendas, 1);
  });

  test('validarCEP e endereco completo', () => {
    assert.equal(Endereco.validarCEP('01000-000'), true);
    assert.equal(Endereco.validarCEP('01000000'), true);
    assert.equal(Endereco.validarCEP('123'), false);
    const endereco = new Endereco({ logradouro: 'Rua A', numero: '10', bairro: 'Centro', cidade: 'SP', estado: 'SP', cep: '01000-000' });
    assert.equal(endereco.getEnderecoCompleto(), 'Rua A, 10 - Centro, SP/SP - CEP 01000-000');
  });
});

describe('Imovel', () => {
  test('composicao: o endereco vira um objeto Endereco', () => {
    assert.ok(novoImovel().endereco instanceof Endereco);
  });

  test('sobrecarga de atualizarPreco: valor absoluto ou percentual', () => {
    const imovel = novoImovel();
    imovel.atualizarPreco(400000);
    assert.equal(imovel.preco, 400000);
    imovel.atualizarPreco(10, true);
    assert.equal(imovel.preco, 440000);
    assert.throws(() => imovel.atualizarPreco(-1), ValidationError);
    assert.throws(() => imovel.atualizarPreco('abc'), ValidationError);
  });

  test('marcarComoVendido valida o valor de venda', () => {
    assert.throws(() => novoImovel().marcarComoVendido(-5), ValidationError);
    assert.throws(() => novoImovel().marcarComoVendido('abc'), ValidationError);

    const semValor = novoImovel();
    semValor.marcarComoVendido();
    assert.equal(semValor.preco, 300000);

    const comValor = novoImovel();
    comValor.marcarComoVendido(290000);
    assert.equal(comValor.status, 'Vendido');
    assert.equal(comValor.preco, 290000);
    assert.throws(() => comValor.marcarComoVendido(1), BusinessRuleError);
  });

  test('imovel vendido nao pode ser inativado; so inativo pode ser reativado', () => {
    const vendido = novoImovel({ status: 'Vendido' });
    assert.throws(() => vendido.inativar(), BusinessRuleError);

    const imovel = novoImovel();
    assert.throws(() => imovel.reativar(), BusinessRuleError);
    imovel.inativar();
    assert.equal(imovel.status, 'Inativo');
    imovel.reativar();
    assert.equal(imovel.status, 'Disponivel');
  });

  test('validar recusa dados sem sentido', () => {
    assert.doesNotThrow(() => novoImovel().validar());
    assert.throws(() => novoImovel({ titulo: '  ' }).validar(), /titulo/);
    assert.throws(() => novoImovel({ quartos: -1 }).validar(), /quartos/);
    assert.throws(() => novoImovel({ banheiros: 1.5 }).validar(), /banheiros/);
    assert.throws(() => novoImovel({ areaTotal: -10 }).validar(), /area/);
    assert.throws(() => novoImovel({ endereco: { cidade: 'SP', cep: '123' } }).validar(), /CEP/);
    assert.throws(() => novoImovel({ endereco: { cidade: '' } }).validar(), /cidade/);
  });
});

describe('Agendamento (encapsulamento do status)', () => {
  test('fluxo normal: Pendente -> Confirmado -> Realizado', () => {
    const visita = new Agendamento({ id: 1 });
    assert.equal(visita.status, 'Pendente');
    assert.equal(visita.estaAtivo(), true);
    visita.confirmar();
    visita.realizar();
    assert.equal(visita.status, 'Realizado');
    assert.equal(visita.estaAtivo(), false);
  });

  test('transicoes invalidas sao bloqueadas', () => {
    assert.throws(() => new Agendamento({}).realizar(), BusinessRuleError);
    const cancelada = new Agendamento({});
    cancelada.cancelar('motivo');
    assert.equal(cancelada.observacoes, 'motivo');
    assert.throws(() => cancelada.confirmar(), BusinessRuleError);
    assert.throws(() => cancelada.reagendar('2030-01-01T10:00'), BusinessRuleError);
  });

  test('reagendar volta a visita para Pendente', () => {
    const visita = new Agendamento({});
    visita.confirmar();
    visita.reagendar('2030-01-01T10:00');
    assert.equal(visita.status, 'Pendente');
    assert.equal(visita.dataVisita, '2030-01-01T10:00');
  });
});

describe('Simulacao (RN08)', () => {
  test('so traz imoveis disponiveis, dentro da capacidade e com entrada ate 80% do preco', () => {
    const portfolio = [
      novoImovel({ id: 1, preco: 200000 }),
      novoImovel({ id: 2, preco: 500000 }),
      novoImovel({ id: 3, preco: 250000, status: 'Vendido' }),
      novoImovel({ id: 4, preco: 50000 }),
    ];
    const simulacao = new Simulacao({ capacidadeCompra: 300000, entradaInformada: 45000 });
    const ids = simulacao.getImoveisCompativeis(portfolio).map((i) => i.id);
    // 2 passa da capacidade, 3 esta vendido, 4: entrada de 45 mil > 80% de 50 mil
    assert.deepEqual(ids, [1]);
  });
});
