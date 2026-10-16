"use client";

import React, { useState, useEffect } from "react";
import { useKonti } from "@/features/kanban/use-konti";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CardMembersPicker } from "./card-members-picker";
import { CardLabelsPicker } from "./card-labels-picker";
import { CardDatesPicker } from "./card-dates-picker";
import { CardPriorityPicker } from "./card-priority-picker";
import { CardChecklists } from "./card-checklists";
import { CardAttachments } from "./card-attachments";
import { CardComments } from "./card-comments";
import { CardCustomFields } from "./card-custom-fields";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { COVER_COLORS, CARD_COVER_IMAGES } from "@/lib/constants";
import {
  Layout,
  AlignLeft,
  CheckSquare,
  Paperclip,
  Copy,
  Archive,
  Trash2,
  Palette,
  CheckCircle2,
  Plus,
  Image as ImageIcon,
  ChevronDown,
  ArrowRightLeft,
  ThumbsUp,
  Eye,
  LayoutTemplate,
} from "lucide-react";

export function CardDetailModal() {
  const {
    currentUser,
    currentBoard,
    activeCardId,
    setActiveCardId,
    activeCard,
    updateCard,
    moveCard,
    createChecklist,
    duplicateCard,
    archiveCard,
    deleteCard,
    toggleCardCompleted,
    toggleCardVote,
    toggleWatchCard,
    saveCardAsTemplate,
    lists,
  } = useKonti();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [descriptionValue, setDescriptionValue] = useState("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isAddingNewChecklist, setIsAddingNewChecklist] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState("Checklist");

  const boardLists = React.useMemo(() => {
    return lists
      .filter((l) => l.board_id === currentBoard?.id && !l.is_archived)
      .sort((a, b) => a.position - b.position);
  }, [lists, currentBoard?.id]);

  useEffect(() => {
    if (activeCard) {
      setTitleValue(activeCard.title);
      setDescriptionValue(activeCard.description || "");
    }
  }, [activeCard]);

  if (!activeCard) return null;

  const currentList = lists.find((l) => l.id === activeCard.list_id);
  const votesCount = activeCard.votes?.length || 0;
  const hasVoted = activeCard.votes?.includes(currentUser.id);
  const isWatching = activeCard.watchers?.includes(currentUser.id);

  const handleSaveTitle = () => {
    if (titleValue.trim() && titleValue !== activeCard.title) {
      updateCard(activeCard.id, { title: titleValue.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleSaveDescription = () => {
    updateCard(activeCard.id, { description: descriptionValue });
    setIsEditingDescription(false);
  };

  const handleAddChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (newChecklistTitle.trim()) {
      createChecklist(activeCard.id, newChecklistTitle.trim());
      setNewChecklistTitle("Checklist");
      setIsAddingNewChecklist(false);
    }
  };

  const handleSetCoverColor = (color: string | null) => {
    updateCard(activeCard.id, { cover_color: color, cover_url: null });
  };

  const handleSetCoverImage = (url: string | null) => {
    updateCard(activeCard.id, { cover_url: url, cover_color: null });
  };

  return (
    <Dialog
      open={!!activeCardId}
      onOpenChange={(open) => {
        if (!open) setActiveCardId(null);
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl border-border/80 shadow-2xl">
        {/* Cover Bar (Image or Color) */}
        {activeCard.cover_url ? (
          <div
            className="h-36 w-full rounded-t-2xl relative bg-cover bg-center transition-all shadow-inner"
            style={{ backgroundImage: `url(${activeCard.cover_url})` }}
          >
            <Button
              variant="ghost"
              size="xs"
              onClick={() => handleSetCoverImage(null)}
              className="absolute right-3 top-3 text-white/90 hover:text-white bg-black/40 hover:bg-black/60 text-xs backdrop-blur-sm"
            >
              Remover capa
            </Button>
          </div>
        ) : activeCard.cover_color ? (
          <div
            className="h-20 w-full rounded-t-2xl relative transition-all"
            style={{ backgroundColor: activeCard.cover_color }}
          >
            <Button
              variant="ghost"
              size="xs"
              onClick={() => handleSetCoverColor(null)}
              className="absolute right-3 top-3 text-white/80 hover:text-white bg-black/30 hover:bg-black/50 text-xs"
            >
              Remover capa
            </Button>
          </div>
        ) : null}

        <div className="p-6 space-y-6">
          {/* Header: Title & List info */}
          <div className="flex items-start gap-3">
            <Layout className="h-5 w-5 text-primary mt-1 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {isEditingTitle ? (
                  <Input
                    autoFocus
                    value={titleValue}
                    onChange={(e) => setTitleValue(e.target.value)}
                    onBlur={handleSaveTitle}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveTitle();
                      if (e.key === "Escape") {
                        setTitleValue(activeCard.title);
                        setIsEditingTitle(false);
                      }
                    }}
                    className="text-lg font-bold h-9 flex-1"
                  />
                ) : (
                  <h2
                    onClick={() => setIsEditingTitle(true)}
                    className="text-lg font-bold text-foreground hover:text-primary transition-colors cursor-pointer break-words flex-1"
                    title="Clique para editar título"
                  >
                    {activeCard.title}
                  </h2>
                )}

                {activeCard.is_template && (
                  <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-300 border-indigo-500/40 text-[10px] shrink-0 gap-1">
                    <LayoutTemplate className="h-3 w-3" />
                    <span>Modelo</span>
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                <span>Na lista</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="font-semibold text-foreground underline underline-offset-2 hover:text-primary transition-colors cursor-pointer inline-flex items-center gap-1 bg-muted/40 hover:bg-muted/70 px-2 py-0.5 rounded-md">
                      {currentList?.title || "Geral"}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48 text-xs">
                    {boardLists.map((l) => (
                      <DropdownMenuItem
                        key={l.id}
                        disabled={l.id === activeCard.list_id}
                        onClick={() => moveCard(activeCard.id, l.id)}
                        className={l.id === activeCard.list_id ? "font-bold bg-accent" : ""}
                      >
                        {l.title}
                        {l.id === activeCard.list_id && (
                          <span className="ml-auto text-[10px] text-muted-foreground">(atual)</span>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Grid Layout: Left Main Column, Right Actions Sidebar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Content (2 cols) */}
            <div className="md:col-span-2 space-y-6">
              {/* Description Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlignLeft className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold text-foreground">
                      Descrição
                    </h4>
                  </div>
                  {!isEditingDescription && activeCard.description && (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setIsEditingDescription(true)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Editar
                    </Button>
                  )}
                </div>

                {isEditingDescription ? (
                  <div className="space-y-2">
                    <Textarea
                      autoFocus
                      placeholder="Adicione uma descrição mais detalhada..."
                      value={descriptionValue}
                      onChange={(e) => setDescriptionValue(e.target.value)}
                      className="min-h-[100px] text-xs"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={handleSaveDescription}
                        className="h-7 text-xs"
                      >
                        Salvar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDescriptionValue(activeCard.description || "");
                          setIsEditingDescription(false);
                        }}
                        className="h-7 text-xs"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setIsEditingDescription(true)}
                    className="p-3 rounded-lg bg-muted/20 border border-border/40 hover:bg-muted/40 transition-colors cursor-pointer min-h-[60px]"
                  >
                    {activeCard.description ? (
                      <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                        {activeCard.description}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        Adicionar uma descrição detalhada...
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Custom Fields Section */}
              <CardCustomFields card={activeCard} />

              {/* Checklists Section */}
              <CardChecklists card={activeCard} />

              {/* Add checklist inline form */}
              {isAddingNewChecklist && (
                <form
                  onSubmit={handleAddChecklist}
                  className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-2"
                >
                  <label className="text-xs font-semibold text-foreground">
                    Título do Checklist
                  </label>
                  <Input
                    autoFocus
                    value={newChecklistTitle}
                    onChange={(e) => setNewChecklistTitle(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <div className="flex items-center gap-2 pt-1">
                    <Button type="submit" size="sm" className="h-7 text-xs">
                      Criar Checklist
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setIsAddingNewChecklist(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              )}

              {/* Attachments Section */}
              <CardAttachments card={activeCard} />

              {/* Comments Section */}
              <CardComments card={activeCard} />
            </div>

            {/* Right Actions Sidebar (1 col) */}
            <div className="space-y-4">
              {/* Card Meta Pickers */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block px-1">
                  Adicionar ao Card
                </span>
                <CardMembersPicker card={activeCard} />
                <CardLabelsPicker card={activeCard} />
                <CardDatesPicker card={activeCard} />
                <CardPriorityPicker card={activeCard} />
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={() => setIsAddingNewChecklist(true)}
                  className="w-full justify-start text-xs font-normal h-8"
                >
                  <CheckSquare className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  <span>Checklist</span>
                </Button>
              </div>

              {/* Social / Collaboration: Vote & Watch & Template */}
              <div className="space-y-1.5 pt-2 border-t border-border/40">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block px-1">
                  Colaboração
                </span>
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={() => toggleCardVote(activeCard.id)}
                  className={`w-full justify-start text-xs font-normal h-8 ${
                    hasVoted ? "bg-primary/20 text-primary font-semibold" : ""
                  }`}
                >
                  <ThumbsUp className="h-3.5 w-3.5 mr-2" />
                  <span>
                    {hasVoted ? "Votado" : "Votar"} ({votesCount})
                  </span>
                </Button>

                <Button
                  variant="subtle"
                  size="sm"
                  onClick={() => toggleWatchCard(activeCard.id)}
                  className={`w-full justify-start text-xs font-normal h-8 ${
                    isWatching ? "bg-sky-500/20 text-sky-400 font-semibold" : ""
                  }`}
                >
                  <Eye className="h-3.5 w-3.5 mr-2" />
                  <span>{isWatching ? "Seguindo" : "Seguir card"}</span>
                </Button>

                <Button
                  variant="subtle"
                  size="sm"
                  onClick={() => saveCardAsTemplate(activeCard.id)}
                  className={`w-full justify-start text-xs font-normal h-8 ${
                    activeCard.is_template ? "bg-indigo-500/20 text-indigo-400 font-semibold" : ""
                  }`}
                >
                  <LayoutTemplate className="h-3.5 w-3.5 mr-2" />
                  <span>
                    {activeCard.is_template ? "Modelo Ativo" : "Salvar como modelo"}
                  </span>
                </Button>
              </div>

              {/* Cover image & colors */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block px-1">
                  Capas & Imagens
                </span>

                {/* Cover Photos */}
                <div className="grid grid-cols-2 gap-1.5 px-1">
                  {CARD_COVER_IMAGES.map((img) => (
                    <div
                      key={img.id}
                      onClick={() => handleSetCoverImage(img.url)}
                      className={`h-10 rounded-md bg-cover bg-center cursor-pointer transition-all border border-border/60 relative overflow-hidden group ${
                        activeCard.cover_url === img.url
                          ? "ring-2 ring-primary scale-105"
                          : "opacity-80 hover:opacity-100"
                      }`}
                      style={{ backgroundImage: `url(${img.url})` }}
                      title={img.name}
                    >
                      <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-white px-1 py-0.2 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                        {img.name}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Colors */}
                <div className="flex flex-wrap gap-1.5 px-1 pt-1">
                  {COVER_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleSetCoverColor(color)}
                      className={`h-6 w-6 rounded-md transition-transform ${
                        activeCard.cover_color === color
                          ? "ring-2 ring-primary scale-110"
                          : "opacity-80 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Card Actions */}
              <div className="space-y-1.5 pt-2 border-t border-border/40">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block px-1">
                  Ações
                </span>
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={() => toggleCardCompleted(activeCard.id)}
                  className="w-full justify-start text-xs font-normal h-8"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-emerald-400" />
                  <span>
                    {activeCard.is_completed
                      ? "Marcar como pendente"
                      : "Concluir tarefa"}
                  </span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="subtle"
                      size="sm"
                      className="w-full justify-start text-xs font-normal h-8 text-primary hover:text-primary"
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5 mr-2" />
                      <span>Mover para...</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 text-xs">
                    {boardLists.map((l) => (
                      <DropdownMenuItem
                        key={l.id}
                        disabled={l.id === activeCard.list_id}
                        onClick={() => moveCard(activeCard.id, l.id)}
                        className={l.id === activeCard.list_id ? "font-bold bg-accent" : ""}
                      >
                        {l.title}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="subtle"
                  size="sm"
                  onClick={() => duplicateCard(activeCard.id)}
                  className="w-full justify-start text-xs font-normal h-8"
                >
                  <Copy className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  <span>Duplicar card</span>
                </Button>
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={() => archiveCard(activeCard.id)}
                  className="w-full justify-start text-xs font-normal h-8 text-amber-500 hover:text-amber-400"
                >
                  <Archive className="h-3.5 w-3.5 mr-2" />
                  <span>Arquivar</span>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteCard(activeCard.id)}
                  className="w-full justify-start text-xs font-normal h-8"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  <span>Excluir</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
