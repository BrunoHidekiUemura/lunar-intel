const express = require('express');
const authService = require('../services/AuthService');
const usuarioRepository = require('../repositories/UsuarioRepository');
const asyncHandler = require('../middlewares/asyncHandler');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();

router.post('/cadastro', asyncHandler(async (req, res) => {
  const usuario = await authService.cadastrar(req.body);
  res.status(201).json(usuario.paraDadosPublicos());
}));

router.post('/login', asyncHandler(async (req, res) => {
  const { email, senha } = req.body;
  const usuario = await authService.autenticar(email, senha);
  req.session.usuarioId = usuario.id;
  req.session.tipo = usuario.tipo;
  res.json(usuario.paraDadosPublicos());
}));

router.post('/logout', (req, res) => {
  req.session = null;
  res.status(204).end();
});

router.post('/recuperar-senha', asyncHandler(async (req, res) => {
  authService.solicitarRecuperacaoSenha(req.body.email);
  res.json({ mensagem: 'Se o e-mail existir em nossa base, um codigo de recuperacao foi enviado.' });
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const usuario = usuarioRepository.findById(req.session.usuarioId);
  res.json(usuario.paraDadosPublicos());
}));

router.put('/perfil', requireAuth, asyncHandler(async (req, res) => {
  const usuario = authService.atualizarDados(req.session.usuarioId, req.body);
  res.json(usuario.paraDadosPublicos());
}));

router.put('/senha', requireAuth, asyncHandler(async (req, res) => {
  const { senhaAntiga, senhaNova } = req.body;
  await authService.redefinirSenha(req.session.usuarioId, senhaAntiga, senhaNova);
  res.json({ mensagem: 'Senha atualizada com sucesso.' });
}));

router.post('/inativar', requireAuth, asyncHandler(async (req, res) => {
  authService.inativarConta(req.session.usuarioId);
  req.session = null;
  res.status(204).end();
}));

module.exports = router;
