"use client";

import React, { useState } from "react";
import { useKonti } from "@/features/kanban/use-konti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BoardFilters } from "./board-filters";
import { BoardBackgroundDialog } from "./board-background-dialog";
import { BoardArchivedDialog } from "./board-archived-dialog";
import { BoardActivityDialog } from "./board-activity-dialog";
import { BoardInviteDialog } from "./board-invite-dialog";
import { BoardNotificationsDialog } from "./board-notifications-dialog";
import { BoardAutomationsDialog } from "./board-automations-dialog";
import { BoardCustomFieldsDialog } from "./board-custom-fields-dialog";
import { BoardExportImportDialog } from "./board-export-import-dialog";
import { BoardTemplatesDialog } from "@/components/layout/board-templates-dialog";
import { getInitials } from "@/lib/utils";
import {
  Star,
  MoreHorizontal,
  Palette,
  Archive,
  Copy,
  Trash2,
  Lock,
  Globe,
  Users,
  Activity as ActivityIcon,
  UserPlus,
  LayoutGrid,
  Table,
  Calendar,
  Clock,
  BarChart3,
  Sliders,
  Share2,
  LayoutTemplate,
  Bell,
  Bot,
} from "lucide-react";

export function BoardHeader() {
  const {
    currentBoard,
    updateBoard,
    toggleFavoriteBoard,
    duplicateBoard,
    archiveBoard,
    deleteBoard,
    workspaceMembers,
    boardView,
    setBoardView,
    unreadNotificationsCount,
  } = useKonti();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(currentBoard?.title || "");

  const [isBgDialogOpen, setIsBgDialogOpen] = useState(false);
  const [isArchivedOpen, setIsArchivedOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isCustomFieldsOpen, setIsCustomFieldsOpen] = useState(false);
  const [isExportImportOpen, setIsExportImportOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAutomationsOpen, setIsAutomationsOpen] = useState(false);

  if (!currentBoard) return null;

  const handleSaveTitle = () => {
    if (titleValue.trim() && titleValue !== currentBoard.title) {
      updateBoard(currentBoard.id, { title: titleValue.trim() });
    } else {
      setTitleValue(currentBoard.title);
    }
    setIsEditingTitle(false);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 border-b border-border/40 bg-background/70 backdrop-blur-md sticky top-0 z-20">
      {/* Left: Title, Favorite, View Switcher & Members */}
      <div className="flex items-center gap-3">
        {isEditingTitle ? (
          <Input
            autoFocus
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveTitle();
              if (e.key === "Escape") {
                setTitleValue(currentBoard.title);
                setIsEditingTitle(false);
              }
            }}
            className="h-8 text-base font-bold px-2 py-1 max-w-[220px]"
          />
        ) : (
          <h1
            onClick={() => {
              setTitleValue(currentBoard.title);
              setIsEditingTitle(true);
            }}
            className="text-base md:text-lg font-bold text-foreground hover:text-primary transition-colors cursor-pointer truncate max-w-[220px]"
            title="Clique para renomear"
          >
            {currentBoard.title}
          </h1>
        )}

        {/* Favorite Star */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => toggleFavoriteBoard(currentBoard.id)}
          className="h-8 w-8 text-muted-foreground hover:text-amber-400 transition-colors"
          title={
            currentBoard.is_favorite
              ? "Remover dos favoritos"
              : "Favoritar quadro"
          }
        >
          <Star
            className={`h-4 w-4 ${
              currentBoard.is_favorite
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground"
            }`}
          />
        </Button>

        {/* View Switcher: Kanban, Tabela, Calendário, Cronograma, Painel */}
        <div className="hidden xl:flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/50">
          <button
            onClick={() => setBoardView("kanban")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              boardView === "kanban"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Kanban</span>
          </button>

          <button
            onClick={() => setBoardView("table")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              boardView === "table"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Table className="h-3.5 w-3.5" />
            <span>Tabela</span>
          </button>

          <button
            onClick={() => setBoardView("calendar")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              boardView === "calendar"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Calendário</span>
          </button>

          <button
            onClick={() => setBoardView("timeline")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              boardView === "timeline"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Cronograma</span>
          </button>

          <button
            onClick={() => setBoardView("dashboard")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              boardView === "dashboard"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Painel</span>
          </button>
        </div>

        {/* Members Avatars & Invite button */}
        <div className="flex items-center gap-1.5 pl-2 border-l border-border/40">
          <div className="flex items-center -space-x-1.5 overflow-hidden">
            {workspaceMembers.slice(0, 4).map((m) => (
              <Avatar
                key={m.id}
                className="h-7 w-7 border-2 border-background ring-1 ring-border/50"
                title={m.profile.full_name || ""}
              >
                <AvatarImage src={m.profile.avatar_url || undefined} />
                <AvatarFallback className="text-[10px]">
                  {getInitials(m.profile.full_name)}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>

          <Button
            variant="ghost"
            size="xs"
            onClick={() => setIsInviteOpen(true)}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Membros</span>
          </Button>
        </div>
      </div>

      {/* Right: Filters, Custom Fields, Share & Board Menu */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsNotificationsOpen(true)}
          className="relative h-8 w-8 bg-background/50"
          title="Notificações"
        >
          <Bell className="h-4 w-4" />
          {unreadNotificationsCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">{unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}</span>}
        </Button>
        <BoardFilters />

        {/* Quick Custom Fields Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCustomFieldsOpen(true)}
          className="h-8 gap-1.5 text-xs bg-background/50 backdrop-blur-sm hidden md:flex"
        >
          <Sliders className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Campos</span>
        </Button>

        {/* Quick Share / Export Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExportImportOpen(true)}
          className="h-8 gap-1.5 text-xs bg-background/50 backdrop-blur-sm hidden sm:flex"
        >
          <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Compartilhar</span>
        </Button>

        {/* Board Options Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-background/50 backdrop-blur-sm"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => setIsCustomFieldsOpen(true)}>
              <Sliders className="h-4 w-4 mr-2" />
              Campos personalizados
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => setIsTemplatesOpen(true)}>
              <LayoutTemplate className="h-4 w-4 mr-2" />
              Galeria de modelos
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => setIsAutomationsOpen(true)}>
              <Bot className="h-4 w-4 mr-2" />
              Automatizações
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => setIsExportImportOpen(true)}>
              <Share2 className="h-4 w-4 mr-2" />
              Exportar / Importar / Link
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => setIsBgDialogOpen(true)}>
              <Palette className="h-4 w-4 mr-2" />
              Alterar plano de fundo
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => setIsActivityOpen(true)}>
              <ActivityIcon className="h-4 w-4 mr-2" />
              Histórico de atividades
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => setIsArchivedOpen(true)}>
              <Archive className="h-4 w-4 mr-2" />
              Itens arquivados
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => duplicateBoard(currentBoard.id)}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicar quadro
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => archiveBoard(currentBoard.id, true)}
            >
              <Archive className="h-4 w-4 mr-2 text-amber-500" />
              Arquivar quadro
            </DropdownMenuItem>
            <DropdownMenuItem
              destructive
              onClick={() => deleteBoard(currentBoard.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir quadro
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <BoardBackgroundDialog
        open={isBgDialogOpen}
        onOpenChange={setIsBgDialogOpen}
      />
      <BoardArchivedDialog
        open={isArchivedOpen}
        onOpenChange={setIsArchivedOpen}
      />
      <BoardActivityDialog
        open={isActivityOpen}
        onOpenChange={setIsActivityOpen}
      />
      <BoardInviteDialog
        open={isInviteOpen}
        onOpenChange={setIsInviteOpen}
      />
      <BoardCustomFieldsDialog
        open={isCustomFieldsOpen}
        onOpenChange={setIsCustomFieldsOpen}
      />
      <BoardExportImportDialog
        open={isExportImportOpen}
        onOpenChange={setIsExportImportOpen}
      />
      <BoardTemplatesDialog
        open={isTemplatesOpen}
        onOpenChange={setIsTemplatesOpen}
      />
      <BoardNotificationsDialog
        open={isNotificationsOpen}
        onOpenChange={setIsNotificationsOpen}
      />
      <BoardAutomationsDialog
        open={isAutomationsOpen}
        onOpenChange={setIsAutomationsOpen}
      />
    </div>
  );
}
