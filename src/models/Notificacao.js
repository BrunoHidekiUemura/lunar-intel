class Notificacao {
  constructor({ id, usuarioId, tipo, titulo, mensagem, lida, dataEnvio }) {
    this.id = id;
    this.usuarioId = usuarioId;
    this.tipo = tipo;
    this.titulo = titulo;
    this.mensagem = mensagem;
    this.lida = lida || false;
    this.dataEnvio = dataEnvio || new Date().toISOString();
  }

  marcarComoLida() {
    this.lida = true;
  }

  getTipo() {
    return this.tipo;
  }
}

module.exports = Notificacao;
