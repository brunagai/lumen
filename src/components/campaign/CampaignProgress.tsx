type CampaignProgressProps = {
  raisedCents: number;
  goalCents: number;
};

export function CampaignProgress({
  raisedCents,
  goalCents,
}: CampaignProgressProps) {
  const percent =
    goalCents <= 0 ? 0 : Math.min(100, Math.round((raisedCents / goalCents) * 100));

  return (
    <div>
      <div
        role="progressbar"
        aria-label="Progresso da arrecadação"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-3 overflow-hidden rounded-full bg-background"
      >
        <div
          className="h-full rounded-full bg-teal transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2 text-sm text-muted">{percent}% da meta alcançada</p>
    </div>
  );
}
