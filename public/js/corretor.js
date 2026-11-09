let mapaImoveisAtual = {};

document.addEventListener('usuario-pronto', async (evento) => {
  const usuario = evento.detail;
  document.getElementById('perfil-nome').value = usuario.nome;
  document.getElementById('perfil-telefone').value = usuario.telefone;

  const [imoveis, agendamentos] = await Promise.all([carregarPortfolio(), carregarSolicitacoes()]);
  document.getElementById('stat-grid').innerHTML = `
    <div class="stat-card"><div class="valor">${usuario.totalVendas || 0}</div><div class="label">Vendas realizadas</div></div>
    <div class="stat-card"><div class="valor">${imoveis.length}</div><div class="label">Imóveis no portfólio</div></div>
    <div class="stat-card"><div class="valor">${agendamentos.length}</div><div class="label">Visitas recebidas</div></div>
    <div class="stat-card"><div class="valor">${usuario.creci}</div><div class="label">Registro CRECI</div></div>
    <div class="stat-card"><div class="valor">${usuario.comissaoPercentual}%</div><div class="label">Comissão</div></div>
  `;

  carregarNotificacoes();
});

document.querySelectorAll('.tab-btn').forEach((botao) => {
  botao.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
    botao.classList.add('active');
    document.getElementById(`tab-${botao.dataset.tab}`).classList.add('active');
  });
});

async function carregarPortfolio() {
  const imoveis = await Api.get('/imoveis/meu-portfolio');
  imoveis.forEach((imovel) => { mapaImoveisAtual[imovel.id] = imovel; });

  const grid = document.getElementById('grid-portfolio');
  grid.innerHTML = imoveis.map((imovel) => `
    <div class="card" data-id="${imovel.id}">
      <div class="card-img" style="background-image:url('${(imovel.imagens && imovel.imagens[0]) || 'https://placehold.co/600x400?text=LUNAR+INTEL'}')">
        <div class="status-tag ${imovel.status === 'Vendido' ? 'vendido' : imovel.status === 'Inativo' ? 'inativo' : ''}">${imovel.status}</div>
        ${imovel.imagens && imovel.imagens.length > 1 ? `<div class="status-tag" style="left:auto; right:12px; background:rgba(0,0,0,0.6); color:#fff;"><i class="fa-solid fa-images"></i> ${imovel.imagens.length}</div>` : ''}
      </div>
      <div class="card-body">
        <h3>${imovel.titulo}</h3>
        <div class="card-price">${formatarMoeda(imovel.preco)}</div>
        <div class="card-features">
          <span><i class="fa-solid fa-bed"></i> ${imovel.quartos}q</span>
          <span><i class="fa-solid fa-bath"></i> ${imovel.banheiros}b</span>
          <span><i class="fa-solid fa-ruler-combined"></i> ${imovel.areaTotal} m²</span>
        </div>
        <div class="card-actions">
          ${botoesAcaoImovel(imovel)}
        </div>
      </div>
    </div>
  `).join('') || '<p class="empty-state">Você ainda não cadastrou nenhum imóvel.</p>';

  ativarBotoesPortfolio(grid);
  return imoveis;
}

function botoesAcaoImovel(imovel) {
  return `
    <button class="btn btn-small btn-secondary btn-editar" data-id="${imovel.id}">Editar</button>
    ${imovel.status === 'Disponivel' ? `
      <button class="btn btn-small btn-danger btn-inativar" data-id="${imovel.id}">Inativar</button>
      <button class="btn btn-small btn-vender" data-id="${imovel.id}" data-preco="${imovel.preco}">Marcar vendido</button>
    ` : ''}
  `;
}

