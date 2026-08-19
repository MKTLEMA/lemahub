import { cn } from "@/lib/utils";

const COLORS = [
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-green-100 text-green-700 border-green-200",
  "bg-purple-100 text-purple-700 border-purple-200",
  "bg-orange-100 text-orange-700 border-orange-200",
  "bg-pink-100 text-pink-700 border-pink-200",
  "bg-teal-100 text-teal-700 border-teal-200",
  "bg-indigo-100 text-indigo-700 border-indigo-200",
  "bg-amber-100 text-amber-700 border-amber-200",
];

function hashValue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function ColorTag({ value, className }: { value?: string; className?: string }) {
  if (!value) return null;
  const color = COLORS[hashValue(value) % COLORS.length]!;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        color,
        className,
      )}
    >
      {value}
    </span>
  );
}
