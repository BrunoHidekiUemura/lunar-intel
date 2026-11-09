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

function mostrarAlerta(containerId, mensagem, tipo = 'error') {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `<div class="alert alert-${tipo}">${mensagem}</div>`;
  if (tipo === 'success') setTimeout(() => { container.innerHTML = ''; }, 4000);
}
