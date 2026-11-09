const express = require('express');
const notificacaoService = require('../services/NotificacaoService');
const asyncHandler = require('../middlewares/asyncHandler');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  res.json(notificacaoService.listarPorUsuario(req.session.usuarioId));
}));

router.put('/:id/lida', asyncHandler(async (req, res) => {
  res.json(notificacaoService.marcarComoLida(req.session.usuarioId, req.params.id));
}));

module.exports = router;
