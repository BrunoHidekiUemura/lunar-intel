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
    this.status = STATUS_IMOVEL.VENDIDO;
    this.preco = valorVenda || this.preco;
  }

  inativar() {
    this.status = STATUS_IMOVEL.INATIVO;
  }

  reativar() {
    this.status = STATUS_IMOVEL.DISPONIVEL;
  }

  atualizarPreco(novoPreco) {
    if (typeof novoPreco !== 'number' || novoPreco <= 0) {
      throw new ValidationError('Preco invalido.');
    }
    this.preco = novoPreco;
  }

  getDadosCompletos() {
    return {
      ...this,
      enderecoCompleto: this.endereco.getEnderecoCompleto(),
    };
  }
}

module.exports = Imovel;
