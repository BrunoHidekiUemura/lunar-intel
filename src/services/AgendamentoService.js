const agendamentoRepository = require('../repositories/AgendamentoRepository');
const imovelRepository = require('../repositories/ImovelRepository');
const usuarioRepository = require('../repositories/UsuarioRepository');
const notificacaoService = require('./NotificacaoService');
const { ValidationError, ForbiddenError, BusinessRuleError, NotFoundError } = require('../errors/AppError');
const { LIMITE_AGENDAMENTOS_ATIVOS, INTERVALO_MINIMO_DIAS, STATUS_AGENDAMENTO } = require('../config/constants');

const UM_DIA_MS = 24 * 60 * 60 * 1000;

class AgendamentoService {
  // RN10 - toda mudanca de status avisa o cliente e o corretor ao mesmo tempo
  _notificarEnvolvidos(agendamento, titulo, mensagemCliente, mensagemCorretor) {
    notificacaoService.notificar(agendamento.clienteId, 'AGENDAMENTO', titulo, mensagemCliente);
    notificacaoService.notificar(agendamento.corretorId, 'AGENDAMENTO', titulo, mensagemCorretor);
  }

  // a data precisa ser valida e estar no futuro
  _validarDataVisita(dataVisita) {
    if (!dataVisita) throw new ValidationError('Informe a data da visita.');
    const data = new Date(dataVisita);
    if (Number.isNaN(data.getTime())) {
      throw new ValidationError('Data da visita invalida. Use o formato AAAA-MM-DDTHH:MM.');
    }
    if (data.getTime() <= Date.now()) {
      throw new ValidationError('A data da visita precisa ser no futuro.');
    }
  }

  solicitar(clienteId, { imovelId, dataVisita, observacoes }) {
    if (!imovelId || !dataVisita) {
      throw new ValidationError('Imovel e data da visita sao obrigatorios.');
    }
    this._validarDataVisita(dataVisita);

    const imovel = imovelRepository.findById(imovelId);

    if (!imovel.isDisponivel()) {
      throw new BusinessRuleError('Este imovel nao esta disponivel para visitas.');
    }

    const visitasDoCliente = agendamentoRepository.findByCliente(clienteId);

    // RN04 - no maximo 3 visitas ativas por cliente (somando todos os imoveis)
    const ativas = visitasDoCliente.filter((a) => a.estaAtivo());
    if (ativas.length >= LIMITE_AGENDAMENTOS_ATIVOS) {
      throw new BusinessRuleError(
        `Voce ja tem ${LIMITE_AGENDAMENTOS_ATIVOS} visitas em andamento. Aguarde alguma ser concluida ou cancelada.`,
      );
    }

    // RN09 - mesmo imovel: nao pode ter visita em aberto nem pedido feito nos ultimos 7 dias
    const visitasNesteImovel = visitasDoCliente.filter((a) => a.imovelId === Number(imovelId));
    if (visitasNesteImovel.some((a) => a.estaAtivo())) {
      throw new BusinessRuleError('Voce ja tem uma visita em aberto para este imovel.');
    }
    const agora = Date.now();
    const pedidoRecente = visitasNesteImovel.some((a) => {
      const dias = (agora - new Date(a.dataSolicitacao).getTime()) / UM_DIA_MS;
      return dias < INTERVALO_MINIMO_DIAS;
    });
    if (pedidoRecente) {
      throw new BusinessRuleError(
        `Aguarde ${INTERVALO_MINIMO_DIAS} dias entre pedidos de visita para o mesmo imovel.`,
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

    this._notificarEnvolvidos(
      agendamento,
      'Nova solicitacao de visita',
      `Seu pedido de visita ao imovel "${imovel.titulo}" foi enviado ao corretor.`,
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
    // RN03 - o imovel precisa continuar disponivel na hora de confirmar
    const imovel = imovelRepository.findById(agendamento.imovelId);
    if (!imovel.isDisponivel()) {
      throw new BusinessRuleError('Este imovel nao esta mais disponivel, a visita nao pode ser confirmada.');
    }
    agendamento.confirmar();
    const salvo = agendamentoRepository.salvarEntidade(agendamento);
    this._notificarEnvolvidos(
      agendamento, 'Visita confirmada',
      'Sua visita foi confirmada pelo corretor.',
      `Voce confirmou a visita ao imovel "${imovel.titulo}".`,
    );
    return salvo;
  }

  reagendar(corretorId, agendamentoId, novaData) {
    const agendamento = this._buscarEVerificarCorretor(agendamentoId, corretorId);
    this._validarDataVisita(novaData);
    agendamento.reagendar(novaData);
    const salvo = agendamentoRepository.salvarEntidade(agendamento);
    this._notificarEnvolvidos(
      agendamento, 'Visita reagendada',
      'O corretor propos uma nova data para sua visita.',
      'Voce reagendou uma visita. O cliente foi avisado.',
    );
    return salvo;
  }

  cancelar(corretorId, agendamentoId, motivo) {
    const agendamento = this._buscarEVerificarCorretor(agendamentoId, corretorId);
    agendamento.cancelar(motivo);
    const salvo = agendamentoRepository.salvarEntidade(agendamento);
    this._notificarEnvolvidos(
      agendamento, 'Visita cancelada',
      motivo || 'Sua visita foi cancelada pelo corretor.',
      'Voce cancelou uma visita. O cliente foi avisado.',
    );
    return salvo;
  }

  realizar(corretorId, agendamentoId) {
    const agendamento = this._buscarEVerificarCorretor(agendamentoId, corretorId);
    agendamento.realizar();
    const salvo = agendamentoRepository.salvarEntidade(agendamento);
    this._notificarEnvolvidos(
      agendamento, 'Visita realizada',
      'Obrigado pela visita! O corretor vai entrar em contato.',
      'Visita marcada como realizada.',
    );
    return salvo;
  }

  cancelarPeloCliente(clienteId, agendamentoId, motivo) {
    const agendamento = agendamentoRepository.findById(agendamentoId);
    if (agendamento.clienteId !== Number(clienteId)) {
      throw new ForbiddenError('Voce so pode cancelar as proprias visitas.');
    }
    agendamento.cancelar(motivo);
    const salvo = agendamentoRepository.salvarEntidade(agendamento);
    this._notificarEnvolvidos(
      agendamento, 'Visita cancelada pelo cliente',
      'Voce cancelou sua visita. O corretor foi avisado.',
      motivo || 'O cliente cancelou a visita agendada.',
    );
    return salvo;
  }

  // inclui o titulo do imovel, ja que o front so enxerga os imoveis disponiveis
  listarPorCliente(clienteId) {
    return agendamentoRepository.findByCliente(clienteId).map((agendamento) => {
      const imovel = imovelRepository.findOne((i) => i.id === agendamento.imovelId);
      return { ...agendamento, imovelTitulo: imovel ? imovel.titulo : `Imovel #${agendamento.imovelId}` };
    });
  }

  listarPorCorretor(corretorId) {
    return agendamentoRepository.findByCorretor(corretorId).map((agendamento) => {
      const cliente = usuarioRepository.findById(agendamento.clienteId);
      return {
        ...agendamento,
        cliente: { nome: cliente.nome, telefone: cliente.telefone, email: cliente.email },
      };
    });
  }

  buscarPorId(agendamentoId) {
    const agendamento = agendamentoRepository.findById(agendamentoId);
    if (!agendamento) throw new NotFoundError('Agendamento nao encontrado.');
    return agendamento;
  }
}

module.exports = new AgendamentoService();
