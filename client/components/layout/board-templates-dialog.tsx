"use client";

import React, { useState } from "react";
import { useKonti } from "@/features/kanban/use-konti";
import { BOARD_TEMPLATES, BoardTemplate } from "@/lib/constants/templates";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  LayoutTemplate,
  Code,
  TrendingUp,
  Megaphone,
  UserCheck,
  Compass,
  ArrowRight,
  Search,
} from "lucide-react";

interface BoardTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BoardTemplatesDialog({
  open,
  onOpenChange,
}: BoardTemplatesDialogProps) {
  const { createBoardFromTemplate } = useKonti();
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = [
    "Todos",
    "Engenharia",
    "Vendas & CRM",
    "Marketing",
    "RH & Operações",
    "Gestão de Produto",
  ];

  const filteredTemplates = BOARD_TEMPLATES.filter((tpl) => {
    const matchesCategory =
      selectedCategory === "Todos" || tpl.category === selectedCategory;
    const matchesSearch =
      tpl.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getTemplateIcon = (iconName: string) => {
    switch (iconName) {
      case "Code":
        return <Code className="h-5 w-5 text-indigo-400" />;
      case "TrendingUp":
        return <TrendingUp className="h-5 w-5 text-emerald-400" />;
      case "Megaphone":
        return <Megaphone className="h-5 w-5 text-rose-400" />;
      case "UserCheck":
        return <UserCheck className="h-5 w-5 text-sky-400" />;
      case "Compass":
        return <Compass className="h-5 w-5 text-amber-400" />;
      default:
        return <LayoutTemplate className="h-5 w-5 text-primary" />;
    }
  };

  const handleSelectTemplate = (template: BoardTemplate) => {
    createBoardFromTemplate(template.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-2 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <LayoutTemplate className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Galeria de Modelos de Quadro
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Inicie seus projetos instantaneamente com fluxos de trabalho e listas pré-configuradas.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar modelos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-muted/20"
            />
          </div>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="p-4 rounded-xl border border-border/70 bg-card/60 hover:bg-card/90 transition-all shadow-md flex flex-col justify-between space-y-3 group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-muted/60 flex items-center justify-center">
                        {getTemplateIcon(template.icon)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                          {template.title}
                        </h4>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {template.category}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {template.description}
                  </p>

                  {/* Preview of lists in template */}
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Listas inclusas:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {template.lists.map((l, lIdx) => (
                        <span
                          key={lIdx}
                          className="text-[10px] bg-muted/40 text-foreground px-2 py-0.5 rounded border border-border/40"
                        >
                          {l.title}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    {template.lists.reduce((acc, l) => acc + l.cards.length, 0)} cards de exemplo
                  </span>

                  <Button
                    size="sm"
                    onClick={() => handleSelectTemplate(template)}
                    className="h-7 text-xs gap-1 font-medium"
                  >
                    <span>Usar este Modelo</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
