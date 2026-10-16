"use client";

import React, { useMemo } from "react";
import { useKonti } from "@/features/kanban/use-konti";
import { PRIORITY_CONFIG } from "@/lib/constants";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  Users,
  Flag,
  TrendingUp,
  BarChart3,
  Calendar,
  CheckSquare,
} from "lucide-react";
import { isPast, isToday, isThisWeek } from "date-fns";

export function BoardDashboardView() {
  const { currentBoard, lists, workspaceMembers } = useKonti();

  const boardLists = useMemo(() => {
    return lists.filter((l) => l.board_id === currentBoard?.id && !l.is_archived);
  }, [lists, currentBoard?.id]);

  const allCards = useMemo(() => {
    return boardLists.flatMap((l) => l.cards.filter((c) => !c.is_archived));
  }, [boardLists]);

  const totalCards = allCards.length;
  const completedCards = allCards.filter((c) => c.is_completed).length;
  const completionRate = totalCards > 0 ? Math.round((completedCards / totalCards) * 100) : 0;

  const overdueCards = allCards.filter((c) => {
    if (!c.due_date || c.is_completed) return false;
    const d = new Date(c.due_date);
    return isPast(d) && !isToday(d);
  }).length;

  const dueTodayCards = allCards.filter((c) => {
    if (!c.due_date || c.is_completed) return false;
    return isToday(new Date(c.due_date));
  }).length;

  const dueThisWeekCards = allCards.filter((c) => {
    if (!c.due_date || c.is_completed) return false;
    return isThisWeek(new Date(c.due_date)) && !isToday(new Date(c.due_date));
  }).length;

  // Priority counts
  const priorityCounts = useMemo(() => {
    const counts = { urgent: 0, high: 0, medium: 0, low: 0, none: 0 };
    allCards.forEach((c) => {
      const p = c.priority || "none";
      if (p in counts) counts[p as keyof typeof counts]++;
      else counts.none++;
    });
    return counts;
  }, [allCards]);

  // Checklists summary
  const checklistStats = useMemo(() => {
    let totalItems = 0;
    let completedItems = 0;
    allCards.forEach((c) => {
      (c.checklists || []).forEach((chk) => {
        totalItems += chk.items?.length || 0;
        completedItems += chk.items?.filter((it) => it.is_completed).length || 0;
      });
    });
    const percent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    return { totalItems, completedItems, percent };
  }, [allCards]);

  // Member workload
  const memberStats = useMemo(() => {
    return workspaceMembers.map((m) => {
      const assigned = allCards.filter((c) => c.members?.some((u) => u.id === m.profile.id));
      const completed = assigned.filter((c) => c.is_completed).length;
      return {
        profile: m.profile,
        total: assigned.length,
        completed,
        percent: assigned.length > 0 ? Math.round((completed / assigned.length) * 100) : 0,
      };
    }).sort((a, b) => b.total - a.total);
  }, [workspaceMembers, allCards]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-h-[calc(100vh-130px)]">
      {/* Top Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cards */}
        <div className="p-4 rounded-xl bg-card/85 backdrop-blur-md border border-border/70 shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total de Cards
            </span>
            <div className="text-2xl font-black text-foreground">{totalCards}</div>
            <p className="text-[11px] text-muted-foreground">Em {boardLists.length} listas ativas</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center text-primary">
            <Layers className="h-6 w-6" />
          </div>
        </div>

        {/* Completion Rate */}
        <div className="p-4 rounded-xl bg-card/85 backdrop-blur-md border border-border/70 shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Taxa de Conclusão
            </span>
            <div className="text-2xl font-black text-emerald-400">{completionRate}%</div>
            <p className="text-[11px] text-muted-foreground">{completedCards} de {totalCards} concluídos</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>

        {/* Overdue */}
        <div className="p-4 rounded-xl bg-card/85 backdrop-blur-md border border-border/70 shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Cards Atrasados
            </span>
            <div className={`text-2xl font-black ${overdueCards > 0 ? "text-rose-400" : "text-foreground"}`}>
              {overdueCards}
            </div>
            <p className="text-[11px] text-muted-foreground">Requer atenção imediata</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-rose-500/15 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>

        {/* Checklists Progress */}
        <div className="p-4 rounded-xl bg-card/85 backdrop-blur-md border border-border/70 shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Itens de Checklist
            </span>
            <div className="text-2xl font-black text-sky-400">{checklistStats.percent}%</div>
            <p className="text-[11px] text-muted-foreground">{checklistStats.completedItems} de {checklistStats.totalItems} feitos</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-sky-500/15 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <CheckSquare className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Main Dashboard Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Cards Distribution by List */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-card/85 backdrop-blur-md border border-border/70 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h3 className="font-bold text-sm text-foreground">Distribuição por Lista</h3>
            </div>
            <span className="text-xs text-muted-foreground">{boardLists.length} Listas</span>
          </div>

          <div className="space-y-3 pt-1">
            {boardLists.map((list) => {
              const count = list.cards.filter((c) => !c.is_archived).length;
              const percent = totalCards > 0 ? Math.round((count / totalCards) * 100) : 0;
              const isOverLimit = list.card_limit && count > list.card_limit;

              return (
                <div key={list.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground truncate max-w-[200px]">
                      {list.title}
                    </span>
                    <div className="flex items-center gap-2 text-muted-foreground font-mono">
                      {list.card_limit && (
                        <span className={isOverLimit ? "text-rose-400 font-bold" : ""}>
                          limite: {list.card_limit}
                        </span>
                      )}
                      <span>{count} cards ({percent}%)</span>
                    </div>
                  </div>
                  <Progress value={percent} className="h-2.5" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2: Priority Breakdown */}
        <div className="p-5 rounded-xl bg-card/85 backdrop-blur-md border border-border/70 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-primary" />
              <h3 className="font-bold text-sm text-foreground">Por Prioridade</h3>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {(["urgent", "high", "medium", "low", "none"] as const).map((p) => {
              const cfg = PRIORITY_CONFIG[p];
              const count = priorityCounts[p];
              const percent = totalCards > 0 ? Math.round((count / totalCards) * 100) : 0;

              return (
                <div key={p} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-[100px]">
                    <span className={`h-2.5 w-2.5 rounded-full ${cfg.badgeColor}`} />
                    <span className="font-medium text-foreground">{cfg.label}</span>
                  </div>
                  <Progress value={percent} className="h-2 flex-1" />
                  <span className="font-mono text-muted-foreground w-8 text-right">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Team Workload Breakdown */}
      <div className="p-5 rounded-xl bg-card/85 backdrop-blur-md border border-border/70 shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm text-foreground">Carga de Trabalho da Equipe</h3>
          </div>
          <span className="text-xs text-muted-foreground">{memberStats.length} Membros</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          {memberStats.map((item) => (
            <div
              key={item.profile.id}
              className="p-3 rounded-lg bg-muted/20 border border-border/50 flex items-center gap-3"
            >
              <Avatar className="h-10 w-10 border border-border">
                <AvatarImage src={item.profile.avatar_url || undefined} />
                <AvatarFallback className="text-xs">{getInitials(item.profile.full_name)}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground truncate">
                    {item.profile.full_name}
                  </span>
                  <span className="text-xs font-mono font-bold text-primary">
                    {item.total} cards
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Concluídos: {item.completed}</span>
                  <span>{item.percent}%</span>
                </div>
                <Progress value={item.percent} className="h-1.5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
