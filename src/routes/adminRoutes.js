const express = require('express');
const adminService = require('../services/AdminService');
const asyncHandler = require('../middlewares/asyncHandler');
const { requireAuth, requireRole } = require('../middlewares/auth');
const { PERFIS } = require('../config/constants');

const router = express.Router();

router.use(requireAuth, requireRole(PERFIS.ADMINISTRADOR));

router.get('/usuarios', asyncHandler(async (req, res) => {
  res.json(adminService.listarUsuarios().map((u) => u.paraDadosPublicos()));
}));

router.put('/usuarios/:id/status', asyncHandler(async (req, res) => {
  const usuario = adminService.alterarStatusUsuario(req.params.id, req.body.ativo);
  res.json(usuario.paraDadosPublicos());
}));

router.get('/imoveis', asyncHandler(async (req, res) => {
  res.json(adminService.listarTodosImoveis());
}));

router.get('/relatorio', asyncHandler(async (req, res) => {
  res.json(adminService.gerarRelatorio());
}));

module.exports = router;
