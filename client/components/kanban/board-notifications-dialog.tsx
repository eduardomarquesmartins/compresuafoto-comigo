"use client";

import { useKonti } from "@/features/kanban/use-konti";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bell, Check } from "lucide-react";

export function BoardNotificationsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { notifications, currentUser, unreadNotificationsCount, markNotificationAsRead, markAllNotificationsAsRead } = useKonti();
  const visibleNotifications = notifications
    .filter((item) => item.user_id === currentUser.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Bell className="h-4 w-4" />Notificações</DialogTitle>
        </DialogHeader>
        {unreadNotificationsCount > 0 && (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={markAllNotificationsAsRead}>Marcar todas como lidas</Button>
          </div>
        )}
        <div className="max-h-[55vh] space-y-2 overflow-y-auto">
          {visibleNotifications.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Você está em dia. Nenhuma notificação por aqui.</p>
          ) : visibleNotifications.map((item) => (
            <div key={item.id} className={`flex items-start gap-3 rounded-lg border p-3 ${item.is_read ? "border-border bg-background" : "border-primary/20 bg-primary/5"}`}>
              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.is_read ? "bg-muted-foreground/30" : "bg-primary"}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{item.title}</p>
                {item.message && <p className="mt-1 text-xs text-muted-foreground">{item.message}</p>}
                <p className="mt-2 text-[11px] text-muted-foreground">{new Date(item.created_at).toLocaleString("pt-BR")}</p>
              </div>
              {!item.is_read && <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label="Marcar como lida" onClick={() => markNotificationAsRead(item.id)}><Check className="h-4 w-4" /></Button>}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
