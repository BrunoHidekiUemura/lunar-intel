document.addEventListener('usuario-pronto', () => {
  carregarRelatorio();
  carregarUsuarios();
  carregarImoveis();
});

document.querySelectorAll('.tab-btn').forEach((botao) => {
  botao.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
    botao.classList.add('active');
    document.getElementById(`tab-${botao.dataset.tab}`).classList.add('active');
  });
});

let ultimoRelatorio = null;

async function carregarRelatorio() {
  const relatorio = await Api.get('/admin/relatorio');
  ultimoRelatorio = relatorio;
  document.getElementById('stat-grid').innerHTML = `
    <div class="stat-card"><div class="valor">${relatorio.totalImoveis}</div><div class="label">Imóveis cadastrados</div></div>
    <div class="stat-card"><div class="valor">${relatorio.imoveisVendidos}</div><div class="label">Imóveis vendidos</div></div>
    <div class="stat-card"><div class="valor">${relatorio.visitasRealizadas}</div><div class="label">Visitas realizadas</div></div>
    <div class="stat-card"><div class="valor">${formatarMoeda(relatorio.ticketMedio)}</div><div class="label">Ticket médio</div></div>
    <div class="stat-card"><div class="valor">${relatorio.taxaConversaoPercentual.toFixed(1)}%</div><div class="label">Taxa de conversão</div></div>
  `;
  document.getElementById('tabela-corretores').innerHTML = relatorio.corretores.map((c) => `
    <tr><td>${esc(c.nome)}</td><td>${c.totalVendas}</td></tr>
  `).join('') || '<tr><td colspan="2" class="empty-state">Nenhum corretor cadastrado.</td></tr>';
}

document.getElementById('btn-exportar-relatorio').addEventListener('click', () => {
  if (!ultimoRelatorio) return;
  const linhas = [
    ['Indicador', 'Valor'],
    ['Imoveis cadastrados', ultimoRelatorio.totalImoveis],
    ['Imoveis disponiveis', ultimoRelatorio.imoveisDisponiveis],
    ['Imoveis vendidos', ultimoRelatorio.imoveisVendidos],
    ['Total de agendamentos', ultimoRelatorio.totalAgendamentos],
    ['Visitas realizadas', ultimoRelatorio.visitasRealizadas],
    ['Ticket medio', ultimoRelatorio.ticketMedio.toFixed(2)],
    ['Taxa de conversao (%)', ultimoRelatorio.taxaConversaoPercentual.toFixed(1)],
    [],
    ['Corretor', 'Vendas realizadas'],
    ...ultimoRelatorio.corretores.map((c) => [c.nome, c.totalVendas]),
  ];
  const csv = linhas.map((linha) => linha.join(';')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `relatorio-lunar-intel-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
});

async function carregarUsuarios() {
  const usuarios = await Api.get('/admin/usuarios');
  document.getElementById('tabela-usuarios').innerHTML = usuarios.map((u) => `
    <tr>
      <td>${esc(u.nome)}</td>
      <td>${esc(u.email)}</td>
      <td>${u.tipo}</td>
      <td><span class="pill ${u.ativo ? 'pill-disponivel' : 'pill-cancelado'}">${u.ativo ? 'Ativo' : 'Inativo'}</span></td>
      <td>${u.id === window.usuarioAtual?.id
        ? '<small style="color:var(--text-dim);">Você</small>'
        : `<button class="btn btn-small ${u.ativo ? 'btn-danger' : 'btn-secondary'} btn-status" data-id="${u.id}" data-ativo="${u.ativo}">
        ${u.ativo ? 'Bloquear' : 'Reativar'}
      </button>`}</td>
    </tr>
  `).join('');

  document.querySelectorAll('.btn-status').forEach((botao) => {
    botao.addEventListener('click', async () => {
      const ativoAtual = botao.dataset.ativo === 'true';
      try {
        await Api.put(`/admin/usuarios/${botao.dataset.id}/status`, { ativo: !ativoAtual });
        carregarUsuarios();
      } catch (erro) { alert(erro.message); }
    });
  });
}

async function carregarImoveis() {
  const imoveis = await Api.get('/admin/imoveis');
  document.getElementById('tabela-imoveis').innerHTML = imoveis.map((i) => `
    <tr>
      <td>${esc(i.titulo)}</td>
      <td>${esc(i.tipo)}</td>
      <td>${formatarMoeda(i.preco)}</td>
      <td><span class="pill pill-${i.status.toLowerCase()}">${i.status}</span></td>
      <td>${esc(i.corretorNome)}</td>
    </tr>
  `).join('') || '<tr><td colspan="5" class="empty-state">Nenhum imóvel cadastrado.</td></tr>';
}
