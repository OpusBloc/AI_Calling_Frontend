import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Eye, Trash2 } from "lucide-react";
import clsx from "clsx";

type ActionIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  className?: string;
};

const baseClass =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-0 bg-transparent p-1 shadow-none transition-[color,transform] duration-150 motion-safe:hover:scale-105 hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40 [&>svg]:h-[18px] [&>svg]:w-[18px]";

export function DeleteIconButton({ className, ...props }: ActionIconButtonProps) {
  return (
    <button
      {...props}
      type="button"
      title="Delete"
      aria-label="Delete"
      className={clsx(baseClass, "text-[var(--icon-danger)] hover:text-[var(--icon-danger-hover)]", className)}
    >
      <Trash2 size={18} aria-hidden="true" />
    </button>
  );
}

export function ViewIconButton({
  className,
  icon,
  ...props
}: ActionIconButtonProps & { icon?: ReactNode }) {
  return (
    <button
      {...props}
      type="button"
      title="View"
      aria-label="View"
      className={clsx(baseClass, "text-[var(--icon-primary)] hover:text-[var(--icon-primary-hover)]", className)}
    >
      {icon ?? <Eye size={18} aria-hidden="true" />}
    </button>
  );
}
