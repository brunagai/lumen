export default function TransparenciaPage() {
  return (
    <section className="flex flex-col gap-6">
      <p className="text-sm font-medium uppercase tracking-widest text-gold">
        Etapa 1 — fundação
      </p>
      <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-teal">
          Trilha de Transparência
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Visão pública das movimentações da campanha. Total arrecadado,
          utilizado e disponível on-chain, além da linha do tempo com entradas
          na Solana e saídas com notas fiscais, entram na próxima etapa.
        </p>
      </div>
    </section>
  );
}
