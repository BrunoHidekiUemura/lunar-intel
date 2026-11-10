const favoritoRepository = require('../repositories/FavoritoRepository');
const imovelRepository = require('../repositories/ImovelRepository');
const { ValidationError, ForbiddenError, BusinessRuleError } = require('../errors/AppError');

class FavoritoService {
  adicionar(clienteId, imovelId) {
    const imovel = imovelRepository.findById(imovelId);
    if (!imovel.isDisponivel()) {
      throw new BusinessRuleError('So e possivel favoritar imoveis disponiveis.');
    }
    const existente = favoritoRepository.findByClienteEImovel(clienteId, imovelId);
    if (existente) throw new ValidationError('Este imovel ja esta na sua lista de favoritos.');
    return favoritoRepository.create({ clienteId: Number(clienteId), imovelId: Number(imovelId) });
  }

  remover(clienteId, favoritoId) {
    const favorito = favoritoRepository.findById(favoritoId);
    if (favorito.clienteId !== Number(clienteId)) {
      throw new ForbiddenError('Voce so pode remover os proprios favoritos.');
    }
    favoritoRepository.delete(favoritoId);
  }

  listarPorCliente(clienteId) {
    const favoritos = favoritoRepository.findByCliente(clienteId);
    return favoritos.map((favorito) => ({
      favorito,
      imovel: imovelRepository.findById(favorito.imovelId),
    }));
  }
}

module.exports = new FavoritoService();
