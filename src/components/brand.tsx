import { cn } from "@/lib/utils";

export function BrandLogo({
  collapsed = false,
  tone = "themed",
  className,
}: {
  collapsed?: boolean;
  tone?: "themed" | "white";
  className?: string;
}) {
  if (collapsed) {
    return <BrandSymbol tone={tone} {...(className !== undefined ? { className } : {})} />;
  }

  if (tone === "white") {
    return (
      <img
        src="/logo-branca.png"
        alt="LEMA"
        className={cn("h-7 w-auto", className)}
        draggable={false}
      />
    );
  }

  return (
    <>
      <img
        src="/logo.png"
        alt="LEMA"
        className={cn("h-7 w-auto dark:hidden", className)}
        draggable={false}
      />
      <img
        src="/logo-branca.png"
        alt="LEMA"
        className={cn("hidden h-7 w-auto dark:block", className)}
        draggable={false}
      />
    </>
  );
}

export function BrandSymbol({
  tone = "themed",
  className,
}: {
  tone?: "themed" | "white";
  className?: string;
}) {
  if (tone === "white") {
    return (
      <img
        src="/simbolo-branca.png"
        alt="LEMA"
        className={cn("h-6 w-auto", className)}
        draggable={false}
      />
    );
  }

  return (
    <>
      <img
        src="/simbolo.png"
        alt="LEMA"
        className={cn("h-6 w-auto dark:hidden", className)}
        draggable={false}
      />
      <img
        src="/simbolo-branca.png"
        alt="LEMA"
        className={cn("hidden h-6 w-auto dark:block", className)}
        draggable={false}
      />
    </>
  );
}
