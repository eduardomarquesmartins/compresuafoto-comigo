"use client";

import React, { useMemo } from "react";
import { useKonti } from "@/features/kanban/use-konti";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PRIORITY_CONFIG } from "@/lib/constants";
import { getInitials } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, isPast, isToday, isThisWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Flag, CheckSquare, MessageSquare, ChevronDown } from "lucide-react";

export function BoardTableView() {
  const {
    currentBoard,
    lists,
    setActiveCardId,
    toggleCardCompleted,
    moveCard,
    filterState,
  } = useKonti();

  const boardLists = useMemo(() => {
    if (!currentBoard) return [];
    return lists
      .filter((l) => l.board_id === currentBoard.id && !l.is_archived)
      .sort((a, b) => a.position - b.position);
  }, [lists, currentBoard?.id]);

  // Flatten active cards with their list information
  const allCards = useMemo(() => {
    if (!currentBoard) return [];
    return lists
      .filter((l) => l.board_id === currentBoard.id && !l.is_archived)
      .flatMap((l) =>
        l.cards
          .filter((c) => !c.is_archived)
          .map((c) => ({ ...c, listName: l.title, listId: l.id }))
      )
      .filter((card) => {
        // Search query
        if (filterState.searchQuery.trim()) {
          const q = filterState.searchQuery.toLowerCase();
          const matchTitle = card.title.toLowerCase().includes(q);
          const matchDesc = (card.description || "").toLowerCase().includes(q);
          const matchLabel = card.labels?.some((lbl) =>
            lbl.name.toLowerCase().includes(q)
          );
          if (!matchTitle && !matchDesc && !matchLabel) return false;
        }

        // Member filter
        if (filterState.memberIds.length > 0) {
          if (!card.members?.some((m) => filterState.memberIds.includes(m.id)))
            return false;
        }

        // Label filter
        if (filterState.labelIds.length > 0) {
          if (!card.labels?.some((lbl) => filterState.labelIds.includes(lbl.id)))
            return false;
        }

        // Priority filter
        if (filterState.priorities.length > 0) {
          if (!filterState.priorities.includes(card.priority)) return false;
        }

        // Due filter
        if (filterState.dueFilter !== "all") {
          if (filterState.dueFilter === "no_due" && card.due_date) return false;
          if (filterState.dueFilter === "completed" && !card.is_completed)
            return false;

          if (card.due_date) {
            const d = new Date(card.due_date);
            if (
              filterState.dueFilter === "overdue" &&
              (!isPast(d) || isToday(d) || card.is_completed)
            )
              return false;
            if (filterState.dueFilter === "due_today" && !isToday(d)) return false;
            if (filterState.dueFilter === "due_week" && !isThisWeek(d))
              return false;
          } else if (filterState.dueFilter !== "no_due") {
            return false;
          }
        }

        return true;
      });
  }, [lists, currentBoard?.id, filterState]);

  if (!currentBoard) return null;

  return (
    <div className="h-full overflow-y-auto p-6 max-w-7xl mx-auto">
      <div className="rounded-xl border border-border/80 bg-card/85 backdrop-blur-xl shadow-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border/60 bg-muted/30 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <th className="py-3 px-4 w-10"></th>
              <th className="py-3 px-4 min-w-[240px]">Título da Tarefa</th>
              <th className="py-3 px-4 min-w-[140px]">Lista / Status</th>
              <th className="py-3 px-4 min-w-[120px]">Responsáveis</th>
              <th className="py-3 px-4 min-w-[120px]">Prazo</th>
              <th className="py-3 px-4 min-w-[100px]">Prioridade</th>
              <th className="py-3 px-4 min-w-[120px]">Etiquetas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 text-xs">
            {allCards.length > 0 ? (
              allCards.map((card) => {
                const priority =
                  card.priority && card.priority !== "none"
                    ? PRIORITY_CONFIG[card.priority]
                    : null;

                const totalChk =
                  card.checklists?.reduce(
                    (acc, chk) => acc + (chk.items?.length || 0),
                    0
                  ) || 0;
                const completedChk =
                  card.checklists?.reduce(
                    (acc, chk) =>
                      acc +
                      (chk.items?.filter((it) => it.is_completed).length || 0),
                    0
                  ) || 0;

                return (
                  <tr
                    key={card.id}
                    onClick={() => setActiveCardId(card.id)}
                    className="hover:bg-muted/30 transition-colors cursor-pointer group"
                  >
                    <td
                      className="py-3 px-4 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={card.is_completed}
                        onCheckedChange={() => toggleCardCompleted(card.id)}
                      />
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {card.cover_color && (
                          <div
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: card.cover_color }}
                          />
                        )}
                        <span
                          className={`font-medium leading-snug ${
                            card.is_completed
                              ? "line-through text-muted-foreground"
                              : "text-foreground"
                          }`}
                        >
                          {card.title}
                        </span>
                        {totalChk > 0 && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 ml-2 font-mono">
                            <CheckSquare className="h-3 w-3" />
                            {completedChk}/{totalChk}
                          </span>
                        )}
                      </div>
                    </td>

                    <td
                      className="py-3 px-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="px-2 py-0.5 rounded-md bg-muted/60 hover:bg-muted text-foreground font-medium text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer">
                            <span>{card.listName}</span>
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-44 text-xs">
                          {boardLists.map((l) => (
                            <DropdownMenuItem
                              key={l.id}
                              disabled={l.id === card.listId}
                              onClick={() => moveCard(card.id, l.id)}
                              className={l.id === card.listId ? "font-bold bg-accent" : ""}
                            >
                              {l.title}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>

                    <td className="py-3 px-4">
                      {card.members && card.members.length > 0 ? (
                        <div className="flex -space-x-1.5 overflow-hidden">
                          {card.members.map((m) => (
                            <Avatar
                              key={m.id}
                              className="h-6 w-6 border-2 border-background ring-1 ring-border/50"
                              title={m.full_name || ""}
                            >
                              <AvatarImage
                                src={m.avatar_url || undefined}
                              />
                              <AvatarFallback className="text-[9px]">
                                {getInitials(m.full_name)}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {card.due_date ? (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(card.due_date), "d MMM", {
                            locale: ptBR,
                          })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {priority ? (
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded border ${priority.badgeColor}`}
                        >
                          <Flag className="h-2.5 w-2.5" />
                          {priority.label}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {card.labels && card.labels.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {card.labels.map((lbl) => (
                            <span
                              key={lbl.id}
                              className="text-[9px] font-semibold px-1.5 py-0.2 rounded text-white"
                              style={{ backgroundColor: lbl.color }}
                            >
                              {lbl.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="py-12 text-center text-xs text-muted-foreground"
                >
                  Nenhum card encontrado correspondente aos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
