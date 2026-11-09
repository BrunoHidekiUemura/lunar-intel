const bcrypt = require('bcryptjs');
const usuarioRepository = require('../repositories/UsuarioRepository');
const Corretor = require('../models/Corretor');
const { ValidationError, AuthError, NotFoundError } = require('../errors/AppError');
const { PERFIS } = require('../config/constants');

const SALT_ROUNDS = 10;

class AuthService {
  async cadastrar({ tipo, nome, email, cpf, telefone, senha, ...dadosEspecificos }) {
    if (!nome || !email || !cpf || !telefone || !senha) {
      throw new ValidationError('Nome, e-mail, CPF, telefone e senha sao obrigatorios.');
    }
    if (senha.length < 6) {
      throw new ValidationError('A senha deve ter no minimo 6 caracteres.');
    }
    if (!Object.values(PERFIS).includes(tipo)) {
      throw new ValidationError('Tipo de usuario invalido.');
    }
    if (usuarioRepository.findByEmail(email)) {
      throw new ValidationError('Ja existe um usuario cadastrado com este e-mail.');
    }
    if (usuarioRepository.findByCpf(cpf)) {
      throw new ValidationError('Ja existe um usuario cadastrado com este CPF.');
    }

    if (tipo === PERFIS.CORRETOR) {
      if (!dadosEspecificos.creci || !Corretor.validarCRECI(dadosEspecificos.creci)) {
        throw new ValidationError('Registro CRECI invalido. Use o formato NUMERO-UF (ex: 12345-F).');
      }
    }

    if (tipo === PERFIS.CLIENTE) {
      const idade = Number(dadosEspecificos.idade);
      if (!idade || idade < 18 || idade > 70) {
        throw new ValidationError('Idade deve estar entre 18 e 70 anos.');
      }
    }

    const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);
    const usuario = usuarioRepository.create({
      tipo, nome, email, cpf, telefone, senhaHash, ...dadosEspecificos,
    });
    return usuario;
  }

  async autenticar(email, senha) {
    if (!email || !senha) throw new ValidationError('Informe e-mail e senha.');

    const usuario = usuarioRepository.findByEmail(email);
    if (!usuario) throw new AuthError('E-mail ou senha invalidos.');
    if (!usuario.ativo) throw new AuthError('Esta conta esta inativa.');

    const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaValida) throw new AuthError('E-mail ou senha invalidos.');

    return usuario;
  }

  solicitarRecuperacaoSenha(email) {
    const usuario = usuarioRepository.findByEmail(email);
    if (!usuario) throw new NotFoundError('Nenhuma conta encontrada para este e-mail.');
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`[LUNAR INTEL] Codigo de recuperacao para ${email}: ${codigo}`);
    return codigo;
  }

  async redefinirSenha(usuarioId, senhaAntiga, senhaNova) {
    const usuario = usuarioRepository.findById(usuarioId);
    const confere = await bcrypt.compare(senhaAntiga, usuario.senhaHash);
    if (!confere) throw new ValidationError('Senha atual incorreta.');
    if (!senhaNova || senhaNova.length < 6) {
      throw new ValidationError('A nova senha deve ter no minimo 6 caracteres.');
    }
    const senhaHash = await bcrypt.hash(senhaNova, SALT_ROUNDS);
    return usuarioRepository.update(usuarioId, { senhaHash });
  }

  atualizarDados(usuarioId, dados) {
    const usuario = usuarioRepository.findById(usuarioId);
    usuario.atualizarDados(dados);
    return usuarioRepository.salvarEntidade(usuario);
  }

  inativarConta(usuarioId) {
    const usuario = usuarioRepository.findById(usuarioId);
    usuario.inativarConta();
    return usuarioRepository.salvarEntidade(usuario);
  }
}

module.exports = new AuthService();
