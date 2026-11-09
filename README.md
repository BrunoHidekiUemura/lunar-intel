# LUNAR INTEL — Sistema Imobiliário Inteligente

Projeto Semestral de Sistema Web Orientado a Objetos (BRIPROO_2026-2).
Alunos: Bruno Hideki Uemura e José Henrique de Lima.

Plataforma que integra simulação de financiamento imobiliário (RN01), catálogo de
imóveis filtrado pela capacidade de compra do cliente, agendamento de visitas e
painéis de gestão para corretores e administradores.

## Stack

Node.js + Express no back-end, HTML/CSS/JavaScript puro no front-end, persistência
em arquivos JSON (`data/*.json`). Escolhida para manter o código simples de explicar
na apresentação: uma única linguagem, sem banco de dados externo para configurar.

## Como rodar

```bash
npm install     # instala as dependências (express, bcryptjs, cookie-session)
npm run seed    # cria data/*.json com usuários e imóveis de demonstração
npm start       # inicia o servidor em http://localhost:3000
```

Abra `http://localhost:3000` no navegador.

### Contas de demonstração (senha para todas: `123456`)

| Perfil        | E-mail                     |
|---------------|-----------------------------|
| Administrador | admin@lunarintel.com        |
| Corretor      | bruno@lunarintel.com        |
| Corretor      | jose@lunarintel.com         |
| Cliente       | cliente@lunarintel.com      |
| Cliente       | marina@lunarintel.com       |

`npm run seed` pode ser executado novamente a qualquer momento para resetar os dados.

## Estrutura do projeto

```
projeto_imobiliario/
├── server.js                  Ponto de entrada: middlewares, sessão, rotas, estáticos
├── seed.js                    Carga inicial de dados de demonstração
├── src/
│   ├── config/constants.js    Parâmetros financeiros e regras (RN01-RN12) centralizados
│   ├── errors/AppError.js     Hierarquia de exceções da aplicação
│   ├── models/                Classes de domínio (ver diagrama da Atividade 4)
│   ├── repositories/          Persistência em JSON (um repositório por entidade)
│   ├── services/               Regras de negócio e orquestração entre repositórios
│   ├── middlewares/            Autenticação de sessão, RBAC e tratamento de erros
│   └── routes/                  Endpoints REST, um módulo por área funcional
├── data/                        Arquivos .json (estado persistido)
└── public/                      Front-end (uma página por perfil + API wrapper)
```

## Classes de domínio × diagrama da Atividade 4

| Classe (src/models) | Papel |
|---|---|
| `Usuario.js` | Superclasse abstrata — não pode ser instanciada diretamente |
| `Cliente.js`, `Corretor.js`, `Administrador.js` | Subclasses de `Usuario` (herança) |
| `Imovel.js` | Entidade principal; possui um `Endereco` (composição) |
| `Endereco.js` | Classe de composição (1:1 com `Imovel`) |
| `Simulacao.js` | Registra simulação financeira e calcula imóveis compatíveis |
| `Agendamento.js` | Ciclo de vida da visita (máquina de estados: Pendente → Confirmado → Realizado/Cancelado) |
| `Favorito.js` | Entidade associativa Cliente × Imóvel |
| `Notificacao.js` | Evento destinado a um `Usuario` |

Conceitos de POO aplicados: **herança** (Usuario → Cliente/Corretor/Administrador),
**abstração** (Usuario abstrata, não instanciável), **composição** (Imovel → Endereco),
**associação** (Agendamento, Simulacao, Favorito, Notificacao referenciando outras
entidades por id), **encapsulamento** (regras e cálculos vivem dentro da própria
classe — ex.: `Cliente.calcularCapacidadeCompra()`, `Agendamento.confirmar()`).

### Polimorfismo e sobrecarga (exigido na etapa de Implementação)

- **Polimorfismo**: `Usuario.getResumoPerfil()` é definido na superclasse e
  **sobrescrito** por `Cliente`, `Corretor` e `Administrador`, cada um retornando um
  resumo diferente (renda, CRECI+vendas, nível de acesso). O mesmo código —
  `usuario.getResumoPerfil()`, chamado em `Usuario.paraDadosPublicos()` e exibido na
  barra de navegação (`public/js/guard.js`) — produz saídas diferentes dependendo da
  classe real do objeto em tempo de execução. É possível ver isso na prática
  comparando o texto do badge ao logar como Cliente, Corretor e Administrador.
