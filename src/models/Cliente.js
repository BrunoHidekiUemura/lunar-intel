const Usuario = require('./Usuario');
const { ValidationError } = require('../errors/AppError');
const {
  COMPROMETIMENTO_MAX_RENDA,
  TAXA_JUROS_MENSAL,
  PRAZO_FINANCIAMENTO_MESES,
  IDADE_MINIMA,
  IDADE_MAXIMA,
} = require('../config/constants');

class Cliente extends Usuario {
  constructor(dados) {
    super(dados);
    this.tipo = 'CLIENTE';
    // garante numero mesmo que o dado venha como texto
    this.rendaMensal = Number(dados.rendaMensal) || 0;
    this.idade = Number(dados.idade) || 0;
    this.poupanca = Number(dados.poupanca) || 0;
    this.fgts = Number(dados.fgts) || 0;
    this.profissao = dados.profissao || '';
  }

  validarIdade() {
    return this.idade >= IDADE_MINIMA && this.idade <= IDADE_MAXIMA;
  }

  obterParcelaMaxima() {
    return this.rendaMensal * COMPROMETIMENTO_MAX_RENDA;
  }

  getValorEntradaTotal() {
    return this.poupanca + this.fgts;
  }

  calcularCapacidadeCompra() {
    if (!this.validarIdade()) {
      throw new ValidationError('Idade fora da faixa permitida para simulacao (18 a 70 anos).');
    }
    if (!this.rendaMensal || this.rendaMensal <= 0) {
      throw new ValidationError('Renda mensal deve ser informada e maior que zero.');
    }

    const parcelaMaxima = this.obterParcelaMaxima();
    const i = TAXA_JUROS_MENSAL;
    const n = PRAZO_FINANCIAMENTO_MESES;
    const valorFinanciavel = parcelaMaxima * (1 - Math.pow(1 + i, -n)) / i;

    return valorFinanciavel + this.getValorEntradaTotal();
  }

  getResumoPerfil() {
    return `${this.nome} | Renda mensal: R$ ${this.rendaMensal.toFixed(2)}`;
  }
}

module.exports = Cliente;
