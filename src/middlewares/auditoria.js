const auditoriaService = require('../services/AuditoriaService');

// RNF07 - eventos criticos que geram log de auditoria (metodo, rota, descricao)
const EVENTOS = [
  ['POST', /^\/api\/auth\/cadastro$/, 'Cadastro de usuario'],
  ['POST', /^\/api\/auth\/login$/, 'Login'],
  ['POST', /^\/api\/auth\/logout$/, 'Logout'],
  ['POST', /^\/api\/auth\/recuperar-senha$/, 'Pedido de recuperacao de senha'],
  ['POST', /^\/api\/auth\/redefinir-senha$/, 'Senha redefinida por codigo'],
  ['PUT', /^\/api\/auth\/perfil$/, 'Dados cadastrais alterados'],
  ['PUT', /^\/api\/auth\/senha$/, 'Senha alterada'],
  ['POST', /^\/api\/auth\/inativar$/, 'Conta encerrada pelo proprio usuario'],
  ['POST', /^\/api\/imoveis$/, 'Imovel cadastrado'],
  ['PUT', /^\/api\/imoveis\/(\d+)$/, 'Imovel #$1 editado'],
  ['DELETE', /^\/api\/imoveis\/(\d+)$/, 'Imovel #$1 inativado'],
  ['POST', /^\/api\/imoveis\/(\d+)\/reativar$/, 'Imovel #$1 reativado'],
  ['POST', /^\/api\/imoveis\/(\d+)\/vender$/, 'Imovel #$1 vendido'],
  ['POST', /^\/api\/simulacoes$/, 'Simulacao realizada'],
  ['POST', /^\/api\/agendamentos$/, 'Visita solicitada'],
  ['PUT', /^\/api\/agendamentos\/(\d+)\/confirmar$/, 'Visita #$1 confirmada'],
  ['PUT', /^\/api\/agendamentos\/(\d+)\/reagendar$/, 'Visita #$1 reagendada'],
  ['PUT', /^\/api\/agendamentos\/(\d+)\/realizar$/, 'Visita #$1 realizada'],
  ['PUT', /^\/api\/agendamentos\/(\d+)\/cancelar$/, 'Visita #$1 cancelada'],
  ['PUT', /^\/api\/admin\/usuarios\/(\d+)\/status$/, 'Status do usuario #$1 alterado'],
];

function descrever(metodo, caminho) {
  for (const [m, padrao, descricao] of EVENTOS) {
    if (m === metodo && padrao.test(caminho)) return caminho.replace(padrao, descricao);
  }
  return null;
}

function auditoria(req, res, next) {
  const caminho = req.originalUrl.split('?')[0];
  const acao = descrever(req.method, caminho);
  if (!acao) return next();

  // guarda o usuario antes da rota rodar (o logout apaga a sessao)
  const usuarioAntes = req.session && req.session.usuarioId;

  res.on('finish', () => {
    try {
      const sucesso = res.statusCode < 400;
      // registra todas as acoes que deram certo e tambem as tentativas de login que falharam
      if (!sucesso && !caminho.endsWith('/login')) return;
      // no login, o autor e quem acabou de entrar; se falhou, nao atribui a ninguem
      // (o navegador pode ter a sessao antiga de outra pessoa)
      const sessaoAtual = req.session && req.session.usuarioId;
      const usuarioId = caminho.endsWith('/login')
        ? (sucesso ? sessaoAtual : null)
        : sessaoAtual || usuarioAntes || null;
      let detalhe = '';
      if (caminho.endsWith('/login') || caminho.endsWith('/cadastro')) detalhe = `e-mail: ${(req.body && req.body.email) || '-'}`;
      if (caminho.includes('/admin/usuarios/')) detalhe = req.body && req.body.ativo ? 'reativado' : 'bloqueado';
      auditoriaService.registrar({
        usuarioId, acao: sucesso ? acao : `${acao} (falhou)`, detalhe, sucesso,
      });
    } catch (erro) {
      // falha no log nao pode derrubar a requisicao do usuario
      console.error('[auditoria] nao foi possivel registrar o evento');
    }
  });
  return next();
}

module.exports = auditoria;
