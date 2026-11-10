const Api = {
  async _chamar(metodo, caminho, corpo) {
    const resposta = await fetch(`/api${caminho}`, {
      method: metodo,
      headers: corpo ? { 'Content-Type': 'application/json' } : undefined,
      credentials: 'same-origin',
      body: corpo ? JSON.stringify(corpo) : undefined,
    });

    if (resposta.status === 204) return null;

    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
      throw new Error(dados.erro || 'Ocorreu um erro inesperado.');
    }
    return dados;
  },

  get(caminho) { return this._chamar('GET', caminho); },
  post(caminho, corpo) { return this._chamar('POST', caminho, corpo); },
  put(caminho, corpo) { return this._chamar('PUT', caminho, corpo); },
  delete(caminho) { return this._chamar('DELETE', caminho); },
};

function formatarMoeda(valor) {
  return (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(isoString) {
  if (!isoString) return '-';
  return new Date(isoString).toLocaleString('pt-BR');
}

// data/hora atual no formato do <input type="datetime-local"> (AAAA-MM-DDTHH:MM),
// usada como "min" para nao deixar escolher datas no passado
function dataHoraAgoraLocal() {
  const agora = new Date();
  agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset());
  return agora.toISOString().slice(0, 16);
}

// escapa texto digitado pelo usuario antes de colocar dentro de innerHTML
function esc(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function mostrarAlerta(containerId, mensagem, tipo = 'error') {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `<div class="alert alert-${tipo}">${esc(mensagem)}</div>`;
  if (tipo === 'success') setTimeout(() => { container.innerHTML = ''; }, 4000);
}
