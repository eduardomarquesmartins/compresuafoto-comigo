"use client";

import React, { useState } from "react";
import { useKonti } from "@/features/kanban/use-konti";
import { Button } from "@/components/ui/button";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Flag } from "lucide-react";
import { PRIORITY_CONFIG } from "@/lib/constants";

export function BoardCalendarView() {
  const { currentBoard, lists, setActiveCardId } = useKonti();
  const [currentDate, setCurrentDate] = useState(new Date());

  if (!currentBoard) return null;

  const activeCards = lists
    .filter((l) => l.board_id === currentBoard.id && !l.is_archived)
    .flatMap((l) => l.cards.filter((c) => !c.is_archived && c.due_date));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const dateFormat = "MMMM yyyy";
  const days = [];
  let day = startDate;

  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="h-full overflow-y-auto p-6 max-w-7xl mx-auto space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-border/80 bg-card/85 backdrop-blur-xl shadow-md">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold text-foreground capitalize">
            {format(currentDate, dateFormat, { locale: ptBR })}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
            className="text-xs h-8"
          >
            Hoje
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border/80 bg-card/85 backdrop-blur-xl shadow-xl overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border/60 bg-muted/30 text-center py-2 text-xs font-semibold text-muted-foreground">
          {weekDays.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border/40 min-h-[550px]">
          {days.map((dItem, index) => {
            const isCurrentMonth = isSameMonth(dItem, monthStart);
            const isTodayDate = isSameDay(dItem, new Date());
            const dayCards = activeCards.filter((c) =>
              c.due_date ? isSameDay(new Date(c.due_date), dItem) : false
            );
            return (
              <div
                key={index}
                className={`p-2 flex flex-col justify-between transition-colors min-h-[90px] ${
                  !isCurrentMonth ? "bg-muted/10 opacity-40" : "bg-card/40 hover:bg-muted/20"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-mono rounded-full h-5 w-5 flex items-center justify-center ${
                      isTodayDate
                        ? "bg-primary text-primary-foreground font-bold shadow-xs"
                        : "text-muted-foreground"
                    }`}
                  >
                    {format(dItem, "d")}
                  </span>
                </div>

                <div className="space-y-1 overflow-y-auto max-h-[80px]">
                  {dayCards.map((c) => {
                    const priority =
                      c.priority && c.priority !== "none"
                        ? PRIORITY_CONFIG[c.priority]
                        : null;

                    return (
                      <div
                        key={c.id}
                        onClick={() => setActiveCardId(c.id)}
                        className={`text-[11px] p-1.5 rounded border border-border/60 font-medium truncate cursor-pointer shadow-xs transition-transform hover:scale-[1.02] flex items-center gap-1.5 ${
                          c.is_completed
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 line-through"
                            : "bg-muted/60 text-foreground hover:border-primary/50"
                        }`}
                      >
                        {priority && <Flag className={`h-2.5 w-2.5 ${priority.iconColor} shrink-0`} />}
                        <span className="truncate">{c.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
