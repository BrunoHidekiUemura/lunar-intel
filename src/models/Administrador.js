const Usuario = require('./Usuario');

class Administrador extends Usuario {
  constructor(dados) {
    super(dados);
    this.tipo = 'ADMINISTRADOR';
    this.nivelAcesso = dados.nivelAcesso || 'GERENCIAL';
  }

  getResumoPerfil() {
    return `${this.nome} (Administrador, nível ${this.nivelAcesso})`;
  }
}

module.exports = Administrador;
