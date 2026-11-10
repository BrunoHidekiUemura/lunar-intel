const express = require('express');
const path = require('path');
const cookieSession = require('cookie-session');

const authRoutes = require('./src/routes/authRoutes');
const imovelRoutes = require('./src/routes/imovelRoutes');
const simulacaoRoutes = require('./src/routes/simulacaoRoutes');
const agendamentoRoutes = require('./src/routes/agendamentoRoutes');
const favoritoRoutes = require('./src/routes/favoritoRoutes');
const notificacaoRoutes = require('./src/routes/notificacaoRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const { errorHandler, rotaNaoEncontrada } = require('./src/middlewares/errorHandler');
const auditoria = require('./src/middlewares/auditoria');

const app = express();
const PORTA = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieSession({
  name: 'lunar-intel-session',
  keys: [process.env.SESSION_SECRET || 'lunar-intel-chave-academica'],
  maxAge: 24 * 60 * 60 * 1000,
}));

app.use('/api', auditoria);

app.use('/api/auth', authRoutes);
app.use('/api/imoveis', imovelRoutes);
app.use('/api/simulacoes', simulacaoRoutes);
app.use('/api/agendamentos', agendamentoRoutes);
app.use('/api/favoritos', favoritoRoutes);
app.use('/api/notificacoes', notificacaoRoutes);
app.use('/api/admin', adminRoutes);

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', rotaNaoEncontrada);
app.use(errorHandler);

app.listen(PORTA, () => {
  console.log(`LUNAR INTEL rodando em http://localhost:${PORTA}`);
});
