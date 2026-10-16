"use client";

import React from "react";
import { useKonti } from "@/features/kanban/use-konti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Filter, X, Search, Check, Flag, Calendar, Tag, User } from "lucide-react";
import { PRIORITY_CONFIG } from "@/lib/constants";
import { CardPriority } from "@/types";
import { getInitials } from "@/lib/utils";

export function BoardFilters() {
  const {
    filterState,
    setFilterState,
    resetFilters,
    workspaceMembers,
    allLabels,
  } = useKonti();

  const activeFiltersCount =
    (filterState.searchQuery ? 1 : 0) +
    filterState.memberIds.length +
    filterState.labelIds.length +
    filterState.priorities.length +
    (filterState.dueFilter !== "all" ? 1 : 0);

  const toggleMember = (id: string) => {
    setFilterState((prev) => ({
      ...prev,
      memberIds: prev.memberIds.includes(id)
        ? prev.memberIds.filter((m) => m !== id)
        : [...prev.memberIds, id],
    }));
  };

  const toggleLabel = (id: string) => {
    setFilterState((prev) => ({
      ...prev,
      labelIds: prev.labelIds.includes(id)
        ? prev.labelIds.filter((l) => l !== id)
        : [...prev.labelIds, id],
    }));
  };

  const togglePriority = (p: CardPriority) => {
    setFilterState((prev) => ({
      ...prev,
      priorities: prev.priorities.includes(p)
        ? prev.priorities.filter((item) => item !== p)
        : [...prev.priorities, p],
    }));
  };

  return (
    <div className="flex items-center gap-2">
      {/* Quick Search */}
      <div className="relative w-40 md:w-56">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar no quadro..."
          value={filterState.searchQuery}
          onChange={(e) =>
            setFilterState((prev) => ({ ...prev, searchQuery: e.target.value }))
          }
          className="h-8 pl-8 text-xs bg-background/50 backdrop-blur-sm"
        />
        {filterState.searchQuery && (
          <button
            onClick={() =>
              setFilterState((prev) => ({ ...prev, searchQuery: "" }))
            }
            className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Filter Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={activeFiltersCount > 0 ? "default" : "outline"}
            size="sm"
            className="h-8 gap-1.5 text-xs bg-background/50 backdrop-blur-sm"
          >
            <Filter className="h-3.5 w-3.5" />
            <span>Filtros</span>
            {activeFiltersCount > 0 && (
              <Badge
                variant="secondary"
                className="h-4 px-1 text-[10px] ml-1 bg-background text-foreground"
              >
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-4 space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h4 className="font-semibold text-sm">Filtros do Quadro</h4>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="xs"
                onClick={resetFilters}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Limpar tudo
              </Button>
            )}
          </div>

          {/* Members */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> Responsáveis
            </label>
            <div className="flex flex-wrap gap-1.5">
              {workspaceMembers.map((m) => {
                const isSelected = filterState.memberIds.includes(m.profile.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => toggleMember(m.profile.id)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/40 hover:bg-muted text-foreground border-border/50"
                    }`}
                  >
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={m.profile.avatar_url || undefined} />
                      <AvatarFallback className="text-[8px]">
                        {getInitials(m.profile.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{m.profile.full_name?.split(" ")[0]}</span>
                    {isSelected && <Check className="h-3 w-3" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Labels */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" /> Etiquetas
            </label>
            <div className="flex flex-wrap gap-1.5">
              {allLabels.map((lbl) => {
                const isSelected = filterState.labelIds.includes(lbl.id);
                return (
                  <button
                    key={lbl.id}
                    onClick={() => toggleLabel(lbl.id)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border transition-colors ${
                      isSelected
                        ? "ring-2 ring-primary text-white"
                        : "opacity-80 hover:opacity-100 text-white"
                    }`}
                    style={{ backgroundColor: lbl.color }}
                  >
                    <span>{lbl.name}</span>
                    {isSelected && <Check className="h-3 w-3" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priorities */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Flag className="h-3.5 w-3.5" /> Prioridade
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(["urgent", "high", "medium", "low"] as CardPriority[]).map(
                (p) => {
                  const cfg = PRIORITY_CONFIG[p];
                  const isSelected = filterState.priorities.includes(p);
                  return (
                    <button
                      key={p}
                      onClick={() => togglePriority(p)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition-colors ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/40 hover:bg-muted text-foreground border-border/50"
                      }`}
                    >
                      <Flag className={`h-3 w-3 ${cfg.iconColor}`} />
                      <span>{cfg.label}</span>
                      {isSelected && <Check className="h-3 w-3" />}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Due date filter */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Prazo
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: "all", label: "Todos" },
                { id: "due_today", label: "Vence hoje" },
                { id: "due_week", label: "Esta semana" },
                { id: "overdue", label: "Atrasadas" },
                { id: "completed", label: "Concluídas" },
                { id: "no_due", label: "Sem prazo" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() =>
                    setFilterState((prev) => ({
                      ...prev,
                      dueFilter: item.id as any,
                    }))
                  }
                  className={`text-left px-2 py-1 rounded-md text-xs border transition-colors ${
                    filterState.dueFilter === item.id
                      ? "bg-primary text-primary-foreground border-primary font-medium"
                      : "bg-muted/30 hover:bg-muted text-foreground border-border/40"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
