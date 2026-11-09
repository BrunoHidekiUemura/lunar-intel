document.addEventListener('usuario-pronto', (evento) => {
  const usuario = evento.detail;
  document.getElementById('perfil-nome').value = usuario.nome;
  document.getElementById('perfil-telefone').value = usuario.telefone;
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

async function carregarRelatorio() {
  const relatorio = await Api.get('/admin/relatorio');
  document.getElementById('stat-grid').innerHTML = `
    <div class="stat-card"><div class="valor">${relatorio.totalImoveis}</div><div class="label">Imóveis cadastrados</div></div>
    <div class="stat-card"><div class="valor">${relatorio.imoveisVendidos}</div><div class="label">Imóveis vendidos</div></div>
    <div class="stat-card"><div class="valor">${relatorio.visitasRealizadas}</div><div class="label">Visitas realizadas</div></div>
    <div class="stat-card"><div class="valor">${formatarMoeda(relatorio.ticketMedio)}</div><div class="label">Ticket médio</div></div>
    <div class="stat-card"><div class="valor">${relatorio.taxaConversaoPercentual.toFixed(1)}%</div><div class="label">Taxa de conversão</div></div>
  `;
  document.getElementById('tabela-corretores').innerHTML = relatorio.corretores.map((c) => `
    <tr><td>${c.nome}</td><td>${c.totalVendas}</td></tr>
  `).join('') || '<tr><td colspan="2" class="empty-state">Nenhum corretor cadastrado.</td></tr>';
}

async function carregarUsuarios() {
  const usuarios = await Api.get('/admin/usuarios');
  document.getElementById('tabela-usuarios').innerHTML = usuarios.map((u) => `
    <tr>
      <td>${u.nome}</td>
      <td>${u.email}</td>
      <td>${u.tipo}</td>
      <td><span class="pill ${u.ativo ? 'pill-disponivel' : 'pill-cancelado'}">${u.ativo ? 'Ativo' : 'Inativo'}</span></td>
      <td><button class="btn btn-small ${u.ativo ? 'btn-danger' : 'btn-secondary'} btn-status" data-id="${u.id}" data-ativo="${u.ativo}">
        ${u.ativo ? 'Bloquear' : 'Reativar'}
      </button></td>
    </tr>
  `).join('');

  document.querySelectorAll('.btn-status').forEach((botao) => {
    botao.addEventListener('click', async () => {
      const ativoAtual = botao.dataset.ativo === 'true';
      await Api.put(`/admin/usuarios/${botao.dataset.id}/status`, { ativo: !ativoAtual });
      carregarUsuarios();
    });
  });
}

async function carregarImoveis() {
  const imoveis = await Api.get('/admin/imoveis');
  document.getElementById('tabela-imoveis').innerHTML = imoveis.map((i) => `
    <tr>
      <td>${i.titulo}</td>
      <td>${i.tipo}</td>
      <td>${formatarMoeda(i.preco)}</td>
      <td><span class="pill pill-${i.status.toLowerCase()}">${i.status}</span></td>
      <td>#${i.corretorId}</td>
    </tr>
  `).join('') || '<tr><td colspan="5" class="empty-state">Nenhum imóvel cadastrado.</td></tr>';
}

document.getElementById('form-perfil').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  try {
    await Api.put('/auth/perfil', {
      nome: document.getElementById('perfil-nome').value,
      telefone: document.getElementById('perfil-telefone').value,
    });
    mostrarAlerta('alerta-perfil', 'Dados atualizados com sucesso.', 'success');
  } catch (erro) {
    mostrarAlerta('alerta-perfil', erro.message);
  }
});
