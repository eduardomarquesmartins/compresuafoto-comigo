"use client";

import React, { useState } from "react";
import { useKonti } from "@/features/kanban/use-konti";
import { CardWithDetails, ChecklistWithItems } from "@/types";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckSquare, Plus, Trash2, ArrowUpRight } from "lucide-react";
import confetti from "canvas-confetti";

interface CardChecklistsProps {
  card: CardWithDetails;
}

export function CardChecklists({ card }: CardChecklistsProps) {
  const {
    deleteChecklist,
    createChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
    convertChecklistItemToCard,
    updateChecklistItem,
    workspaceMembers,
  } = useKonti();

  const [addingItemId, setAddingItemId] = useState<string | null>(null);
  const [newItemTitle, setNewItemTitle] = useState("");

  const handleAddItem = (checklistId: string) => {
    if (newItemTitle.trim()) {
      createChecklistItem(checklistId, newItemTitle.trim());
      setNewItemTitle("");
    }
  };

  const handleToggleItem = (
    checklist: ChecklistWithItems,
    itemId: string,
    currentStatus: boolean
  ) => {
    toggleChecklistItem(checklist.id, itemId);

    // If this checklist is now 100% completed, trigger confetti!
    const uncompletedCount = checklist.items.filter(
      (it) => !it.is_completed && it.id !== itemId
    ).length;

    if (!currentStatus && uncompletedCount === 0 && checklist.items.length > 0) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch (e) {
        // Safe fallback if canvas-confetti is not rendered
      }
    }
  };

  if (!card.checklists || card.checklists.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {card.checklists.map((checklist) => {
        const total = checklist.items?.length || 0;
        const completed =
          checklist.items?.filter((it) => it.is_completed).length || 0;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

        return (
          <div key={checklist.id} className="space-y-3">
            {/* Checklist Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold text-foreground">
                  {checklist.title}
                </h4>
              </div>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => deleteChecklist(card.id, checklist.id)}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                Excluir
              </Button>
            </div>

            {/* Progress */}
            {total > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-muted-foreground w-8">
                  {percent}%
                </span>
                <Progress value={percent} className="h-2 flex-1" />
              </div>
            )}

            {/* Items List */}
            <div className="space-y-1.5 pl-1">
              {checklist.items?.map((item) => (
                <div
                  key={item.id}
                  className="group rounded-md p-1.5 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <Checkbox
                        checked={item.is_completed}
                        onCheckedChange={() =>
                          handleToggleItem(checklist, item.id, item.is_completed)
                        }
                      />
                      <span
                        className={`text-sm break-words ${
                          item.is_completed
                            ? "line-through text-muted-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {item.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        convertChecklistItemToCard(
                          card.id,
                          checklist.id,
                          item.id
                        )
                      }
                      className="h-6 w-6 text-muted-foreground hover:text-primary"
                      title="Converter em novo card"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteChecklistItem(checklist.id, item.id)}
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      title="Excluir item"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                    </div>
                  </div>
                  <details className="ml-7 mt-1 text-[11px] text-muted-foreground">
                    <summary className="w-fit cursor-pointer select-none hover:text-foreground">
                      {[item.assigned_to && workspaceMembers.find((member) => member.user_id === item.assigned_to)?.profile.full_name, item.due_date && new Date(item.due_date).toLocaleDateString("pt-BR")].filter(Boolean).join(" · ") || "Definir responsável ou prazo"}
                    </summary>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <select
                        aria-label={`Responsável por ${item.title}`}
                        value={item.assigned_to || ""}
                        onChange={(event) => updateChecklistItem(checklist.id, item.id, { assigned_to: event.target.value || null })}
                        className="h-7 max-w-[190px] rounded-md border border-border bg-background px-2 text-[11px] text-muted-foreground"
                      >
                        <option value="">Sem responsável</option>
                        {workspaceMembers.map((member) => (
                          <option key={member.user_id} value={member.user_id}>
                            {member.profile.full_name || member.profile.username}
                          </option>
                        ))}
                      </select>
                      <input
                        type="date"
                        aria-label={`Prazo de ${item.title}`}
                        value={item.due_date ? item.due_date.slice(0, 10) : ""}
                        onChange={(event) => updateChecklistItem(checklist.id, item.id, { due_date: event.target.value || null })}
                        className="h-7 rounded-md border border-border bg-background px-2 text-[11px] text-muted-foreground"
                      />
                    </div>
                  </details>
                </div>
              ))}
            </div>

            {/* Add item */}
            {addingItemId === checklist.id ? (
              <div className="space-y-2 pt-1 pl-1">
                <Input
                  autoFocus
                  placeholder="Adicionar um item..."
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddItem(checklist.id);
                    if (e.key === "Escape") {
                      setAddingItemId(null);
                      setNewItemTitle("");
                    }
                  }}
                  className="h-8 text-xs"
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleAddItem(checklist.id)}
                  >
                    Adicionar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setAddingItemId(null);
                      setNewItemTitle("");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAddingItemId(checklist.id)}
                className="text-xs text-muted-foreground hover:text-foreground h-7 pl-1"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Adicionar um item
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
