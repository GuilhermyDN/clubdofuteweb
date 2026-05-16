# Relatório de Alterações — Redesign + Foto do Usuário

Documento gerado em **2026-05-12** sumarizando todas as mudanças aplicadas na branch `redesign-velocity`.

---

## 1. Hambúrguer no canto superior direito (`AppHeader`)

Já existia (`commit 3de814d`), mas confirmado e mantido. O menu agora abre com:

- **Equipes** (`/equipes` — também é o destino do logo CLUBEDOFUT)
- **Estatísticas** (`/estatisticas`)
- **Perfil** (`/eu` — edição de telefone, CEP, peso, altura, foto)
- **Sair** (logout, em vermelho)

**Arquivo:** [src/components/AppHeader.tsx](src/components/AppHeader.tsx) (lista `items`). O item "Convites" e o polling de pendentes foram removidos — fluxo de convites foi descontinuado do front por enquanto.

---

## 2. Hero da equipe simplificado

Antes: nome + cadeado em uma linha; nota gigante em outra; depois esporte/local/dias/horários; depois pill de admin/membro.

Agora ([src/pages/EquipeDetalhe.tsx:461](src/pages/EquipeDetalhe.tsx#L461)): **nome + ★ nota geral + cadeado** tudo na mesma linha, focando na competitividade. A pill "Você é admin / Membro" virou opcional logo abaixo.

**Onde foram as informações secundárias?** Para uma info-bar nova abaixo dos stats (Membros / Ativos / Admins / Jogos):

```tsx
<div className="x-team-info-bar">
  <div className="x-team-info-item"><lbl>Esporte</lbl><val>{esporte}</val></div>
  <div className="x-team-info-item"><lbl>Local</lbl><val>{rua, numero || cep}</val></div>
  <div className="x-team-info-item"><lbl>Agenda</lbl><val>{dias-horarios}</val></div>
</div>
```

**Arquivos:**
- [src/pages/EquipeDetalhe.tsx:540](src/pages/EquipeDetalhe.tsx#L540) (JSX da info-bar)
- [src/styles/landing.css:3087](src/styles/landing.css#L3087) (CSS: `.x-team-score` reduziu o tamanho pra ficar inline; `.x-team-info-bar` novo)

---

## 3. Foto do usuário em todas as listas onde ele aparece

### 3.1. Times gerados (sorteio)

Antes: só nome + nota. Agora ([src/pages/PartidaDetalhe.tsx:557](src/pages/PartidaDetalhe.tsx#L557) e seguintes): cada jogador aparece com `<UserAvatar fotoPerfil>` + nome + ★ nota. Também adicionei `fotoPerfil?: string | null` ao tipo `TimeJogador` em [src/pages/PartidaDetalhe.tsx:16](src/pages/PartidaDetalhe.tsx#L16) (e idem em PartidaAvaliacao).

CSS para o layout: `.x-team-player-main` em [src/styles/landing.css:3450](src/styles/landing.css#L3450).

### 3.2. Parceiros frequentes — linha inteira clicável + "Ver mais"

Antes: só um botão pequeno "Ver mais" no canto direito (fácil de não ver, especialmente no mobile).

Agora ([src/pages/Estatisticas.tsx:140](src/pages/Estatisticas.tsx#L140)): a linha inteira virou `<button class="x-row x-row-clickable">` — toca em qualquer lugar e abre o modal do jogador. O texto **"Ver mais →"** continua visível no canto direito como _call to action_.

CSS: `.x-row-clickable` + `.x-row-cta` em [src/styles/landing.css:3240](src/styles/landing.css#L3240). Hover deixa a borda accent (verde) e troca a cor do "Ver mais".

### 3.3. Já tinham foto antes (mantidos):

- Membros da equipe — [src/pages/EquipeDetalhe.tsx:652](src/pages/EquipeDetalhe.tsx#L652)
- Presenças da partida — [src/pages/PartidaDetalhe.tsx:490](src/pages/PartidaDetalhe.tsx#L490)
- Jogadores da avaliação — [src/pages/PartidaAvaliacao.tsx:273](src/pages/PartidaAvaliacao.tsx#L273)
- Modal de detalhe do jogador — [src/components/UserDetalheModal.tsx:46](src/components/UserDetalheModal.tsx#L46)
- Próprio perfil — [src/pages/Eu.tsx:228](src/pages/Eu.tsx#L228)

---

## 4. Gap do backend (precisa ser corrigido em Java)

O frontend está tipado e renderizando `fotoPerfil` corretamente, mas o backend **não inclui esse campo** em três DTOs:

| Endpoint | DTO | Campo faltando |
| --- | --- | --- |
| `GET /equipes/:id` | `MembroEquipe` (em `membros[]`) | `fotoPerfil: string` |
| `GET /partidas/:id` | `Presenca` (em `presencas[]`) | `fotoPerfil: string` |
| `GET /partidas/:id` | `TimeJogador` (em `timesGerados.times[].jogadores[]` e `reservas[]`) | `fotoPerfil: string` |
| `GET /eu/estatisticas` | `ParceiroFrequente` (em `parceirosFrequentes[]`) | `fotoPerfil: string` |
| `GET /usuarios/:id/estatisticas` | mesma `ParceiroFrequente` | `fotoPerfil: string` |

Enquanto o backend não retornar o campo, o frontend cai pras iniciais coloridas (fallback do `UserAvatar`).

---

## 5. Convites — removidos do front

Página `/convites`, rota, service `convites.ts` e item do hambúrguer foram apagados. O backend devolvia 404 nesses endpoints e mantê-los só polui a UI. Quando/se o fluxo voltar, restauramos do histórico do git.

Arquivos apagados:
- `src/pages/Convites.tsx`
- `src/services/convites.ts`

Edits relacionados (limpeza):
- [src/components/AppHeader.tsx](src/components/AppHeader.tsx) — sem item Convites, sem polling, sem badge.
- [src/routes/AppRoutes.tsx](src/routes/AppRoutes.tsx) — sem rota `/convites`.
- [src/styles/landing.css](src/styles/landing.css) — removida classe `.x-row-sender` (usada só na tela de convites).

---

## 6. ⚠️ Hack temporário de demo — REMOVER antes de deploy

Para o demo local exibir as fotos enquanto o backend não inclui `fotoPerfil`, foi adicionado um interceptor de resposta no Axios que enriquece o payload com fotos vindas de um mapa hardcoded (userId → URL R2). Arquivos a remover:

- [src/utils/devPhotoEnricher.ts](src/utils/devPhotoEnricher.ts) — apagar arquivo inteiro.
- [src/services/api.ts](src/services/api.ts) — remover o import, o mapa `DEMO_PHOTOS`, o `Object.entries(...)...registerPhoto(...)` e trocar `enrichResponse(res)` de volta para `res` no interceptor de resposta.

Tudo o que esse hack faz é injetar `fotoPerfil` quando o backend não devolve. Depois que o Java passar a incluir o campo, é só apagar.

---

## 7. Onde ver no demo (rodando agora em `http://localhost:5173`)

| Tela | URL | O que validar |
| --- | --- | --- |
| Equipes (home logada) | `/equipes` | Hambúrguer no top direito, brand → home |
| Hero da equipe | `/equipes/2` | Nome + ★ nota + cadeado inline, info-bar abaixo |
| Lista de membros | `/equipes/2` (scroll) | Avatares com foto, medalhas 🥇🥈🥉 nos top-3 |
| Partida | `/partidas/2` | Presenças com foto |
| Times gerados | `/partidas/2` (scroll) | Cada jogador com foto + ★ nota |
| Estatísticas | `/estatisticas` | Parceiros frequentes — linha inteira clicável, foto + "Ver mais →" |
| Modal jogador | clicar em qualquer parceiro | Abre com foto + Nota / Partidas / Média recebida |
| Perfil | `/eu` | Foto do próprio usuário visível, hambúrguer no top |

---

## 8. Type-check

`npx tsc --noEmit` passou limpo após todas as alterações.
