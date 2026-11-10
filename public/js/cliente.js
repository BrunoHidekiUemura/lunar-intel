let favoritosIds = new Set();
let mapaImoveisAtual = {};

document.addEventListener('usuario-pronto', (evento) => {
  const usuario = evento.detail;
  document.getElementById('sim-renda').value = usuario.rendaMensal || '';
  document.getElementById('sim-idade').value = usuario.idade || '';
  document.getElementById('sim-poupanca').value = usuario.poupanca || '';
  document.getElementById('sim-fgts').value = usuario.fgts || '';

  carregarFavoritos();
  carregarHistoricoSimulacoes();
  carregarVisitas();
  carregarNotificacoes();
});

document.querySelectorAll('.tab-btn').forEach((botao) => {
  botao.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
    botao.classList.add('active');
    document.getElementById(`tab-${botao.dataset.tab}`).classList.add('active');
    if (botao.dataset.tab === 'catalogo') carregarCatalogo();
  });
});

document.getElementById('form-simulacao').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  try {
    const resultado = await Api.post('/simulacoes', {
      rendaMensal: Number(document.getElementById('sim-renda').value),
      idade: Number(document.getElementById('sim-idade').value),
      poupanca: Number(document.getElementById('sim-poupanca').value) || 0,
      fgts: Number(document.getElementById('sim-fgts').value) || 0,
    });

    document.getElementById('resultado-simulacao').style.display = 'block';
    document.getElementById('valor-capacidade').textContent = formatarMoeda(resultado.simulacao.capacidadeCompra);
    renderizarImoveis('grid-simulacao', resultado.imoveisCompativeis);
    carregarHistoricoSimulacoes();
  } catch (erro) {
    mostrarAlerta('alerta-simulacao', erro.message);
  }
});

async function carregarHistoricoSimulacoes() {
  const simulacoes = await Api.get('/simulacoes');
  const corpo = document.getElementById('tabela-historico-simulacoes');
  corpo.innerHTML = simulacoes.map((s) => `
    <tr>
      <td>${formatarData(s.dataSimulacao)}</td>
      <td>${formatarMoeda(s.rendaInformada)}</td>
      <td>${formatarMoeda(s.entradaInformada)}</td>
      <td>${formatarMoeda(s.capacidadeCompra)}</td>
    </tr>
  `).join('') || '<tr><td colspan="4" class="empty-state">Nenhuma simulação realizada ainda.</td></tr>';
}

document.getElementById('btn-filtrar').addEventListener('click', carregarCatalogo);

async function carregarCatalogo() {
  const parametros = new URLSearchParams();
  const tipo = document.getElementById('filtro-tipo').value;
  const quartos = document.getElementById('filtro-quartos').value;
  const banheiros = document.getElementById('filtro-banheiros').value;
  const cidade = document.getElementById('filtro-cidade').value;
  const precoMax = document.getElementById('filtro-preco').value;
  if (tipo) parametros.set('tipo', tipo);
  if (quartos) parametros.set('quartos', quartos);
  if (banheiros) parametros.set('banheiros', banheiros);
  if (cidade) parametros.set('cidade', cidade);
  if (precoMax) parametros.set('precoMax', precoMax);

  const imoveis = await Api.get(`/imoveis?${parametros.toString()}`);
  renderizarImoveis('grid-catalogo', imoveis);
}

async function carregarFavoritos() {
  const favoritos = await Api.get('/favoritos');
  favoritosIds = new Set(favoritos.map((f) => f.imovel.id));
  atualizarMapaImoveis(favoritos.map((f) => f.imovel));
  const grid = document.getElementById('grid-favoritos');
  grid.innerHTML = favoritos.map((f) => cartaoImovel(f.imovel, f.favorito.id)).join('')
    || '<p class="empty-state">Você ainda não favoritou nenhum imóvel.</p>';
  ativarBotoesImovel();
}

function renderizarImoveis(idGrid, imoveis) {
  atualizarMapaImoveis(imoveis);
  const grid = document.getElementById(idGrid);
  grid.innerHTML = imoveis.map((i) => cartaoImovel(i)).join('')
    || '<p class="empty-state">Nenhum imóvel encontrado para este filtro/perfil financeiro.</p>';
  ativarBotoesImovel();
}

