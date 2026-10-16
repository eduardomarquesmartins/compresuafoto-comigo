"use client";

import React, { useRef, useState } from "react";
import { useKonti } from "@/features/kanban/use-konti";
import { CardWithDetails, Attachment } from "@/types";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { toast } from "sonner";
import { formatBytes } from "@/lib/utils";
import {
  Paperclip,
  FileText,
  Image as ImageIcon,
  FileArchive,
  Download,
  Trash2,
  Upload,
  Layout,
} from "lucide-react";

interface CardAttachmentsProps {
  card: CardWithDetails;
}

export function CardAttachments({ card }: CardAttachmentsProps) {
  const { currentUser, addAttachment, deleteAttachment, updateCard } = useKonti();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const attachments: Attachment[] = card.attachments || [];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("O arquivo deve ter no máximo 20 MB.");
      e.target.value = "";
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post("/konti/attachments", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
      });
      const newAtt: Attachment = {
        id: `att-${Date.now()}`,
        card_id: card.id,
        user_id: currentUser.id,
        file_name: data.fileName,
        file_size: data.fileSize,
        file_type: data.fileType,
        storage_path: data.publicId,
        url: data.url,
        created_at: new Date().toISOString(),
      };
      addAttachment(card.id, newAtt);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Não foi possível enviar o anexo. Confira a conexão e a configuração de armazenamento.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteAttachment = async (attachment: Attachment) => {
    if (attachment.storage_path?.startsWith("konti/attachments/")) {
      try {
        await api.delete("/konti/attachments", { data: { publicId: attachment.storage_path, fileType: attachment.file_type } });
      } catch (error: any) {
        toast.error(error?.response?.data?.error || "Não foi possível remover o arquivo do armazenamento.");
        return;
      }
    }
    const updated = attachments.filter((a) => a.id !== attachment.id);
    updateCard(card.id, {
      attachments: updated,
      attachments_count: updated.length,
    });
    deleteAttachment(attachment.id);
  };

  const handleToggleCover = (url: string) => {
    if (card.cover_url === url) {
      updateCard(card.id, { cover_url: null });
    } else {
      updateCard(card.id, { cover_url: url, cover_color: null });
    }
  };

  const getIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="h-5 w-5 text-sky-400" />;
    if (type.includes("pdf")) return <FileText className="h-5 w-5 text-rose-400" />;
    if (type.includes("zip") || type.includes("rar")) return <FileArchive className="h-5 w-5 text-amber-400" />;
    return <FileText className="h-5 w-5 text-primary" />;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold text-foreground">
            Anexos ({attachments.length})
          </h4>
        </div>
        <Button
          variant="outline"
          size="xs"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="text-xs"
        >
          <Upload className="h-3 w-3 mr-1" />
          {isUploading ? "Enviando…" : "Anexar arquivo"}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Attachments List */}
      <div className="space-y-2">
        {attachments.length > 0 ? (
          attachments.map((att) => {
            const isImage = att.file_type.startsWith("image/");
            const isCurrentCover = card.cover_url === att.url;

            return (
              <div
                key={att.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-md bg-muted/60 flex items-center justify-center shrink-0 overflow-hidden">
                    {isImage ? (
                      <img
                        src={att.url}
                        alt={att.file_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getIcon(att.file_type)
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate max-w-[180px] sm:max-w-[260px]">
                      {att.file_name}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {formatBytes(att.file_size)} • Anexado recentemente
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {isImage && (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => handleToggleCover(att.url)}
                      className={`text-xs px-2 h-7 ${
                        isCurrentCover
                          ? "text-primary font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Layout className="h-3 w-3 mr-1" />
                      <span>{isCurrentCover ? "Capa ativa" : "Definir capa"}</span>
                    </Button>
                  )}

                  <a
                    href={att.url}
                    download={att.file_name}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
                    title="Baixar anexo"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => void handleDeleteAttachment(att)}
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    title="Excluir anexo"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-xs text-muted-foreground">
            Nenhum arquivo anexado a este card ainda.
          </p>
        )}
      </div>
    </div>
  );
}
