# Auditoria pós-sprint — Lúmen

Reauditoria dos quatro pilares (escalabilidade, segurança, resiliência, clean code) e smoke HTTP contra `next start`. Escopo: código em `4702ee7`, 18/08/2026.

**Veredito:** apto para demo, pitch e handoff de engenharia. Não apto a produção multi-instância nem a fundos reais.

A fronteira de confiança saiu do browser: cookie HMAC, ledger no servidor, Origin nas mutações, recibos assinados e paginação na trilha. Ainda bloqueiam produção o login mock (papel `institution` sem credencial), o ledger JSON (não sobrevive a serverless) e o seed misturado no saldo.

| Pilar | 17/08 | 18/08 |
| --- | --- | --- |
| Escalabilidade | 6/10 | **7/10** |
| Segurança | 5/10 | **7/10** |
| Resiliência | 8/10 | **8/10** |
| Clean Code | 8/10 | **8/10** |
| **Total** | 27/40 | **30/40** |

## Smoke test (18/08/2026)

Como repetir:

```bash
npm run build
npm run start
```

Em outro terminal (porta padrão 3000; use `SMOKE_BASE` se a porta for outra):

```bash
npm run smoke
```

Resultado desta rodada (`next start` em `http://127.0.0.1:3010`, `NODE_ENV=production`):

| Gate | Resultado |
| --- | --- |
| `npm test` | 45/45 |
| `npm run lint` | 0 erros |
| `npm run build` | ok |
| HTTP smoke | **17/17** |

| Check | HTTP | Resultado |
| --- | --- | --- |
| GET `/` + CSP sem `unsafe-inline` | 200 | nonce presente, `X-Frame-Options: DENY` |
| GET `/transparencia` | 200 | trilha renderiza |
| GET `/instituicao` sem cookie | 307 | `/?acesso=instituicao&motivo=nao-autenticado` |
| GET `/api/auth/session` | 200 | `value: null` |
| GET transparency `pageSize=3` | 200 | 3 de 7, raised 1.845.000, `hasMore` |
| GET transparency sem `campaignId` | 400 | `INVALID_INPUT` |
| POST login sem Origin | 403 | `AUTH_FORBIDDEN` |
| POST donations sem Origin | 403 | `AUTH_FORBIDDEN` |
| GET dashboard sem cookie | 401 | `AUTH_UNAUTHENTICATED` |
| GET `/comprovantes/recibo` sem `sig` | 200 | Recibo inválido |
| POST login doadora + cookie | 200 | `lumen_session` gravado |
| POST doação R$ 10 | 200 | assinatura mock persistida |
| Doadora lê dashboard | 403 | `AUTH_FORBIDDEN` |
| POST login instituição | 200 | `inst_casa-da-mulher` |
| GET `/instituicao` autenticada | 200 | página institucional |
| GET dashboard instituição | 200 | available 1.226.000 (seed + R$ 10) |
| POST logout | 200 | `value: null` |

O smoke prova o contrato HTTP, cookie, Origin, papéis, paginação e HMAC do recibo **num processo só**. Não prova lock entre instâncias, Prisma, IdP real nem CSP efetiva no HTML (o nonce vai no header; o layout ainda não injeta no documento).

A doação de R$ 10 **grava** no ledger local (`.data/ledger.json`).

## O que fechou desde 17/08

| Antes | Agora |
| --- | --- |
| Sessão forjável no `localStorage` | Cookie httpOnly `lumen_session` com HMAC (`src/lib/session-token.ts`) |
| Ledger no browser | `LedgerRepository` + `.data/ledger.json` no servidor |
| Dashboard institucional sem sessão | Proxy + cookie `role=institution`; API 401/403 no smoke |
| Recibo aberto na query string | HMAC em `/comprovantes/recibo`; URL sem `sig` recusada |
| CSP com `'unsafe-inline'` | Nonce por request, sem `'unsafe-inline'` (ainda não no HTML) |
| `CAMPAIGN.raised` estático | Métricas do snapshot vivo |
| Sem paginação | `GET /api/ledger/transparency?page&pageSize` |

## Achados restantes

| Sev. | Pilar | Achado | Onde |
| --- | --- | --- | --- |
| Crítico | Segurança | Login mock emite papel `institution` sem credencial | `src/server/auth-service.ts` |
| Crítico | Escalabilidade | JSON + lock in-process; serverless perde dados | `src/adapters/ledger/ledger-repository.ts` |
| Alto | Escalabilidade | `SEED_MOVEMENTS` entra no saldo | `src/lib/ledger-core.ts` |
| Alto | Segurança | `x-forwarded-host` preferido ao `Host` | `src/lib/request-origin.ts` |
| Alto | Segurança | Nonce CSP não chega ao layout; `style` inline vs `style-src` nonce | `src/app/layout.tsx`, `CampaignProgress.tsx` |
| Alto | Resiliência | JSON inválido vira ledger vazio em silêncio | `parseLedgerState`, `JsonFileLedgerRepository.load` |
| Médio | Escalabilidade | Dashboard devolve snapshot completo que a UI não usa | `src/lib/ledger-operations.ts` |
| Médio | Segurança | `toAppError` vaza `Error.message` cru | `src/lib/errors.ts` |
| Médio | Resiliência | “Carregar mais” na trilha engole erro de rede | `TransparencyTrail.tsx` |
| Baixo | Clean Code | Assinaturas ainda são mock; RPC não escreve chain | `createMockSignature` |

## Próximo desenvolvedor

1. **P0** — Prisma/PostgreSQL no `LedgerRepository`; lock transacional; falhar alto se o estado corromper.
2. **P0** — IdP real; papel `institution` amarrado à org; remover login aberto.
3. **P0** — Seed só no bootstrap de demo; métricas de produção sem `SEED_MOVEMENTS`.
4. **P1** — Origin allowlist; não preferir `x-forwarded-host` cru.
5. **P1** — Ler nonce no root layout; tirar `width` inline das barras.
6. **P2** — Enxugar DTO do dashboard; `RECEIPT_SECRET` separado; testes de API.
