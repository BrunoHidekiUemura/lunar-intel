const Endereco = require('./Endereco');
const { BusinessRuleError, ValidationError } = require('../errors/AppError');
const { STATUS_IMOVEL } = require('../config/constants');

class Imovel {
  constructor({
    id, titulo, descricao, preco, areaTotal, quartos, banheiros, tipo,
    status, endereco, corretorId, imagens,
  }) {
    this.id = id;
    this.titulo = titulo;
    this.descricao = descricao;
    this.preco = preco;
    this.areaTotal = areaTotal;
    this.quartos = quartos;
    this.banheiros = banheiros;
    this.tipo = tipo;
    this.status = status || STATUS_IMOVEL.DISPONIVEL;
    this.endereco = endereco instanceof Endereco ? endereco : new Endereco(endereco || {});
    this.corretorId = corretorId;
    this.imagens = imagens || [];
  }

  isDisponivel() {
    return this.status === STATUS_IMOVEL.DISPONIVEL;
  }

  marcarComoVendido(valorVenda) {
    if (!this.isDisponivel()) {
      throw new BusinessRuleError('Somente imoveis disponiveis podem ser marcados como vendidos.');
    }
    const semValor = valorVenda === undefined || valorVenda === null || valorVenda === '';
    if (!semValor && (typeof valorVenda !== 'number' || Number.isNaN(valorVenda) || valorVenda <= 0)) {
      throw new ValidationError('O valor de venda precisa ser um numero maior que zero.');
    }
    this.status = STATUS_IMOVEL.VENDIDO;
    if (!semValor) this.preco = valorVenda;
  }

  isVendido() {
    return this.status === STATUS_IMOVEL.VENDIDO;
  }

  inativar() {
    if (this.isVendido()) {
      throw new BusinessRuleError('Um imovel vendido nao pode ser inativado.');
    }
    this.status = STATUS_IMOVEL.INATIVO;
  }

  reativar() {
    if (this.status !== STATUS_IMOVEL.INATIVO) {
      throw new BusinessRuleError('Somente imoveis inativos podem ser reativados.');
    }
    this.status = STATUS_IMOVEL.DISPONIVEL;
  }

  // confere se os dados do imovel fazem sentido antes de salvar
  validar() {
    if (!this.titulo || !String(this.titulo).trim()) {
      throw new ValidationError('O titulo do imovel e obrigatorio.');
    }
    if (typeof this.preco !== 'number' || Number.isNaN(this.preco) || this.preco <= 0) {
      throw new ValidationError('O preco do imovel precisa ser maior que zero.');
    }
    if (typeof this.areaTotal !== 'number' || Number.isNaN(this.areaTotal) || this.areaTotal < 0) {
      throw new ValidationError('A area total nao pode ser negativa.');
    }
    ['quartos', 'banheiros'].forEach((campo) => {
      if (!Number.isInteger(this[campo]) || this[campo] < 0) {
        throw new ValidationError(`O numero de ${campo} precisa ser um inteiro maior ou igual a zero.`);
      }
    });
    if (!this.endereco.cidade || !String(this.endereco.cidade).trim()) {
      throw new ValidationError('Informe a cidade do imovel.');
    }
    if (this.endereco.cep && !Endereco.validarCEP(this.endereco.cep)) {
      throw new ValidationError('CEP invalido.');
    }
  }

  // Sobrecarga: JS nao tem sobrecarga de verdade, entao o metodo muda
  // o comportamento conforme os parametros recebidos.
  //   atualizarPreco(500000)        -> define o novo preco
  //   atualizarPreco(10, true)      -> reajusta o preco atual em 10%
  atualizarPreco(valor, ehPercentual = false) {
    if (typeof valor !== 'number' || Number.isNaN(valor)) {
      throw new ValidationError('Preco invalido.');
    }

    const novoPreco = ehPercentual ? this.preco * (1 + valor / 100) : valor;
    if (novoPreco <= 0) {
      throw new ValidationError('O preco do imovel precisa ser maior que zero.');
    }
    this.preco = Math.round(novoPreco * 100) / 100;
  }

  getDadosCompletos() {
    return {
      ...this,
      enderecoCompleto: this.endereco.getEnderecoCompleto(),
    };
  }
}

module.exports = Imovel;
