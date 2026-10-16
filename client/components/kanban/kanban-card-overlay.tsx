"use client";

import React from "react";
import { CardWithDetails } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { PRIORITY_CONFIG } from "@/lib/constants";
import { CheckSquare, MessageSquare, Paperclip, Calendar, Flag } from "lucide-react";

export function KanbanCardOverlay({ card }: { card: CardWithDetails }) {
  const priority = card.priority ? PRIORITY_CONFIG[card.priority] : null;

  const totalChecklistItems =
    card.checklists?.reduce((acc, chk) => acc + (chk.items?.length || 0), 0) || 0;
  const completedChecklistItems =
    card.checklists?.reduce(
      (acc, chk) => acc + (chk.items?.filter((it) => it.is_completed).length || 0),
      0
    ) || 0;

  return (
    <div className="w-[280px] rounded-lg border border-primary/50 bg-card p-3 shadow-2xl ring-2 ring-primary/30 rotate-2 opacity-95 cursor-grabbing pointer-events-none select-none">
      {/* Cover */}
      {card.cover_color && (
        <div
          className="h-3 w-full rounded-sm mb-2"
          style={{ backgroundColor: card.cover_color }}
        />
      )}

      {/* Labels */}
      {card.labels && card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {card.labels.map((lbl) => (
            <span
              key={lbl.id}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: lbl.color }}
            >
              {lbl.name}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <h4 className="text-sm font-medium text-foreground leading-snug">
        {card.title}
      </h4>

      {/* Metadata Badges */}
      <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {card.priority !== "none" && priority && (
            <span className={`flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded ${priority.badgeColor}`}>
              <Flag className="h-3 w-3" />
              {priority.label}
            </span>
          )}

          {totalChecklistItems > 0 && (
            <span className="flex items-center gap-1 text-[11px]">
              <CheckSquare className="h-3 w-3" />
              {completedChecklistItems}/{totalChecklistItems}
            </span>
          )}

          {(card.comments_count || 0) > 0 && (
            <span className="flex items-center gap-1 text-[11px]">
              <MessageSquare className="h-3 w-3" />
              {card.comments_count}
            </span>
          )}
        </div>

        {/* Member Avatars */}
        {card.members && card.members.length > 0 && (
          <div className="flex -space-x-1.5 overflow-hidden">
            {card.members.map((m) => (
              <Avatar key={m.id} className="h-5 w-5 border border-background">
                <AvatarImage src={m.avatar_url || undefined} />
                <AvatarFallback className="text-[9px]">
                  {getInitials(m.full_name)}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