function atualizarMapaImoveis(imoveis) {
  imoveis.forEach((imovel) => { mapaImoveisAtual[imovel.id] = imovel; });
}

function cartaoImovel(imovel, favoritoId) {
  const imagem = (imovel.imagens && imovel.imagens[0]) || 'https://placehold.co/600x400?text=LUNAR+INTEL';
  const jaFavoritado = favoritosIds.has(imovel.id) || favoritoId;
  const disponivel = imovel.status === 'Disponivel';
  return `
    <div class="card" data-id="${imovel.id}">
      <div class="card-img" style="background-image:url('${esc(imagem)}')">
        ${disponivel
          ? `<div class="status-tag">${esc(imovel.tipo)}</div>`
          : `<div class="status-tag ${imovel.status === 'Vendido' ? 'vendido' : 'inativo'}">${esc(imovel.status)}</div>`}
        ${imovel.imagens && imovel.imagens.length > 1 ? `<div class="status-tag" style="left:auto; right:12px; background:rgba(0,0,0,0.6); color:#fff;"><i class="fa-solid fa-images"></i> ${imovel.imagens.length}</div>` : ''}
      </div>
      <div class="card-body">
        <h3>${esc(imovel.titulo)}</h3>
        <div class="card-price">${formatarMoeda(imovel.preco)}</div>
        <div class="card-features">
          <span><i class="fa-solid fa-bed"></i> ${imovel.quartos} quartos</span>
          <span><i class="fa-solid fa-bath"></i> ${imovel.banheiros} banheiros</span>
          <span><i class="fa-solid fa-ruler-combined"></i> ${imovel.areaTotal} m²</span>
        </div>
        <p style="font-size:13px; color:var(--text-dim); margin-top:10px;">${esc(imovel.endereco.bairro)}, ${esc(imovel.endereco.cidade)}/${esc(imovel.endereco.estado)}</p>
        <div class="card-actions">
          ${disponivel
            ? `<button class="btn btn-small btn-agendar" data-id="${imovel.id}">Agendar visita</button>`
            : '<small style="color:var(--text-dim);">Não está mais disponível</small>'}
          ${favoritoId
            ? `<button class="btn btn-small btn-danger btn-desfavoritar" data-favorito-id="${favoritoId}">Remover favorito</button>`
            : `<button class="btn btn-small btn-secondary btn-favoritar" data-id="${imovel.id}" ${jaFavoritado ? 'disabled' : ''}>
                 ${jaFavoritado ? 'Favoritado' : 'Favoritar'}
               </button>`}
        </div>
      </div>
    </div>
  `;
}

