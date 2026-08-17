import { formatBrlFromCents } from "@/lib/money";
import { formatDatePtBr } from "@/lib/format";

type SearchValue = string | string[] | undefined;

function readParam(value: SearchValue, maxLength: number): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").trim().slice(0, maxLength);
}

export default async function ReciboPage({
  searchParams,
}: {
  searchParams: Promise<{
    numero?: SearchValue;
    emitente?: SearchValue;
    valor?: SearchValue;
    data?: SearchValue;
  }>;
}) {
  const params = await searchParams;
  const numero = readParam(params.numero, 40) || "Sem número";
  const emitente = readParam(params.emitente, 80) || "Emitente não informado";
  const valorRaw = Number(readParam(params.valor, 12));
  const valor = Number.isFinite(valorRaw) && valorRaw > 0
    ? formatBrlFromCents(valorRaw)
    : "Valor não informado";
  const data = readParam(params.data, 40);
  const dataLabel = data ? formatDatePtBr(data) : "Data não informada";

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <p className="text-sm text-muted">Comprovante verificável · Lúmen.</p>
      <h1 className="mt-2 text-2xl font-semibold text-teal">
        Recibo / Nota Fiscal
      </h1>
      <dl className="mt-6 grid gap-4 rounded-2xl border border-border bg-surface p-6">
        <div>
          <dt className="text-sm text-muted">Número</dt>
          <dd className="font-medium">{numero}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Emitente</dt>
          <dd className="font-medium">{emitente}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Valor</dt>
          <dd className="font-medium">{valor}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Emissão</dt>
          <dd className="font-medium">{dataLabel}</dd>
        </div>
      </dl>
    </main>
  );
}
