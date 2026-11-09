const notificacaoRepository = require('../repositories/NotificacaoRepository');
const { ForbiddenError } = require('../errors/AppError');

class NotificacaoService {
  notificar(usuarioId, tipo, titulo, mensagem) {
    return notificacaoRepository.create({ usuarioId: Number(usuarioId), tipo, titulo, mensagem });
  }

  listarPorUsuario(usuarioId) {
    return notificacaoRepository.findByUsuario(usuarioId);
  }

  marcarComoLida(usuarioId, notificacaoId) {
    const notificacao = notificacaoRepository.findById(notificacaoId);
    if (notificacao.usuarioId !== Number(usuarioId)) {
      throw new ForbiddenError('Voce so pode gerenciar as proprias notificacoes.');
    }
    notificacao.marcarComoLida();
    return notificacaoRepository.salvarEntidade(notificacao);
  }
}

module.exports = new NotificacaoService();
