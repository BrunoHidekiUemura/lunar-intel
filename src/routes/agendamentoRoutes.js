const express = require('express');
const agendamentoService = require('../services/AgendamentoService');
const asyncHandler = require('../middlewares/asyncHandler');
const { requireAuth, requireRole } = require('../middlewares/auth');
const { PERFIS } = require('../config/constants');

const router = express.Router();

router.post('/', requireAuth, requireRole(PERFIS.CLIENTE), asyncHandler(async (req, res) => {
  const agendamento = agendamentoService.solicitar(req.session.usuarioId, req.body);
  res.status(201).json(agendamento);
}));

router.get('/', requireAuth, requireRole(PERFIS.CLIENTE, PERFIS.CORRETOR), asyncHandler(async (req, res) => {
  const { usuarioId, tipo } = req.session;
  if (tipo === PERFIS.CLIENTE) return res.json(agendamentoService.listarPorCliente(usuarioId));
  return res.json(agendamentoService.listarPorCorretor(usuarioId));
}));

router.put('/:id/confirmar', requireAuth, requireRole(PERFIS.CORRETOR), asyncHandler(async (req, res) => {
  res.json(agendamentoService.confirmar(req.session.usuarioId, req.params.id));
}));

router.put('/:id/reagendar', requireAuth, requireRole(PERFIS.CORRETOR), asyncHandler(async (req, res) => {
  res.json(agendamentoService.reagendar(req.session.usuarioId, req.params.id, req.body.dataVisita));
}));

router.put('/:id/cancelar', requireAuth, requireRole(PERFIS.CLIENTE, PERFIS.CORRETOR), asyncHandler(async (req, res) => {
  const { usuarioId, tipo } = req.session;
  if (tipo === PERFIS.CLIENTE) {
    return res.json(agendamentoService.cancelarPeloCliente(usuarioId, req.params.id, req.body.motivo));
  }
  return res.json(agendamentoService.cancelar(usuarioId, req.params.id, req.body.motivo));
}));

router.put('/:id/realizar', requireAuth, requireRole(PERFIS.CORRETOR), asyncHandler(async (req, res) => {
  res.json(agendamentoService.realizar(req.session.usuarioId, req.params.id));
}));

module.exports = router;
