const { BusinessRuleError } = require('../errors/AppError');
const { STATUS_AGENDAMENTO } = require('../config/constants');

const TRANSICOES_VALIDAS = {
  [STATUS_AGENDAMENTO.PENDENTE]: [STATUS_AGENDAMENTO.CONFIRMADO, STATUS_AGENDAMENTO.CANCELADO],
  [STATUS_AGENDAMENTO.CONFIRMADO]: [STATUS_AGENDAMENTO.REALIZADO, STATUS_AGENDAMENTO.CANCELADO],
  [STATUS_AGENDAMENTO.REALIZADO]: [],
  [STATUS_AGENDAMENTO.CANCELADO]: [],
};

class Agendamento {
  constructor({
    id, clienteId, corretorId, imovelId, dataSolicitacao, dataVisita,
    status, observacoes,
  }) {
    this.id = id;
    this.clienteId = clienteId;
    this.corretorId = corretorId;
    this.imovelId = imovelId;
    this.dataSolicitacao = dataSolicitacao || new Date().toISOString();
    this.dataVisita = dataVisita;
    this.status = status || STATUS_AGENDAMENTO.PENDENTE;
    this.observacoes = observacoes || '';
  }

  _transicionarPara(novoStatus) {
    const permitidas = TRANSICOES_VALIDAS[this.status] || [];
    if (!permitidas.includes(novoStatus)) {
      throw new BusinessRuleError(
        `Nao e possivel transitar de "${this.status}" para "${novoStatus}".`,
      );
    }
    this.status = novoStatus;
  }

  confirmar() {
    this._transicionarPara(STATUS_AGENDAMENTO.CONFIRMADO);
  }

  realizar() {
    this._transicionarPara(STATUS_AGENDAMENTO.REALIZADO);
  }

  cancelar(motivo) {
    this._transicionarPara(STATUS_AGENDAMENTO.CANCELADO);
    if (motivo) this.observacoes = motivo;
  }

  reagendar(novaData) {
    if (this.status === STATUS_AGENDAMENTO.REALIZADO || this.status === STATUS_AGENDAMENTO.CANCELADO) {
      throw new BusinessRuleError('Nao e possivel reagendar uma visita ja encerrada.');
    }
    this.dataVisita = novaData;
    this.status = STATUS_AGENDAMENTO.PENDENTE;
  }

  estaAtivo() {
    return this.status === STATUS_AGENDAMENTO.PENDENTE || this.status === STATUS_AGENDAMENTO.CONFIRMADO;
  }
}

module.exports = Agendamento;
