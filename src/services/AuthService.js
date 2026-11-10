const bcrypt = require('bcryptjs');
const usuarioRepository = require('../repositories/UsuarioRepository');
const Usuario = require('../models/Usuario');
const Corretor = require('../models/Corretor');
const { ValidationError, AuthError } = require('../errors/AppError');
const { PERFIS, IDADE_MINIMA, IDADE_MAXIMA } = require('../config/constants');

const SALT_ROUNDS = 10;
const VALIDADE_CODIGO_MS = 15 * 60 * 1000; // 15 minutos
const MAX_TENTATIVAS_CODIGO = 5;

class AuthService {
  constructor() {
    // codigos de recuperacao de senha ficam so em memoria: e-mail -> { codigo, expiraEm, tentativas }
    this.codigosRecuperacao = new Map();
  }

  async cadastrar({ tipo, nome, email, cpf, telefone, senha, ...dadosEspecificos }) {
    if (!nome || !email || !cpf || !telefone || !senha) {
      throw new ValidationError('Nome, e-mail, CPF, telefone e senha sao obrigatorios.');
    }
    if (String(senha).length < 6) {
      throw new ValidationError('A senha deve ter no minimo 6 caracteres.');
    }
    // cadastro publico so cria cliente ou corretor; administrador nao se cadastra sozinho
    if (tipo !== PERFIS.CLIENTE && tipo !== PERFIS.CORRETOR) {
      throw new ValidationError('Tipo de usuario invalido.');
    }
    if (!Usuario.validarEmail(email)) {
      throw new ValidationError('E-mail invalido.');
    }
    if (!Usuario.validarCPF(cpf)) {
      throw new ValidationError('CPF invalido.');
    }

    const emailNormalizado = email.trim().toLowerCase();
    const cpfNormalizado = Usuario.normalizarCPF(cpf);

    if (usuarioRepository.findByEmail(emailNormalizado)) {
      throw new ValidationError('Ja existe um usuario cadastrado com este e-mail.');
    }
    if (usuarioRepository.findByCpf(cpfNormalizado)) {
      throw new ValidationError('Ja existe um usuario cadastrado com este CPF.');
    }

    if (tipo === PERFIS.CORRETOR) {
      if (!dadosEspecificos.creci || !Corretor.validarCRECI(dadosEspecificos.creci)) {
        throw new ValidationError('Registro CRECI invalido. Use o formato NUMERO-UF (ex: 12345-F).');
      }
    }

    if (tipo === PERFIS.CLIENTE) {
      const idade = Number(dadosEspecificos.idade);
      if (!idade || idade < IDADE_MINIMA || idade > IDADE_MAXIMA) {
        throw new ValidationError(`Idade deve estar entre ${IDADE_MINIMA} e ${IDADE_MAXIMA} anos.`);
      }
    }

    const senhaHash = await bcrypt.hash(String(senha), SALT_ROUNDS);
    return usuarioRepository.create({
      tipo,
      nome: String(nome).trim(),
      email: emailNormalizado,
      cpf: cpfNormalizado,
      telefone: String(telefone),
      senhaHash,
      ...this._camposDoPerfil(tipo, dadosEspecificos),
    });
  }

  // so aceita os campos que fazem sentido para cada perfil (ativo, totalVendas,
  // senhaHash etc. nao podem vir do formulario)
  _camposDoPerfil(tipo, dados) {
    if (tipo === PERFIS.CLIENTE) {
      return {
        idade: Number(dados.idade),
        rendaMensal: Number(dados.rendaMensal) || 0,
        poupanca: Number(dados.poupanca) || 0,
        fgts: Number(dados.fgts) || 0,
        profissao: dados.profissao ? String(dados.profissao) : '',
      };
    }
    return {
      creci: String(dados.creci).trim().toUpperCase(),
      especialidade: dados.especialidade ? String(dados.especialidade) : '',
    };
  }

  async autenticar(email, senha) {
    if (!email || !senha) throw new ValidationError('Informe e-mail e senha.');

    const usuario = usuarioRepository.findByEmail(String(email).trim());
    if (!usuario) throw new AuthError('E-mail ou senha invalidos.');
    if (!usuario.ativo) throw new AuthError('Esta conta esta inativa.');

    const senhaValida = await bcrypt.compare(String(senha), usuario.senhaHash);
    if (!senhaValida) throw new AuthError('E-mail ou senha invalidos.');

    return usuario;
  }

  // gera um codigo de 6 digitos valido por 15 minutos. Como o projeto nao envia
  // e-mail de verdade, o codigo aparece no console do servidor.
  solicitarRecuperacaoSenha(email) {
    if (!email) throw new ValidationError('Informe o e-mail.');
    // nao avisa se o e-mail existe ou nao, para nao revelar quem tem conta
    const usuario = usuarioRepository.findByEmail(String(email).trim());
    if (!usuario || !usuario.ativo) return null;

    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    this.codigosRecuperacao.set(usuario.email.toLowerCase(), {
      codigo,
      expiraEm: Date.now() + VALIDADE_CODIGO_MS,
      tentativas: 0,
    });
    console.log(`[LUNAR INTEL] Codigo de recuperacao para ${usuario.email}: ${codigo} (vale 15 minutos)`);
    return codigo;
  }

  async redefinirSenhaComCodigo(email, codigo, senhaNova) {
    if (!email || !codigo || !senhaNova) {
      throw new ValidationError('Informe e-mail, codigo e a nova senha.');
    }
    if (String(senhaNova).length < 6) {
      throw new ValidationError('A nova senha deve ter no minimo 6 caracteres.');
    }

    const chave = String(email).trim().toLowerCase();
    const registro = this.codigosRecuperacao.get(chave);
    if (!registro || Date.now() > registro.expiraEm) {
      this.codigosRecuperacao.delete(chave);
      throw new ValidationError('Codigo invalido ou expirado. Peca um novo codigo.');
    }
    if (registro.codigo !== String(codigo).trim()) {
      registro.tentativas += 1;
      if (registro.tentativas >= MAX_TENTATIVAS_CODIGO) this.codigosRecuperacao.delete(chave);
      throw new ValidationError('Codigo invalido ou expirado. Peca um novo codigo.');
    }

    const usuario = usuarioRepository.findByEmail(chave);
    const senhaHash = await bcrypt.hash(String(senhaNova), SALT_ROUNDS);
    usuarioRepository.update(usuario.id, { senhaHash });
    this.codigosRecuperacao.delete(chave);
  }

  async redefinirSenha(usuarioId, senhaAntiga, senhaNova) {
    if (!senhaAntiga) throw new ValidationError('Informe a senha atual.');
    const usuario = usuarioRepository.findById(usuarioId);
    const confere = await bcrypt.compare(String(senhaAntiga), usuario.senhaHash);
    if (!confere) throw new ValidationError('Senha atual incorreta.');
    if (!senhaNova || String(senhaNova).length < 6) {
      throw new ValidationError('A nova senha deve ter no minimo 6 caracteres.');
    }
    const senhaHash = await bcrypt.hash(String(senhaNova), SALT_ROUNDS);
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
