const usuarioRepository = require('../repositories/UsuarioRepository');
const { AuthError, ForbiddenError } = require('../errors/AppError');

function requireAuth(req, res, next) {
  if (!req.session || !req.session.usuarioId) {
    return next(new AuthError('E necessario estar autenticado para acessar este recurso.'));
  }
  // confere a cada requisicao se a conta ainda existe e esta ativa,
  // assim um usuario bloqueado pelo admin perde o acesso na hora
  const usuario = usuarioRepository.findOne((u) => u.id === Number(req.session.usuarioId));
  if (!usuario || !usuario.ativo) {
    req.session = null;
    return next(new AuthError('Sua sessao foi encerrada porque a conta esta inativa.'));
  }
  return next();
}

function requireRole(...perfisPermitidos) {
  return (req, res, next) => {
    if (!req.session || !req.session.usuarioId) {
      return next(new AuthError('E necessario estar autenticado para acessar este recurso.'));
    }
    if (!perfisPermitidos.includes(req.session.tipo)) {
      return next(new ForbiddenError('Seu perfil nao tem permissao para esta operacao.'));
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };
