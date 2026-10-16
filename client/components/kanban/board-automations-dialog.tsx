"use client";

import { useMemo, useState } from "react";
import { useKonti } from "@/features/kanban/use-konti";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowRight, Bot, Trash2 } from "lucide-react";

export function BoardAutomationsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { currentBoard, lists, automationRules, createAutomationRule, toggleAutomationRule, deleteAutomationRule } = useKonti();
  const boardLists = useMemo(() => lists.filter((list) => list.board_id === currentBoard?.id && !list.is_archived), [lists, currentBoard?.id]);
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const rules = automationRules.filter((rule) => rule.board_id === currentBoard?.id);

  const addRule = () => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    createAutomationRule(sourceId, targetId);
    setSourceId("");
    setTargetId("");
  };
  const listName = (id: string) => boardLists.find((list) => list.id === id)?.title || "Lista removida";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Bot className="h-4 w-4" />Automatizações do quadro</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">Regra disponível: quando um cartão entrar em uma lista, movê-lo automaticamente para outra.</p>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <select value={sourceId} onChange={(event) => setSourceId(event.target.value)} className="h-9 min-w-0 rounded-md border border-border bg-background px-2 text-sm">
            <option value="">Ao entrar em…</option>
            {boardLists.map((list) => <option key={list.id} value={list.id}>{list.title}</option>)}
          </select>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <select value={targetId} onChange={(event) => setTargetId(event.target.value)} className="h-9 min-w-0 rounded-md border border-border bg-background px-2 text-sm">
            <option value="">Mover para…</option>
            {boardLists.filter((list) => list.id !== sourceId).map((list) => <option key={list.id} value={list.id}>{list.title}</option>)}
          </select>
        </div>
        <Button onClick={addRule} disabled={!sourceId || !targetId || sourceId === targetId}>Criar regra</Button>
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {rules.length === 0 ? <p className="py-5 text-center text-xs text-muted-foreground">Nenhuma regra configurada.</p> : rules.map((rule) => (
            <div key={rule.id} className="flex items-center gap-3 rounded-md border border-border p-3">
              <input type="checkbox" aria-label="Ativar regra" checked={rule.enabled} onChange={() => toggleAutomationRule(rule.id)} />
              <p className="min-w-0 flex-1 text-xs">Ao entrar em <strong>{listName(rule.source_list_id)}</strong>, mover para <strong>{listName(rule.target_list_id)}</strong></p>
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Excluir regra" onClick={() => deleteAutomationRule(rule.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