function ativarBotoesPortfolio(container) {
  container.querySelectorAll('.btn-editar').forEach((b) => b.addEventListener('click', () => {
    document.getElementById('modal-detalhe-imovel').classList.remove('active');
    abrirModalImovel(mapaImoveisAtual[Number(b.dataset.id)]);
  }));
  container.querySelectorAll('.btn-inativar').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('Inativar este imóvel?')) return;
    document.getElementById('modal-detalhe-imovel').classList.remove('active');
    await Api.delete(`/imoveis/${b.dataset.id}`);
    carregarPortfolio();
  }));
  container.querySelectorAll('.btn-vender').forEach((b) => b.addEventListener('click', async () => {
    const valor = prompt('Valor final de venda (R$):', b.dataset.preco);
    if (!valor) return;
    try {
      await Api.post(`/imoveis/${b.dataset.id}/vender`, { valorVenda: Number(valor) });
      document.getElementById('modal-detalhe-imovel').classList.remove('active');
      carregarPortfolio();
    } catch (erro) { alert(erro.message); }
  }));
}

document.getElementById('grid-portfolio').addEventListener('click', (evento) => {
  if (evento.target.closest('.card-actions')) return;
  const card = evento.target.closest('.card');
  if (!card) return;
  abrirDetalheImovel(mapaImoveisAtual[Number(card.dataset.id)]);
});

let carrosselImagens = [];
let carrosselIndice = 0;

function abrirDetalheImovel(imovel) {
  if (!imovel) return;
  carrosselImagens = (imovel.imagens && imovel.imagens.length)
    ? imovel.imagens
    : ['https://placehold.co/800x500?text=LUNAR+INTEL'];
  carrosselIndice = 0;
  renderizarCarrossel();

  document.getElementById('detalhe-titulo').textContent = imovel.titulo;
  document.getElementById('detalhe-preco').textContent = formatarMoeda(imovel.preco);
  document.getElementById('detalhe-endereco').textContent =
    `${imovel.endereco.logradouro}, ${imovel.endereco.numero} - ${imovel.endereco.bairro}, ${imovel.endereco.cidade}/${imovel.endereco.estado}`;
  document.getElementById('detalhe-features').innerHTML = `
    <span><i class="fa-solid fa-bed"></i> ${imovel.quartos} quartos</span>
    <span><i class="fa-solid fa-bath"></i> ${imovel.banheiros} banheiros</span>
    <span><i class="fa-solid fa-ruler-combined"></i> ${imovel.areaTotal} m²</span>
    <span><i class="fa-solid fa-tag"></i> ${imovel.tipo}</span>
  `;
  document.getElementById('detalhe-descricao').textContent = imovel.descricao || '';

  const acoes = document.getElementById('detalhe-acoes');
  acoes.innerHTML = botoesAcaoImovel(imovel);
  ativarBotoesPortfolio(acoes);

  document.getElementById('modal-detalhe-imovel').classList.add('active');
}

document.getElementById('btn-fechar-detalhe').addEventListener('click', () => {
  document.getElementById('modal-detalhe-imovel').classList.remove('active');
});

function renderizarCarrossel() {
  document.getElementById('carrossel-img').style.backgroundImage = `url('${carrosselImagens[carrosselIndice]}')`;

  const temVarias = carrosselImagens.length > 1;
  document.getElementById('carrossel-anterior').style.display = temVarias ? 'flex' : 'none';
  document.getElementById('carrossel-proxima').style.display = temVarias ? 'flex' : 'none';

  const dots = document.getElementById('carrossel-dots');
  dots.innerHTML = temVarias
    ? carrosselImagens.map((_, i) => `<span class="dot ${i === carrosselIndice ? 'active' : ''}" data-i="${i}"></span>`).join('')
    : '';
  dots.querySelectorAll('.dot').forEach((dot) => {
    dot.addEventListener('click', () => { carrosselIndice = Number(dot.dataset.i); renderizarCarrossel(); });
  });
}

document.getElementById('carrossel-anterior').addEventListener('click', () => {
  carrosselIndice = (carrosselIndice - 1 + carrosselImagens.length) % carrosselImagens.length;
  renderizarCarrossel();
});
document.getElementById('carrossel-proxima').addEventListener('click', () => {
  carrosselIndice = (carrosselIndice + 1) % carrosselImagens.length;
  renderizarCarrossel();
});

let imagensImovelAtual = [];

