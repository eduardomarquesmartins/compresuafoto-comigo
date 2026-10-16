"use client";

import React, { useState } from "react";
import { useKonti } from "@/features/kanban/use-konti";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkspaceRole } from "@/types";
import { UserPlus, Mail, Shield, Check } from "lucide-react";

interface BoardInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BoardInviteDialog({
  open,
  onOpenChange,
}: BoardInviteDialogProps) {
  const { currentBoard, inviteMember } = useKonti();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceRole>("MEMBER");

  if (!currentBoard) return null;

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      inviteMember(email.trim(), role);
      setEmail("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Adicionar membro
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Isso adiciona o perfil à lista local do KONTI para atribuição de tarefas. Ainda não cria uma conta nem envia convite por e-mail.
        </p>

        <form onSubmit={handleInvite} className="space-y-4 pt-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              E-mail do colaborador
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                required
                autoFocus
                placeholder="colaborador@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 h-8 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              Permissão
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(["ADMIN", "MEMBER", "VIEWER"] as WorkspaceRole[]).map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setRole(r)}
                  className={`p-2 rounded-lg border text-center transition-colors ${
                    role === r
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/30 hover:bg-muted text-foreground border-border/40"
                  }`}
                >
                  <span className="text-xs font-semibold block capitalize">
                    {r.toLowerCase()}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" className="text-xs">
              Adicionar membro
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
