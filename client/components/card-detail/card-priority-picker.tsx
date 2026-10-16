"use client";

import React from "react";
import { useKonti } from "@/features/kanban/use-konti";
import { CardWithDetails, CardPriority } from "@/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { PRIORITY_CONFIG } from "@/lib/constants";
import { Flag, Check } from "lucide-react";

interface CardPriorityPickerProps {
  card: CardWithDetails;
}

export function CardPriorityPicker({ card }: CardPriorityPickerProps) {
  const { updateCard } = useKonti();

  const handleSelect = (priority: CardPriority) => {
    updateCard(card.id, { priority });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="subtle"
          size="sm"
          className="w-full justify-start text-xs font-normal h-8"
        >
          <Flag className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
          <span>Prioridade</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2 space-y-1">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
          Nível de Prioridade
        </h4>
        {(["urgent", "high", "medium", "low", "none"] as CardPriority[]).map(
          (p) => {
            const cfg = PRIORITY_CONFIG[p];
            const isSelected = (card.priority || "none") === p;
            return (
              <button
                key={p}
                onClick={() => handleSelect(p)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                  isSelected
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Flag className={`h-3.5 w-3.5 ${cfg.iconColor}`} />
                  <span>{cfg.label}</span>
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            );
          }
        )}
      </PopoverContent>
    </Popover>
  );
}
