const auditoriaRepository = require('../repositories/AuditoriaRepository');
const usuarioRepository = require('../repositories/UsuarioRepository');

class AuditoriaService {
  // grava quem fez o que e quando (RNF07)
  registrar({ usuarioId, acao, detalhe, sucesso }) {
    return auditoriaRepository.create({
      dataHora: new Date().toISOString(),
      usuarioId: usuarioId ? Number(usuarioId) : null,
      acao,
      detalhe: detalhe || '',
      sucesso: Boolean(sucesso),
    });
  }

  listar(limite = 200) {
    const usuarios = usuarioRepository.findAll();
    return auditoriaRepository.listarRecentes(limite).map((registro) => {
      const usuario = usuarios.find((u) => u.id === registro.usuarioId);
      return {
        ...registro,
        usuarioNome: usuario ? usuario.nome : '-',
        usuarioTipo: usuario ? usuario.tipo : '-',
      };
    });
  }
}

module.exports = new AuditoriaService();
