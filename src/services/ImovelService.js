const imovelRepository = require('../repositories/ImovelRepository');
const agendamentoRepository = require('../repositories/AgendamentoRepository');
const usuarioRepository = require('../repositories/UsuarioRepository');
const notificacaoService = require('./NotificacaoService');
const Imovel = require('../models/Imovel');
const Endereco = require('../models/Endereco');
const { ValidationError, ForbiddenError, BusinessRuleError } = require('../errors/AppError');
const { STATUS_IMOVEL, STATUS_AGENDAMENTO, PERFIS } = require('../config/constants');

class ImovelService {
  listarDisponiveis({ tipo, quartos, banheiros, cidade, precoMax } = {}) {
    return imovelRepository.findMany((imovel) => {
      if (imovel.status !== STATUS_IMOVEL.DISPONIVEL) return false;
      if (tipo && imovel.tipo !== tipo) return false;
      if (quartos && imovel.quartos < Number(quartos)) return false;
      if (banheiros && imovel.banheiros < Number(banheiros)) return false;
      if (cidade && imovel.endereco.cidade.toLowerCase() !== String(cidade).toLowerCase()) return false;
      if (precoMax && imovel.preco > Number(precoMax)) return false;
      return true;
    });
  }

  buscarPorId(id) {
    return imovelRepository.findById(id);
  }

  cadastrar(corretorId, dados) {
    if (!dados.titulo || !dados.preco || !dados.endereco) {
      throw new ValidationError('Titulo, preco e endereco sao obrigatorios.');
    }
    // monta o objeto e valida antes de gravar no arquivo
    const novoImovel = new Imovel({
      areaTotal: 0,
      quartos: 0,
      banheiros: 0,
      ...this._camposEditaveis(dados),
      corretorId: Number(corretorId),
      status: STATUS_IMOVEL.DISPONIVEL,
    });
    novoImovel.validar();

    const imovel = imovelRepository.create(novoImovel);
    this._avisarClientesCompativeis(imovel, 'acabou de ser cadastrado');
    return imovel;
  }

  // so deixa passar o que o corretor pode mudar (status e corretorId ficam de fora)
  _camposEditaveis(dados) {
    const resultado = {};
    ['titulo', 'descricao', 'tipo', 'endereco', 'imagens'].forEach((campo) => {
      if (dados[campo] !== undefined) resultado[campo] = dados[campo];
    });
    ['preco', 'areaTotal', 'quartos', 'banheiros'].forEach((campo) => {
      if (dados[campo] !== undefined) resultado[campo] = Number(dados[campo]);
    });
    return resultado;
  }

  // avisa os clientes que conseguem comprar o imovel
  _avisarClientesCompativeis(imovel, acontecimento) {
    const clientes = usuarioRepository.findMany((u) => u.tipo === PERFIS.CLIENTE && u.ativo && u.rendaMensal);
    clientes.forEach((cliente) => {
      let capacidade;
      try {
        capacidade = cliente.calcularCapacidadeCompra();
      } catch (erro) {
        return; // cliente sem dados validos para simular
      }
      if (imovel.preco <= capacidade) {
        notificacaoService.notificar(
          cliente.id,
          'IMOVEL_NOVO',
          'Novo imovel compativel',
          `"${imovel.titulo}" ${acontecimento} e cabe no seu orcamento.`,
        );
      }
    });
  }

  _verificarTitularidade(imovel, corretorId) {
    if (imovel.corretorId !== Number(corretorId)) {
      throw new ForbiddenError('Voce so pode alterar imoveis do seu proprio portfolio.');
    }
  }

  atualizar(corretorId, imovelId, dados) {
    const imovel = imovelRepository.findById(imovelId);
    this._verificarTitularidade(imovel, corretorId);

    // depois de vendido o imovel fica congelado (o preco entra no relatorio de vendas)
    if (imovel.isVendido()) {
      throw new BusinessRuleError('Um imovel vendido nao pode mais ser editado.');
    }

    const novosDados = this._camposEditaveis(dados);
    if (novosDados.preco !== undefined) {
      imovel.atualizarPreco(novosDados.preco);
      delete novosDados.preco;
    }
    if (novosDados.endereco) novosDados.endereco = new Endereco(novosDados.endereco);
    Object.assign(imovel, novosDados);
    imovel.validar();
    return imovelRepository.salvarEntidade(imovel);
  }

  inativar(corretorId, imovelId) {
    const imovel = imovelRepository.findById(imovelId);
    this._verificarTitularidade(imovel, corretorId);
    imovel.inativar();
    return imovelRepository.salvarEntidade(imovel);
  }

  reativar(corretorId, imovelId) {
    const imovel = imovelRepository.findById(imovelId);
    this._verificarTitularidade(imovel, corretorId);
    imovel.reativar();
    const salvo = imovelRepository.salvarEntidade(imovel);
    this._avisarClientesCompativeis(salvo, 'voltou a ficar disponivel');
    return salvo;
  }

  marcarComoVendido(corretorId, imovelId, valorVenda) {
    const imovel = imovelRepository.findById(imovelId);
    this._verificarTitularidade(imovel, corretorId);

    const agendamentosVinculados = agendamentoRepository.findByImovel(imovelId);
    const temVisitaEmAberto = agendamentosVinculados.some(
      (a) => a.status === STATUS_AGENDAMENTO.PENDENTE || a.status === STATUS_AGENDAMENTO.CONFIRMADO,
    );
    if (temVisitaEmAberto) {
      throw new BusinessRuleError(
        'Nao e possivel concluir a venda: existem visitas pendentes ou confirmadas para este imovel.',
      );
    }

    imovel.marcarComoVendido(valorVenda);
    const salvo = imovelRepository.salvarEntidade(imovel);

    const corretor = usuarioRepository.findById(corretorId);
    corretor.registrarVenda();
    usuarioRepository.salvarEntidade(corretor);

    return salvo;
  }

  listarPorCorretor(corretorId) {
    return imovelRepository.findByCorretor(corretorId);
  }

  listarTodos() {
    return imovelRepository.findAll();
  }
}

module.exports = new ImovelService();
