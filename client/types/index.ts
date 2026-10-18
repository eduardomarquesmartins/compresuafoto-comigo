import { Database, WorkspaceRole, CardPriority, BoardBackgroundType, BoardVisibility, InvitationStatus } from './database.types';

export type { WorkspaceRole, CardPriority, BoardBackgroundType, BoardVisibility, InvitationStatus };

export type CustomFieldType = 'text' | 'number' | 'currency' | 'dropdown' | 'checkbox' | 'date';

export interface CustomFieldOption {
  id: string;
  value: string;
  color?: string;
}

export interface CustomField {
  id: string;
  board_id: string;
  name: string;
  type: CustomFieldType;
  options?: CustomFieldOption[];
  show_on_card: boolean;
  created_at: string;
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Workspace = Database['public']['Tables']['workspaces']['Row'];
export type WorkspaceMember = Database['public']['Tables']['workspace_members']['Row'];
export type WorkspaceInvitation = Database['public']['Tables']['workspace_invitations']['Row'];
export type Board = Database['public']['Tables']['boards']['Row'];
export type BoardMember = Database['public']['Tables']['board_members']['Row'];

export interface List {
  id: string;
  board_id: string;
  title: string;
  position: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  card_limit?: number | null;
  is_collapsed?: boolean;
}

export interface Card {
  id: string;
  list_id: string;
  board_id?: string;
  created_by?: string;
  title: string;
  description: string | null;
  position: number;
  is_completed: boolean;
  is_archived: boolean;
  priority: CardPriority;
  due_date: string | null;
  due_time: string | null;
  start_date?: string | null;
  cover_color: string | null;
  cover_url: string | null;
  is_template?: boolean;
  votes?: string[]; // user IDs
  watchers?: string[]; // user IDs
  custom_field_values?: Record<string, any>; // field_id -> value
  created_at: string;
  updated_at: string;
}

export type CardMember = Database['public']['Tables']['card_members']['Row'];
export type Label = Database['public']['Tables']['labels']['Row'];
export type CardLabel = Database['public']['Tables']['card_labels']['Row'];
export type Checklist = Database['public']['Tables']['checklists']['Row'];

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  title: string;
  is_completed: boolean;
  position: number;
  created_at: string;
  due_date?: string | null;
  assigned_to?: string | null; // Profile ID
}

export interface Comment {
  id: string;
  card_id: string;
  user_id: string;
  content: string;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  reactions?: Record<string, string[]>; // emoji -> user_ids[]
}

export type Attachment = Database['public']['Tables']['attachments']['Row'];
export type Activity = Database['public']['Tables']['activities']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];

// Extended Joined Types
export interface WorkspaceMemberWithProfile extends WorkspaceMember {
  profile: Profile;
}

export interface WorkspaceWithDetails extends Workspace {
  members?: WorkspaceMemberWithProfile[];
  boards?: Board[];
  role?: WorkspaceRole;
}

export interface ChecklistWithItems extends Checklist {
  items: ChecklistItem[];
}

export interface CommentWithUser extends Comment {
  user: Profile;
}

export interface CardWithDetails extends Card {
  members: Profile[];
  labels: Label[];
  checklists: ChecklistWithItems[];
  comments?: CommentWithUser[];
  attachments?: Attachment[];
  comments_count?: number;
  attachments_count?: number;
  checklists_count?: number;
  checklists_completed_count?: number;
}

export interface ListWithCards extends List {
  cards: CardWithDetails[];
}

export interface BoardWithLists extends Board {
  lists: ListWithCards[];
  members?: Profile[];
  labels?: Label[];
  custom_fields?: CustomField[];
}

export interface ActivityWithUser extends Activity {
  user: Profile;
}

export interface NotificationWithActor extends Notification {
  actor?: Profile | null;
}

// Filter State for Board
export interface BoardFilterState {
  searchQuery: string;
  memberIds: string[];
  labelIds: string[];
  priorities: CardPriority[];
  dueFilter: 'all' | 'no_due' | 'overdue' | 'due_today' | 'due_week' | 'completed';
}

