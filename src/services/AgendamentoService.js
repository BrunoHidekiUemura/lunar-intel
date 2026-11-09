const agendamentoRepository = require('../repositories/AgendamentoRepository');
const imovelRepository = require('../repositories/ImovelRepository');
const notificacaoService = require('./NotificacaoService');
const { ValidationError, ForbiddenError, BusinessRuleError, NotFoundError } = require('../errors/AppError');
const { LIMITE_AGENDAMENTOS_ATIVOS, INTERVALO_MINIMO_DIAS, STATUS_AGENDAMENTO } = require('../config/constants');

const UM_DIA_MS = 24 * 60 * 60 * 1000;

class AgendamentoService {
  solicitar(clienteId, { imovelId, dataVisita, observacoes }) {
    if (!imovelId || !dataVisita) {
      throw new ValidationError('Imovel e data da visita sao obrigatorios.');
    }

    const imovel = imovelRepository.findById(imovelId);

    if (!imovel.isDisponivel()) {
      throw new BusinessRuleError('Este imovel nao esta disponivel para visitas.');
    }

    const agendamentosDoImovel = agendamentoRepository.findByImovel(imovelId)
      .filter((a) => a.clienteId === Number(clienteId));

    const ativos = agendamentosDoImovel.filter((a) => a.estaAtivo());
    if (ativos.length >= LIMITE_AGENDAMENTOS_ATIVOS) {
      throw new BusinessRuleError(
        `Limite de ${LIMITE_AGENDAMENTOS_ATIVOS} agendamentos ativos para este imovel atingido.`,
      );
    }

    const agora = Date.now();
    const recorrenciaRecente = agendamentosDoImovel.some((a) => {
      if (!a.estaAtivo()) return false;
      const diffDias = (agora - new Date(a.dataSolicitacao).getTime()) / UM_DIA_MS;
      return diffDias < INTERVALO_MINIMO_DIAS;
    });
    if (recorrenciaRecente) {
      throw new BusinessRuleError(
        `Aguarde ${INTERVALO_MINIMO_DIAS} dias entre solicitacoes de visita para o mesmo imovel.`,
      );
    }

    const agendamento = agendamentoRepository.create({
      clienteId: Number(clienteId),
      corretorId: imovel.corretorId,
      imovelId: Number(imovelId),
      dataVisita,
      observacoes,
      status: STATUS_AGENDAMENTO.PENDENTE,
    });

    notificacaoService.notificar(
      imovel.corretorId,
      'AGENDAMENTO',
      'Nova solicitacao de visita',
      `O cliente solicitou uma visita para o imovel "${imovel.titulo}".`,
    );

    return agendamento;
  }

  _buscarEVerificarCorretor(agendamentoId, corretorId) {
    const agendamento = agendamentoRepository.findById(agendamentoId);
    if (agendamento.corretorId !== Number(corretorId)) {
      throw new ForbiddenError('Voce so pode gerenciar agendamentos dos seus proprios imoveis.');
    }
    return agendamento;
  }

  confirmar(corretorId, agendamentoId) {
    const agendamento = this._buscarEVerificarCorretor(agendamentoId, corretorId);
    agendamento.confirmar();
    const salvo = agendamentoRepository.salvarEntidade(agendamento);
    notificacaoService.notificar(
      agendamento.clienteId, 'AGENDAMENTO', 'Visita confirmada', 'Sua visita foi confirmada pelo corretor.',
    );
    return salvo;
  }

  reagendar(corretorId, agendamentoId, novaData) {
    const agendamento = this._buscarEVerificarCorretor(agendamentoId, corretorId);
    agendamento.reagendar(novaData);
    const salvo = agendamentoRepository.salvarEntidade(agendamento);
    notificacaoService.notificar(
      agendamento.clienteId, 'AGENDAMENTO', 'Visita reagendada', 'O corretor propos uma nova data para sua visita.',
    );
    return salvo;
  }

  cancelar(corretorId, agendamentoId, motivo) {
    const agendamento = this._buscarEVerificarCorretor(agendamentoId, corretorId);
    agendamento.cancelar(motivo);
    const salvo = agendamentoRepository.salvarEntidade(agendamento);
    notificacaoService.notificar(
      agendamento.clienteId, 'AGENDAMENTO', 'Visita cancelada', motivo || 'Sua visita foi cancelada pelo corretor.',
    );
    return salvo;
  }

  realizar(corretorId, agendamentoId) {
    const agendamento = this._buscarEVerificarCorretor(agendamentoId, corretorId);
    agendamento.realizar();
    return agendamentoRepository.salvarEntidade(agendamento);
  }

  listarPorCliente(clienteId) {
    return agendamentoRepository.findByCliente(clienteId);
  }

  listarPorCorretor(corretorId) {
    return agendamentoRepository.findByCorretor(corretorId);
  }

  buscarPorId(agendamentoId) {
    const agendamento = agendamentoRepository.findById(agendamentoId);
    if (!agendamento) throw new NotFoundError('Agendamento nao encontrado.');
    return agendamento;
  }
}

module.exports = new AgendamentoService();
