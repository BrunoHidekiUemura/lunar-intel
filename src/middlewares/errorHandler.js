const { AppError } = require('../errors/AppError');

function errorHandler(erro, req, res, next) {
  if (erro instanceof AppError) {
    return res.status(erro.status).json({ erro: erro.message });
  }

  console.error('[LUNAR INTEL] Erro nao tratado:', erro);
  return res.status(500).json({ erro: 'Ocorreu um erro inesperado. Tente novamente mais tarde.' });
}

function rotaNaoEncontrada(req, res) {
  res.status(404).json({ erro: 'Rota nao encontrada.' });
}

module.exports = { errorHandler, rotaNaoEncontrada };
