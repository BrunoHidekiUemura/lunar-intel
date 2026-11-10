const JsonRepository = require('./JsonRepository');

// RNF07 - registros de auditoria (nao e uma classe de dominio, so um registro tecnico)
class AuditoriaRepository extends JsonRepository {
  constructor() {
    super('auditoria.json', (dados) => ({ ...dados }));
  }

  listarRecentes(limite) {
    return this.findAll()
      .sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora) || b.id - a.id)
      .slice(0, limite);
  }
}

module.exports = new AuditoriaRepository();
