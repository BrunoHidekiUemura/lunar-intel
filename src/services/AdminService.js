const usuarioRepository = require('../repositories/UsuarioRepository');
const imovelRepository = require('../repositories/ImovelRepository');
const agendamentoRepository = require('../repositories/AgendamentoRepository');
const { ValidationError, BusinessRuleError } = require('../errors/AppError');
const { PERFIS, STATUS_IMOVEL, STATUS_AGENDAMENTO } = require('../config/constants');

class AdminService {
  listarUsuarios() {
    return usuarioRepository.findAll();
  }

  alterarStatusUsuario(adminId, usuarioId, ativo) {
    if (typeof ativo !== 'boolean') {
      throw new ValidationError('Informe "ativo" como true ou false.');
    }
    if (Number(usuarioId) === Number(adminId) && !ativo) {
      throw new BusinessRuleError('Voce nao pode bloquear a sua propria conta.');
    }
    const usuario = usuarioRepository.findById(usuarioId);
    if (ativo) usuario.reativarConta();
    else usuario.inativarConta();
    return usuarioRepository.salvarEntidade(usuario);
  }

  listarTodosImoveis() {
    const imoveis = imovelRepository.findAll();
    return imoveis.map((imovel) => {
      const corretor = usuarioRepository.findOne((u) => u.id === imovel.corretorId);
      return { ...imovel, corretorNome: corretor ? corretor.nome : `Corretor #${imovel.corretorId}` };
    });
  }

  gerarRelatorio() {
    const imoveis = imovelRepository.findAll();
    const agendamentos = agendamentoRepository.findAll();
    const corretores = usuarioRepository.findAll().filter((u) => u.tipo === PERFIS.CORRETOR);

    const vendidos = imoveis.filter((i) => i.status === STATUS_IMOVEL.VENDIDO);
    const realizadas = agendamentos.filter((a) => a.status === STATUS_AGENDAMENTO.REALIZADO);

    const ticketMedio = vendidos.length
      ? vendidos.reduce((soma, i) => soma + i.preco, 0) / vendidos.length
      : 0;

    // conversao = dos imoveis que receberam visita realizada, quantos foram vendidos
    // (assim o valor fica sempre entre 0% e 100%)
    const imoveisVisitados = new Set(realizadas.map((a) => a.imovelId));
    const visitadosEVendidos = vendidos.filter((i) => imoveisVisitados.has(i.id)).length;
    const taxaConversao = imoveisVisitados.size
      ? (visitadosEVendidos / imoveisVisitados.size) * 100
      : 0;

    return {
      totalImoveis: imoveis.length,
      imoveisDisponiveis: imoveis.filter((i) => i.status === STATUS_IMOVEL.DISPONIVEL).length,
      imoveisVendidos: vendidos.length,
      totalAgendamentos: agendamentos.length,
      visitasRealizadas: realizadas.length,
      ticketMedio,
      taxaConversaoPercentual: taxaConversao,
      corretores: corretores.map((c) => ({
        id: c.id, nome: c.nome, totalVendas: c.totalVendas,
      })),
    };
  }
}

module.exports = new AdminService();
