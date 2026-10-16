"use client";

import React, { useState } from "react";
import { useKonti } from "@/features/kanban/use-konti";
import { CustomField, CustomFieldType, CustomFieldOption } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sliders,
  Plus,
  Trash2,
  Type,
  Hash,
  DollarSign,
  ListFilter,
  CheckSquare,
  Calendar,
} from "lucide-react";

interface BoardCustomFieldsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BoardCustomFieldsDialog({
  open,
  onOpenChange,
}: BoardCustomFieldsDialogProps) {
  const { currentBoard, customFields, createCustomField, deleteCustomField } =
    useKonti();

  const [isAdding, setIsAdding] = useState(false);
  const [fieldName, setFieldName] = useState("");
  const [fieldType, setFieldType] = useState<CustomFieldType>("text");
  const [showOnCard, setShowOnCard] = useState(true);
  const [dropdownOptionsText, setDropdownOptionsText] = useState("Opção 1, Opção 2, Opção 3");

  const boardFields = customFields.filter(
    (f) => f.board_id === currentBoard?.id
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldName.trim()) return;

    let options: CustomFieldOption[] | undefined;
    if (fieldType === "dropdown") {
      options = dropdownOptionsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((val, idx) => ({
          id: `opt-${idx}-${Date.now()}`,
          value: val,
        }));
    }

    createCustomField({
      name: fieldName.trim(),
      type: fieldType,
      options,
      show_on_card: showOnCard,
    });

    setFieldName("");
    setFieldType("text");
    setShowOnCard(true);
    setIsAdding(false);
  };

  const getFieldIcon = (type: CustomFieldType) => {
    switch (type) {
      case "text":
        return <Type className="h-4 w-4 text-sky-400" />;
      case "number":
        return <Hash className="h-4 w-4 text-emerald-400" />;
      case "currency":
        return <DollarSign className="h-4 w-4 text-amber-400" />;
      case "dropdown":
        return <ListFilter className="h-4 w-4 text-purple-400" />;
      case "checkbox":
        return <CheckSquare className="h-4 w-4 text-rose-400" />;
      case "date":
        return <Calendar className="h-4 w-4 text-primary" />;
    }
  };

  const getFieldTypeLabel = (type: CustomFieldType) => {
    switch (type) {
      case "text":
        return "Texto";
      case "number":
        return "Número";
      case "currency":
        return "Moeda / Valor";
      case "dropdown":
        return "Lista Suspensa";
      case "checkbox":
        return "Checkbox (Sim/Não)";
      case "date":
        return "Data Adicional";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-primary" />
            <DialogTitle>Campos Personalizados do Quadro</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* List of existing custom fields */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {boardFields.length > 0 ? (
              boardFields.map((field) => (
                <div
                  key={field.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border/60"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-7 w-7 rounded-md bg-muted/60 flex items-center justify-center shrink-0">
                      {getFieldIcon(field.type)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {field.name}
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        {getFieldTypeLabel(field.type)} •{" "}
                        {field.show_on_card ? "Visível no card" : "Oculto no card"}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteCustomField(field.id)}
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                Nenhum campo personalizado cadastrado neste quadro.
              </p>
            )}
          </div>

          {/* Add New Field Section */}
          {isAdding ? (
            <form
              onSubmit={handleCreate}
              className="p-3.5 rounded-xl border border-border/70 bg-card/60 space-y-3"
            >
              <h4 className="text-xs font-bold text-foreground">Novo Campo</h4>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Nome do Campo
                </label>
                <Input
                  autoFocus
                  placeholder="Ex: Orçamento (R$), Story Points, etc."
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Tipo de Dado
                </label>
                <select
                  value={fieldType}
                  onChange={(e) => setFieldType(e.target.value as CustomFieldType)}
                  className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="text">Texto Simples</option>
                  <option value="number">Número</option>
                  <option value="currency">Moeda (R$)</option>
                  <option value="dropdown">Lista Suspensa (Dropdown)</option>
                  <option value="checkbox">Checkbox (Verdadeiro/Falso)</option>
                  <option value="date">Data</option>
                </select>
              </div>

              {fieldType === "dropdown" && (
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Opções (separadas por vírgula)
                  </label>
                  <Input
                    placeholder="Opção 1, Opção 2, Opção 3"
                    value={dropdownOptionsText}
                    onChange={(e) => setDropdownOptionsText(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="show-on-card"
                  checked={showOnCard}
                  onCheckedChange={(c) => setShowOnCard(!!c)}
                />
                <label
                  htmlFor="show-on-card"
                  className="text-xs text-foreground font-medium cursor-pointer"
                >
                  Exibir campo na capa do card no Kanban
                </label>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t">
                <Button type="submit" size="sm" className="h-7 text-xs font-medium">
                  Salvar Campo
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAdding(false)}
                  className="h-7 text-xs"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(true)}
              className="w-full text-xs font-medium h-8"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Adicionar Campo Personalizado
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
