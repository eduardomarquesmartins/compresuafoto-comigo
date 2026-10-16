"use client";

import React, { useState, useMemo } from "react";
import { useKonti } from "@/features/kanban/use-konti";
import { CardWithDetails } from "@/types";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PRIORITY_CONFIG } from "@/lib/constants";
import { getInitials } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Flag,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  differenceInCalendarDays,
  addDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";

export function BoardTimelineView() {
  const { currentBoard, lists, setActiveCardId } = useKonti();
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const boardLists = useMemo(() => {
    return lists
      .filter((l) => l.board_id === currentBoard?.id && !l.is_archived)
      .sort((a, b) => a.position - b.position);
  }, [lists, currentBoard?.id]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = useMemo(
    () => eachDayOfInterval({ start: monthStart, end: monthEnd }),
    [monthStart, monthEnd]
  );

  const totalDays = daysInMonth.length;
  const dayColumnWidth = 44; // pixels per day

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] bg-background/50 backdrop-blur-sm rounded-xl border border-border/70 overflow-hidden shadow-xl m-4">
      {/* Timeline Controls Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border/50 bg-card/60">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-primary">
            <CalendarIcon className="h-5 w-5" />
            <h2 className="text-base font-bold capitalize text-foreground">
              {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
            </h2>
          </div>

          <Button
            variant="outline"
            size="xs"
            onClick={() => setCurrentMonth(new Date())}
            className="text-xs h-7 ml-2"
          >
            Hoje
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Gantt Grid Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Fixed Column: List & Card Names */}
        <div className="w-64 md:w-80 shrink-0 border-r border-border/60 bg-card/40 overflow-y-auto flex flex-col z-10">
          <div className="h-12 border-b border-border/50 px-4 flex items-center font-semibold text-xs text-muted-foreground uppercase tracking-wider bg-card/80 sticky top-0 z-10">
            Listas & Cards
          </div>

          <div className="flex-1 divide-y divide-border/30">
            {boardLists.map((list) => (
              <div key={list.id} className="py-2">
                {/* List Header */}
                <div className="px-4 py-1.5 flex items-center justify-between text-xs font-bold text-primary uppercase tracking-wider">
                  <span className="truncate">{list.title}</span>
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full">
                    {list.cards.filter((c) => !c.is_archived).length}
                  </span>
                </div>

                {/* Cards under list */}
                <div className="space-y-1 mt-1">
                  {list.cards
                    .filter((c) => !c.is_archived)
                    .map((card) => (
                      <div
                        key={card.id}
                        onClick={() => setActiveCardId(card.id)}
                        className="h-10 px-4 flex items-center gap-2 hover:bg-muted/30 cursor-pointer transition-colors text-xs text-foreground group"
                      >
                        <div
                          className={`h-2 w-2 rounded-full shrink-0 ${
                            card.is_completed ? "bg-emerald-500" : "bg-primary"
                          }`}
                        />
                        <span className="truncate font-medium group-hover:text-primary transition-colors">
                          {card.title}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Scrollable Timeline Days & Bars */}
        <div className="flex-1 overflow-x-auto overflow-y-auto relative bg-background/30">
          <div
            style={{ width: `${totalDays * dayColumnWidth}px` }}
            className="min-w-full"
          >
            {/* Days Header */}
            <div className="h-12 border-b border-border/50 flex sticky top-0 bg-card/90 backdrop-blur-md z-10">
              {daysInMonth.map((day, idx) => {
                const isCurrentDay = isToday(day);
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                return (
                  <div
                    key={idx}
                    style={{ width: `${dayColumnWidth}px` }}
                    className={`shrink-0 flex flex-col items-center justify-center border-r border-border/40 text-[11px] font-medium transition-colors ${
                      isCurrentDay
                        ? "bg-primary/15 text-primary font-bold"
                        : isWeekend
                        ? "bg-muted/20 text-muted-foreground/70"
                        : "text-muted-foreground"
                    }`}
                  >
                    <span className="text-[9px] uppercase">
                      {format(day, "EEE", { locale: ptBR }).substring(0, 1)}
                    </span>
                    <span>{format(day, "d")}</span>
                  </div>
                );
              })}
            </div>

            {/* Grid Rows for each list and card */}
            <div className="divide-y divide-border/30">
              {boardLists.map((list) => (
                <div key={list.id} className="py-2">
                  {/* Empty list row height matching left column */}
                  <div className="h-7 border-b border-transparent" />

                  {/* Card Timeline Bars */}
                  <div className="space-y-1 mt-1">
                    {list.cards
                      .filter((c) => !c.is_archived)
                      .map((card) => {
                        // Calculate start and end position in this month
                        const cardDue = card.due_date
                          ? new Date(card.due_date)
                          : addDays(monthStart, 5);
                        const cardStart = card.start_date
                          ? new Date(card.start_date)
                          : addDays(cardDue, -3);

                        // Clamp within current month
                        const clampedStart =
                          cardStart < monthStart ? monthStart : cardStart;
                        const clampedEnd =
                          cardDue > monthEnd ? monthEnd : cardDue;

                        const startDayIndex = differenceInCalendarDays(
                          clampedStart,
                          monthStart
                        );
                        const durationDays = Math.max(
                          1,
                          differenceInCalendarDays(clampedEnd, clampedStart) + 1
                        );

                        const leftPos = Math.max(0, startDayIndex * dayColumnWidth);
                        const barWidth = Math.max(
                          dayColumnWidth,
                          durationDays * dayColumnWidth - 6
                        );

                        const priority =
                          card.priority && card.priority !== "none"
                            ? PRIORITY_CONFIG[card.priority]
                            : null;

                        return (
                          <div
                            key={card.id}
                            className="h-10 relative flex items-center"
                          >
                            {/* Day background grid lines */}
                            <div className="absolute inset-0 flex pointer-events-none">
                              {daysInMonth.map((d, dIdx) => (
                                <div
                                  key={dIdx}
                                  style={{ width: `${dayColumnWidth}px` }}
                                  className={`shrink-0 border-r border-border/20 h-full ${
                                    isToday(d) ? "bg-primary/5" : ""
                                  }`}
                                />
                              ))}
                            </div>

                            {/* Gantt Bar */}
                            <div
                              onClick={() => setActiveCardId(card.id)}
                              style={{
                                left: `${leftPos}px`,
                                width: `${barWidth}px`,
                              }}
                              className={`absolute h-7 rounded-md px-2.5 flex items-center justify-between gap-1.5 cursor-pointer shadow-sm hover:shadow-md transition-all group z-10 border ${
                                card.is_completed
                                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                                  : "bg-primary/20 border-primary/40 text-primary-foreground hover:bg-primary/30"
                              }`}
                              title={`${card.title} (${format(
                                cardStart,
                                "dd/MM"
                              )} - ${format(cardDue, "dd/MM")})`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                {card.is_completed ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                ) : (
                                  <Clock className="h-3 w-3 text-primary shrink-0" />
                                )}
                                <span className="text-xs font-semibold truncate text-foreground">
                                  {card.title}
                                </span>
                              </div>

                              {card.members && card.members.length > 0 && (
                                <div className="flex -space-x-1 shrink-0">
                                  {card.members.slice(0, 2).map((m) => (
                                    <Avatar key={m.id} className="h-4 w-4 border border-background">
                                      <AvatarImage src={m.avatar_url || undefined} />
                                      <AvatarFallback className="text-[7px]">
                                        {getInitials(m.full_name)}
                                      </AvatarFallback>
                                    </Avatar>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
