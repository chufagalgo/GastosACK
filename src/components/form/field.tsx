import { Label } from "@/components/ui/label";

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}

export function Field({ label, htmlFor, hint, error, children }: FieldProps) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

/** Interruptor con texto, pensado para formularios con server actions (envía "on"). */
export function SwitchRow({
  name,
  label,
  hint,
  defaultChecked,
  checked,
  onCheckedChange,
  disabled,
  children,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onCheckedChange?: (v: boolean) => void;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-2">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
        {children}
      </span>
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        checked={checked}
        onChange={onCheckedChange ? (e) => onCheckedChange(e.target.checked) : undefined}
        disabled={disabled}
        role="switch"
        className="peer relative h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-input transition-colors before:absolute before:top-0.5 before:left-0.5 before:size-5 before:rounded-full before:bg-background before:shadow before:transition-transform checked:bg-primary checked:before:translate-x-5 disabled:opacity-50"
      />
    </label>
  );
}
