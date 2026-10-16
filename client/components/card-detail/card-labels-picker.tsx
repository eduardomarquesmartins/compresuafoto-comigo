"use client";

import React, { useState } from "react";
import { useKonti } from "@/features/kanban/use-konti";
import { CardWithDetails, Label } from "@/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_LABEL_PALETTES } from "@/lib/constants";
import { Tag, Check, Plus } from "lucide-react";

interface CardLabelsPickerProps {
  card: CardWithDetails;
}

export function CardLabelsPicker({ card }: CardLabelsPickerProps) {
  const { allLabels, toggleCardLabel, createCustomLabel } = useKonti();
  const [isCreating, setIsCreating] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [selectedColor, setSelectedColor] = useState(DEFAULT_LABEL_PALETTES[0].color);

  const isAssigned = (labelId: string) =>
    card.labels?.some((lbl) => lbl.id === labelId);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newLabelName.trim()) {
      const created = createCustomLabel(newLabelName.trim(), selectedColor);
      toggleCardLabel(card.id, created);
      setNewLabelName("");
      setIsCreating(false);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="subtle"
          size="sm"
          className="w-full justify-start text-xs font-normal h-8"
        >
          <Tag className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
          <span>Etiquetas</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3 space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Etiquetas
        </h4>

        {/* Existing labels list */}
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {allLabels.map((label) => {
            const assigned = isAssigned(label.id);
            return (
              <button
                key={label.id}
                onClick={() => toggleCardLabel(card.id, label)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-semibold text-white transition-opacity hover:opacity-90 shadow-xs"
                style={{ backgroundColor: label.color }}
              >
                <span>{label.name}</span>
                {assigned && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>

        {/* Create new label */}
        {isCreating ? (
          <form onSubmit={handleCreate} className="space-y-2 pt-2 border-t">
            <Input
              autoFocus
              placeholder="Nome da etiqueta..."
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              className="h-7 text-xs"
            />
            <div className="flex flex-wrap gap-1">
              {DEFAULT_LABEL_PALETTES.map((pal) => (
                <button
                  type="button"
                  key={pal.color}
                  onClick={() => setSelectedColor(pal.color)}
                  className={`h-5 w-5 rounded-full transition-transform ${
                    selectedColor === pal.color
                      ? "ring-2 ring-primary scale-110"
                      : "opacity-80 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: pal.color }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Button type="submit" size="sm" className="h-7 text-xs">
                Criar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setIsCreating(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreating(true)}
            className="w-full h-7 text-xs text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3 w-3 mr-1" />
            Nova etiqueta
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
