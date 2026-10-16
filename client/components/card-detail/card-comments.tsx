"use client";

import React, { useState } from "react";
import { useKonti } from "@/features/kanban/use-konti";
import { CardWithDetails, CommentWithUser } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/utils";
import { MessageSquare, Send, Trash2, Smile, AtSign } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CardCommentsProps {
  card: CardWithDetails;
}

const EMOJI_OPTIONS = ["👍", "❤️", "🚀", "🎉", "👀", "🎯"];

export function CardComments({ card }: CardCommentsProps) {
  const {
    currentUser,
    workspaceMembers,
    addComment,
    deleteComment,
    toggleCommentReaction,
    updateCard,
  } = useKonti();

  const [commentText, setCommentText] = useState("");

  const cardComments = card.comments || [];

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (commentText.trim()) {
      const newComment: CommentWithUser = {
        id: `cmt-${Date.now()}`,
        card_id: card.id,
        user_id: currentUser.id,
        content: commentText.trim(),
        is_edited: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user: currentUser,
        reactions: {},
      };

      const updated = [newComment, ...cardComments];
      updateCard(card.id, {
        comments: updated,
        comments_count: updated.length,
      });

      addComment(card.id, commentText.trim());
      setCommentText("");
    }
  };

  const handleDeleteComment = (commentId: string) => {
    const updated = cardComments.filter((c) => c.id !== commentId);
    updateCard(card.id, {
      comments: updated,
      comments_count: updated.length,
    });
    deleteComment(commentId);
  };

  const handleInsertMention = (name: string) => {
    const clean = name.replace(/\s+/g, "");
    setCommentText((prev) => `${prev}@${clean} `);
  };

  // Render comment text with highlighted @mentions
  const renderCommentContent = (content: string) => {
    const parts = content.split(/(@[a-zA-ZÀ-ÿ0-9_]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith("@")) {
        return (
          <span
            key={index}
            className="text-primary font-semibold bg-primary/10 px-1 py-0.5 rounded text-[11px]"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">
          Comentários ({cardComments.length})
        </h4>
      </div>

      {/* Comment composer */}
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8 mt-1 shrink-0">
          <AvatarImage src={currentUser.avatar_url || undefined} />
          <AvatarFallback>{getInitials(currentUser.full_name)}</AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-2">
          <Textarea
            placeholder="Escreva um comentário... Use @ para mencionar colegas (Ctrl+Enter para enviar)"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            className="min-h-[70px] text-xs bg-muted/20"
          />

          {/* Quick Mention buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <AtSign className="h-3 w-3" /> Mencionar:
              </span>
              {workspaceMembers.slice(0, 3).map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => handleInsertMention(m.profile.full_name || "Colega")}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-muted/40 hover:bg-muted/80 text-foreground transition-colors border border-border/40"
                >
                  @{m.profile.full_name?.split(" ")[0]}
                </button>
              ))}
            </div>

            {commentText.trim() && (
              <Button
                size="sm"
                onClick={() => handleSubmit()}
                className="h-7 text-xs"
              >
                <Send className="h-3 w-3 mr-1.5" />
                Comentar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-2.5 pt-2">
        {cardComments.length > 0 ? (
          cardComments.map((cmt) => {
            const reactions = cmt.reactions || {};

            return (
              <div
                key={cmt.id}
                className="group flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border/40 hover:bg-muted/30 transition-colors"
              >
                <Avatar className="h-7 w-7 mt-0.5 shrink-0">
                  <AvatarImage src={cmt.user.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(cmt.user.full_name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      {cmt.user.full_name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(cmt.created_at), "d MMM 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </span>

                      {/* Emoji reaction button */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
                            title="Reagir com emoji"
                          >
                            <Smile className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="flex gap-1 p-1 min-w-0">
                          {EMOJI_OPTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => toggleCommentReaction(card.id, cmt.id, emoji)}
                              className="p-1 hover:bg-muted rounded text-sm transition-transform hover:scale-125"
                            >
                              {emoji}
                            </button>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteComment(cmt.id)}
                        className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                        title="Excluir comentário"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                    {renderCommentContent(cmt.content)}
                  </p>

                  {/* Render Reaction Pills */}
                  {Object.keys(reactions).length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {Object.entries(reactions).map(([emoji, users]) => {
                        const hasReacted = users.includes(currentUser.id);
                        return (
                          <button
                            key={emoji}
                            onClick={() => toggleCommentReaction(card.id, cmt.id, emoji)}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] border transition-colors ${
                              hasReacted
                                ? "bg-primary/15 border-primary/40 text-primary font-bold"
                                : "bg-muted/40 border-border/50 text-muted-foreground hover:text-foreground"
                            }`}
                            title={`${users.length} pessoa(s) reagiram`}
                          >
                            <span>{emoji}</span>
                            <span>{users.length}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-xs text-muted-foreground text-center py-4">
            Nenhum comentário publicado ainda. Seja o primeiro a comentar!
          </p>
        )}
      </div>
    </div>
  );
}
