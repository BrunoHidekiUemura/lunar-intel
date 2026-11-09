const { AuthError, ForbiddenError } = require('../errors/AppError');

function requireAuth(req, res, next) {
  if (!req.session || !req.session.usuarioId) {
    return next(new AuthError('E necessario estar autenticado para acessar este recurso.'));
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
