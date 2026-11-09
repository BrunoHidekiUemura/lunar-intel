const REGEX_CEP = /^\d{5}-?\d{3}$/;

class Endereco {
  constructor({ logradouro, numero, complemento, bairro, cidade, estado, cep }) {
    this.logradouro = logradouro;
    this.numero = numero;
    this.complemento = complemento || '';
    this.bairro = bairro;
    this.cidade = cidade;
    this.estado = estado;
    this.cep = cep;
  }

  static validarCEP(cep) {
    return typeof cep === 'string' && REGEX_CEP.test(cep.trim());
  }

  getEnderecoCompleto() {
    const complementoTexto = this.complemento ? `, ${this.complemento}` : '';
    return `${this.logradouro}, ${this.numero}${complementoTexto} - ${this.bairro}, ${this.cidade}/${this.estado} - CEP ${this.cep}`;
  }
}

module.exports = Endereco;
