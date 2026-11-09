const { ENTRADA_MAX_PROPORCAO } = require('../config/constants');

class Simulacao {
  constructor({
    id, clienteId, dataSimulacao, rendaInformada, idadeInformada,
    entradaInformada, capacidadeCompra, imoveisEncontrados,
  }) {
    this.id = id;
    this.clienteId = clienteId;
    this.dataSimulacao = dataSimulacao || new Date().toISOString();
    this.rendaInformada = rendaInformada;
    this.idadeInformada = idadeInformada;
    this.entradaInformada = entradaInformada;
    this.capacidadeCompra = capacidadeCompra || 0;
    this.imoveisEncontrados = imoveisEncontrados || [];
  }

  getImoveisCompativeis(portfolio) {
    return portfolio.filter((imovel) => {
      if (imovel.status !== 'Disponivel') return false;
      if (imovel.preco > this.capacidadeCompra) return false;
      const entradaMaximaPermitida = imovel.preco * ENTRADA_MAX_PROPORCAO;
      if (this.entradaInformada > entradaMaximaPermitida) return false;
      return true;
    });
  }

  getResumo() {
    return `Renda de R$ ${this.rendaInformada.toFixed(2)} e entrada de R$ ${this.entradaInformada.toFixed(2)} `
      + `resultam em capacidade de compra de R$ ${this.capacidadeCompra.toFixed(2)}.`;
  }
}

module.exports = Simulacao;