function abrirModalImovel(imovel) {
  document.getElementById('titulo-modal-imovel').textContent = imovel ? 'Editar imóvel' : 'Novo imóvel';
  document.getElementById('alerta-imovel').innerHTML = '';
  document.getElementById('imovel-id').value = imovel ? imovel.id : '';
  document.getElementById('imovel-titulo').value = imovel ? imovel.titulo : '';
  document.getElementById('imovel-descricao').value = imovel ? imovel.descricao : '';
  document.getElementById('imovel-tipo').value = imovel ? imovel.tipo : 'Casa';
  document.getElementById('imovel-preco').value = imovel ? imovel.preco : '';
  document.getElementById('imovel-area').value = imovel ? imovel.areaTotal : '';
  document.getElementById('imovel-quartos').value = imovel ? imovel.quartos : '';
  document.getElementById('imovel-banheiros').value = imovel ? imovel.banheiros : '';
  document.getElementById('imovel-logradouro').value = imovel ? imovel.endereco.logradouro : '';
  document.getElementById('imovel-numero').value = imovel ? imovel.endereco.numero : '';
  document.getElementById('imovel-bairro').value = imovel ? imovel.endereco.bairro : '';
  document.getElementById('imovel-cidade').value = imovel ? imovel.endereco.cidade : '';
  document.getElementById('imovel-estado').value = imovel ? imovel.endereco.estado : '';
  document.getElementById('imovel-cep').value = imovel ? imovel.endereco.cep : '';

  imagensImovelAtual = imovel && imovel.imagens ? [...imovel.imagens] : [];
  renderizarListaImagens();
  document.getElementById('imovel-nova-imagem').value = '';

  document.getElementById('modal-imovel').classList.add('active');
}
document.getElementById('btn-novo-imovel').addEventListener('click', () => abrirModalImovel(null));
document.getElementById('btn-fechar-modal-imovel').addEventListener('click', () => {
  document.getElementById('modal-imovel').classList.remove('active');
});

function renderizarListaImagens() {
  const container = document.getElementById('lista-imagens-imovel');
  container.innerHTML = imagensImovelAtual.map((url, indice) => `
    <div class="imagem-chip">
      <img src="${url}" alt="Foto ${indice + 1}" onerror="this.src='https://placehold.co/80x60?text=?'">
      <span class="imagem-chip-url">${url}</span>
      <button type="button" class="imagem-chip-remover" data-i="${indice}" title="Remover foto">&times;</button>
    </div>
  `).join('') || '<p style="font-size:12px; color:var(--text-dim);">Nenhuma foto adicionada ainda.</p>';

  container.querySelectorAll('.imagem-chip-remover').forEach((botao) => {
    botao.addEventListener('click', () => {
      imagensImovelAtual.splice(Number(botao.dataset.i), 1);
      renderizarListaImagens();
    });
  });
}

function adicionarImagemAtual() {
  const campo = document.getElementById('imovel-nova-imagem');
  const url = campo.value.trim();
  if (!url) return;
  imagensImovelAtual.push(url);
  campo.value = '';
  renderizarListaImagens();
}
document.getElementById('btn-add-imagem').addEventListener('click', adicionarImagemAtual);
document.getElementById('imovel-nova-imagem').addEventListener('keydown', (evento) => {
  if (evento.key === 'Enter') { evento.preventDefault(); adicionarImagemAtual(); }
});

document.getElementById('form-imovel').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const id = document.getElementById('imovel-id').value;
  const dados = {
    titulo: document.getElementById('imovel-titulo').value,
    descricao: document.getElementById('imovel-descricao').value,
    tipo: document.getElementById('imovel-tipo').value,
    preco: Number(document.getElementById('imovel-preco').value),
    areaTotal: Number(document.getElementById('imovel-area').value) || 0,
    quartos: Number(document.getElementById('imovel-quartos').value) || 0,
    banheiros: Number(document.getElementById('imovel-banheiros').value) || 0,
    imagens: imagensImovelAtual,
    endereco: {
      logradouro: document.getElementById('imovel-logradouro').value,
      numero: document.getElementById('imovel-numero').value,
      bairro: document.getElementById('imovel-bairro').value,
      cidade: document.getElementById('imovel-cidade').value,
      estado: document.getElementById('imovel-estado').value,
      cep: document.getElementById('imovel-cep').value,
    },
  };

  try {
    if (id) await Api.put(`/imoveis/${id}`, dados);
    else await Api.post('/imoveis', dados);
    document.getElementById('modal-imovel').classList.remove('active');
    carregarPortfolio();
  } catch (erro) {
    mostrarAlerta('alerta-imovel', erro.message);
  }
});

