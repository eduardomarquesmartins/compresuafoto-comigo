"use client";

import React, { useState } from "react";
import { useKonti } from "@/features/kanban/use-konti";
import { CardWithDetails } from "@/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Trash2, Clock, Bell } from "lucide-react";
import { format } from "date-fns";

interface CardDatesPickerProps {
  card: CardWithDetails;
}

export function CardDatesPicker({ card }: CardDatesPickerProps) {
  const { updateCard } = useKonti();

  const [startDate, setStartDate] = useState(
    card.start_date ? format(new Date(card.start_date), "yyyy-MM-dd") : ""
  );
  const [dueDate, setDueDate] = useState(
    card.due_date ? format(new Date(card.due_date), "yyyy-MM-dd") : ""
  );
  const [dueTime, setDueTime] = useState(card.due_time || "18:00");
  const [isOpen, setIsOpen] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateCard(card.id, {
      start_date: startDate ? new Date(`${startDate}T09:00:00`).toISOString() : null,
      due_date: dueDate ? new Date(`${dueDate}T${dueTime || "18:00"}:00`).toISOString() : null,
      due_time: dueDate ? dueTime : null,
    });
    setIsOpen(false);
  };

  const handleRemove = () => {
    updateCard(card.id, {
      due_date: null,
      due_time: null,
      start_date: null,
    });
    setStartDate("");
    setDueDate("");
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="subtle"
          size="sm"
          className="w-full justify-start text-xs font-normal h-8"
        >
          <Calendar className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
          <span>Datas & Prazos</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3.5 space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Período & Entrega
        </h4>
        <form onSubmit={handleSave} className="space-y-3">
          {/* Start Date */}
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Data de Início
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          {/* Due Date */}
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Data de Entrega
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-8 text-xs col-span-2"
              />
              <Input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="h-8 text-xs col-span-1"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <Button type="submit" size="sm" className="h-7 text-xs font-medium">
              Salvar Datas
            </Button>
            {(card.due_date || card.start_date) && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="h-7 text-xs px-2"
                onClick={handleRemove}
                title="Remover datas"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

