export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
export type CardPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent';
export type BoardBackgroundType = 'color' | 'gradient' | 'image';
export type BoardVisibility = 'private' | 'workspace' | 'public';
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'canceled';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          username: string | null;
          avatar_url: string | null;
          bio: string | null;
          theme_preference: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          username?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          theme_preference?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          username?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          theme_preference?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          logo_url: string | null;
          owner_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          logo_url?: string | null;
          owner_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          logo_url?: string | null;
          owner_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: WorkspaceRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          role?: WorkspaceRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          role?: WorkspaceRole;
          created_at?: string;
        };
      };
      workspace_invitations: {
        Row: {
          id: string;
          workspace_id: string;
          email: string;
          role: WorkspaceRole;
          token: string;
          status: InvitationStatus;
          expires_at: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          email: string;
          role?: WorkspaceRole;
          token?: string;
          status?: InvitationStatus;
          expires_at?: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          email?: string;
          role?: WorkspaceRole;
          token?: string;
          status?: InvitationStatus;
          expires_at?: string;
          created_by?: string;
          created_at?: string;
        };
      };
      boards: {
        Row: {
          id: string;
          workspace_id: string;
          title: string;
          description: string | null;
          background_type: BoardBackgroundType;
          background_value: string;
          visibility: BoardVisibility;
          is_archived: boolean;
          is_favorite: boolean;
          position: number;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          title: string;
          description?: string | null;
          background_type?: BoardBackgroundType;
          background_value?: string;
          visibility?: BoardVisibility;
          is_archived?: boolean;
          is_favorite?: boolean;
          position?: number;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          title?: string;
          description?: string | null;
          background_type?: BoardBackgroundType;
          background_value?: string;
          visibility?: BoardVisibility;
          is_archived?: boolean;
          is_favorite?: boolean;
          position?: number;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      board_members: {
        Row: {
          id: string;
          board_id: string;
          user_id: string;
          role: WorkspaceRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          board_id: string;
          user_id: string;
          role?: WorkspaceRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          board_id?: string;
          user_id?: string;
          role?: WorkspaceRole;
          created_at?: string;
        };
      };
      lists: {
        Row: {
          id: string;
          board_id: string;
          title: string;
          position: number;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          board_id: string;
          title: string;
          position?: number;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          board_id?: string;
          title?: string;
          position?: number;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      cards: {
        Row: {
          id: string;
          list_id: string;
          board_id: string;
          title: string;
          description: string | null;
          cover_url: string | null;
          cover_color: string | null;
          priority: CardPriority;
          start_date: string | null;
          due_date: string | null;
          due_time: string | null;
          is_completed: boolean;
          is_archived: boolean;
          position: number;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          list_id: string;
          board_id: string;
          title: string;
          description?: string | null;
          cover_url?: string | null;
          cover_color?: string | null;
          priority?: CardPriority;
          start_date?: string | null;
          due_date?: string | null;
          due_time?: string | null;
          is_completed?: boolean;
          is_archived?: boolean;
          position?: number;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          list_id?: string;
          board_id?: string;
          title?: string;
          description?: string | null;
          cover_url?: string | null;
          cover_color?: string | null;
          priority?: CardPriority;
          start_date?: string | null;
          due_date?: string | null;
          due_time?: string | null;
          is_completed?: boolean;
          is_archived?: boolean;
          position?: number;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      card_members: {
        Row: {
          id: string;
          card_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          card_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          card_id?: string;
          user_id?: string;
          created_at?: string;
        };
      };
      labels: {
        Row: {
          id: string;
          workspace_id: string;
          board_id: string | null;
          name: string;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          board_id?: string | null;
          name: string;
          color: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          board_id?: string | null;
          name?: string;
          color?: string;
          created_at?: string;
        };
      };
      card_labels: {
        Row: {
          id: string;
          card_id: string;
          label_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          card_id: string;
          label_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          card_id?: string;
          label_id?: string;
          created_at?: string;
        };
      };
      checklists: {
        Row: {
          id: string;
          card_id: string;
          title: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          card_id: string;
          title?: string;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          card_id?: string;
          title?: string;
          position?: number;
          created_at?: string;
        };
      };
      checklist_items: {
        Row: {
          id: string;
          checklist_id: string;
          title: string;
          is_completed: boolean;
          position: number;
          due_date: string | null;
          assigned_to: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          checklist_id: string;
          title: string;
          is_completed?: boolean;
          position?: number;
          due_date?: string | null;
          assigned_to?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          checklist_id?: string;
          title?: string;
          is_completed?: boolean;
          position?: number;
          due_date?: string | null;
          assigned_to?: string | null;
          created_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          card_id: string;
          user_id: string;
          content: string;
          is_edited: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          card_id: string;
          user_id: string;
          content: string;
          is_edited?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          card_id?: string;
          user_id?: string;
          content?: string;
          is_edited?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      attachments: {
        Row: {
          id: string;
          card_id: string;
          user_id: string;
          file_name: string;
          file_size: number;
          file_type: string;
          storage_path: string;
          url: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          card_id: string;
          user_id: string;
          file_name: string;
          file_size: number;
          file_type: string;
          storage_path: string;
          url: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          card_id?: string;
          user_id?: string;
          file_name?: string;
          file_size?: number;
          file_type?: string;
          storage_path?: string;
          url?: string;
          created_at?: string;
        };
      };
      activities: {
        Row: {
          id: string;
          workspace_id: string;
          board_id: string | null;
          card_id: string | null;
          user_id: string;
          action_type: string;
          entity_type: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          board_id?: string | null;
          card_id?: string | null;
          user_id: string;
          action_type: string;
          entity_type: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          board_id?: string | null;
          card_id?: string | null;
          user_id?: string;
          action_type?: string;
          entity_type?: string;
          metadata?: Json;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          actor_id: string | null;
          type: string;
          title: string;
          message: string;
          entity_type: string;
          entity_id: string | null;
          workspace_id: string | null;
          board_id: string | null;
          is_read: boolean;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          actor_id?: string | null;
          type: string;
          title: string;
          message: string;
          entity_type: string;
          entity_id?: string | null;
          workspace_id?: string | null;
          board_id?: string | null;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          actor_id?: string | null;
          type?: string;
          title?: string;
          message?: string;
          entity_type?: string;
          entity_id?: string | null;
          workspace_id?: string | null;
          board_id?: string | null;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
      };
    };
  };
}
