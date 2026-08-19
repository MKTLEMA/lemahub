import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type FieldSpec = {
  name: string;
  label: string;
  type: "text" | "date" | "number" | "boolean" | "email" | "select" | "list" | "image" | "file";
  options?: string[];
  /** Alternativa a options quando o valor salvo difere do rótulo exibido. */
  optionsKV?: { value: string; label: string }[];
  /** Campo só é exibido quando outro campo tiver o valor indicado. */
  visibleIf?: { field: string; equals: unknown };
};

export type FormValues = Record<string, string | number | boolean | string[]>;

export function iniciais(nome: string) {
  return (
    nome
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join("") || "?"
  );
}

/** Lê o arquivo como data URL base64 (sem compressão). Limite de 2MB. */
async function lerArquivo(file: File): Promise<string | null> {
  if (file.size > 2 * 1024 * 1024) return null;
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read"));
    reader.readAsDataURL(file);
  });
}

/** Comprime a imagem via canvas até ficar abaixo de ~150KB e devolve data URL. */
async function comprimirImagem(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read"));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("img"));
    el.src = dataUrl;
  });

  const MAX_BYTES = 150 * 1024;
  let lado = Math.min(512, Math.max(img.width, img.height));
  let out = dataUrl;

  for (let tentativa = 0; tentativa < 6; tentativa += 1) {
    const escala = lado / Math.max(img.width, img.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * escala);
    canvas.height = Math.round(img.height * escala);
    const ctx = canvas.getContext("2d");
    if (!ctx) break;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const quality = 0.8 - tentativa * 0.1;
    out = canvas.toDataURL("image/jpeg", Math.max(0.35, quality));
    if (out.length * 0.75 <= MAX_BYTES) return out;
    lado = Math.round(lado * 0.75);
  }
  return out;
}

export function EntityForm({
  open,
  onOpenChange,
  title,
  description,
  fields,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  fields: FieldSpec[];
  initial?: FormValues | undefined;
  onSubmit: (values: FormValues) => void;
}) {
  const empty = () =>
    Object.fromEntries(
      fields.map((f) => [
        f.name,
        f.type === "boolean" ? false : f.type === "number" ? 0 : f.type === "list" ? [] : "",
      ]),
    ) as FormValues;

  const [values, setValues] = useState<FormValues>(empty);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (open) setValues(initial ? { ...empty(), ...initial } : empty());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const set = (name: string, value: FormValues[string]) =>
    setValues((v) => ({ ...v, [name]: value }));

  const visiveis = fields.filter(
    (f) => !f.visibleIf || values[f.visibleIf.field] === f.visibleIf.equals,
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="font-display">{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>

        <form
          className="grid gap-4 px-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(values);
            onOpenChange(false);
          }}
        >
          {visiveis.map((f) => (
            <div key={f.name} className="grid gap-2">
              <Label htmlFor={f.name}>{f.label}</Label>
              {f.type === "boolean" ? (
                <Switch
                  id={f.name}
                  checked={Boolean(values[f.name])}
                  onCheckedChange={(c) => set(f.name, c)}
                />
              ) : f.type === "image" ? (
                <div className="flex items-center gap-3">
                  {values[f.name] ? (
                    <img
                      src={String(values[f.name])}
                      alt="Prévia da foto"
                      className="size-16 shrink-0 rounded-full border border-border object-cover"
                    />
                  ) : (
                    <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                      {iniciais(String(values["nome"] ?? ""))}
                    </span>
                  )}
                  <input
                    id={f.name}
                    ref={(el) => {
                      fileRefs.current[f.name] = el;
                    }}
                    type="file"
                    accept="image/*"
                    className="text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-secondary file:px-3 file:py-1.5 file:text-sm"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      set(f.name, await comprimirImagem(file));
                    }}
                  />
                  {values[f.name] ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        set(f.name, "");
                        const input = fileRefs.current[f.name];
                        if (input) input.value = "";
                      }}
                    >
                      Remover
                    </Button>
                  ) : null}
                </div>
              ) : f.type === "file" ? (
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    id={f.name}
                    ref={(el) => {
                      fileRefs.current[f.name] = el;
                    }}
                    type="file"
                    accept=".pdf,image/jpeg,image/png"
                    className="text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-secondary file:px-3 file:py-1.5 file:text-sm"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const url = await lerArquivo(file);
                      if (!url) {
                        toast.error("Arquivo acima de 2MB. Envie um arquivo menor.");
                        e.target.value = "";
                        return;
                      }
                      set(f.name, url);
                    }}
                  />
                  {values[f.name] ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const w = window.open();
                          if (w)
                            w.document.write(
                              `<iframe src="${String(values[f.name])}" style="border:0;width:100%;height:100%"></iframe>`,
                            );
                        }}
                      >
                        Ver arquivo
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          set(f.name, "");
                          const input = fileRefs.current[f.name];
                          if (input) input.value = "";
                        }}
                      >
                        Remover
                      </Button>
                    </>
                  ) : null}
                </div>
              ) : f.type === "select" ? (
                <Select
                  value={String(values[f.name] ?? "")}
                  onValueChange={(v) => set(f.name, v === "__none__" ? "" : v)}
                >
                  <SelectTrigger id={f.name}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {f.optionsKV
                      ? [{ value: "__none__", label: "Nenhum" }, ...f.optionsKV].map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))
                      : (f.options ?? []).map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              ) : f.type === "list" ? (
                <Input
                  id={f.name}
                  placeholder="Separe por vírgula"
                  value={(values[f.name] as string[])?.join(", ") ?? ""}
                  onChange={(e) =>
                    set(
                      f.name,
                      e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    )
                  }
                />
              ) : (
                <Input
                  id={f.name}
                  type={f.type === "number" ? "number" : f.type}
                  step={f.type === "number" ? "0.01" : undefined}
                  value={String(values[f.name] ?? "")}
                  onChange={(e) =>
                    set(f.name, f.type === "number" ? Number(e.target.value) : e.target.value)
                  }
                />
              )}
            </div>
          ))}

          <SheetFooter className="px-0">
            <Button type="submit">Salvar</Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
