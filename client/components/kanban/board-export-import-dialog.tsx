"use client";

import React, { useRef, useState } from "react";
import { useKonti } from "@/features/kanban/use-konti";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Download,
  Upload,
  FileJson,
  FileSpreadsheet,
  Share2,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";

interface BoardExportImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BoardExportImportDialog({
  open,
  onOpenChange,
}: BoardExportImportDialogProps) {
  const { currentBoard, exportBoardToJson, exportBoardToCsv, importBoardFromJson } =
    useKonti();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!currentBoard) return null;

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/admin/konti` : "";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    toast.success("Link do quadro copiado para a área de transferência!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        importBoardFromJson(json);
        onOpenChange(false);
      } catch (err) {
        toast.error("O arquivo selecionado não é um JSON válido.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg space-y-4">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            <DialogTitle>Exportar, Importar & Compartilhar</DialogTitle>
          </div>
        </DialogHeader>

        {/* Section 1: Export Data */}
        <div className="space-y-2.5">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            Exportar Dados do Quadro
          </span>
          <div className="grid grid-cols-2 gap-2.5">
            <Button
              variant="outline"
              onClick={() => exportBoardToJson(currentBoard.id)}
              className="h-16 flex flex-col items-center justify-center gap-1 text-xs border-border/70 hover:bg-muted/40"
            >
              <FileJson className="h-5 w-5 text-amber-400" />
              <span>Exportar JSON (Backup)</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => exportBoardToCsv(currentBoard.id)}
              className="h-16 flex flex-col items-center justify-center gap-1 text-xs border-border/70 hover:bg-muted/40"
            >
              <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
              <span>Exportar CSV (Excel)</span>
            </Button>
          </div>
        </div>

        {/* Section 2: Import Data */}
        <div className="space-y-2.5 pt-2 border-t border-border/40">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            Importar Quadro
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="subtle"
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-10 text-xs gap-2 font-medium"
          >
            <Upload className="h-4 w-4" />
            <span>Selecionar arquivo de Backup (.json)</span>
          </Button>
        </div>

        {/* Section 3: Share & Embed */}
        <div className="space-y-3 pt-2 border-t border-border/40">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            Acesso da equipe
          </span>

          {/* Share Link */}
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground flex items-center gap-1">
              Link do KONTI (requer acesso administrativo)
            </label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={shareUrl}
                className="h-8 text-xs bg-muted/20 text-muted-foreground font-mono"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="h-8 text-xs shrink-0 gap-1"
              >
                {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedLink ? "Copiado!" : "Copiar"}</span>
              </Button>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
