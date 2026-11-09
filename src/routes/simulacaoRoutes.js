const express = require('express');
const simulacaoService = require('../services/SimulacaoService');
const asyncHandler = require('../middlewares/asyncHandler');
const { requireAuth, requireRole } = require('../middlewares/auth');
const { PERFIS } = require('../config/constants');

const router = express.Router();

router.post('/', requireAuth, requireRole(PERFIS.CLIENTE), asyncHandler(async (req, res) => {
  const resultado = simulacaoService.simular(req.session.usuarioId, req.body);
  res.status(201).json(resultado);
}));

router.get('/', requireAuth, requireRole(PERFIS.CLIENTE), asyncHandler(async (req, res) => {
  res.json(simulacaoService.listarPorCliente(req.session.usuarioId));
}));

module.exports = router;
