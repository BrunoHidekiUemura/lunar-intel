const usuarioRepository = require('../repositories/UsuarioRepository');
const imovelRepository = require('../repositories/ImovelRepository');
const agendamentoRepository = require('../repositories/AgendamentoRepository');
const { NotFoundError } = require('../errors/AppError');
const { PERFIS, STATUS_IMOVEL, STATUS_AGENDAMENTO } = require('../config/constants');

class AdminService {
  listarUsuarios() {
    return usuarioRepository.findAll();
  }

  alterarStatusUsuario(usuarioId, ativo) {
    const usuario = usuarioRepository.findById(usuarioId);
    if (!usuario) throw new NotFoundError('Usuario nao encontrado.');
    if (ativo) usuario.reativarConta();
    else usuario.inativarConta();
    return usuarioRepository.salvarEntidade(usuario);
  }

  listarTodosImoveis() {
    return imovelRepository.findAll();
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

    const taxaConversao = realizadas.length
      ? (vendidos.length / realizadas.length) * 100
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