async function carregarSolicitacoes() {
  const [agendamentos, imoveis] = await Promise.all([Api.get('/agendamentos'), Api.get('/imoveis/meu-portfolio')]);
  const mapaImoveis = {};
  imoveis.forEach((i) => { mapaImoveis[i.id] = i; });

  const corpo = document.getElementById('tabela-solicitacoes');
  corpo.innerHTML = agendamentos.map((a) => `
    <tr>
      <td>${mapaImoveis[a.imovelId]?.titulo || `Imóvel #${a.imovelId}`}</td>
      <td>${formatarData(a.dataVisita)}</td>
      <td><span class="pill pill-${a.status.toLowerCase()}">${a.status}</span></td>
      <td>
        ${a.status === 'Pendente' ? `<button class="btn btn-small btn-confirmar" data-id="${a.id}">Confirmar</button>
          <button class="btn btn-small btn-danger btn-cancelar" data-id="${a.id}">Cancelar</button>` : ''}
        ${a.status === 'Confirmado' ? `<button class="btn btn-small btn-realizar" data-id="${a.id}">Marcar realizada</button>
          <button class="btn btn-small btn-secondary btn-reagendar" data-id="${a.id}">Reagendar</button>
          <button class="btn btn-small btn-danger btn-cancelar" data-id="${a.id}">Cancelar</button>` : ''}
      </td>
    </tr>
  `).join('') || '<tr><td colspan="4" class="empty-state">Nenhuma solicitação recebida ainda.</td></tr>';

  corpo.querySelectorAll('.btn-confirmar').forEach((b) => b.addEventListener('click', async () => {
    await Api.put(`/agendamentos/${b.dataset.id}/confirmar`); carregarSolicitacoes();
  }));
  corpo.querySelectorAll('.btn-realizar').forEach((b) => b.addEventListener('click', async () => {
    await Api.put(`/agendamentos/${b.dataset.id}/realizar`); carregarSolicitacoes();
  }));
  corpo.querySelectorAll('.btn-cancelar').forEach((b) => b.addEventListener('click', async () => {
    const motivo = prompt('Motivo do cancelamento (opcional):') || '';
    await Api.put(`/agendamentos/${b.dataset.id}/cancelar`, { motivo });
    carregarSolicitacoes();
  }));
  corpo.querySelectorAll('.btn-reagendar').forEach((b) => b.addEventListener('click', async () => {
    const novaData = prompt('Nova data e horário (AAAA-MM-DDTHH:MM):');
    if (!novaData) return;
    await Api.put(`/agendamentos/${b.dataset.id}/reagendar`, { dataVisita: novaData });
    carregarSolicitacoes();
  }));

  return agendamentos;
}

async function carregarNotificacoes() {
  const notificacoes = await Api.get('/notificacoes');
  const lista = document.getElementById('lista-notificacoes');
  lista.innerHTML = notificacoes.map((n) => `
    <div class="notif-item ${n.lida ? '' : 'nao-lida'}" data-id="${n.id}">
      <h4>${n.titulo}</h4><p>${n.mensagem}</p><small>${formatarData(n.dataEnvio)}</small>
    </div>
  `).join('') || '<p class="empty-state">Nenhuma notificação.</p>';

  lista.querySelectorAll('.notif-item.nao-lida').forEach((item) => {
    item.addEventListener('click', async () => {
      await Api.put(`/notificacoes/${item.dataset.id}/lida`);
      item.classList.remove('nao-lida');
    });
  });
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
