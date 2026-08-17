import type { InvoiceEvidence } from "@/domain/types";
import { formatDatePtBr } from "@/lib/format";
import { parseSafeEvidenceUrl } from "@/lib/safe-url";

type InvoiceEvidenceCardProps = {
  invoice?: InvoiceEvidence;
};

export function InvoiceEvidenceCard({ invoice }: InvoiceEvidenceCardProps) {
  if (!invoice) {
    return (
      <div className="rounded-xl border border-dashed border-pending bg-pending-bg/60 p-4">
        <p className="text-sm font-semibold text-pending">
          Nota fiscal pendente
        </p>
        <p className="mt-1 text-sm text-muted">
          A instituição ainda não anexou o comprovante desta saída. O valor já
          saiu da carteira, mas a cadeia de evidência permanece aberta.
        </p>
      </div>
    );
  }

  const documentHref = parseSafeEvidenceUrl(invoice.documentUrl);

  return (
    <div className="rounded-xl border border-closed/20 bg-closed-bg/70 p-4">
      <p className="text-sm font-semibold text-closed">Nota Fiscal Vinculada</p>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">Número</dt>
          <dd className="font-medium text-foreground">{invoice.number}</dd>
        </div>
        <div>
          <dt className="text-muted">Emissão</dt>
          <dd className="font-medium text-foreground">
            {formatDatePtBr(invoice.issuedAt)}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted">Emitente</dt>
          <dd className="font-medium break-words text-foreground">{invoice.issuer}</dd>
        </div>
      </dl>
      {documentHref.ok ? (
        <a
          href={documentHref.value}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex text-sm font-medium text-closed underline-offset-2 hover:underline"
        >
          Abrir comprovante verificável
        </a>
      ) : (
        <p className="mt-3 text-sm text-muted">Comprovante indisponível.</p>
      )}
    </div>
  );
}
