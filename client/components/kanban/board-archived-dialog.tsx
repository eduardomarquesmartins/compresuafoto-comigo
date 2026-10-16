"use client";

import React, { useState } from "react";
import { useKonti } from "@/features/kanban/use-konti";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Archive, RotateCcw, Trash2, Search, LayoutList, CheckSquare } from "lucide-react";

interface BoardArchivedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BoardArchivedDialog({
  open,
  onOpenChange,
}: BoardArchivedDialogProps) {
  const {
    currentBoard,
    lists,
    restoreCard,
    deleteCard,
    restoreList,
    deleteList,
  } = useKonti();

  const [search, setSearch] = useState("");

  if (!currentBoard) return null;

  // Gather archived cards
  const archivedCards = lists
    .flatMap((l) =>
      l.cards
        .filter((c) => c.is_archived && c.board_id === currentBoard.id)
        .map((c) => ({ ...c, listName: l.title }))
    )
    .filter((c) =>
      search.trim() ? c.title.toLowerCase().includes(search.toLowerCase()) : true
    );

  // Gather archived lists
  const archivedLists = lists.filter(
    (l) =>
      l.is_archived &&
      l.board_id === currentBoard.id &&
      (search.trim() ? l.title.toLowerCase().includes(search.toLowerCase()) : true)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-amber-400" />
            Itens Arquivados do Quadro
          </DialogTitle>
        </DialogHeader>

        <div className="relative mt-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar itens arquivados..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <Tabs defaultValue="cards" className="flex-1 flex flex-col min-h-0 mt-4">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="cards" className="text-xs">
              Cards Arquivados ({archivedCards.length})
            </TabsTrigger>
            <TabsTrigger value="lists" className="text-xs">
              Listas Arquivadas ({archivedLists.length})
            </TabsTrigger>
          </TabsList>

          {/* Cards Tab */}
          <TabsContent value="cards" className="flex-1 overflow-y-auto min-h-0 pt-3 space-y-2">
            {archivedCards.length > 0 ? (
              archivedCards.map((card) => (
                <div
                  key={card.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {card.title}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      Lista original: {card.listName}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => restoreCard(card.id)}
                      className="text-xs h-7 gap-1"
                    >
                      <RotateCcw className="h-3 w-3 text-emerald-400" />
                      Restaurar
                    </Button>
                    <Button
                      size="xs"
                      variant="destructive"
                      onClick={() => deleteCard(card.id)}
                      className="text-xs h-7 px-2"
                      title="Excluir permanentemente"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Nenhum card arquivado no momento.
              </div>
            )}
          </TabsContent>

          {/* Lists Tab */}
          <TabsContent value="lists" className="flex-1 overflow-y-auto min-h-0 pt-3 space-y-2">
            {archivedLists.length > 0 ? (
              archivedLists.map((list) => (
                <div
                  key={list.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {list.title}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      Contém {list.cards.length} cards
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => restoreList(list.id)}
                      className="text-xs h-7 gap-1"
                    >
                      <RotateCcw className="h-3 w-3 text-emerald-400" />
                      Restaurar
                    </Button>
                    <Button
                      size="xs"
                      variant="destructive"
                      onClick={() => deleteList(list.id)}
                      className="text-xs h-7 px-2"
                      title="Excluir permanentemente"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Nenhuma lista arquivada no momento.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
