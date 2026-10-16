"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BACKGROUND_PRESETS } from "@/lib/constants";
import { useKonti } from "@/features/kanban/use-konti";
import { Check } from "lucide-react";

interface BoardBackgroundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BoardBackgroundDialog({
  open,
  onOpenChange,
}: BoardBackgroundDialogProps) {
  const { currentBoard, updateBoard } = useKonti();

  if (!currentBoard) return null;

  const handleSelectBackground = (
    type: "color" | "gradient" | "image",
    value: string
  ) => {
    updateBoard(currentBoard.id, {
      background_type: type,
      background_value: value,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Plano de Fundo do Quadro</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="gradients" className="mt-2">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="gradients">Gradientes</TabsTrigger>
            <TabsTrigger value="colors">Cores</TabsTrigger>
            <TabsTrigger value="images">Fotos</TabsTrigger>
          </TabsList>

          {/* Gradients */}
          <TabsContent value="gradients" className="pt-4">
            <div className="grid grid-cols-2 gap-3">
              {BACKGROUND_PRESETS.gradients.map((preset) => {
                const isSelected =
                  currentBoard.background_value === preset.value;
                return (
                  <button
                    key={preset.id}
                    onClick={() =>
                      handleSelectBackground("gradient", preset.value)
                    }
                    className={`relative h-20 w-full rounded-lg overflow-hidden border transition-all hover:scale-[1.02] cursor-pointer flex items-end p-2 text-xs font-medium text-white shadow-md ${
                      isSelected
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background border-primary"
                        : "border-border/50"
                    }`}
                    style={{ background: preset.value }}
                  >
                    <span>{preset.name}</span>
                    {isSelected && (
                      <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </TabsContent>

          {/* Colors */}
          <TabsContent value="colors" className="pt-4">
            <div className="grid grid-cols-3 gap-3">
              {BACKGROUND_PRESETS.colors.map((preset) => {
                const isSelected =
                  currentBoard.background_value === preset.value;
                return (
                  <button
                    key={preset.id}
                    onClick={() =>
                      handleSelectBackground("color", preset.value)
                    }
                    className={`relative h-16 w-full rounded-lg overflow-hidden border transition-all hover:scale-[1.02] cursor-pointer flex items-end p-2 text-xs font-medium text-white shadow-md ${
                      isSelected
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background border-primary"
                        : "border-border/50"
                    }`}
                    style={{ backgroundColor: preset.value }}
                  >
                    <span>{preset.name}</span>
                    {isSelected && (
                      <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </TabsContent>

          {/* Photos */}
          <TabsContent value="images" className="pt-4">
            <div className="grid grid-cols-2 gap-3">
              {BACKGROUND_PRESETS.images.map((preset) => {
                const isSelected =
                  currentBoard.background_value === preset.value;
                return (
                  <button
                    key={preset.id}
                    onClick={() =>
                      handleSelectBackground("image", preset.value)
                    }
                    className={`relative h-24 w-full rounded-lg overflow-hidden border transition-all hover:scale-[1.02] cursor-pointer flex items-end p-2 text-xs font-medium text-white shadow-md bg-cover bg-center ${
                      isSelected
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background border-primary"
                        : "border-border/50"
                    }`}
                    style={{ backgroundImage: `url(${preset.value})` }}
                  >
                    <div className="absolute inset-0 bg-black/40" />
                    <span className="relative z-10">{preset.name}</span>
                    {isSelected && (
                      <div className="absolute top-2 right-2 z-10 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
