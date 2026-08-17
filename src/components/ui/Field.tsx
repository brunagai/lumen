import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

type FieldProps = {
  label: string;
  children: ReactNode;
};

export function Field({ label, children }: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

const controlClassName =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:cursor-not-allowed disabled:opacity-60";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={controlClassName} {...props} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={controlClassName} {...props} />;
}
