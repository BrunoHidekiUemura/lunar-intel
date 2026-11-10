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

  // tira pontos e traco: "123.456.789-09" -> "12345678909"
  static normalizarCPF(cpf) {
    return String(cpf || '').replace(/\D/g, '');
  }

  // confere o tamanho e os dois digitos verificadores do CPF
  static validarCPF(cpf) {
    const numeros = Usuario.normalizarCPF(cpf);
    if (numeros.length !== 11 || /^(\d)\1{10}$/.test(numeros)) return false;

    const digitoVerificador = (quantidade) => {
      let soma = 0;
      for (let i = 0; i < quantidade; i += 1) {
        soma += Number(numeros[i]) * (quantidade + 1 - i);
      }
      const resto = (soma * 10) % 11;
      return resto === 10 ? 0 : resto;
    };

    return digitoVerificador(9) === Number(numeros[9]) && digitoVerificador(10) === Number(numeros[10]);
  }

  static validarEmail(email) {
    return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
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
