# Lúmen.

Plataforma de doações transparentes e rastreáveis baseada em Solana.

## Como executar

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

Scripts: `npm run dev`, `npm run build`, `npm run start`, `npm run lint`.

## Rotas

- `/` — vitrine da campanha *Fundo de Amparo: Casa da Mulher* (seletor de valores, auth e confirmação on-chain)
- `/transparencia` — trilha pública (métricas, timeline on-chain e notas fiscais)
- `/instituicao` — portal da instituição (protegido)

Na Home, escolha R$ 10, R$ 50 ou R$ 100 e use **Entrar para Doar**. O modal simula Privy (e-mail, Google ou carteira), persiste a sessão no `localStorage` e registra a doação via adapter da Solana. O header mostra a sessão ativa. Doações novas aparecem na trilha pública.

A trilha em `/transparencia` mostra Total Arrecadado, Total Utilizado e Disponível On-Chain, com entradas confirmadas na Devnet e saídas com nota fiscal vinculada (`Entrada on-chain`, `Cadeia fechada` ou `Pendente`).

No portal da instituição, use **Simular acesso da instituição** para validar o dashboard.

## Arquitetura

A UI não fala com Solana nem com Privy diretamente. Tudo passa por adapters:

- `src/adapters/auth` — contrato de autenticação + mock
- `src/adapters/solana` — contrato on-chain + mock (Devnet)

Variáveis públicas são validadas em `src/lib/env.ts`. Não coloque chaves privadas no client.

## Próximas etapas

- Saldo, nota fiscal e liberação a fornecedores no dashboard da instituição
