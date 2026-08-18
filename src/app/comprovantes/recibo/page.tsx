import { formatDatePtBr } from "@/lib/format";
import { formatBrlFromCents } from "@/lib/money";
import {
  verifyReceiptSignature,
  type ReceiptFields,
} from "@/lib/receipt-signature";
import { tryGetSessionSecret } from "@/lib/session-secret";

type SearchValue = string | string[] | undefined;

function readParam(value: SearchValue, maxLength: number): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").trim().slice(0, maxLength);
}

function readReceiptFields(params: {
  numero?: SearchValue;
  emitente?: SearchValue;
  valor?: SearchValue;
  data?: SearchValue;
}): ReceiptFields | null {
  const number = readParam(params.numero, 40);
  const issuer = readParam(params.emitente, 80);
  const amountCents = Number(readParam(params.valor, 12));
  const issuedAt = readParam(params.data, 40);

  if (
    !number ||
    !issuer ||
    !issuedAt ||
    !Number.isInteger(amountCents) ||
    amountCents <= 0
  ) {
    return null;
  }

  return { number, issuer, amountCents, issuedAt };
}

export default async function ReciboPage({
  searchParams,
}: {
  searchParams: Promise<{
    numero?: SearchValue;
    emitente?: SearchValue;
    valor?: SearchValue;
    data?: SearchValue;
    sig?: SearchValue;
  }>;
}) {
  const params = await searchParams;
  const fields = readReceiptFields(params);
  const signature = readParam(params.sig, 128);
  const secret = tryGetSessionSecret();
  const isAuthentic = Boolean(
    fields &&
      secret &&
      verifyReceiptSignature(fields, signature, secret),
  );

  if (!isAuthentic || !fields) {
    return (
      <main className="mx-auto max-w-xl px-4 py-10">
        <p className="text-sm text-muted">Comprovante verificável · Lúmen.</p>
        <h1 className="mt-2 text-2xl font-semibold text-primary">
          Recibo inválido
        </h1>
        <p className="mt-3 text-muted" role="alert">
          Este comprovante não possui uma assinatura válida. Os dados da URL
          não foram aceitos.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <p className="text-sm text-muted">Comprovante verificável · Lúmen.</p>
      <h1 className="mt-2 text-2xl font-semibold text-primary">
        Recibo / Nota Fiscal
      </h1>
      <dl className="mt-6 grid gap-4 rounded-2xl border border-border bg-surface p-6">
        <div>
          <dt className="text-sm text-muted">Número</dt>
          <dd className="font-medium">{fields.number}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Emitente</dt>
          <dd className="font-medium">{fields.issuer}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Valor</dt>
          <dd className="font-medium">
            {formatBrlFromCents(fields.amountCents)}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Emissão</dt>
          <dd className="font-medium">{formatDatePtBr(fields.issuedAt)}</dd>
        </div>
      </dl>
    </main>
  );
}