- **Sobrecarga**: JavaScript não possui sobrecarga por assinatura (como Java/C#); o
  equivalente usado no projeto é parâmetros opcionais/objetos de parâmetros, por
  exemplo `Agendamento.cancelar(motivo)` (motivo é opcional) e
  `Usuario.atualizarDados({ nome, telefone })` (atualiza só os campos informados).

## Regras de negócio (RN01–RN12) × implementação

| Regra | Onde está implementada |
|---|---|
| RN01 — 30% da renda | `Cliente.obterParcelaMaxima()`, `Cliente.calcularCapacidadeCompra()` |
| RN02 — venda só sem visitas em aberto | `ImovelService.marcarComoVendido()` |
| RN03 — visita só em imóvel disponível | `AgendamentoService.solicitar()` |
| RN04 — máx. 3 agendamentos ativos | `AgendamentoService.solicitar()` |
| RN05 — idade 18–70 | `Cliente.validarIdade()` |
| RN06 — isolamento do corretor | `ImovelService._verificarTitularidade()` |
| RN07 — admin não intermedia visitas | Rotas de agendamento não aceitam perfil `ADMINISTRADOR` |
| RN08 — entrada ≤ 80% do imóvel | `Simulacao.getImoveisCompativeis()` |
| RN09 — intervalo mínimo de 7 dias | `AgendamentoService.solicitar()` |
| RN10 — notificação em mudanças de status | `NotificacaoService.notificar()`, chamado pelo `AgendamentoService` |
| RN11 — validação de CRECI | `Corretor.validarCRECI()` |
| RN12 — imóvel inativo some das buscas | `ImovelService.listarDisponiveis()`, `Imovel.inativar()` |

## Persistência e tratamento de exceções

- Persistência via `JsonRepository` (classe genérica em `src/repositories/JsonRepository.js`),
  especializada por entidade. Cada escrita é feita por reescrita atômica do arquivo JSON.
- Exceções tipadas em `src/errors/AppError.js`: `ValidationError` (400), `AuthError` (401),
  `ForbiddenError` (403), `NotFoundError` (404), `BusinessRuleError` (422) e
  `PersistenceError` (500 — falha de leitura/gravação). O middleware
  `src/middlewares/errorHandler.js` converte qualquer uma delas em uma resposta JSON
  amigável, nunca expondo stack trace ao usuário final.

## Conformidade com o enunciado do professor (seção 4)

Checklist das características obrigatórias do sistema, verificada no código:

| Exigido | Status | Onde |
|---|---|---|
| Cadastro de usuários | ✅ | `AuthService.cadastrar`, `POST /api/auth/cadastro` |
| Autenticação | ✅ | `AuthService.autenticar`, sessão via `cookie-session` |
| Cadastros do domínio (imóveis) | ✅ | `ImovelService`, `src/routes/imovelRoutes.js` |
| Processo principal (simulação → catálogo → visita → venda) | ✅ | `SimulacaoService` + `AgendamentoService` + `ImovelService.marcarComoVendido` |
| Pesquisa de informações | ✅ | Filtros do catálogo (`ImovelService.listarDisponiveis`), busca do corretor |
| Alteração de registros | ✅ | Editar imóvel, editar perfil |
| Exclusão ou inativação de registros | ✅ | `Imovel.inativar()` (RN12), `Usuario.inativarConta()` (RF05), bloqueio de conta pelo admin |
| Validação dos dados | ✅ | `ValidationError` em todos os services |
| Tratamento de erros | ✅ | Hierarquia `AppError` + `errorHandler` (nunca expõe stack trace) |
| Armazenamento e recuperação das informações | ✅ | `JsonRepository` (`data/*.json`) |
| Interface web | ✅ | `public/` (uma página por perfil) |
| Organização do código em classes | ✅ | `src/models`, `src/services`, `src/repositories` |

Não há telas isoladas de cadastro sem um processo: o fluxo principal conecta
simulação financeira, catálogo filtrado, agendamento de visita e fechamento de venda.

### Ajustes de implementação em relação ao diagrama da Atividade 3

Alguns métodos que no diagrama da Atividade 3 aparecem na própria classe de domínio
(ex.: `Cliente.listarFavoritos()`, `Cliente.listarSimulacoes()`,
`Corretor.cadastrarImovel()`, `Corretor.confirmarVisita()`) foram implementados na
camada de **services** (`FavoritoService`, `SimulacaoService`, `ImovelService`,
`AgendamentoService`). Motivo: esses métodos dependem de acesso a outros
repositórios (ex.: buscar todos os imóveis para filtrar favoritos), e manter esse
acesso dentro da classe de domínio acoplaria `Cliente`/`Corretor` à camada de
persistência. As classes de domínio continuam concentrando os atributos e as regras
de negócio "puras" (cálculos e validações que não dependem de outros dados
externos), o que é o ponto central cobrado pela disciplina.

## Deploy (opcional)

O enunciado só exige "disponibilizar link acessível em qualquer repositório" — ou
seja, o link do GitHub já é suficiente para a entrega. Caso queiram também uma URL
pública funcionando:

- **Evitar Vercel**: a Vercel roda funções serverless sem disco persistente; como a
  persistência aqui é em arquivos JSON gravados localmente, os dados cadastrados
  seriam perdidos a cada nova invocação/cold start.
- **Render.com** (recomendado): conecta direto no repositório GitHub, detecta o
  `npm start` automaticamente e mantém um processo Node tradicional rodando — mesmo
  modelo usado aqui. No plano gratuito o disco não é garantido entre reinicializações
  por inatividade, então os dados cadastrados podem resetar depois de um tempo sem
  acesso — aceitável para uma demonstração.
- **Railway**: alternativa parecida ao Render, com a opção de anexar um volume
  persistente caso queiram que os dados sobrevivam de verdade entre reinícios.

## Observações e simplificações assumidas

- Taxa de juros (1% a.m.) e prazo (360 meses) usados no cálculo de financiamento
  (Tabela Price) são constantes fixas em `src/config/constants.js`, representativas
  de uma simulação de mercado — podem ser ajustadas facilmente em um único lugar.
- RF03 (recuperação de senha) gera um código e o registra no console do servidor,
  já que o projeto não possui um serviço real de envio de e-mail.
- Contas de Administrador não são auto-cadastráveis publicamente (coerente com RN07);
  são criadas via `seed.js`, simulando a gestão interna da imobiliária.
