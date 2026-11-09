const JsonRepository = require('./JsonRepository');
const Cliente = require('../models/Cliente');
const Corretor = require('../models/Corretor');
const Administrador = require('../models/Administrador');
const { PERFIS } = require('../config/constants');

function fabricaUsuario(dados) {
  switch (dados.tipo) {
    case PERFIS.CLIENTE:
      return new Cliente(dados);
    case PERFIS.CORRETOR:
      return new Corretor(dados);
    case PERFIS.ADMINISTRADOR:
      return new Administrador(dados);
    default:
      throw new Error(`Tipo de usuario desconhecido: ${dados.tipo}`);
  }
}

class UsuarioRepository extends JsonRepository {
  constructor() {
    super('usuarios.json', fabricaUsuario);
  }

  findByEmail(email) {
    return this.findOne((u) => u.email.toLowerCase() === String(email).toLowerCase());
  }

  findByCpf(cpf) {
    return this.findOne((u) => u.cpf === cpf);
  }
}

module.exports = new UsuarioRepository();
