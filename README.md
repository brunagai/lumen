# Lúmen.

O Lúmen nasceu no **Hackathon da Wohackers**, na **trilha Solana**.

É um protótipo de doações transparentes: a pessoa doa em **reais**, acompanha o caminho do dinheiro e a instituição presta contas com nota fiscal. A ideia é que qualquer pessoa consiga entender o que aconteceu com a doação, mesmo sem saber o que é criptomoeda.

## Por que Solana?

Escolhemos a trilha Solana porque a blockchain deixa um **rastro público** de cada movimento: dá para mostrar que o dinheiro entrou, que saiu e para onde foi.

Neste protótipo usamos da Solana:

- a **Devnet** (rede de testes, sem dinheiro real)
- o **Explorer** da Solana, para abrir o comprovante de cada transação no navegador
- uma **assinatura de transação** (o “código” da operação na rede)
- a ideia de saldo **on-chain** (o que ainda está na carteira da campanha)
- uma conversão simulada para **USDC** no painel da instituição, só para quem quiser ver o equivalente em cripto

Os valores que a doadora escolhe e vê na tela são sempre em **reais**. A Solana entra como o “cartório digital” por trás: o registro da doação, o link da Devnet e o saldo da campanha.

## Por que Privy?

Quem não convive com cripto não precisa entender carteira, token ou Devnet para doar.

O **Privy** entra no fluxo de entrada (e-mail, Google ou carteira) para a pessoa se identificar sem virar especialista em Web3. Na interface, o Lúmen **mostra tudo em reais**. Assim a Solana continua por baixo, mas a doadora pensa em R$ 10, R$ 50 ou R$ 100 — o mesmo jeito de doar que ela já conhece.

No hackathon esse login é uma **simulação** do Privy, pensada para a demo: o importante é o gesto (entrar e doar em reais), não configurar uma carteira de verdade.

## O que o Lúmen mostra

1. **Doar** — a pessoa escolhe um valor em reais e confirma.
2. **Trilha pública** — qualquer um vê o que entrou, o que foi usado e o que ainda está disponível.
3. **Prestação de contas** — a Casa da Mulher registra saque, pagamento a fornecedor e anexa a nota fiscal.

Quando a nota está vinculada, a trilha mostra **cadeia fechada**. Se ainda falta o comprovante, aparece **pendente**.

Isto é um **protótipo para o hackathon**, não uma operação com dinheiro real.

## Como abrir no computador

No terminal, na pasta do projeto:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Depois abra [http://localhost:3000](http://localhost:3000).

Outros comandos, se precisar: `npm run build`, `npm run start`, `npm run lint`, `npm test`, `npm run smoke`.

## Roteiro rápido para apresentar

### 1. Doar (`/`)

1. Mostre o logo **Lúmen**, os selos **Ambiente Seguro** e **Instituição Verificada**, e a campanha **Fundo de Amparo: Casa da Mulher**.
2. Escolha **R$ 10**, **R$ 50** ou **R$ 100**. Sem valor, o botão fica desligado.
3. Clique em **Entrar para Doar**.
4. No modal (Privy simulado), escolha e-mail, Google ou carteira.
5. Espere **Registrando na Solana...**.
6. Na tela **Muito Obrigado!**, clique em **Acompanhar destino do dinheiro**.

Se a pessoa já estiver “logada”, a doação segue direto, sem abrir o modal de novo.

### 2. Trilha pública (`/transparencia`)

1. Mostre **Total Arrecadado**, **Total Utilizado** e **Disponível On-Chain** — sempre em reais.
2. Na linha do tempo, a doação nova aparece no topo, com link para a Devnet.
3. Mostre uma saída **Cadeia fechada** (já tem nota fiscal).
4. Mostre uma saída **Pendente** (ainda falta o comprovante).

A tese do produto: entrada, uso e comprovante no mesmo lugar, em linguagem de reais.

### 3. Painel da instituição (`/instituicao`)

1. Clique em **Instituição**. Sem acesso, o site volta para a Home com **Acesso restrito**.
2. Clique em **Entrar como Casa da Mulher**.
3. Mostre o saldo em **reais** e o equivalente simulado em USDC, além do **Score de Transparência**.
4. **Saque para conta PJ:** um valor (ex.: 200). O saldo cai e a trilha ganha uma saída pendente.
5. **Pagar fornecedor:** escolha um homologado, descreva a despesa, informe a NF e o valor. A cadeia fecha na hora.
6. **Anexar recibo:** número e emitente da pendência, depois **Anexar e fechar cadeia**. O score sobe e a trilha pública atualiza.

Valor vazio ou acima do saldo é recusado na hora.

### 4. Fechar a história

Volte para `/transparencia` e mostre o ciclo: doação na Home, rastreio público e prestação de contas.

## Se quiser mostrar uma falha na rede

1. Em `.env.local`, coloque `NEXT_PUBLIC_MOCK_FORCE_ERROR=true`.
2. Reinicie o `npm run dev`.
3. Tente doar, abrir a trilha ou registrar uma saída.

O login continua. A parte da Solana mostra erro e o botão **Tentar novamente**. Apague a flag e reinicie para voltar ao normal.

## Páginas

- `/` — campanha e doação
- `/transparencia` — trilha pública (qualquer pessoa pode ver)
- `/instituicao` — painel da Casa da Mulher (só com acesso institucional)

Detalhes técnicos das APIs: [API.md](./API.md). Relatório de auditoria e smoke: [AUDITORIA.md](./AUDITORIA.md).

Para o teste HTTP automático, com o site já rodando (`npm run start` na porta 3000):

```bash
npm run smoke
```

Se a porta for outra: `SMOKE_BASE=http://127.0.0.1:3010 npm run smoke`.

## Como o código está organizado (resumo)

A tela **não fala direto** com Solana nem com Privy. Tudo passa por “adaptadores”: a interface pede “doar” ou “entrar”, e o servidor registra.

- Login e sessão ficam no servidor (cookie seguro). Só a instituição abre `/instituicao`.
- Doações, saques, pagamentos e notas também ficam no servidor. Hoje isso é um arquivo local (`.data/ledger.json`); no futuro pode virar banco de dados sem mudar as telas.
- Recibos só abrem se a assinatura da URL for válida.
- Segredos (como `SESSION_SECRET`) ficam só no servidor. Copie `.env.example` para `.env.local` e não publique esse arquivo.
