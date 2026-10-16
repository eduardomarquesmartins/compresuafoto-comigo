"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  CollisionDetection,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { ListWithCards, CardWithDetails } from "@/types";
import { useKonti } from "@/features/kanban/use-konti";
import { KanbanColumn } from "./kanban-column";
import { KanbanCardOverlay } from "./kanban-card-overlay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";
import { calculateNewPosition } from "@/lib/utils/fractional-index";

export function KanbanBoard() {
  const {
    currentBoard,
    lists,
    createList,
    reorderList,
    moveCard,
  } = useKonti();

  const [mounted, setMounted] = useState(false);
  const [activeDragItem, setActiveDragItem] = useState<{
    type: "List" | "Card";
    item: ListWithCards | CardWithDetails;
  } | null>(null);

  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Active lists belonging to current board
  const boardLists = useMemo(() => {
    if (!currentBoard) return [];
    return lists
      .filter((l) => l.board_id === currentBoard.id && !l.is_archived)
      .sort((a, b) => a.position - b.position);
  }, [lists, currentBoard]);

  const listIds = useMemo(() => boardLists.map((l) => l.id), [boardLists]);

  // Helper to find which list contains an item or list ID
  const findContainer = useCallback(
    (id: string): string | null => {
      if (boardLists.some((l) => l.id === id)) {
        return id;
      }
      const list = boardLists.find((l) => l.cards.some((c) => c.id === id));
      return list ? list.id : null;
    },
    [boardLists]
  );

  // Optimized collision detection for Kanban multi-container
  const collisionDetectionStrategy: CollisionDetection = useCallback(
    (args) => {
      // 1. If dragging a column, only collide with other columns
      if (activeDragItem?.type === "List") {
        return closestCenter({
          ...args,
          droppableContainers: args.droppableContainers.filter((container) =>
            listIds.includes(container.id as string)
          ),
        });
      }

      // 2. If dragging a Card:
      // Check pointer intersections first (most natural feel)
      const pointerCollisions = pointerWithin(args);
      if (pointerCollisions.length > 0) {
        return pointerCollisions;
      }

      // Check bounding box rect intersections
      const rectCollisions = rectIntersection(args);
      if (rectCollisions.length > 0) {
        return rectCollisions;
      }

      // Fallback
      return closestCenter(args);
    },
    [activeDragItem, listIds]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const type = active.data.current?.type;

    if (type === "List") {
      setActiveDragItem({
        type: "List",
        item: active.data.current?.list,
      });
    } else if (type === "Card") {
      setActiveDragItem({
        type: "Card",
        item: active.data.current?.card,
      });
    }
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;
      const activeType = active.data.current?.type;

      if (activeType !== "Card") return;

      const activeContainer = findContainer(activeId);
      const overContainer = findContainer(overId);

      if (!activeContainer || !overContainer || activeContainer === overContainer) {
        return;
      }

      const overList = boardLists.find((l) => l.id === overContainer);
      if (!overList) return;

      const overIndex = overList.cards.findIndex((c) => c.id === overId);
      const targetIndex = overIndex >= 0 ? overIndex : overList.cards.length;

      // Move card to target container during drag
      moveCard(activeId, overContainer, undefined, undefined, targetIndex);
    },
    [boardLists, findContainer, moveCard]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDragItem(null);

      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;
      const activeType = active.data.current?.type;

      // 1. LIST REORDERING
      if (activeType === "List") {
        if (activeId !== overId) {
          const oldIndex = boardLists.findIndex((l) => l.id === activeId);
          const newIndex = boardLists.findIndex((l) => l.id === overId);

          if (oldIndex !== -1 && newIndex !== -1) {
            const reordered = arrayMove(boardLists, oldIndex, newIndex);
            const prevItem = reordered[newIndex - 1];
            const nextItem = reordered[newIndex + 1];
            const newPos = calculateNewPosition(
              prevItem?.position,
              nextItem?.position
            );
            reorderList(activeId, newPos);
          }
        }
        return;
      }

      // 2. CARD REORDERING
      if (activeType === "Card") {
        const activeContainer = findContainer(activeId);
        const overContainer = findContainer(overId);

        if (!activeContainer || !overContainer) return;

        const activeList = boardLists.find((l) => l.id === activeContainer);
        const overList = boardLists.find((l) => l.id === overContainer);

        if (!activeList || !overList) return;

        if (activeContainer === overContainer) {
          const oldIndex = activeList.cards.findIndex((c) => c.id === activeId);
          const newIndex = activeList.cards.findIndex((c) => c.id === overId);

          if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            moveCard(activeId, activeContainer, undefined, undefined, newIndex);
          }
        } else {
          const overIndex = overList.cards.findIndex((c) => c.id === overId);
          const targetIndex = overIndex >= 0 ? overIndex : overList.cards.length;
          moveCard(activeId, overContainer, undefined, undefined, targetIndex);
        }
      }
    },
    [boardLists, findContainer, moveCard, reorderList]
  );

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (newListTitle.trim()) {
      createList(newListTitle.trim());
      setNewListTitle("");
      setIsAddingList(false);
    }
  };

  if (!mounted) {
    return (
      <div className="flex h-full w-full items-start gap-4 overflow-x-auto p-6 pb-8 scrollbar-thin select-none">
        {boardLists.map((list) => (
          <div
            key={list.id}
            className="flex flex-col w-[300px] shrink-0 rounded-xl bg-card/85 backdrop-blur-md border border-border/80 shadow-lg min-h-[300px] p-3"
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              {list.title}
            </h3>
          </div>
        ))}
      </div>
    );
  }

  return (
    <DndContext
      id="konti-kanban-dnd-context"
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full w-full items-start gap-4 overflow-x-auto p-6 pb-8 scrollbar-thin select-none">
        <SortableContext
          items={listIds}
          strategy={horizontalListSortingStrategy}
        >
          {boardLists.map((list) => (
            <KanbanColumn key={list.id} list={list} />
          ))}
        </SortableContext>

        {/* Add List Button / Form */}
        <div className="w-[300px] shrink-0">
          {isAddingList ? (
            <form
              onSubmit={handleCreateList}
              className="rounded-xl border border-border/80 bg-card/90 backdrop-blur-md p-3 shadow-lg space-y-3"
            >
              <Input
                autoFocus
                placeholder="Nome da lista..."
                value={newListTitle}
                onChange={(e) => setNewListTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setIsAddingList(false);
                    setNewListTitle("");
                  }
                }}
                className="h-8 text-sm"
              />
              <div className="flex items-center gap-2">
                <Button type="submit" size="sm" className="h-8 text-xs">
                  Adicionar lista
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setIsAddingList(false);
                    setNewListTitle("");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </form>
          ) : (
            <Button
              variant="outline"
              onClick={() => setIsAddingList(true)}
              className="w-full justify-start h-12 rounded-xl bg-card/60 hover:bg-card/90 backdrop-blur-md border-dashed border-border/80 text-muted-foreground hover:text-foreground shadow-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar outra lista
            </Button>
          )}
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay dropAnimation={null}>
        {activeDragItem?.type === "Card" && (
          <KanbanCardOverlay card={activeDragItem.item as CardWithDetails} />
        )}
      </DragOverlay>
    </DndContext>
  );
}
