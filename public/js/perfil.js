// aba "Perfil", igual para os tres perfis (cliente, corretor e administrador)

document.addEventListener('usuario-pronto', (evento) => {
  const usuario = evento.detail;
  document.getElementById('perfil-nome').value = usuario.nome;
  document.getElementById('perfil-telefone').value = usuario.telefone;
});

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

document.getElementById('form-senha').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  try {
    await Api.put('/auth/senha', {
      senhaAntiga: document.getElementById('senha-atual').value,
      senhaNova: document.getElementById('senha-nova').value,
    });
    evento.target.reset();
    mostrarAlerta('alerta-senha', 'Senha alterada com sucesso.', 'success');
  } catch (erro) {
    mostrarAlerta('alerta-senha', erro.message);
  }
});

const botaoInativar = document.getElementById('btn-inativar');
if (botaoInativar) {
  botaoInativar.addEventListener('click', async () => {
    if (!confirm('Tem certeza que deseja inativar sua conta?')) return;
    await Api.post('/auth/inativar');
    window.location.href = 'login.html';
  });
}
