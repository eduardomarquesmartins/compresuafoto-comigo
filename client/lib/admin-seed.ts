import type {
  ActivityWithUser,
  Board,
  Label,
  ListWithCards,
  NotificationWithActor,
  Profile,
  Workspace,
  WorkspaceMemberWithProfile,
} from "@/types";

export const ECONT_USER: Profile = {
  id: "econti-admin",
  full_name: "Admin Econti",
  username: "admin",
  avatar_url: null,
  bio: "Equipe Econti",
  theme_preference: "light",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const ECONT_WORKSPACE: Workspace = {
  id: "econti-workspace",
  name: "& CONTI",
  slug: "econti",
  description: "Quadros de trabalho da equipe & CONTI.",
  logo_url: null,
  owner_id: ECONT_USER.id,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const ECONT_MEMBERS: WorkspaceMemberWithProfile[] = [
  {
    id: "econti-admin-member",
    workspace_id: ECONT_WORKSPACE.id,
    user_id: ECONT_USER.id,
    role: "OWNER",
    created_at: new Date().toISOString(),
    profile: ECONT_USER,
  },
];

export const ECONT_BOARDS: Board[] = [
  {
    id: "econti-board",
    workspace_id: ECONT_WORKSPACE.id,
    title: "Operação Econti",
    description: "Acompanhe tarefas, responsáveis e prazos da equipe.",
    background_type: "color",
    background_value: "#f5f6f8",
    visibility: "workspace",
    is_archived: false,
    is_favorite: true,
    position: 1000,
    created_by: ECONT_USER.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const ECONT_LISTS: ListWithCards[] = [
  { id: "econti-todo", board_id: ECONT_BOARDS[0].id, title: "A fazer", position: 1000, is_archived: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), cards: [] },
  { id: "econti-doing", board_id: ECONT_BOARDS[0].id, title: "Em andamento", position: 2000, is_archived: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), cards: [] },
  { id: "econti-done", board_id: ECONT_BOARDS[0].id, title: "Concluído", position: 3000, is_archived: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), cards: [] },
];

export const ECONT_LABELS: Label[] = [
  { id: "econti-label-operacao", workspace_id: ECONT_WORKSPACE.id, board_id: null, name: "Operação", color: "#2563eb", created_at: new Date().toISOString() },
];

export const ECONT_ACTIVITIES: ActivityWithUser[] = [];
export const ECONT_NOTIFICATIONS: NotificationWithActor[] = [];
