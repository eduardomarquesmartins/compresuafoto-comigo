"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CardWithDetails } from "@/types";
import { useKonti } from "@/features/kanban/use-konti";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/utils";
import { PRIORITY_CONFIG } from "@/lib/constants";
import {
  CheckSquare,
  MessageSquare,
  Paperclip,
  Calendar,
  Flag,
  MoreHorizontal,
  ArrowRightLeft,
  Copy,
  Archive,
  Trash2,
  ThumbsUp,
  Eye,
  LayoutTemplate,
  Sliders,
} from "lucide-react";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface KanbanCardProps {
  card: CardWithDetails;
}

export function KanbanCard({ card }: KanbanCardProps) {
  const {
    currentUser,
    currentBoard,
    lists,
    customFields,
    setActiveCardId,
    toggleCardCompleted,
    moveCard,
    duplicateCard,
    archiveCard,
    deleteCard,
    toggleCardVote,
    toggleWatchCard,
    saveCardAsTemplate,
  } = useKonti();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: {
      type: "Card",
      card,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const priority = card.priority && card.priority !== "none" ? PRIORITY_CONFIG[card.priority] : null;

  const totalChecklistItems =
    card.checklists?.reduce((acc, chk) => acc + (chk.items?.length || 0), 0) || 0;
  const completedChecklistItems =
    card.checklists?.reduce(
      (acc, chk) => acc + (chk.items?.filter((it) => it.is_completed).length || 0),
      0
    ) || 0;

  const otherLists = React.useMemo(() => {
    return lists.filter(
      (l) =>
        l.board_id === currentBoard?.id &&
        !l.is_archived &&
        l.id !== card.list_id
    );
  }, [lists, currentBoard?.id, card.list_id]);

  // Visible Custom Fields on Card Front
  const visibleCustomFields = React.useMemo(() => {
    if (!card.custom_field_values) return [];
    return customFields
      .filter((f) => f.board_id === currentBoard?.id && f.show_on_card)
      .map((f) => ({
        field: f,
        value: card.custom_field_values?.[f.id],
      }))
      .filter((item) => item.value !== undefined && item.value !== null && item.value !== "");
  }, [customFields, currentBoard?.id, card.custom_field_values]);

  const votesCount = card.votes?.length || 0;
  const hasVoted = card.votes?.includes(currentUser.id);
  const isWatching = card.watchers?.includes(currentUser.id);

  // Due date calculation
  let dueStatusClass = "text-muted-foreground bg-muted/40 border-border/50";
  let dueText = "";

  if (card.due_date) {
    const d = new Date(card.due_date);
    dueText = format(d, "d 'de' MMM", { locale: ptBR });

    if (card.is_completed) {
      dueStatusClass = "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    } else if (isPast(d) && !isToday(d)) {
      dueStatusClass = "text-rose-400 bg-rose-500/15 border-rose-500/40 font-medium";
    } else if (isToday(d)) {
      dueStatusClass = "text-amber-400 bg-amber-500/15 border-amber-500/40 font-medium";
      dueText = "Hoje";
    } else if (isTomorrow(d)) {
      dueStatusClass = "text-sky-400 bg-sky-500/15 border-sky-500/40";
      dueText = "Amanhã";
    }
  }

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="opacity-30 border-2 border-dashed border-primary/60 bg-primary/10 rounded-lg h-[90px] mb-2"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => setActiveCardId(card.id)}
      className={`group relative flex flex-col rounded-lg border bg-card hover:bg-card/90 p-3 shadow-sm hover:shadow-md transition-all duration-150 cursor-pointer select-none mb-2 focus:outline-none overflow-hidden ${
        card.is_template
          ? "border-indigo-500/60 bg-indigo-950/10 hover:border-indigo-400"
          : "border-border/70 hover:border-primary/40"
      }`}
    >
      {/* Quick Action Menu Button */}
      <div
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded bg-card/80 hover:bg-card text-muted-foreground hover:text-foreground shadow-xs"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 text-xs">
            <DropdownMenuItem onClick={() => toggleCardVote(card.id)}>
              <ThumbsUp className="h-3.5 w-3.5 mr-2 text-primary" />
              {hasVoted ? "Remover voto" : "Votar no card"}
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => toggleWatchCard(card.id)}>
              <Eye className="h-3.5 w-3.5 mr-2 text-sky-400" />
              {isWatching ? "Deixar de seguir" : "Seguir card"}
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => saveCardAsTemplate(card.id)}>
              <LayoutTemplate className="h-3.5 w-3.5 mr-2 text-indigo-400" />
              {card.is_template ? "Remover modelo" : "Salvar como modelo"}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {otherLists.length > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ArrowRightLeft className="h-3.5 w-3.5 mr-2 text-primary" />
                  Mover para...
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-44">
                  {otherLists.map((target) => (
                    <DropdownMenuItem
                      key={target.id}
                      onClick={() => moveCard(card.id, target.id)}
                    >
                      {target.title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}

            <DropdownMenuItem onClick={() => duplicateCard(card.id)}>
              <Copy className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              Duplicar card
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => archiveCard(card.id)}>
              <Archive className="h-3.5 w-3.5 mr-2 text-amber-500" />
              Arquivar card
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              destructive
              onClick={() => deleteCard(card.id)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Excluir card
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Card Cover Image */}
      {card.cover_url && (
        <div
          className="h-20 -mx-3 -mt-3 mb-2.5 bg-cover bg-center rounded-t-md"
          style={{ backgroundImage: `url(${card.cover_url})` }}
        />
      )}

      {/* Card Cover Color */}
      {!card.cover_url && card.cover_color && (
        <div
          className="h-2 w-full rounded-sm mb-2"
          style={{ backgroundColor: card.cover_color }}
        />
      )}

      {/* Labels & Template Badge */}
      <div className="flex flex-wrap items-center gap-1 mb-2 pr-6">
        {card.is_template && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 uppercase tracking-wider flex items-center gap-1">
            <LayoutTemplate className="h-2.5 w-2.5" />
            <span>Modelo</span>
          </span>
        )}

        {card.labels && card.labels.length > 0 && (
          <>
            {card.labels.map((lbl) => (
              <span
                key={lbl.id}
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white tracking-wide shadow-xs"
                style={{ backgroundColor: lbl.color }}
              >
                {lbl.name}
              </span>
            ))}
          </>
        )}
      </div>

      {/* Card Title & Quick Checkbox */}
      <div className="flex items-start gap-2 pr-4">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleCardCompleted(card.id);
          }}
          className="mt-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          <div
            className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${
              card.is_completed
                ? "bg-emerald-500 border-emerald-500 text-white"
                : "border-muted-foreground/40 hover:border-primary"
            }`}
          >
            {card.is_completed && <span className="text-[10px] font-bold">✓</span>}
          </div>
        </button>

        <h4
          className={`text-sm font-medium leading-snug break-words flex-1 ${
            card.is_completed ? "line-through text-muted-foreground" : "text-foreground"
          }`}
        >
          {card.title}
        </h4>
      </div>

      {/* Card Description snippet indicator */}
      {card.description && (
        <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {card.description}
        </p>
      )}

      {/* Custom Fields on Front */}
      {visibleCustomFields.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {visibleCustomFields.map(({ field, value }) => (
            <div
              key={field.id}
              className="text-[10px] bg-muted/40 border border-border/50 px-2 py-0.5 rounded-md flex items-center gap-1 text-foreground"
            >
              <span className="text-muted-foreground">{field.name}:</span>
              <span className="font-semibold">
                {field.type === "currency"
                  ? `R$ ${value}`
                  : field.type === "checkbox"
                  ? value
                    ? "Sim"
                    : "Não"
                  : String(value)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footer Badges */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-border/40 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Watching indicator */}
          {isWatching && (
            <span className="flex items-center text-sky-400" title="Você está seguindo este card">
              <Eye className="h-3.5 w-3.5" />
            </span>
          )}

          {/* Votes */}
          {votesCount > 0 && (
            <span
              className={`flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                hasVoted
                  ? "bg-primary/20 text-primary border-primary/40"
                  : "bg-muted/40 text-muted-foreground border-border/50"
              }`}
              title={`${votesCount} votos`}
            >
              <ThumbsUp className="h-3 w-3" />
              <span>{votesCount}</span>
            </span>
          )}

          {/* Priority */}
          {priority && (
            <span
              className={`flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded border ${priority.badgeColor}`}
              title={`Prioridade: ${priority.label}`}
            >
              <Flag className="h-3 w-3" />
              <span>{priority.label}</span>
            </span>
          )}

          {/* Due Date */}
          {card.due_date && (
            <span
              className={`flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border ${dueStatusClass}`}
              title={`Prazo: ${dueText}`}
            >
              <Calendar className="h-3 w-3" />
              <span>{dueText}</span>
            </span>
          )}

          {/* Checklist */}
          {totalChecklistItems > 0 && (
            <span
              className={`flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border ${
                completedChecklistItems === totalChecklistItems
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-muted/40 text-muted-foreground border-border/50"
              }`}
              title="Checklists"
            >
              <CheckSquare className="h-3 w-3" />
              <span>
                {completedChecklistItems}/{totalChecklistItems}
              </span>
            </span>
          )}

          {/* Comments count */}
          {(card.comments_count || 0) > 0 && (
            <span className="flex items-center gap-1 text-[11px]" title="Comentários">
              <MessageSquare className="h-3 w-3" />
              <span>{card.comments_count}</span>
            </span>
          )}

          {/* Attachments count */}
          {(card.attachments_count || 0) > 0 && (
            <span className="flex items-center gap-1 text-[11px]" title="Anexos">
              <Paperclip className="h-3 w-3" />
              <span>{card.attachments_count}</span>
            </span>
          )}
        </div>

        {/* Members */}
        {card.members && card.members.length > 0 && (
          <div className="flex -space-x-1.5 overflow-hidden ml-auto">
            {card.members.map((m) => (
              <Avatar key={m.id} className="h-5 w-5 border border-background ring-1 ring-border/50">
                <AvatarImage src={m.avatar_url || undefined} />
                <AvatarFallback className="text-[9px]">
                  {getInitials(m.full_name)}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

