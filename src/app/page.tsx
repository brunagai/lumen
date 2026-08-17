import { DonationCard } from "@/components/donation/DonationCard";
import { InstitutionSignInCard } from "@/components/institution/InstitutionSignInCard";

type SearchValue = string | string[] | undefined;

function readParam(value: SearchValue): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();

  return trimmed ? trimmed : undefined;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    acesso?: SearchValue;
    motivo?: SearchValue;
  }>;
}) {
  const params = await searchParams;
  const showInstitutionAccess = readParam(params.acesso) === "instituicao";

  return (
    <div className="flex flex-col gap-6">
      {showInstitutionAccess ? (
        <InstitutionSignInCard motivo={readParam(params.motivo)} />
      ) : null}
      <DonationCard />
    </div>
  );
}
