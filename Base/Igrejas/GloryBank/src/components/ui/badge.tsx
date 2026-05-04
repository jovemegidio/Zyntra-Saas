interface BadgeProps {
  children: React.ReactNode;
  variant?: "success" | "warning" | "error" | "info" | "default";
  size?: "sm" | "md";
}

const variants = {
  success: "bg-green-500/10 text-green-400 ring-1 ring-green-500/20",
  warning: "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20",
  error: "bg-red-500/10 text-red-400 ring-1 ring-red-500/20",
  info: "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20",
  default: "bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20",
};

const sizes = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-1 text-xs",
};

export function Badge({
  children,
  variant = "default",
  size = "sm",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${variants[variant]} ${sizes[size]}`}
    >
      {children}
    </span>
  );
}
