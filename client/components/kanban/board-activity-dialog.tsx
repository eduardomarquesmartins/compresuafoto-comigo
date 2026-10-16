"use client";

import React from "react";
import { useKonti } from "@/features/kanban/use-konti";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { Activity, Clock, Layers, MessageSquare, CheckCircle, Tag, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BoardActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BoardActivityDialog({
  open,
  onOpenChange,
}: BoardActivityDialogProps) {
  const { currentBoard, activities } = useKonti();

  if (!currentBoard) return null;

  const boardActivities = activities.filter(
    (act) => act.board_id === currentBoard.id || !act.board_id
  );

  const getActionLabel = (act: (typeof activities)[0]) => {
    switch (act.action_type) {
      case "CARD_CREATED":
        return `criou o card "${(act.metadata as any)?.title || "Novo Card"}"`;
      case "CARD_COMPLETED":
        return `concluiu o card "${(act.metadata as any)?.title || "Card"}"`;
      case "COMMENT_ADDED":
        return `comentou: "${(act.metadata as any)?.preview || "..."}"`;
      case "CHECKLIST_CREATED":
        return `adicionou o checklist "${(act.metadata as any)?.title || ""}"`;
      case "MEMBER_ASSIGNED":
        return `adicionou ${(act.metadata as any)?.memberName || "um membro"} como responsável`;
      case "LIST_CREATED":
        return `criou a lista "${(act.metadata as any)?.title || ""}"`;
      case "BOARD_CREATED":
        return `criou o quadro "${(act.metadata as any)?.title || ""}"`;
      case "ATTACHMENT_ADDED":
        return `anexou o arquivo "${(act.metadata as any)?.fileName || ""}"`;
      default:
        return "realizou uma alteração no quadro";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Histórico de Atividades do Quadro
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 pt-3 space-y-3 divide-y divide-border/30">
          {boardActivities.length > 0 ? (
            boardActivities.map((act) => (
              <div key={act.id} className="flex items-start gap-3 pt-3 first:pt-0">
                <Avatar className="h-7 w-7 mt-0.5 ring-1 ring-border/50 shrink-0">
                  <AvatarImage src={act.user.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(act.user.full_name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="text-xs text-foreground leading-snug">
                    <strong className="font-semibold text-foreground">
                      {act.user.full_name}
                    </strong>{" "}
                    <span className="text-muted-foreground">{getActionLabel(act)}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground/80 flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {format(new Date(act.created_at), "d 'de' MMMM 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Nenhuma atividade registrada recentemente.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
