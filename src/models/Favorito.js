class Favorito {
  constructor({ id, clienteId, imovelId, dataAdicao }) {
    this.id = id;
    this.clienteId = clienteId;
    this.imovelId = imovelId;
    this.dataAdicao = dataAdicao || new Date().toISOString();
  }

  getClienteId() {
    return this.clienteId;
  }

  getImovelId() {
    return this.imovelId;
  }
}

module.exports = Favorito;
