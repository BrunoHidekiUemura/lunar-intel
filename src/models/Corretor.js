const Usuario = require('./Usuario');

const REGEX_CRECI = /^\d{4,6}-[A-Z]{1,2}$/;

class Corretor extends Usuario {
  constructor(dados) {
    super(dados);
    this.tipo = 'CORRETOR';
    this.creci = dados.creci;
    this.especialidade = dados.especialidade || '';
    this.totalVendas = dados.totalVendas || 0;
    this.comissaoPercentual = dados.comissaoPercentual || 5;
  }

  static validarCRECI(creci) {
    return typeof creci === 'string' && REGEX_CRECI.test(creci.trim().toUpperCase());
  }

  registrarVenda() {
    this.totalVendas += 1;
  }

  getResumoPerfil() {
    return `${this.nome} — CRECI ${this.creci} — ${this.totalVendas} venda(s) realizada(s)`;
  }
}

module.exports = Corretor;
