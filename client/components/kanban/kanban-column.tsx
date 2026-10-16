"use client";

import React, { useState, useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ListWithCards, CardWithDetails } from "@/types";
import { useKonti } from "@/features/kanban/use-konti";
import { KanbanCard } from "./kanban-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Plus,
  MoreHorizontal,
  Copy,
  Archive,
  Trash2,
  GripVertical,
  ArrowRightLeft,
  ArrowUpDown,
  Calendar,
  Flag,
  Type,
  Gauge,
  Minimize2,
  Maximize2,
  LayoutTemplate,
  AlertTriangle,
} from "lucide-react";
import { isPast, isToday, isThisWeek } from "date-fns";

interface KanbanColumnProps {
  list: ListWithCards;
}

export function KanbanColumn({ list }: KanbanColumnProps) {
  const {
    currentBoard,
    lists,
    updateList,
    duplicateList,
    archiveList,
    deleteList,
    createCard,
    filterState,
    moveAllCardsInList,
    archiveAllCardsInList,
    sortListCards,
    setListLimit,
    toggleListCollapse,
    createCardFromTemplate,
  } = useKonti();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(list.title);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [isEditingLimit, setIsEditingLimit] = useState(false);
  const [limitValue, setLimitValue] = useState(list.card_limit?.toString() || "");

  const otherLists = useMemo(
    () =>
      lists.filter(
        (l) =>
          l.board_id === currentBoard?.id && !l.is_archived && l.id !== list.id
      ),
    [lists, currentBoard?.id, list.id]
  );

  // Available card templates on the current board
  const boardCardTemplates = useMemo(() => {
    const allBoardCards = lists
      .filter((l) => l.board_id === currentBoard?.id)
      .flatMap((l) => l.cards);
    return allBoardCards.filter((c) => c.is_template && !c.is_archived);
  }, [lists, currentBoard?.id]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: list.id,
    data: {
      type: "List",
      list,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Filter cards based on filterState
  const filteredCards = useMemo(() => {
    return (list.cards || []).filter((card) => {
      if (card.is_archived) return false;

      // 1. Search Query
      if (filterState.searchQuery.trim()) {
        const query = filterState.searchQuery.toLowerCase();
        const matchesTitle = card.title.toLowerCase().includes(query);
        const matchesDesc = (card.description || "").toLowerCase().includes(query);
        const matchesLabel = card.labels?.some((l) =>
          l.name.toLowerCase().includes(query)
        );
        if (!matchesTitle && !matchesDesc && !matchesLabel) return false;
      }

      // 2. Member filter
      if (filterState.memberIds.length > 0) {
        const hasMember = card.members?.some((m) =>
          filterState.memberIds.includes(m.id)
        );
        if (!hasMember) return false;
      }

      // 3. Label filter
      if (filterState.labelIds.length > 0) {
        const hasLabel = card.labels?.some((l) =>
          filterState.labelIds.includes(l.id)
        );
        if (!hasLabel) return false;
      }

      // 4. Priority filter
      if (filterState.priorities.length > 0) {
        if (!filterState.priorities.includes(card.priority)) return false;
      }

      // 5. Due date filter
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
  }, [list.cards, filterState]);

  const cardIds = useMemo(() => filteredCards.map((c) => c.id), [filteredCards]);
  const isOverLimit = list.card_limit && filteredCards.length > list.card_limit;

  const handleSaveTitle = () => {
    if (titleValue.trim() && titleValue !== list.title) {
      updateList(list.id, titleValue.trim());
    } else {
      setTitleValue(list.title);
    }
    setIsEditingTitle(false);
  };

  const handleSaveLimit = () => {
    const parsed = parseInt(limitValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setListLimit(list.id, parsed);
    } else {
      setListLimit(list.id, null);
      setLimitValue("");
    }
    setIsEditingLimit(false);
  };

  const handleCreateCard = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (newCardTitle.trim()) {
      createCard(list.id, newCardTitle.trim());
      setNewCardTitle("");
    }
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="w-[300px] shrink-0 opacity-40 border-2 border-dashed border-primary/50 bg-background/50 rounded-xl min-h-[500px]"
      />
    );
  }

  // Collapsed Column View
  if (list.is_collapsed) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        onClick={() => toggleListCollapse(list.id)}
        className="flex flex-col items-center justify-between w-12 shrink-0 rounded-xl bg-card/85 backdrop-blur-md border border-border/80 shadow-md py-4 hover:border-primary/50 cursor-pointer transition-all duration-200 select-none max-h-[calc(100vh-140px)]"
        title="Clique para expandir lista"
      >
        <div className="flex flex-col items-center gap-2">
          <Maximize2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-[11px] font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
            {filteredCards.length}
          </span>
        </div>

        <div className="writing-vertical-rl transform rotate-180 text-xs font-bold uppercase tracking-wider text-foreground truncate max-h-[300px]">
          {list.title}
        </div>

        <div className="h-4" />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-col w-[300px] shrink-0 rounded-xl bg-card/85 backdrop-blur-md border shadow-lg max-h-[calc(100vh-140px)] select-none transition-colors ${
        isOverLimit
          ? "border-rose-500/80 ring-1 ring-rose-500/40"
          : "border-border/80"
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/50">
        <div className="flex items-center gap-1.5 flex-1 mr-2 min-w-0">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="text-muted-foreground/50 hover:text-foreground cursor-grab active:cursor-grabbing p-0.5 rounded transition-colors shrink-0"
            title="Arrastar lista"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {isEditingTitle ? (
            <Input
              autoFocus
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveTitle();
                if (e.key === "Escape") {
                  setTitleValue(list.title);
                  setIsEditingTitle(false);
                }
              }}
              className="h-7 text-xs font-semibold uppercase tracking-wider py-0 px-1.5 bg-background"
            />
          ) : (
            <h3
              onClick={() => setIsEditingTitle(true)}
              className="text-xs font-semibold uppercase tracking-wider text-foreground hover:text-primary transition-colors cursor-pointer truncate max-w-[150px]"
              title="Clique para renomear"
            >
              {list.title}
            </h3>
          )}

          {/* WIP Limit / Cards Count Badge */}
          <span
            className={`text-[11px] font-mono px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${
              isOverLimit
                ? "bg-rose-500/20 text-rose-400 font-bold border border-rose-500/40"
                : list.card_limit
                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                : "text-muted-foreground bg-muted/60"
            }`}
            title={
              list.card_limit
                ? `Limite WIP: ${filteredCards.length} de ${list.card_limit}`
                : `${filteredCards.length} cards`
            }
          >
            {isOverLimit && <AlertTriangle className="h-3 w-3 text-rose-400" />}
            <span>
              {filteredCards.length}
              {list.card_limit ? `/${list.card_limit}` : ""}
            </span>
          </span>
        </div>

        {/* List Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => setIsEditingTitle(true)}>
              Renomear lista
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => toggleListCollapse(list.id)}>
              <Minimize2 className="h-4 w-4 mr-2" />
              Recolher lista
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => setIsEditingLimit(true)}>
              <Gauge className="h-4 w-4 mr-2 text-primary" />
              Definir limite de cards (WIP)
            </DropdownMenuItem>

            {/* Templates submenu */}
            {boardCardTemplates.length > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <LayoutTemplate className="h-4 w-4 mr-2 text-indigo-400" />
                  Criar a partir de modelo...
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-48">
                  {boardCardTemplates.map((tpl) => (
                    <DropdownMenuItem
                      key={tpl.id}
                      onClick={() => createCardFromTemplate(list.id, tpl)}
                    >
                      {tpl.title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}

            <DropdownMenuItem onClick={() => duplicateList(list.id)}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicar lista
            </DropdownMenuItem>

            {/* Sort Submenu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ArrowUpDown className="h-4 w-4 mr-2" />
                Ordenar por...
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-44">
                <DropdownMenuItem onClick={() => sortListCards(list.id, "dueDate")}>
                  <Calendar className="h-3.5 w-3.5 mr-2" />
                  Data de entrega
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => sortListCards(list.id, "priority")}>
                  <Flag className="h-3.5 w-3.5 mr-2" />
                  Prioridade
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => sortListCards(list.id, "title")}>
                  <Type className="h-3.5 w-3.5 mr-2" />
                  Ordem alfabética
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {/* Move all cards */}
            {otherLists.length > 0 && list.cards.length > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Mover todos os cards
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-48">
                  {otherLists.map((target) => (
                    <DropdownMenuItem
                      key={target.id}
                      onClick={() => moveAllCardsInList(list.id, target.id)}
                    >
                      Para: {target.title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}

            {list.cards.length > 0 && (
              <DropdownMenuItem onClick={() => archiveAllCardsInList(list.id)}>
                <Archive className="h-4 w-4 mr-2" />
                Arquivar todos os cards
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => archiveList(list.id)}>
              <Archive className="h-4 w-4 mr-2 text-amber-500" />
              Arquivar lista
            </DropdownMenuItem>
            <DropdownMenuItem
              destructive
              onClick={() => deleteList(list.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir lista
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Inline Limit Edit Box */}
      {isEditingLimit && (
        <div className="p-2.5 bg-muted/30 border-b border-border/50 space-y-2">
          <label className="text-[11px] font-semibold text-muted-foreground block">
            Limite máximo de cards (WIP)
          </label>
          <div className="flex items-center gap-1.5">
            <Input
              autoFocus
              type="number"
              min="1"
              placeholder="Sem limite"
              value={limitValue}
              onChange={(e) => setLimitValue(e.target.value)}
              className="h-7 text-xs"
            />
            <Button size="sm" onClick={handleSaveLimit} className="h-7 text-xs px-2">
              Salvar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditingLimit(false)}
              className="h-7 text-xs px-2"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Cards Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-2 min-h-[60px]">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {filteredCards.map((card) => (
            <KanbanCard key={card.id} card={card} />
          ))}
        </SortableContext>

        {filteredCards.length === 0 && !isAddingCard && (
          <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-muted-foreground border border-dashed border-border/40 rounded-lg">
            <span>Nenhum card aqui</span>
          </div>
        )}
      </div>

      {/* Column Footer: Quick Add Card */}
      <div className="p-2 border-t border-border/40">
        {isAddingCard ? (
          <form onSubmit={handleCreateCard} className="space-y-2">
            <textarea
              autoFocus
              placeholder="Digite o título do card..."
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleCreateCard();
                }
                if (e.key === "Escape") {
                  setIsAddingCard(false);
                  setNewCardTitle("");
                }
              }}
              className="w-full min-h-[64px] rounded-md border border-input bg-background p-2 text-sm shadow-inner placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" className="h-7 text-xs font-medium">
                Adicionar Card
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setIsAddingCard(false);
                  setNewCardTitle("");
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAddingCard(true)}
            className="w-full justify-start text-xs text-muted-foreground hover:text-foreground h-8"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Adicionar card
          </Button>
        )}
      </div>
    </div>
  );
}
