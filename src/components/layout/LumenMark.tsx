import Image from "next/image";

type LumenMarkProps = {
  className?: string;
};

export function LumenMark({ className = "h-14 w-auto" }: LumenMarkProps) {
  return (
    <Image
      src="/brand/lumen-logo.png"
      alt="Lúmen"
      width={280}
      height={320}
      priority
      className={className}
    />
  );
}
