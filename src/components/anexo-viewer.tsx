"use client";

import * as React from "react";
import { useEffect } from "react";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type MimeType = "pdf" | "image" | "other";

function detectMimeType(url: string): MimeType {
  if (!url) return "other";
  const lower = url.toLowerCase();
  if (lower.endsWith(".pdf") || url.includes("application/pdf")) return "pdf";
  if (
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".gif") ||
    lower.endsWith(".webp") ||
    url.includes("image/")
  )
    return "image";
  return "other";
}

export function AnexoViewer({ url }: { url: string | undefined | null }) {
  const [blobUrl, setBlobUrl] = React.useState<string | null>(null);
  const [mime, setMime] = React.useState<MimeType>("other");

  useEffect(() => {
    if (!url) return;

    if (url.startsWith("data:")) {
      const parts = url.split(",");
      const meta = parts[0];
      const b64 = parts[1];
      const mimeMatch = meta?.match(/data:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : "application/octet-stream";
      setMime(detectMimeType(url));

      if (b64) {
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

        const blob = new Blob([bytes], { type: mimeType as string });
        const objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);

        return () => {
          if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
          }
        };
      }
    } else {
      setMime("other");
      setBlobUrl(url);
    }
    return;
  }, [url]);

  if (!blobUrl || !url) return null;

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = url?.split("/").pop() ?? "anexo.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="cursor-pointer text-accent underline-offset-4 hover:underline">
          Ver
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{mime === "pdf" ? "Visualizar Anexo" : "Visualizar Arquivo"}</DialogTitle>
        </DialogHeader>

        {mime === "pdf" ? (
          <iframe src={blobUrl} className="h-[70vh] w-full rounded-md border" title="Anexo PDF" />
        ) : mime === "image" ? (
          <img src={blobUrl} alt="Anexo" className="max-h-[70vh] w-full object-contain" />
        ) : (
          <p className="text-sm text-muted-foreground">
            Formato de arquivo não suportado para visualização inline
          </p>
        )}

        <DialogFooter className="justify-end">
          <Button variant="outline" onClick={handleDownload}>
            Baixar
          </Button>
          <Button variant="outline" onClick={() => window.open(blobUrl, "_blank", "noopener")}>
            Abrir em nova aba
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
