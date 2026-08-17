# Lúmen.

Plataforma de doações transparentes e rastreáveis baseada em Solana. Este repositório é a base demonstrável do produto: o doador acompanha o dinheiro on-chain e a instituição presta contas com nota fiscal.

## Como executar

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

Scripts: `npm run dev`, `npm run build`, `npm run start`, `npm run lint`, `npm test`.

## Fluxo de demonstração (pitch)

Use esta sequência em apresentações. Leva poucos minutos e cobre o ciclo completo do dinheiro.

### 1. Doar na Home (`/`)

1. Mostre o cabeçalho **Lúmen.**, os selos **Ambiente Seguro** e **Instituição Verificada**, e a campanha **Fundo de Amparo: Casa da Mulher**.
2. Selecione **R$ 10**, **R$ 50** ou **R$ 100**. Sem valor selecionado, o botão permanece desabilitado.
3. Clique em **Entrar para Doar**.
4. No modal (simulação Privy), escolha e-mail, Google ou carteira.
5. Aguarde o estado **Registrando na Solana...**.
6. Confirme a tela **Muito Obrigado!** e clique em **Acompanhar destino do dinheiro**.

Se a sessão da doadora já existir, o clique registra a transação direto, sem abrir o modal.

### 2. Acompanhar na Trilha (`/transparencia`)

1. Apresente as métricas: **Total Arrecadado**, **Total Utilizado** e **Disponível On-Chain**.
2. Na timeline, mostre uma **Entrada on-chain** (a doação recém-feita aparece no topo, com link da Devnet).
3. Mostre uma saída com **Cadeia fechada** (nota fiscal vinculada e comprovante).
4. Mostre a saída **Pendente** (transporte) — a evidência ainda não foi anexada.

Essa é a tese do produto: o doador vê entrada, uso e comprovante no mesmo lugar.

### 3. Prestar contas no Dashboard (`/instituicao`)

1. Clique em **Instituição** no menu. Sem sessão institucional, o servidor redireciona para a Home com o cartão **Acesso restrito**.
2. Clique em **Entrar como Casa da Mulher**. O login grava um cookie httpOnly assinado no servidor.
3. Mostre o **saldo on-chain** (R$ e USDC simulado na Solana Devnet) e o **Score de Transparência** (começa em 92/100 por causa da NF pendente).
4. **Saque para conta PJ:** informe um valor (ex.: `200`) e solicite o saque. O saldo cai, o score cai e a trilha ganha uma saída **Pendente**.
5. **Pagar fornecedor:** escolha um homologado, descreva a despesa, informe a NF e o valor. A cadeia fecha na hora.
6. **Anexar recibo:** preencha número e emitente da pendência e clique em **Anexar e fechar cadeia**. O score sobe e a trilha pública atualiza.

Formulários vazios ou valor acima do saldo são recusados na hora, sem chamar a rede.

### 4. Encerrar a narrativa

Volte para `/transparencia` e mostre o ciclo fechado: doação na Home, rastreio público e prestação de contas da instituição.

## Teste de resiliência (falha na Solana)

1. Em `.env.local`, defina `NEXT_PUBLIC_MOCK_FORCE_ERROR=true`.
2. Reinicie o `npm run dev`.
3. Tente doar, abrir a trilha ou registrar uma saída no dashboard.

A autenticação continua funcionando. As chamadas ao adapter da Solana falham com mensagem visível e botão **Tentar novamente**. Remova a flag e reinicie para voltar ao fluxo normal.

## Rotas

- `/` — vitrine da campanha
- `/transparencia` — trilha pública
- `/instituicao` — dashboard da Casa da Mulher (protegido no servidor)

## Arquitetura

A UI não fala com Solana nem com Privy diretamente. Tudo passa por adapters:

- `src/adapters/auth` — contrato de autenticação; o client chama `/api/auth/*`
- `src/adapters/solana` — contrato on-chain; o client chama `/api/ledger/*`
- `src/adapters/ledger` — persistência do ledger (`LedgerRepository`); JSON hoje, banco relacional depois
- `src/proxy.ts` — no Next.js 16 o antigo `middleware.ts` virou Proxy; intercepta `/instituicao` e exige `role === "institution"` no cookie assinado

O ledger (doações, saques, pagamentos e notas) vive no servidor. As rotas em `src/app/api/ledger/` só fazem HTTP: o acesso ao estado passa pela interface `LedgerRepository` (`src/adapters/ledger/ledger-repository.ts`). A implementação atual persiste em `.data/ledger.json`; um adaptador Prisma/PostgreSQL pode substituí-la sem mudar as rotas. A trilha pública pagina movimentações (`page` e `pageSize`, até 50 por página). Mutações exigem o cookie de sessão e, nas operações da instituição, `role === "institution"`. Recibos em `/comprovantes/recibo` só são exibidos com HMAC válido. A CSP é emitida por requisição no Proxy, com nonce e sem `'unsafe-inline'`.

Variáveis públicas são validadas em `src/lib/env.ts`. O cookie de sessão usa `SESSION_SECRET` só no servidor. Não coloque chaves privadas no client. Copie apenas `.env.example` para `.env.local`.
