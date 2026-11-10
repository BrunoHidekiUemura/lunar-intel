const express = require('express');
const imovelService = require('../services/ImovelService');
const asyncHandler = require('../middlewares/asyncHandler');
const { requireAuth, requireRole } = require('../middlewares/auth');
const { PERFIS } = require('../config/constants');

const router = express.Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  res.json(imovelService.listarDisponiveis(req.query));
}));

router.get('/meu-portfolio', requireAuth, requireRole(PERFIS.CORRETOR), asyncHandler(async (req, res) => {
  res.json(imovelService.listarPorCorretor(req.session.usuarioId));
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  res.json(imovelService.buscarPorId(req.params.id).getDadosCompletos());
}));

router.post('/', requireAuth, requireRole(PERFIS.CORRETOR), asyncHandler(async (req, res) => {
  const imovel = imovelService.cadastrar(req.session.usuarioId, req.body);
  res.status(201).json(imovel);
}));

router.put('/:id', requireAuth, requireRole(PERFIS.CORRETOR), asyncHandler(async (req, res) => {
  const imovel = imovelService.atualizar(req.session.usuarioId, req.params.id, req.body);
  res.json(imovel);
}));

router.delete('/:id', requireAuth, requireRole(PERFIS.CORRETOR), asyncHandler(async (req, res) => {
  const imovel = imovelService.inativar(req.session.usuarioId, req.params.id);
  res.json(imovel);
}));

router.post('/:id/reativar', requireAuth, requireRole(PERFIS.CORRETOR), asyncHandler(async (req, res) => {
  res.json(imovelService.reativar(req.session.usuarioId, req.params.id));
}));

router.post('/:id/vender', requireAuth, requireRole(PERFIS.CORRETOR), asyncHandler(async (req, res) => {
  const imovel = imovelService.marcarComoVendido(req.session.usuarioId, req.params.id, req.body.valorVenda);
  res.json(imovel);
}));

module.exports = router;
