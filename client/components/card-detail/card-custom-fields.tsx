"use client";

import React from "react";
import { useKonti } from "@/features/kanban/use-konti";
import { CardWithDetails, CustomField } from "@/types";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Sliders, Type, Hash, DollarSign, ListFilter, CheckSquare, Calendar } from "lucide-react";

interface CardCustomFieldsProps {
  card: CardWithDetails;
}

export function CardCustomFields({ card }: CardCustomFieldsProps) {
  const { currentBoard, customFields, setCardCustomFieldValue } = useKonti();

  const boardFields = customFields.filter(
    (f) => f.board_id === currentBoard?.id
  );

  if (boardFields.length === 0) return null;

  const currentValues = card.custom_field_values || {};

  const renderFieldInput = (field: CustomField) => {
    const value = currentValues[field.id];

    switch (field.type) {
      case "text":
        return (
          <Input
            placeholder="Preencher..."
            value={value || ""}
            onChange={(e) =>
              setCardCustomFieldValue(card.id, field.id, e.target.value)
            }
            className="h-8 text-xs bg-muted/20"
          />
        );

      case "number":
        return (
          <Input
            type="number"
            placeholder="0"
            value={value !== undefined ? value : ""}
            onChange={(e) =>
              setCardCustomFieldValue(
                card.id,
                field.id,
                e.target.value === "" ? "" : Number(e.target.value)
              )
            }
            className="h-8 text-xs bg-muted/20"
          />
        );

      case "currency":
        return (
          <div className="relative">
            <span className="absolute left-2.5 top-2 text-xs text-muted-foreground font-semibold">
              R$
            </span>
            <Input
              placeholder="0,00"
              value={value || ""}
              onChange={(e) =>
                setCardCustomFieldValue(card.id, field.id, e.target.value)
              }
              className="h-8 pl-8 text-xs bg-muted/20 font-mono"
            />
          </div>
        );

      case "dropdown":
        return (
          <select
            value={value || ""}
            onChange={(e) =>
              setCardCustomFieldValue(card.id, field.id, e.target.value)
            }
            className="w-full h-8 px-2 rounded-md border border-input bg-muted/20 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Selecione uma opção...</option>
            {field.options?.map((opt) => (
              <option key={opt.id} value={opt.value}>
                {opt.value}
              </option>
            ))}
          </select>
        );

      case "checkbox":
        return (
          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              id={`cf-${field.id}`}
              checked={!!value}
              onCheckedChange={(checked) =>
                setCardCustomFieldValue(card.id, field.id, !!checked)
              }
            />
            <label
              htmlFor={`cf-${field.id}`}
              className="text-xs text-foreground cursor-pointer"
            >
              {value ? "Sim / Ativo" : "Não / Pendente"}
            </label>
          </div>
        );

      case "date":
        return (
          <Input
            type="date"
            value={value || ""}
            onChange={(e) =>
              setCardCustomFieldValue(card.id, field.id, e.target.value)
            }
            className="h-8 text-xs bg-muted/20"
          />
        );
    }
  };

  const getFieldIcon = (type: string) => {
    switch (type) {
      case "text":
        return <Type className="h-3.5 w-3.5 text-sky-400" />;
      case "number":
        return <Hash className="h-3.5 w-3.5 text-emerald-400" />;
      case "currency":
        return <DollarSign className="h-3.5 w-3.5 text-amber-400" />;
      case "dropdown":
        return <ListFilter className="h-3.5 w-3.5 text-purple-400" />;
      case "checkbox":
        return <CheckSquare className="h-3.5 w-3.5 text-rose-400" />;
      case "date":
        return <Calendar className="h-3.5 w-3.5 text-primary" />;
      default:
        return <Sliders className="h-3.5 w-3.5" />;
    }
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center gap-2">
        <Sliders className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">
          Campos Personalizados ({boardFields.length})
        </h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg border border-border/50 bg-muted/10">
        {boardFields.map((field) => (
          <div key={field.id} className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
              {getFieldIcon(field.type)}
              <span>{field.name}</span>
            </label>
            {renderFieldInput(field)}
          </div>
        ))}
      </div>
    </div>
  );
}
