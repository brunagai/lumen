# API HTTP do Lúmen

A UI fala só com estas rotas. Envie `credentials: "include"` para o cookie httpOnly `lumen_session` ir junto. Mutações (`POST`) também recusam origem cruzada: `Origin` precisa coincidir com `Host`.

Envelope padrão:

```json
{ "ok": true, "value": {} }
```

```json
{ "ok": false, "error": { "code": "AUTH_UNAUTHENTICATED", "message": "Entre para continuar." } }
```

Códigos HTTP: `400` input/valor, `401` sem sessão, `403` papel/origem, `404` não encontrado, `409` saldo insuficiente, `502` falha de transação, `503` falha simulada.

Sessão (objeto `session` no corpo das mutações do ledger **e** no cookie; os dois precisam bater):

```json
{
  "userId": "donor_mock",
  "displayName": "Doadora",
  "method": "email",
  "role": "donor"
}
```

`method`: `email` | `google` | `wallet`. `role`: `donor` | `institution`.

---

## `/api/auth/*`

| Método | Rota | Cookie | Corpo | Resposta `value` |
| --- | --- | --- | --- | --- |
| `POST` | `/api/auth/login` | grava `lumen_session` | `{ "method", "role" }` | `Session` |
| `POST` | `/api/auth/logout` | apaga o cookie | vazio | `null` |
| `GET` | `/api/auth/session` | lê o cookie | — | `Session` ou `null` |
| `POST` | `/api/auth/verify` | exige cookie | `Session` | `Session` |

Login e logout não exigem cookie prévio. `GET /api/auth/session` é público e devolve `null` se ninguém estiver autenticado.

---

## `/api/ledger/*`

Persistência atrás de `LedgerRepository` (`src/adapters/ledger/ledger-repository.ts`). As rotas não conhecem o arquivo JSON.

Campanha de demo: `fundo-amparo-casa-da-mulher`. Instituição: `casa-da-mulher`. Doações rápidas: `1000`, `5000` ou `10000` centavos (R$ 10 / 50 / 100).

### Leitura

| Método | Rota | Auth | Query | Resposta `value` |
| --- | --- | --- | --- | --- |
| `GET` | `/api/ledger/transparency` | pública | `campaignId` (obrigatório), `page`, `pageSize` | snapshot paginado |
| `GET` | `/api/ledger/balance` | cookie `role=institution` | `institutionId` | `{ availableBrlCents, availableUsdc }` |
| `GET` | `/api/ledger/dashboard` | cookie `role=institution` | `institutionId` | saldo, score, pendências e snapshot |

Paginação da trilha: `page` começa em 1, `pageSize` padrão 20, máximo 50. Métricas (`raisedCents`, `usedCents`, `availableCents`) são do ledger inteiro; só `movements` é fatiado. Metadados: `{ page, pageSize, total, hasMore }`.

### Mutação

Todas exigem cookie `lumen_session` **e** o mesmo objeto `session` no JSON. Origem precisa ser confiável. Operações da instituição exigem `role: "institution"`.

**`POST /api/ledger/donations`** — doadora ou instituição autenticada.

```json
{
  "campaignId": "fundo-amparo-casa-da-mulher",
  "amountCents": 1000,
  "session": { "userId": "donor_mock", "displayName": "Doadora", "method": "email", "role": "donor" }
}
```

`value`: `{ "donation": { "id", "campaignId", "amount", "txSignature", "confirmedAt" }, "explorerUrl" }`.

**`POST /api/ledger/withdrawals`** — saque PJ (fica pendente de NF).

```json
{
  "campaignId": "fundo-amparo-casa-da-mulher",
  "amountCents": 20000,
  "session": { "userId": "inst_casa-da-mulher", "displayName": "Casa da Mulher", "method": "email", "role": "institution" }
}
```

`value`: movimentação `outflow` com `status: "pending"`.

**`POST /api/ledger/payments`** — pagamento a fornecedor homologado (fecha a cadeia).

```json
{
  "campaignId": "fundo-amparo-casa-da-mulher",
  "amountCents": 25000,
  "supplierName": "Distribuidora Alimentos Vida Ltda",
  "description": "Compra de kits de higiene",
  "invoiceNumber": "NF 2026/0401",
  "session": { "userId": "inst_casa-da-mulher", "displayName": "Casa da Mulher", "method": "email", "role": "institution" }
}
```

`value`: movimentação `outflow` com `status: "chain_closed"` e `invoice`.

**`POST /api/ledger/invoices`** — anexa NF a uma saída pendente (uma vez só).

```json
{
  "movementId": "uuid-da-saida-pendente",
  "invoiceNumber": "NF-100",
  "issuer": "Casa da Mulher",
  "session": { "userId": "inst_casa-da-mulher", "displayName": "Casa da Mulher", "method": "email", "role": "institution" }
}
```

`value`: a mesma movimentação com `status: "chain_closed"` e `invoice`.
