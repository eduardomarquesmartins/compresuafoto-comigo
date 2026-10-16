"use client";

import React from "react";
import { useKonti } from "@/features/kanban/use-konti";
import { CardWithDetails, Profile } from "@/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { User, Check } from "lucide-react";

interface CardMembersPickerProps {
  card: CardWithDetails;
}

export function CardMembersPicker({ card }: CardMembersPickerProps) {
  const { workspaceMembers, assignCardMember, removeCardMember } = useKonti();

  const isAssigned = (userId: string) =>
    card.members?.some((m) => m.id === userId);

  const toggleMember = (profile: Profile) => {
    if (isAssigned(profile.id)) {
      removeCardMember(card.id, profile.id);
    } else {
      assignCardMember(card.id, profile);
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
          <User className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
          <span>Responsáveis</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3 space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Membros do Workspace
        </h4>
        <div className="space-y-1">
          {workspaceMembers.map((m) => {
            const assigned = isAssigned(m.profile.id);
            return (
              <button
                key={m.id}
                onClick={() => toggleMember(m.profile)}
                className={`w-full flex items-center justify-between p-1.5 rounded-md text-xs transition-colors ${
                  assigned
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={m.profile.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {getInitials(m.profile.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{m.profile.full_name}</span>
                </div>
                {assigned && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
