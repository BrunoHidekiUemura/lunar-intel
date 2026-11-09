const { ValidationError } = require('../errors/AppError');

class Usuario {
  constructor({ id, nome, email, cpf, telefone, senhaHash, dataCadastro, ativo }) {
    if (new.target === Usuario) {
      throw new Error('Usuario e uma classe abstrata e nao pode ser instanciada diretamente.');
    }
    this.id = id;
    this.nome = nome;
    this.email = email;
    this.cpf = cpf;
    this.telefone = telefone;
    this.senhaHash = senhaHash;
    this.dataCadastro = dataCadastro || new Date().toISOString();
    this.ativo = ativo !== undefined ? ativo : true;
  }

  atualizarDados({ nome, telefone }) {
    if (nome !== undefined) {
      if (!nome || !nome.trim()) throw new ValidationError('Nome nao pode ser vazio.');
      this.nome = nome.trim();
    }
    if (telefone !== undefined) this.telefone = telefone;
  }

  inativarConta() {
    this.ativo = false;
  }

  reativarConta() {
    this.ativo = true;
  }

  getResumoPerfil() {
    return `${this.nome} (perfil não identificado)`;
  }

  paraDadosPublicos() {
    const { senhaHash, ...dadosPublicos } = this;
    return { ...dadosPublicos, resumoPerfil: this.getResumoPerfil() };
  }
}

module.exports = Usuario;
