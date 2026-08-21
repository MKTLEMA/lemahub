"use client";

import * as React from "react";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

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
  const [triggered, setTriggered] = React.useState(false);

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mime === "pdf" ? "Visualizar Anexo" : "Visualizar Arquivo"}</DialogTitle>
        </DialogHeader>

        <DialogFooter className="justify-between">
          {mime === "pdf" ? (
            <>
              <iframe
                src={blobUrl}
                style={{ width: "100%", height: "600px", border: "none" }}
                title="Anexo PDF"
              />
              <div className="mt-4 flex gap-2">
                <Button onClick={handleDownload} variant="outline">
                  Baixar
                </Button>
                <Button
                  onClick={() => window.open(blobUrl, "_blank", "noopener")}
                  variant="outline"
                >
                  Abrir em nova aba
                </Button>
              </div>
            </>
          ) : mime === "image" ? (
            <div>
              <img
                src={blobUrl}
                alt="Anexo"
                style={{
                  width: "100%",
                  maxWidth: "800px",
                  height: "auto",
                  border: "1px solid #e2e8f0",
                }}
              />
              <div className="mt-2 flex gap-2">
                <Button onClick={handleDownload} variant="outline">
                  Baixar
                </Button>
                <Button
                  onClick={() => window.open(blobUrl, "_blank", "noopener")}
                  variant="outline"
                >
                  Abrir em nova aba
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground">
                {mime === "other"
                  ? "Visualização não disponível neste tipo de arquivo"
                  : "Formato de arquivo não suportado para visualização inline"}
              </p>
              <div className="mt-2 flex gap-2">
                <Button onClick={handleDownload} variant="outline">
                  Baixar
                </Button>
                <Button
                  onClick={() => window.open(blobUrl, "_blank", "noopener")}
                  variant="outline"
                >
                  Abrir em nova aba
                </Button>
              </div>
            </div>
          )}
          <DialogClose asChild>
            <Button variant="ghost" size="sm">
              <X className="h-4 w-4" />
              <span className="sr-only">Fechar</span>
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
