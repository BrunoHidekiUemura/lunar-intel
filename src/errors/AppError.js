class AppError extends Error {
  constructor(mensagem, status = 500) {
    super(mensagem);
    this.name = this.constructor.name;
    this.status = status;
  }
}

class ValidationError extends AppError {
  constructor(mensagem) {
    super(mensagem, 400);
  }
}

class AuthError extends AppError {
  constructor(mensagem = 'Nao autenticado.') {
    super(mensagem, 401);
  }
}

class ForbiddenError extends AppError {
  constructor(mensagem = 'Operacao nao permitida para este perfil.') {
    super(mensagem, 403);
  }
}

class NotFoundError extends AppError {
  constructor(mensagem = 'Registro nao encontrado.') {
    super(mensagem, 404);
  }
}

class BusinessRuleError extends AppError {
  constructor(mensagem) {
    super(mensagem, 422);
  }
}

class PersistenceError extends AppError {
  constructor(mensagem = 'Falha ao acessar os dados armazenados.') {
    super(mensagem, 500);
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  BusinessRuleError,
  PersistenceError,
};
