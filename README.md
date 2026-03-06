# 🏐 Match Teams --- Sistema Inteligente de Organização de Partidas

Plataforma web para **organização de partidas esportivas**, **geração
automática de times equilibrados** e **avaliação de desempenho dos
jogadores** após cada jogo.

O sistema foi projetado para resolver um problema comum em esportes
recreativos:\
**organizar jogadores, balancear times e melhorar o nível das partidas
ao longo do tempo.**

------------------------------------------------------------------------

# 🎯 Objetivo do Projeto

Criar uma plataforma onde jogadores possam:

-   Criar e gerenciar **equipes esportivas**
-   Organizar **partidas**
-   Confirmar **presença**
-   Gerar **times equilibrados automaticamente**
-   Avaliar **desempenho dos times**
-   Evoluir o **ranking dos jogadores**

Tudo isso com uma **interface moderna e simples de usar**.

------------------------------------------------------------------------

# ⚡ Principais Funcionalidades

## 👥 Sistema de Equipes

Usuários podem criar ou entrar em equipes esportivas.

Cada equipe possui:

-   Nome
-   Esporte
-   Status (Aberta ou Fechada)
-   Senha opcional
-   Administradores

Admins podem:

-   Gerenciar membros
-   Criar partidas
-   Gerar times
-   Encerrar avaliações

------------------------------------------------------------------------

## 📅 Criação de Partidas

Uma equipe pode criar partidas com:

-   Data e hora
-   Política de inscrição
-   Número de jogadores por time
-   Limite de participantes

Estados da partida:

ABERTA → LISTA_FECHADA → AVALIACAO_LIBERADA → ENCERRADA

Fluxo:

Criar partida\
↓\
Jogadores confirmam presença\
↓\
Admin fecha lista\
↓\
Sistema gera times\
↓\
Avaliação liberada\
↓\
Avaliação encerrada

------------------------------------------------------------------------

## ✅ Confirmação de Presença

Jogadores podem:

-   Confirmar presença
-   Cancelar presença

O sistema controla automaticamente:

-   Número de vagas
-   Limite de participantes

------------------------------------------------------------------------

## ⚖️ Geração Automática de Times

Quando a lista é fechada:

Admin → Fechar lista e gerar times

O sistema cria times equilibrados baseado em:

-   Nota do jogador
-   Histórico de desempenho
-   Distribuição equilibrada

Resultado:

Time 1\
Time 2\
Reservas

------------------------------------------------------------------------

## ⭐ Sistema de Avaliação

Após a partida:

Jogadores podem avaliar **os times**.

Escala:

0 → Muito ruim\
10 → Excelente

Regras:

-   Cada jogador pode enviar **apenas uma avaliação**
-   Deve avaliar **todos os times**
-   Avaliação só é possível quando statusPartida = AVALIACAO_LIBERADA

------------------------------------------------------------------------

# 🏗️ Arquitetura

## Frontend

Stack:

React\
TypeScript\
React Router\
Axios\
CSS custom

Estrutura:

src/ ├ pages\
│ ├ HomeLogado\
│ ├ EquipeDetalhePage\
│ ├ PartidaDetalhePage\
│ ├ PartidaAvaliacaoTimesPage\
│ ├ services\
│ ├ api.ts\
│ ├ equipe.ts\
│ ├ partidas.ts\
│ ├ styles\
│ └ components

------------------------------------------------------------------------

## Backend (API)

A aplicação consome uma API REST.

Principais endpoints:

### Autenticação

POST /auth/login\
POST /auth/register\
GET /eu

### Equipes

POST /equipes\
GET /equipes/buscar\
GET /equipes/{id}\
PATCH /equipes/{id}/senha

### Partidas

POST /partidas\
GET /partidas/{id}\
POST /partidas/{id}/confirmar\
POST /partidas/{id}/cancelar\
POST /partidas/{id}/fechar-lista\
POST /partidas/{id}/liberar-avaliacao\
POST /partidas/{id}/encerrar-avaliacao

### Avaliações

POST /partidas/{id}/avaliacoes-times

Exemplo de payload:

\[ { "tipoAlvo": "TIME", "alvoId": "TIME_1", "nota": 8 }\]

------------------------------------------------------------------------

# 🚀 Como Rodar o Projeto

## 1️⃣ Clonar repositório

git clone https://github.com/GuilhermyDN/clubdofuteweb

## 2️⃣ Instalar dependências

npm install

## 3️⃣ Rodar projeto

npm run dev

------------------------------------------------------------------------

# 📦 Build de Produção

npm run build

------------------------------------------------------------------------

# 📊 Estrutura de Estados da Partida

ABERTA\
↓\
LISTA_FECHADA\
↓\
AVALIACAO_LIBERADA\
↓\
ENCERRADA

------------------------------------------------------------------------

# 📊 Futuras Melhorias

-   Ranking de jogadores
-   Estatísticas de desempenho
-   Sistema de temporadas
-   Histórico de partidas
-   Algoritmo avançado de balanceamento
-   Aplicativo mobile
-   Sistema de notificações

------------------------------------------------------------------------

# 👨‍💻 Autor

Desenvolvido por **Guilhermy Damasceno Novaes**

Projeto focado em organização de partidas esportivas e balanceamento
automático de times.

------------------------------------------------------------------------

# ⭐ Licença

MIT