['grid-catalogo', 'grid-favoritos', 'grid-simulacao'].forEach((idGrid) => {
  document.getElementById(idGrid).addEventListener('click', (evento) => {
    if (evento.target.closest('.card-actions')) return;
    const card = evento.target.closest('.card');
    if (!card) return;
    abrirDetalheImovel(mapaImoveisAtual[Number(card.dataset.id)]);
  });
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
    <span><i class="fa-solid fa-tag"></i> ${esc(imovel.tipo)}</span>
  `;
  document.getElementById('detalhe-descricao').textContent = imovel.descricao || '';

  const jaFavoritado = favoritosIds.has(imovel.id);
  if (imovel.status !== 'Disponivel') {
    document.getElementById('detalhe-acoes').innerHTML = `
      <p style="color:var(--text-dim);">Este imóvel está <strong>${esc(imovel.status)}</strong> e não recebe mais visitas.</p>
    `;
    document.getElementById('modal-detalhe-imovel').classList.add('active');
    return;
  }
  document.getElementById('detalhe-acoes').innerHTML = `
    <button class="btn btn-agendar-detalhe">Agendar visita</button>
    <button class="btn btn-secondary btn-favoritar-detalhe" ${jaFavoritado ? 'disabled' : ''}>${jaFavoritado ? 'Favoritado' : 'Favoritar'}</button>
  `;
  document.querySelector('.btn-agendar-detalhe').addEventListener('click', () => {
    document.getElementById('modal-detalhe-imovel').classList.remove('active');
    abrirModalAgendamento(imovel.id);
  });
  document.querySelector('.btn-favoritar-detalhe').addEventListener('click', async (evento) => {
    try {
      await Api.post('/favoritos', { imovelId: imovel.id });
      await carregarFavoritos();
      evento.target.disabled = true;
      evento.target.textContent = 'Favoritado';
    } catch (erro) { alert(erro.message); }
  });

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

function ativarBotoesImovel() {
  document.querySelectorAll('.btn-agendar').forEach((botao) => {
    botao.addEventListener('click', () => abrirModalAgendamento(botao.dataset.id));
  });
  document.querySelectorAll('.btn-favoritar').forEach((botao) => {
    botao.addEventListener('click', async () => {
      try {
        await Api.post('/favoritos', { imovelId: Number(botao.dataset.id) });
        await carregarFavoritos();
        document.querySelectorAll(`.btn-favoritar[data-id="${botao.dataset.id}"]`).forEach((b) => {
          b.disabled = true; b.textContent = 'Favoritado';
        });
      } catch (erro) { alert(erro.message); }
    });
  });
  document.querySelectorAll('.btn-desfavoritar').forEach((botao) => {
    botao.addEventListener('click', async () => {
      await Api.delete(`/favoritos/${botao.dataset.favoritoId}`);
      carregarFavoritos();
    });
  });
}

function abrirModalAgendamento(imovelId) {
  document.getElementById('agendar-imovel-id').value = imovelId;
  document.getElementById('agendar-data').min = dataHoraAgoraLocal();
  document.getElementById('alerta-agendamento').innerHTML = '';
  document.getElementById('modal-agendamento').classList.add('active');
}
document.getElementById('btn-fechar-modal').addEventListener('click', () => {
  document.getElementById('modal-agendamento').classList.remove('active');
});
document.getElementById('form-agendamento').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  try {
    await Api.post('/agendamentos', {
      imovelId: Number(document.getElementById('agendar-imovel-id').value),
      dataVisita: document.getElementById('agendar-data').value,
      observacoes: document.getElementById('agendar-observacoes').value,
    });
    document.getElementById('modal-agendamento').classList.remove('active');
    document.getElementById('form-agendamento').reset();
    carregarVisitas();
  } catch (erro) {
    mostrarAlerta('alerta-agendamento', erro.message);
  }
});

async function carregarVisitas() {
  const visitas = await Api.get('/agendamentos');

  const corpo = document.getElementById('tabela-visitas');
  corpo.innerHTML = visitas.map((v) => `
    <tr>
      <td>${esc(v.imovelTitulo || `Imóvel #${v.imovelId}`)}</td>
      <td>${formatarData(v.dataVisita)}</td>
      <td><span class="pill pill-${v.status.toLowerCase()}">${v.status}</span></td>
      <td>${esc(v.observacoes || '-')}</td>
      <td>${v.status === 'Pendente' || v.status === 'Confirmado'
        ? `<button class="btn btn-small btn-danger btn-cancelar-visita" data-id="${v.id}">Cancelar</button>`
        : ''}</td>
    </tr>
  `).join('') || '<tr><td colspan="5" class="empty-state">Nenhuma visita solicitada ainda.</td></tr>';

  corpo.querySelectorAll('.btn-cancelar-visita').forEach((botao) => {
    botao.addEventListener('click', async () => {
      if (!confirm('Cancelar esta visita?')) return;
      const motivo = prompt('Motivo do cancelamento (opcional):') || '';
      try {
        await Api.put(`/agendamentos/${botao.dataset.id}/cancelar`, { motivo });
        carregarVisitas();
      } catch (erro) { alert(erro.message); }
    });
  });
}

async function carregarNotificacoes() {
  const notificacoes = await Api.get('/notificacoes');
  const lista = document.getElementById('lista-notificacoes');
  lista.innerHTML = notificacoes.map((n) => `
    <div class="notif-item ${n.lida ? '' : 'nao-lida'}" data-id="${n.id}">
      <h4>${esc(n.titulo)}</h4>
      <p>${esc(n.mensagem)}</p>
      <small>${formatarData(n.dataEnvio)}</small>
    </div>
  `).join('') || '<p class="empty-state">Nenhuma notificação.</p>';

  lista.querySelectorAll('.notif-item.nao-lida').forEach((item) => {
    item.addEventListener('click', async () => {
      await Api.put(`/notificacoes/${item.dataset.id}/lida`);
      item.classList.remove('nao-lida');
    });
  });
}
