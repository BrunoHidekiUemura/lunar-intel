const fs = require('fs');
const path = require('path');
const { NotFoundError, PersistenceError } = require('../errors/AppError');

class JsonRepository {
  constructor(nomeArquivo, factory) {
    // LUNAR_DATA_DIR permite apontar para outra pasta (usado nos testes automatizados)
    const pastaDados = process.env.LUNAR_DATA_DIR || path.join(__dirname, '..', '..', 'data');
    this.caminho = path.join(pastaDados, nomeArquivo);
    this.factory = factory;
    this._garantirArquivo();
  }

  _garantirArquivo() {
    const pasta = path.dirname(this.caminho);
    if (!fs.existsSync(pasta)) fs.mkdirSync(pasta, { recursive: true });
    if (!fs.existsSync(this.caminho)) fs.writeFileSync(this.caminho, '[]', 'utf-8');
  }

  _carregar() {
    try {
      const conteudo = fs.readFileSync(this.caminho, 'utf-8');
      const registros = JSON.parse(conteudo || '[]');
      return registros.map((registro) => this.factory(registro));
    } catch (erro) {
      throw new PersistenceError(`Falha ao carregar dados de ${path.basename(this.caminho)}.`);
    }
  }

  _salvar(registros) {
    try {
      fs.writeFileSync(this.caminho, JSON.stringify(registros, null, 2), 'utf-8');
    } catch (erro) {
      throw new PersistenceError(`Falha ao salvar dados em ${path.basename(this.caminho)}.`);
    }
  }

  _proximoId(registros) {
    return registros.reduce((max, r) => Math.max(max, r.id || 0), 0) + 1;
  }

  findAll() {
    return this._carregar();
  }

  findById(id) {
    const registro = this._carregar().find((r) => r.id === Number(id));
    if (!registro) throw new NotFoundError('Registro nao encontrado.');
    return registro;
  }

  findOne(predicado) {
    return this._carregar().find(predicado) || null;
  }

  findMany(predicado) {
    return this._carregar().filter(predicado);
  }

  create(dadosParciais) {
    const registros = this._carregar();
    const entidade = this.factory({ ...dadosParciais, id: this._proximoId(registros) });
    registros.push(entidade);
    this._salvar(registros);
    return entidade;
  }

  update(id, dadosAtualizados) {
    const registros = this._carregar();
    const indice = registros.findIndex((r) => r.id === Number(id));
    if (indice === -1) throw new NotFoundError('Registro nao encontrado para atualizacao.');
    const atualizado = this.factory({ ...registros[indice], ...dadosAtualizados, id: registros[indice].id });
    registros[indice] = atualizado;
    this._salvar(registros);
    return atualizado;
  }

  salvarEntidade(entidade) {
    return this.update(entidade.id, entidade);
  }

  delete(id) {
    const registros = this._carregar();
    const restantes = registros.filter((r) => r.id !== Number(id));
    if (restantes.length === registros.length) throw new NotFoundError('Registro nao encontrado para remocao.');
    this._salvar(restantes);
  }
}

module.exports = JsonRepository;
