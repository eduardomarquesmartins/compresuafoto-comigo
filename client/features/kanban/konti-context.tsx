"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/api";
import {
  Profile,
  Workspace,
  WorkspaceMemberWithProfile,
  Board,
  ListWithCards,
  CardWithDetails,
  Label,
  ChecklistWithItems,
  ChecklistItem,
  ActivityWithUser,
  NotificationWithActor,
  BoardFilterState,
  WorkspaceRole,
  CardPriority,
  BoardBackgroundType,
  BoardVisibility,
  CustomField,
  CustomFieldType,
  CustomFieldOption,
} from "@/types";
import {
  ECONT_USER,
  ECONT_WORKSPACE,
  ECONT_MEMBERS,
  ECONT_BOARDS,
  ECONT_LISTS,
  ECONT_LABELS,
  ECONT_ACTIVITIES,
  ECONT_NOTIFICATIONS,
} from "@/lib/admin-seed";
import { BOARD_TEMPLATES } from "@/lib/constants/templates";
import { calculateNewPosition } from "@/lib/utils/fractional-index";
import { toast } from "sonner";

export type BoardViewMode = "kanban" | "table" | "calendar" | "timeline" | "dashboard";

export interface KontiAutomationRule {
  id: string;
  board_id: string;
  source_list_id: string;
  target_list_id: string;
  enabled: boolean;
  created_at: string;
}

interface KontiContextType {
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  isPersistenceAvailable: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  register: (fullName: string, email: string, password?: string, workspaceName?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;

  currentUser: Profile;
  setCurrentUser: React.Dispatch<React.SetStateAction<Profile>>;
  allUsers: Profile[];

  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  workspaceMembers: WorkspaceMemberWithProfile[];

  boards: Board[];
  currentBoard: Board | null;
  setCurrentBoard: (board: Board | null) => void;

  boardView: BoardViewMode;
  setBoardView: (view: BoardViewMode) => void;

  lists: ListWithCards[];
  allLabels: Label[];
  customFields: CustomField[];
  activities: ActivityWithUser[];
  notifications: NotificationWithActor[];
  unreadNotificationsCount: number;
  automationRules: KontiAutomationRule[];

  filterState: BoardFilterState;
  setFilterState: React.Dispatch<React.SetStateAction<BoardFilterState>>;
  resetFilters: () => void;

  activeCardId: string | null;
  setActiveCardId: (cardId: string | null) => void;
  activeCard: CardWithDetails | null;

  // Actions
  createWorkspace: (data: { name: string; description?: string | null; logoUrl?: string | null }) => Workspace;
  updateWorkspace: (id: string, data: Partial<Workspace>) => void;
  deleteWorkspace: (id: string) => void;
  inviteMember: (email: string, role: WorkspaceRole) => void;
  createAutomationRule: (sourceListId: string, targetListId: string) => void;
  toggleAutomationRule: (ruleId: string) => void;
  deleteAutomationRule: (ruleId: string) => void;
  updateMemberRole: (memberId: string, role: WorkspaceRole) => void;
  removeMember: (memberId: string) => void;

  createBoard: (data: {
    title: string;
    description?: string | null;
    backgroundType: BoardBackgroundType;
    backgroundValue: string;
    visibility: BoardVisibility;
  }) => Board;
  updateBoard: (id: string, data: Partial<Board>) => void;
  duplicateBoard: (id: string) => Board;
  toggleFavoriteBoard: (id: string) => void;
  archiveBoard: (id: string, archive?: boolean) => void;
  deleteBoard: (id: string) => void;

  createList: (title: string) => void;
  updateList: (id: string, title: string) => void;
  reorderList: (listId: string, newPosition: number) => void;
  duplicateList: (listId: string) => void;
  archiveList: (listId: string) => void;
  restoreList: (listId: string) => void;
  deleteList: (listId: string) => void;
  moveAllCardsInList: (sourceListId: string, targetListId: string) => void;
  archiveAllCardsInList: (listId: string) => void;
  sortListCards: (listId: string, sortBy: "dueDate" | "priority" | "title") => void;
  setListLimit: (listId: string, limit: number | null) => void;
  toggleListCollapse: (listId: string) => void;

  createCard: (listId: string, title: string) => void;
  updateCard: (id: string, data: Partial<CardWithDetails>) => void;
  moveCard: (
    cardId: string,
    sourceOrTargetListId: string,
    targetListId?: string,
    newPosition?: number,
    targetIndex?: number
  ) => void;
  duplicateCard: (cardId: string) => void;
  archiveCard: (cardId: string) => void;
  restoreCard: (cardId: string) => void;
  deleteCard: (cardId: string) => void;
  toggleCardCompleted: (cardId: string) => void;
  assignCardMember: (cardId: string, user: Profile) => void;
  removeCardMember: (cardId: string, userId: string) => void;
  toggleCardLabel: (cardId: string, label: Label) => void;
  toggleCardVote: (cardId: string) => void;
  toggleWatchCard: (cardId: string) => void;
  saveCardAsTemplate: (cardId: string) => void;
  createCardFromTemplate: (listId: string, templateCard: CardWithDetails) => void;

  createChecklist: (cardId: string, title: string) => void;
  deleteChecklist: (cardId: string, checklistId: string) => void;
  createChecklistItem: (checklistId: string, title: string) => void;
  toggleChecklistItem: (checklistId: string, itemId: string) => void;
  deleteChecklistItem: (checklistId: string, itemId: string) => void;
  convertChecklistItemToCard: (cardId: string, checklistId: string, itemId: string) => void;
  updateChecklistItem: (checklistId: string, itemId: string, data: Partial<ChecklistItem>) => void;

  addComment: (cardId: string, content: string) => void;
  deleteComment: (commentId: string) => void;
  toggleCommentReaction: (cardId: string, commentId: string, emoji: string) => void;

  addAttachment: (cardId: string, attachment: Attachment) => void;
  deleteAttachment: (attachmentId: string) => void;

  createCustomLabel: (name: string, color: string) => Label;

  createCustomField: (data: { name: string; type: CustomFieldType; options?: CustomFieldOption[]; show_on_card: boolean }) => CustomField;
  updateCustomField: (id: string, data: Partial<CustomField>) => void;
  deleteCustomField: (id: string) => void;
  setCardCustomFieldValue: (cardId: string, fieldId: string, value: any) => void;

  createBoardFromTemplate: (templateId: string, customTitle?: string) => Board;
  exportBoardToJson: (boardId: string) => void;
  exportBoardToCsv: (boardId: string) => void;
  importBoardFromJson: (jsonData: any) => Board | null;

  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  deleteNotification: (id: string) => void;
}

const KontiContext = createContext<KontiContextType | undefined>(undefined);

const STORAGE_PREFIX = "konti_saas_v1_";

export function KontiProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Profile>(ECONT_USER);
  const [allUsers, setAllUsers] = useState<Profile[]>([ECONT_USER]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isPersistenceAvailable, setIsPersistenceAvailable] = useState(false);

  const [workspaces, setWorkspaces] = useState<Workspace[]>([ECONT_WORKSPACE]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(ECONT_WORKSPACE);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMemberWithProfile[]>(ECONT_MEMBERS);

  const [boards, setBoards] = useState<Board[]>(ECONT_BOARDS);
  const [currentBoard, setCurrentBoard] = useState<Board | null>(ECONT_BOARDS[0]);
  const [boardView, setBoardView] = useState<BoardViewMode>("kanban");

  const [lists, setLists] = useState<ListWithCards[]>(ECONT_LISTS);
  const [allLabels, setAllLabels] = useState<Label[]>(ECONT_LABELS);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [activities, setActivities] = useState<ActivityWithUser[]>(ECONT_ACTIVITIES);
  const [notifications, setNotifications] = useState<NotificationWithActor[]>(ECONT_NOTIFICATIONS);
  const [automationRules, setAutomationRules] = useState<KontiAutomationRule[]>([]);
  const stateWriteQueues = useRef(new Map<string, Promise<unknown>>());

  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  const [filterState, setFilterState] = useState<BoardFilterState>({
    searchQuery: "",
    memberIds: [],
    labelIds: [],
    priorities: [],
    dueFilter: "all",
  });

  // Load the shared admin workspace from the Econti API, with local state as an offline fallback.
  useEffect(() => {
    let cancelled = false;
    const keys = ["users", "workspaces", "boards", "lists", "labels", "custom_fields", "members", "notifications", "activities", "automation_rules"] as const;
    const setters: Record<string, (value: any) => void> = {
      users: setAllUsers,
      workspaces: setWorkspaces,
      boards: (value) => {
        setBoards(value);
        const selectedBoardId = localStorage.getItem(`${STORAGE_PREFIX}current_board`);
        setCurrentBoard((current) => value.find((board: Board) => board.id === selectedBoardId) || value.find((board: Board) => board.id === current?.id) || value[0] || null);
      },
      lists: setLists,
      labels: setAllLabels,
      custom_fields: setCustomFields,
      members: setWorkspaceMembers,
      notifications: setNotifications,
      activities: setActivities,
      automation_rules: setAutomationRules,
    };

    const load = async () => {
      let remoteState: Record<string, unknown> = {};
      let online = false;
      try {
        const response = await api.get("/konti/state");
        remoteState = response.data || {};
        online = true;
      } catch (error) {
        console.warn("KONTI: usando o estado local até a API estar disponível.", error);
      }

      try {
        const storedAdmin = JSON.parse(localStorage.getItem("user") || "{}");
        const adminProfile: Profile = {
          ...ECONT_USER,
          id: String(storedAdmin.id ?? ECONT_USER.id),
          full_name: storedAdmin.fullName || storedAdmin.name || storedAdmin.email?.split("@")[0] || ECONT_USER.full_name,
          username: String(storedAdmin.email || "admin").split("@")[0].toLowerCase(),
          bio: "Equipe Econti",
          theme_preference: "light",
          updated_at: new Date().toISOString(),
        };
        if (!cancelled) {
          setCurrentUser(adminProfile);
          setIsAuthenticated(true);
        }

        for (const key of keys) {
          const localValue = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
          let value = Object.prototype.hasOwnProperty.call(remoteState, key)
            ? remoteState[key]
            : (online ? null : localValue ? JSON.parse(localValue) : null);
          if (key === "users" && Array.isArray(value) && !value.some((profile: Profile) => profile.id === adminProfile.id)) {
            value = [...value, adminProfile];
          }
          if (key === "members" && Array.isArray(value) && !value.some((member: WorkspaceMemberWithProfile) => member.user_id === adminProfile.id)) {
            value = [...value, {
              id: `econti-admin-member-${adminProfile.id}`,
              workspace_id: ECONT_WORKSPACE.id,
              user_id: adminProfile.id,
              role: "OWNER",
              created_at: new Date().toISOString(),
              profile: adminProfile,
            }];
          }
          if (value !== null && value !== undefined) {
            if (!cancelled) setters[key](value);
            if (online && Object.prototype.hasOwnProperty.call(remoteState, key) && (key === "users" || key === "members")) {
              await api.put(`/konti/state/${key}`, { data: value });
            }
          } else if (online && !Object.prototype.hasOwnProperty.call(remoteState, key)) {
            const defaults: Record<string, unknown> = {
              users: [adminProfile], workspaces: [ECONT_WORKSPACE], boards: ECONT_BOARDS,
              lists: ECONT_LISTS, labels: ECONT_LABELS, custom_fields: [],
              members: [{ ...ECONT_MEMBERS[0], user_id: adminProfile.id, profile: adminProfile }],
              notifications: [], activities: [],
              automation_rules: [],
            };
            await api.put(`/konti/state/${key}`, { data: defaults[key] });
            if (!cancelled) setters[key](defaults[key]);
          }
        }
        if (!cancelled) setIsPersistenceAvailable(online);
      } catch (error) {
        if (!cancelled) setIsPersistenceAvailable(false);
        console.error("Falha ao carregar o espaço KONTI.", error);
      } finally {
        if (!cancelled) setIsAuthLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (currentBoard?.id) localStorage.setItem(`${STORAGE_PREFIX}current_board`, currentBoard.id);
  }, [currentBoard?.id]);

  // Keep local recovery data and serialize writes per collection to avoid stale updates.
  const saveState = useCallback((key: string, data: unknown) => {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(data));
    } catch (e) {
      console.error(`Error saving ${key} to localStorage`, e);
    }
    const previous = stateWriteQueues.current.get(key) || Promise.resolve();
    const next = previous
      .catch(() => undefined)
      .then(() => api.put(`/konti/state/${key}`, { data }))
      .then((response) => {
        setIsPersistenceAvailable(true);
        return response;
      });
    stateWriteQueues.current.set(key, next);
    void next.catch((error) => {
      setIsPersistenceAvailable(false);
      console.error(`KONTI: falha ao salvar ${key} na API.`, error);
    });
  }, []);

  // Helper to log activity
  const logActivity = useCallback(
    (actionType: string, entityType: string, metadata: Record<string, unknown>, cardId?: string) => {
      const newAct: ActivityWithUser = {
        id: `act-${Date.now()}`,
        workspace_id: currentWorkspace?.id || ECONT_WORKSPACE.id,
        board_id: currentBoard?.id || null,
        card_id: cardId || null,
        user_id: currentUser.id,
        action_type: actionType,
        entity_type: entityType,
        metadata: metadata as any,
        created_at: new Date().toISOString(),
        user: currentUser,
      };
      setActivities((prev) => {
        const next = [newAct, ...prev];
        saveState("activities", next);
        return next;
      });
    },
    [currentWorkspace, currentBoard, currentUser, saveState]
  );

  const resetFilters = useCallback(() => {
    setFilterState({
      searchQuery: "",
      memberIds: [],
      labelIds: [],
      priorities: [],
      dueFilter: "all",
    });
  }, []);

  // Active Card computation
  const activeCard = React.useMemo(() => {
    if (!activeCardId) return null;
    for (const list of lists) {
      const found = list.cards.find((c) => c.id === activeCardId);
      if (found) return found;
    }
    return null;
  }, [activeCardId, lists]);

  const unreadNotificationsCount = React.useMemo(() => {
    return notifications.filter((n) => !n.is_read && n.user_id === currentUser.id).length;
  }, [notifications, currentUser.id]);

  // AUTH ACTIONS
  const login = useCallback(
    async (email: string, _password?: string) => {
      setIsAuthLoading(true);
      try {
        const savedUsers = localStorage.getItem(`${STORAGE_PREFIX}users`);
        const users: Profile[] = savedUsers ? JSON.parse(savedUsers) : [];
        let user = users.find(
          (u) =>
            u.username === email.split("@")[0].toLowerCase() ||
            u.id === email ||
            u.full_name?.toLowerCase() === email.toLowerCase()
        );

        if (!user) {
          user = {
            id: `usr-${Date.now()}`,
            full_name:
              email.split("@")[0].charAt(0).toUpperCase() +
              email.split("@")[0].slice(1),
            username:
              email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "") ||
              "usuario",
            avatar_url: null,
            bio: "Membro do KONTI",
            theme_preference: "dark",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          const nextUsers = [...users, user];
          localStorage.setItem(`${STORAGE_PREFIX}users`, JSON.stringify(nextUsers));
          setAllUsers(nextUsers);
        }

        setCurrentUser(user);
        setIsAuthenticated(true);
        localStorage.setItem(
          `${STORAGE_PREFIX}session_user`,
          JSON.stringify(user)
        );
        setIsAuthLoading(false);
        return { success: true };
      } catch (e: any) {
        setIsAuthLoading(false);
        return { success: false, error: e?.message || "Erro no login" };
      }
    },
    []
  );

  const register = useCallback(
    async (
      fullName: string,
      email: string,
      _password?: string,
      workspaceName?: string
    ) => {
      setIsAuthLoading(true);
      try {
        const newUser: Profile = {
          id: `usr-${Date.now()}`,
          full_name: fullName.trim(),
          username:
            email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "") ||
            `user${Date.now().toString().slice(-4)}`,
          avatar_url: null,
          bio: "Membro do KONTI",
          theme_preference: "dark",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const savedUsers = localStorage.getItem(`${STORAGE_PREFIX}users`);
        const users: Profile[] = savedUsers ? JSON.parse(savedUsers) : [];
        const nextUsers = [...users.filter((u) => u.id !== newUser.id), newUser];
        localStorage.setItem(`${STORAGE_PREFIX}users`, JSON.stringify(nextUsers));
        setAllUsers(nextUsers);

        const wsTitle = workspaceName?.trim() || `${fullName.trim()} Workspace`;
        const newWs: Workspace = {
          id: `ws-${Date.now()}`,
          name: wsTitle,
          slug: wsTitle.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-"),
          description: "Espaço principal de trabalho.",
          logo_url: null,
          owner_id: newUser.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const newMember: WorkspaceMemberWithProfile = {
          id: `wsm-${Date.now()}`,
          workspace_id: newWs.id,
          user_id: newUser.id,
          role: "OWNER",
          created_at: new Date().toISOString(),
          profile: newUser,
        };

        const newBoard: Board = {
          id: `brd-${Date.now()}`,
          workspace_id: newWs.id,
          title: "Projeto Website",
          description: "Quadro principal para gerenciar entregas e tarefas.",
          background_type: "gradient",
          background_value:
            "linear-gradient(135deg, #090d16 0%, #1e1b4b 50%, #311042 100%)",
          visibility: "workspace",
          is_archived: false,
          is_favorite: true,
          position: 1000,
          created_by: newUser.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const initialNewLists: ListWithCards[] = [
          {
            id: `lst-${Date.now()}-1`,
            board_id: newBoard.id,
            title: "BACKLOG",
            position: 10000,
            is_archived: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            cards: [
              {
                id: `crd-${Date.now()}-1`,
                list_id: `lst-${Date.now()}-1`,
                board_id: newBoard.id,
                title: "Definir metas e escopo do projeto",
                description:
                  "Estruturar os objetivos principais e os prazos de entrega do projeto.",
                cover_color: "#8b5cf6",
                cover_url: null,
                priority: "high",
                start_date: null,
                due_date: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
                due_time: "18:00",
                is_completed: false,
                is_archived: false,
                position: 1000,
                created_by: newUser.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                members: [newUser],
                labels: [ECONT_LABELS[0]],
                checklists: [],
                comments_count: 0,
                attachments_count: 0,
              },
            ],
          },
          {
            id: `lst-${Date.now()}-2`,
            board_id: newBoard.id,
            title: "EM ANDAMENTO",
            position: 20000,
            is_archived: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            cards: [],
          },
          {
            id: `lst-${Date.now()}-3`,
            board_id: newBoard.id,
            title: "CONCLUÍDO",
            position: 30000,
            is_archived: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            cards: [],
          },
        ];

        setCurrentUser(newUser);
        setWorkspaces([newWs]);
        setCurrentWorkspace(newWs);
        setWorkspaceMembers([newMember]);
        setBoards([newBoard]);
        setCurrentBoard(newBoard);
        setLists(initialNewLists);
        setIsAuthenticated(true);

        localStorage.setItem(
          `${STORAGE_PREFIX}session_user`,
          JSON.stringify(newUser)
        );
        localStorage.setItem(
          `${STORAGE_PREFIX}workspaces`,
          JSON.stringify([newWs])
        );
        localStorage.setItem(
          `${STORAGE_PREFIX}members`,
          JSON.stringify([newMember])
        );
        localStorage.setItem(
          `${STORAGE_PREFIX}boards`,
          JSON.stringify([newBoard])
        );
        localStorage.setItem(
          `${STORAGE_PREFIX}lists`,
          JSON.stringify(initialNewLists)
        );

        setIsAuthLoading(false);
        return { success: true };
      } catch (e: any) {
        setIsAuthLoading(false);
        return { success: false, error: e?.message || "Erro no cadastro" };
      }
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem(`${STORAGE_PREFIX}session_user`);
    setIsAuthenticated(false);
    toast.success("Você saiu da sua conta.");
  }, []);

  // WORKSPACES ACTIONS
  const createWorkspace = useCallback(
    (data: { name: string; description?: string | null; logoUrl?: string | null }) => {
      const newWs: Workspace = {
        id: `ws-${Date.now()}`,
        name: data.name,
        slug: data.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
        description: data.description || null,
        logo_url: data.logoUrl || null,
        owner_id: currentUser.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const updated = [...workspaces, newWs];
      setWorkspaces(updated);
      saveState("workspaces", updated);
      setCurrentWorkspace(newWs);
      toast.success(`Workspace "${newWs.name}" criado com sucesso!`);
      return newWs;
    },
    [workspaces, currentUser.id, saveState]
  );

  const updateWorkspace = useCallback(
    (id: string, data: Partial<Workspace>) => {
      const updated = workspaces.map((w) => (w.id === id ? { ...w, ...data, updated_at: new Date().toISOString() } : w));
      setWorkspaces(updated);
      saveState("workspaces", updated);
      if (currentWorkspace?.id === id) {
        setCurrentWorkspace((prev) => (prev ? { ...prev, ...data } : null));
      }
      toast.success("Workspace atualizado!");
    },
    [workspaces, currentWorkspace, saveState]
  );

  const deleteWorkspace = useCallback(
    (id: string) => {
      if (workspaces.length <= 1) {
        toast.error("Você deve manter pelo menos um workspace.");
        return;
      }
      const filtered = workspaces.filter((w) => w.id !== id);
      setWorkspaces(filtered);
      saveState("workspaces", filtered);
      if (currentWorkspace?.id === id) {
        setCurrentWorkspace(filtered[0] || null);
      }
      toast.success("Workspace excluído.");
    },
    [workspaces, currentWorkspace, saveState]
  );

  const inviteMember = useCallback(
    (email: string, role: WorkspaceRole) => {
      const existing = workspaceMembers.find((m) => m.profile.username === email || m.user_id === email);
      if (existing) {
        toast.error("Membro já faz parte deste workspace.");
        return;
      }
      const newProfile: Profile = {
        id: `usr-${Date.now()}`,
        full_name: email.split("@")[0],
        username: email.split("@")[0],
        avatar_url: null,
        bio: null,
        theme_preference: "dark",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const newMember: WorkspaceMemberWithProfile = {
        id: `wsm-${Date.now()}`,
        workspace_id: currentWorkspace?.id || ECONT_WORKSPACE.id,
        user_id: newProfile.id,
        role: role,
        created_at: new Date().toISOString(),
        profile: newProfile,
      };
      const updated = [...workspaceMembers, newMember];
      setWorkspaceMembers(updated);
      saveState("members", updated);
      toast.success(`${email} foi adicionado à lista local de membros. Nenhum e-mail foi enviado.`);
      logActivity("MEMBER_INVITED", "workspace", { email, role });
    },
    [workspaceMembers, currentWorkspace, saveState, logActivity]
  );

  const createAutomationRule = useCallback((sourceListId: string, targetListId: string) => {
    if (!currentBoard || sourceListId === targetListId) return;
    const rule: KontiAutomationRule = {
      id: `rule-${Date.now()}`,
      board_id: currentBoard.id,
      source_list_id: sourceListId,
      target_list_id: targetListId,
      enabled: true,
      created_at: new Date().toISOString(),
    };
    setAutomationRules((previous) => {
      const next = [...previous, rule];
      saveState("automation_rules", next);
      return next;
    });
    toast.success("Regra de automação criada.");
  }, [currentBoard, saveState]);

  const toggleAutomationRule = useCallback((ruleId: string) => {
    setAutomationRules((previous) => {
      const next = previous.map((rule) => rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule);
      saveState("automation_rules", next);
      return next;
    });
  }, [saveState]);

  const deleteAutomationRule = useCallback((ruleId: string) => {
    setAutomationRules((previous) => {
      const next = previous.filter((rule) => rule.id !== ruleId);
      saveState("automation_rules", next);
      return next;
    });
    toast.success("Regra removida.");
  }, [saveState]);

  const updateMemberRole = useCallback(
    (memberId: string, role: WorkspaceRole) => {
      const updated = workspaceMembers.map((m) => (m.id === memberId ? { ...m, role } : m));
      setWorkspaceMembers(updated);
      saveState("members", updated);
      toast.success("Permissão do membro atualizada.");
    },
    [workspaceMembers, saveState]
  );

  const removeMember = useCallback(
    (memberId: string) => {
      const updated = workspaceMembers.filter((m) => m.id !== memberId);
      setWorkspaceMembers(updated);
      saveState("members", updated);
      toast.success("Membro removido do workspace.");
    },
    [workspaceMembers, saveState]
  );

  // BOARDS ACTIONS
  const createBoard = useCallback(
    (data: {
      title: string;
      description?: string | null;
      backgroundType: BoardBackgroundType;
      backgroundValue: string;
      visibility: BoardVisibility;
    }) => {
      const newBoard: Board = {
        id: `brd-${Date.now()}`,
        workspace_id: currentWorkspace?.id || ECONT_WORKSPACE.id,
        title: data.title,
        description: data.description || null,
        background_type: data.backgroundType,
        background_value: data.backgroundValue,
        visibility: data.visibility,
        is_archived: false,
        is_favorite: false,
        position: (boards[boards.length - 1]?.position || 0) + 1000,
        created_by: currentUser.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const updated = [...boards, newBoard];
      setBoards(updated);
      saveState("boards", updated);
      setCurrentBoard(newBoard);

      const defaultLists: ListWithCards[] = [
        {
          id: `lst-${Date.now()}-1`,
          board_id: newBoard.id,
          title: "A Fazer",
          position: 10000,
          is_archived: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          cards: [],
        },
        {
          id: `lst-${Date.now()}-2`,
          board_id: newBoard.id,
          title: "Em Andamento",
          position: 20000,
          is_archived: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          cards: [],
        },
        {
          id: `lst-${Date.now()}-3`,
          board_id: newBoard.id,
          title: "Concluído",
          position: 30000,
          is_archived: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          cards: [],
        },
      ];
      setLists((prev) => {
        const next = [...prev, ...defaultLists];
        saveState("lists", next);
        return next;
      });

      toast.success(`Quadro "${newBoard.title}" criado!`);
      logActivity("BOARD_CREATED", "board", { title: newBoard.title });
      return newBoard;
    },
    [boards, currentWorkspace, currentUser.id, saveState, logActivity]
  );

  const updateBoard = useCallback(
    (id: string, data: Partial<Board>) => {
      const updated = boards.map((b) => (b.id === id ? { ...b, ...data, updated_at: new Date().toISOString() } : b));
      setBoards(updated);
      saveState("boards", updated);
      if (currentBoard?.id === id) {
        setCurrentBoard((prev) => (prev ? { ...prev, ...data } : null));
      }
      toast.success("Quadro atualizado.");
    },
    [boards, currentBoard, saveState]
  );

  const duplicateBoard = useCallback(
    (id: string) => {
      const original = boards.find((b) => b.id === id);
      if (!original) return {} as Board;

      const dupBoard: Board = {
        ...original,
        id: `brd-${Date.now()}`,
        title: `${original.title} (Cópia)`,
        is_favorite: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const boardLists = lists.filter((l) => l.board_id === id);
      const dupLists: ListWithCards[] = boardLists.map((l, index) => {
        const newListId = `lst-${Date.now()}-${index}`;
        return {
          ...l,
          id: newListId,
          board_id: dupBoard.id,
          cards: l.cards.map((c, cIndex) => ({
            ...c,
            id: `crd-${Date.now()}-${index}-${cIndex}`,
            list_id: newListId,
            board_id: dupBoard.id,
          })),
        };
      });

      const updatedBoards = [...boards, dupBoard];
      setBoards(updatedBoards);
      saveState("boards", updatedBoards);

      setLists((prev) => {
        const next = [...prev, ...dupLists];
        saveState("lists", next);
        return next;
      });

      toast.success(`Quadro "${dupBoard.title}" duplicado!`);
      return dupBoard;
    },
    [boards, lists, saveState]
  );

  const toggleFavoriteBoard = useCallback(
    (id: string) => {
      const updated = boards.map((b) => (b.id === id ? { ...b, is_favorite: !b.is_favorite } : b));
      setBoards(updated);
      saveState("boards", updated);
      if (currentBoard?.id === id) {
        setCurrentBoard((prev) => (prev ? { ...prev, is_favorite: !prev.is_favorite } : null));
      }
    },
    [boards, currentBoard, saveState]
  );

  const archiveBoard = useCallback(
    (id: string, archive = true) => {
      const updated = boards.map((b) => (b.id === id ? { ...b, is_archived: archive } : b));
      setBoards(updated);
      saveState("boards", updated);
      if (currentBoard?.id === id && archive) {
        const remaining = updated.filter((b) => !b.is_archived);
        setCurrentBoard(remaining[0] || null);
      }
      toast.success(archive ? "Quadro arquivado." : "Quadro restaurado.");
    },
    [boards, currentBoard, saveState]
  );

  const deleteBoard = useCallback(
    (id: string) => {
      const updated = boards.filter((b) => b.id !== id);
      setBoards(updated);
      saveState("boards", updated);
      if (currentBoard?.id === id) {
        setCurrentBoard(updated[0] || null);
      }
      toast.success("Quadro excluído.");
    },
    [boards, currentBoard, saveState]
  );

  // LISTS ACTIONS
  const createList = useCallback(
    (title: string) => {
      if (!currentBoard) return;
      const currentBoardLists = lists.filter((l) => l.board_id === currentBoard.id && !l.is_archived);
      const lastList = currentBoardLists[currentBoardLists.length - 1];
      const position = calculateNewPosition(lastList?.position, null);

      const newList: ListWithCards = {
        id: `lst-${Date.now()}`,
        board_id: currentBoard.id,
        title,
        position,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        cards: [],
      };

      setLists((prev) => {
        const next = [...prev, newList];
        saveState("lists", next);
        return next;
      });

      toast.success(`Lista "${title}" adicionada!`);
      logActivity("LIST_CREATED", "list", { title });
    },
    [currentBoard, lists, saveState, logActivity]
  );

  const updateList = useCallback(
    (id: string, title: string) => {
      setLists((prev) => {
        const next = prev.map((l) => (l.id === id ? { ...l, title, updated_at: new Date().toISOString() } : l));
        saveState("lists", next);
        return next;
      });
      toast.success("Lista renomeada.");
    },
    [saveState]
  );

  const reorderList = useCallback(
    (listId: string, newPosition: number) => {
      setLists((prev) => {
        const next = prev.map((l) => (l.id === listId ? { ...l, position: newPosition } : l));
        saveState("lists", next);
        return next;
      });
    },
    [saveState]
  );

  const duplicateList = useCallback(
    (listId: string) => {
      const original = lists.find((l) => l.id === listId);
      if (!original) return;
      const position = original.position + 500;
      const newListId = `lst-${Date.now()}`;
      const duplicated: ListWithCards = {
        ...original,
        id: newListId,
        title: `${original.title} (Cópia)`,
        position,
        cards: original.cards.map((c, idx) => ({
          ...c,
          id: `crd-${Date.now()}-${idx}`,
          list_id: newListId,
        })),
      };

      setLists((prev) => {
        const next = [...prev, duplicated];
        saveState("lists", next);
        return next;
      });
      toast.success("Lista duplicada com sucesso!");
    },
    [lists, saveState]
  );

  const archiveList = useCallback(
    (listId: string) => {
      setLists((prev) => {
        const next = prev.map((l) => (l.id === listId ? { ...l, is_archived: true } : l));
        saveState("lists", next);
        return next;
      });
      toast.success("Lista arquivada.");
    },
    [saveState]
  );

  const restoreList = useCallback(
    (listId: string) => {
      setLists((prev) => {
        const next = prev.map((l) => (l.id === listId ? { ...l, is_archived: false } : l));
        saveState("lists", next);
        return next;
      });
      toast.success("Lista restaurada.");
    },
    [saveState]
  );

  const deleteList = useCallback(
    (listId: string) => {
      setLists((prev) => {
        const next = prev.filter((l) => l.id !== listId);
        saveState("lists", next);
        return next;
      });
      toast.success("Lista removida.");
    },
    [saveState]
  );

  const moveAllCardsInList = useCallback(
    (sourceListId: string, targetListId: string) => {
      setLists((prev) => {
        const source = prev.find((l) => l.id === sourceListId);
        if (!source || source.cards.length === 0) return prev;

        const cardsToMove = source.cards.map((c, idx) => ({
          ...c,
          list_id: targetListId,
          position: (idx + 1) * 1000,
        }));

        const next = prev.map((l) => {
          if (l.id === sourceListId) return { ...l, cards: [] };
          if (l.id === targetListId) return { ...l, cards: [...l.cards, ...cardsToMove] };
          return l;
        });

        saveState("lists", next);
        return next;
      });
      toast.success("Todos os cards foram movidos!");
    },
    [saveState]
  );

  const archiveAllCardsInList = useCallback(
    (listId: string) => {
      setLists((prev) => {
        const next = prev.map((l) => {
          if (l.id === listId) {
            return {
              ...l,
              cards: l.cards.map((c) => ({ ...c, is_archived: true })),
            };
          }
          return l;
        });
        saveState("lists", next);
        return next;
      });
      toast.success("Todos os cards da lista foram arquivados!");
    },
    [saveState]
  );

  const sortListCards = useCallback(
    (listId: string, sortBy: "dueDate" | "priority" | "title") => {
      setLists((prev) => {
        const next = prev.map((l) => {
          if (l.id === listId) {
            const sorted = [...l.cards].sort((a, b) => {
              if (sortBy === "title") return a.title.localeCompare(b.title);
              if (sortBy === "dueDate") {
                if (!a.due_date) return 1;
                if (!b.due_date) return -1;
                return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
              }
              if (sortBy === "priority") {
                const map: Record<CardPriority, number> = {
                  urgent: 4,
                  high: 3,
                  medium: 2,
                  low: 1,
                  none: 0,
                };
                return (map[b.priority] || 0) - (map[a.priority] || 0);
              }
              return 0;
            });
            return {
              ...l,
              cards: sorted.map((c, idx) => ({ ...c, position: (idx + 1) * 1000 })),
            };
          }
          return l;
        });
        saveState("lists", next);
        return next;
      });
      toast.success("Lista reordenada.");
    },
    [saveState]
  );

  // CARDS ACTIONS
  const createCard = useCallback(
    (listId: string, title: string) => {
      if (!currentBoard) return;
      const targetList = lists.find((l) => l.id === listId);
      const lastCard = targetList?.cards[targetList.cards.length - 1];
      const position = calculateNewPosition(lastCard?.position, null);

      const newCard: CardWithDetails = {
        id: `crd-${Date.now()}`,
        list_id: listId,
        board_id: currentBoard.id,
        title,
        description: null,
        cover_color: null,
        cover_url: null,
        priority: "none",
        start_date: null,
        due_date: null,
        due_time: null,
        is_completed: false,
        is_archived: false,
        position,
        created_by: currentUser.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        members: [currentUser],
        labels: [],
        checklists: [],
        comments_count: 0,
        attachments_count: 0,
      };

      setLists((prev) => {
        const next = prev.map((l) => (l.id === listId ? { ...l, cards: [...l.cards, newCard] } : l));
        saveState("lists", next);
        return next;
      });

      toast.success(`Card "${title}" criado!`);
      logActivity("CARD_CREATED", "card", { title }, newCard.id);
    },
    [currentBoard, lists, currentUser, saveState, logActivity]
  );

  const updateCard = useCallback(
    (id: string, data: Partial<CardWithDetails>) => {
      setLists((prev) => {
        const next = prev.map((list) => ({
          ...list,
          cards: list.cards.map((card) =>
            card.id === id ? { ...card, ...data, updated_at: new Date().toISOString() } : card
          ),
        }));
        saveState("lists", next);
        return next;
      });
      toast.success("Card atualizado.");
    },
    [saveState]
  );

  const moveCard = useCallback(
    (
      cardId: string,
      sourceOrTargetListId: string,
      targetListId?: string,
      newPosition?: number,
      targetIndex?: number
    ) => {
      const resolvedTargetListId = targetListId || sourceOrTargetListId;

      setLists((prev) => {
        let cardToMove: CardWithDetails | null = null;
        let originalListId: string | null = null;

        for (const l of prev) {
          const found = l.cards.find((c) => c.id === cardId);
          if (found) {
            originalListId = l.id;
            cardToMove = {
              ...found,
              list_id: resolvedTargetListId,
              ...(newPosition !== undefined ? { position: newPosition } : {}),
            };
            break;
          }
        }

        if (!cardToMove) return prev;

        // 1. Remove card from all lists in prev
        const withoutCard = prev.map((l) => ({
          ...l,
          cards: l.cards.filter((c) => c.id !== cardId),
        }));

        // Apply one simple rule after a card enters its destination list.
        const matchingRule = automationRules.find((rule) =>
          rule.enabled && rule.board_id === currentBoard?.id &&
          originalListId !== resolvedTargetListId &&
          rule.source_list_id === resolvedTargetListId && rule.target_list_id !== resolvedTargetListId
        );
        const finalTargetListId = matchingRule?.target_list_id || resolvedTargetListId;
        cardToMove.list_id = finalTargetListId;

        // 2. Insert into target list
        const next = withoutCard.map((l) => {
          if (l.id !== finalTargetListId) return l;

          const targetCards = [...l.cards];

          if (targetIndex !== undefined && targetIndex >= 0 && targetIndex <= targetCards.length) {
            targetCards.splice(targetIndex, 0, cardToMove!);
          } else if (newPosition !== undefined) {
            cardToMove!.position = newPosition;
            targetCards.push(cardToMove!);
            targetCards.sort((a, b) => a.position - b.position);
          } else {
            targetCards.push(cardToMove!);
          }

          // Reindex positions to guarantee clean 1000 spacing
          const reindexedCards = targetCards.map((c, idx) => ({
            ...c,
            position: (idx + 1) * 1000,
          }));

          return {
            ...l,
            cards: reindexedCards,
          };
        });

        saveState("lists", next);
        return next;
      });
    },
    [saveState, automationRules, currentBoard?.id]
  );

  const duplicateCard = useCallback(
    (cardId: string) => {
      setLists((prev) => {
        const next = prev.map((l) => {
          const card = l.cards.find((c) => c.id === cardId);
          if (!card) return l;
          const dup: CardWithDetails = {
            ...card,
            id: `crd-${Date.now()}`,
            title: `${card.title} (Cópia)`,
            position: card.position + 500,
            created_at: new Date().toISOString(),
          };
          const updatedCards = [...l.cards, dup].sort((a, b) => a.position - b.position);
          return { ...l, cards: updatedCards };
        });
        saveState("lists", next);
        return next;
      });
      toast.success("Card duplicado!");
    },
    [saveState]
  );

  const archiveCard = useCallback(
    (cardId: string) => {
      setLists((prev) => {
        const next = prev.map((l) => ({
          ...l,
          cards: l.cards.map((c) => (c.id === cardId ? { ...c, is_archived: true } : c)),
        }));
        saveState("lists", next);
        return next;
      });
      if (activeCardId === cardId) setActiveCardId(null);
      toast.success("Card arquivado.");
    },
    [activeCardId, saveState]
  );

  const restoreCard = useCallback(
    (cardId: string) => {
      setLists((prev) => {
        const next = prev.map((l) => ({
          ...l,
          cards: l.cards.map((c) => (c.id === cardId ? { ...c, is_archived: false } : c)),
        }));
        saveState("lists", next);
        return next;
      });
      toast.success("Card restaurado para o quadro!");
    },
    [saveState]
  );

  const deleteCard = useCallback(
    (cardId: string) => {
      setLists((prev) => {
        const next = prev.map((l) => ({
          ...l,
          cards: l.cards.filter((c) => c.id !== cardId),
        }));
        saveState("lists", next);
        return next;
      });
      if (activeCardId === cardId) setActiveCardId(null);
      toast.success("Card excluído.");
    },
    [activeCardId, saveState]
  );

  const toggleCardCompleted = useCallback(
    (cardId: string) => {
      setLists((prev) => {
        let isNowCompleted = false;
        const next = prev.map((l) => ({
          ...l,
          cards: l.cards.map((c) => {
            if (c.id === cardId) {
              isNowCompleted = !c.is_completed;
              return { ...c, is_completed: isNowCompleted };
            }
            return c;
          }),
        }));
        saveState("lists", next);
        if (isNowCompleted) {
          toast.success("Tarefa marcada como concluída! 🎉");
        }
        return next;
      });
    },
    [saveState]
  );

  const assignCardMember = useCallback(
    (cardId: string, user: Profile) => {
      setLists((prev) => {
        const next = prev.map((l) => ({
          ...l,
          cards: l.cards.map((c) => {
            if (c.id === cardId) {
              if (c.members.some((m) => m.id === user.id)) return c;
              return { ...c, members: [...c.members, user] };
            }
            return c;
          }),
        }));
        saveState("lists", next);
        return next;
      });
      toast.success(`${user.full_name} adicionado ao card.`);
      logActivity("MEMBER_ASSIGNED", "card", { memberName: user.full_name }, cardId);
    },
    [saveState, logActivity]
  );

  const removeCardMember = useCallback(
    (cardId: string, userId: string) => {
      setLists((prev) => {
        const next = prev.map((l) => ({
          ...l,
          cards: l.cards.map((c) => {
            if (c.id === cardId) {
              return { ...c, members: c.members.filter((m) => m.id !== userId) };
            }
            return c;
          }),
        }));
        saveState("lists", next);
        return next;
      });
    },
    [saveState]
  );

  const toggleCardLabel = useCallback(
    (cardId: string, label: Label) => {
      setLists((prev) => {
        const next = prev.map((l) => ({
          ...l,
          cards: l.cards.map((c) => {
            if (c.id === cardId) {
              const hasLabel = c.labels.some((lbl) => lbl.id === label.id);
              const updatedLabels = hasLabel
                ? c.labels.filter((lbl) => lbl.id !== label.id)
                : [...c.labels, label];
              return { ...c, labels: updatedLabels };
            }
            return c;
          }),
        }));
        saveState("lists", next);
        return next;
      });
    },
    [saveState]
  );

  // CHECKLISTS
  const createChecklist = useCallback(
    (cardId: string, title: string) => {
      const newChk: ChecklistWithItems = {
        id: `chk-${Date.now()}`,
        card_id: cardId,
        title,
        position: 1000,
        created_at: new Date().toISOString(),
        items: [],
      };
      setLists((prev) => {
        const next = prev.map((l) => ({
          ...l,
          cards: l.cards.map((c) => {
            if (c.id === cardId) {
              return { ...c, checklists: [...(c.checklists || []), newChk] };
            }
            return c;
          }),
        }));
        saveState("lists", next);
        return next;
      });
      toast.success(`Checklist "${title}" adicionado!`);
      logActivity("CHECKLIST_CREATED", "checklist", { title }, cardId);
    },
    [saveState, logActivity]
  );

  const deleteChecklist = useCallback(
    (cardId: string, checklistId: string) => {
      setLists((prev) => {
        const next = prev.map((l) => ({
          ...l,
          cards: l.cards.map((c) => {
            if (c.id === cardId) {
              return { ...c, checklists: c.checklists.filter((chk) => chk.id !== checklistId) };
            }
            return c;
          }),
        }));
        saveState("lists", next);
        return next;
      });
      toast.success("Checklist removido.");
    },
    [saveState]
  );

  const createChecklistItem = useCallback(
    (checklistId: string, title: string) => {
      const newItem = {
        id: `chki-${Date.now()}`,
        checklist_id: checklistId,
        title,
        is_completed: false,
        position: 1000,
        due_date: null,
        assigned_to: null,
        created_at: new Date().toISOString(),
      };
      setLists((prev) => {
        const next = prev.map((l) => ({
          ...l,
          cards: l.cards.map((c) => ({
            ...c,
            checklists: c.checklists.map((chk) =>
              chk.id === checklistId ? { ...chk, items: [...chk.items, newItem] } : chk
            ),
          })),
        }));
        saveState("lists", next);
        return next;
      });
    },
    [saveState]
  );

  const toggleChecklistItem = useCallback(
    (checklistId: string, itemId: string) => {
      setLists((prev) => {
        const next = prev.map((l) => ({
          ...l,
          cards: l.cards.map((c) => ({
            ...c,
            checklists: c.checklists.map((chk) =>
              chk.id === checklistId
                ? {
                    ...chk,
                    items: chk.items.map((it) =>
                      it.id === itemId ? { ...it, is_completed: !it.is_completed } : it
                    ),
                  }
                : chk
            ),
          })),
        }));
        saveState("lists", next);
        return next;
      });
    },
    [saveState]
  );

  const deleteChecklistItem = useCallback(
    (checklistId: string, itemId: string) => {
      setLists((prev) => {
        const next = prev.map((l) => ({
          ...l,
          cards: l.cards.map((c) => ({
            ...c,
            checklists: c.checklists.map((chk) =>
              chk.id === checklistId
                ? {
                    ...chk,
                    items: chk.items.filter((it) => it.id !== itemId),
                  }
                : chk
            ),
          })),
        }));
        saveState("lists", next);
        return next;
      });
    },
    [saveState]
  );

  const convertChecklistItemToCard = useCallback(
    (cardId: string, checklistId: string, itemId: string) => {
      let itemTitle = "";
      let sourceListId = "";
      setLists((prev) => {
        const next = prev.map((l) => ({
          ...l,
          cards: l.cards.map((c) => {
            if (c.id === cardId) {
              sourceListId = c.list_id;
              const chk = c.checklists?.find((chk) => chk.id === checklistId);
              const item = chk?.items?.find((it) => it.id === itemId);
              if (item) itemTitle = item.title;
              return {
                ...c,
                checklists: c.checklists.map((chk) =>
                  chk.id === checklistId
                    ? { ...chk, items: chk.items.filter((it) => it.id !== itemId) }
                    : chk
                ),
              };
            }
            return c;
          }),
        }));
        saveState("lists", next);
        return next;
      });

      if (itemTitle && sourceListId) {
        createCard(sourceListId, itemTitle);
        toast.success(`Item convertido no novo card "${itemTitle}"!`);
      }
    },
    [createCard, saveState]
  );

  const updateChecklistItem = useCallback(
    (checklistId: string, itemId: string, data: Partial<ChecklistItem>) => {
      setLists((prev) => {
        const next = prev.map((l) => ({
          ...l,
          cards: l.cards.map((c) => ({
            ...c,
            checklists: c.checklists.map((chk) =>
              chk.id === checklistId
                ? {
                    ...chk,
                    items: chk.items.map((it) => (it.id === itemId ? { ...it, ...data } : it)),
                  }
                : chk
            ),
          })),
        }));
        saveState("lists", next);
        return next;
      });
    },
    [saveState]
  );

  // CARD VOTES & WATCHERS & TEMPLATES
  const toggleCardVote = useCallback(
    (cardId: string) => {
      setLists((prev) => {
        let isNowVoted = false;
        const next = prev.map((l) => ({
          ...l,
          cards: l.cards.map((c) => {
            if (c.id === cardId) {
              const currentVotes = c.votes || [];
              const hasVoted = currentVotes.includes(currentUser.id);
              const updatedVotes = hasVoted
                ? currentVotes.filter((id) => id !== currentUser.id)
                : [...currentVotes, currentUser.id];
              isNowVoted = !hasVoted;
              return { ...c, votes: updatedVotes };
            }
            return c;
          }),
        }));
        saveState("lists", next);
        if (isNowVoted) toast.success("Voto adicionado ao card! 👍");
        else toast.info("Voto removido.");
        return next;
      });
    },
    [currentUser.id, saveState]
  );

  const toggleWatchCard = useCallback(
    (cardId: string) => {
      setLists((prev) => {
        let isWatching = false;
        const next = prev.map((l) => ({
          ...l,
          cards: l.cards.map((c) => {
            if (c.id === cardId) {
              const currentWatchers = c.watchers || [];
              const isAlreadyWatching = currentWatchers.includes(currentUser.id);
              const updatedWatchers = isAlreadyWatching
                ? currentWatchers.filter((id) => id !== currentUser.id)
                : [...currentWatchers, currentUser.id];
              isWatching = !isAlreadyWatching;
              return { ...c, watchers: updatedWatchers };
            }
            return c;
          }),
        }));
        saveState("lists", next);
        if (isWatching) toast.success("Você agora está seguindo este card! 👁️");
        else toast.info("Você deixou de seguir este card.");
        return next;
      });
    },
    [currentUser.id, saveState]
  );

  const saveCardAsTemplate = useCallback(
    (cardId: string) => {
      setLists((prev) => {
        let isNowTemplate = false;
        const next = prev.map((l) => ({
          ...l,
          cards: l.cards.map((c) => {
            if (c.id === cardId) {
              isNowTemplate = !c.is_template;
              return { ...c, is_template: isNowTemplate };
            }
            return c;
          }),
        }));
        saveState("lists", next);
        if (isNowTemplate) toast.success("Card salvo como Modelo! 📋");
        else toast.info("Card removido dos modelos.");
        return next;
      });
    },
    [saveState]
  );

  const createCardFromTemplate = useCallback(
    (listId: string, templateCard: CardWithDetails) => {
      const newCard: CardWithDetails = {
        id: `crd-${Date.now()}`,
        list_id: listId,
        title: templateCard.title.replace(/\(Modelo\)/i, "").trim(),
        description: templateCard.description,
        position: 1000,
        is_completed: false,
        is_archived: false,
        priority: templateCard.priority,
        due_date: null,
        due_time: null,
        start_date: null,
        cover_color: templateCard.cover_color,
        cover_url: templateCard.cover_url,
        is_template: false,
        members: [...templateCard.members],
        labels: [...templateCard.labels],
        checklists: (templateCard.checklists || []).map((chk) => ({
          ...chk,
          id: `chk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          items: chk.items.map((it) => ({
            ...it,
            id: `chki-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            is_completed: false,
          })),
        })),
        comments: [],
        attachments: [],
        comments_count: 0,
        attachments_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setLists((prev) => {
        const next = prev.map((l) => {
          if (l.id === listId) {
            return { ...l, cards: [newCard, ...l.cards] };
          }
          return l;
        });
        saveState("lists", next);
        return next;
      });
      toast.success(`Card criado a partir do modelo "${templateCard.title}"!`);
    },
    [saveState]
  );

  // LIST LIMITS & COLLAPSE
  const setListLimit = useCallback(
    (listId: string, limit: number | null) => {
      setLists((prev) => {
        const next = prev.map((l) => (l.id === listId ? { ...l, card_limit: limit } : l));
        saveState("lists", next);
        return next;
      });
      toast.success(limit ? `Limite de ${limit} cards definido para a lista!` : "Limite de cards removido.");
    },
    [saveState]
  );

  const toggleListCollapse = useCallback(
    (listId: string) => {
      setLists((prev) => {
        const next = prev.map((l) => (l.id === listId ? { ...l, is_collapsed: !l.is_collapsed } : l));
        saveState("lists", next);
        return next;
      });
    },
    [saveState]
  );

  // COMMENTS
  const addComment = useCallback(
    (cardId: string, content: string) => {
      setLists((prev) => {
        const next = prev.map((l) => ({
          ...l,
          cards: l.cards.map((c) => {
            if (c.id === cardId) {
              return { ...c, comments_count: (c.comments_count || 0) + 1 };
            }
            return c;
          }),
        }));
        saveState("lists", next);
        return next;
      });

      // Check for @mentions in comment
      const mentionMatches = content.match(/@([a-zA-ZÀ-ÿ0-9_]+)/g);
      if (mentionMatches && mentionMatches.length > 0) {
        mentionMatches.forEach((mention) => {
          const cleanName = mention.substring(1).toLowerCase();
          const targetMember = workspaceMembers.find(
            (m) =>
              m.profile.full_name?.toLowerCase().includes(cleanName) ||
              m.profile.username?.toLowerCase().includes(cleanName)
          );
          if (targetMember && targetMember.profile.id !== currentUser.id) {
            const newNotif: NotificationWithActor = {
              id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              user_id: targetMember.profile.id,
              actor_id: currentUser.id,
              type: "mention",
              title: "Você foi mencionado!",
              message: `${currentUser.full_name || "Alguém"} mencionou você em um comentário: "${content.substring(0, 50)}"`,
              entity_type: "card",
              entity_id: cardId,
              workspace_id: currentWorkspace?.id || null,
              board_id: currentBoard?.id || null,
              is_read: false,
              read_at: null,
              created_at: new Date().toISOString(),
              actor: currentUser,
            };
            setNotifications((prev) => {
              const updated = [newNotif, ...prev];
              saveState("notifications", updated);
              return updated;
            });
          }
        });
      }

      toast.success("Comentário publicado!");
      logActivity("COMMENT_ADDED", "comment", { preview: content.substring(0, 40) }, cardId);
    },
    [saveState, logActivity, workspaceMembers, currentUser]
  );

  const deleteComment = useCallback((commentId: string) => {
    toast.success("Comentário excluído.");
  }, []);

  const toggleCommentReaction = useCallback(
    (cardId: string, commentId: string, emoji: string) => {
      setLists((prev) => {
        const next = prev.map((l) => ({
          ...l,
          cards: l.cards.map((c) => {
            if (c.id === cardId && c.comments) {
              const updatedComments = c.comments.map((cmt) => {
                if (cmt.id === commentId) {
                  const currentReactions = cmt.reactions || {};
                  const userList = currentReactions[emoji] || [];
                  const hasReacted = userList.includes(currentUser.id);
                  const updatedUserList = hasReacted
                    ? userList.filter((id) => id !== currentUser.id)
                    : [...userList, currentUser.id];

                  const newReactions = { ...currentReactions };
                  if (updatedUserList.length > 0) {
                    newReactions[emoji] = updatedUserList;
                  } else {
                    delete newReactions[emoji];
                  }
                  return { ...cmt, reactions: newReactions };
                }
                return cmt;
              });
              return { ...c, comments: updatedComments };
            }
            return c;
          }),
        }));
        saveState("lists", next);
        return next;
      });
    },
    [currentUser.id, saveState]
  );

  // ATTACHMENTS
  const addAttachment = useCallback(
    (cardId: string, attachment: Attachment) => {
      setLists((prev) => {
        const next = prev.map((l) => ({
          ...l,
          cards: l.cards.map((c) => {
            if (c.id === cardId) {
              const attachments = [...(c.attachments || []), attachment];
              return { ...c, attachments, attachments_count: attachments.length };
            }
            return c;
          }),
        }));
        saveState("lists", next);
        return next;
      });
      toast.success(`Arquivo "${attachment.file_name}" anexado!`);
      logActivity("ATTACHMENT_ADDED", "attachment", { fileName: attachment.file_name }, cardId);
    },
    [saveState, logActivity]
  );

  const deleteAttachment = useCallback((attachmentId: string) => {
    toast.success("Anexo removido.");
  }, []);

  // LABELS
  const createCustomLabel = useCallback(
    (name: string, color: string) => {
      const newLabel: Label = {
        id: `lbl-${Date.now()}`,
        workspace_id: currentWorkspace?.id || ECONT_WORKSPACE.id,
        board_id: currentBoard?.id || null,
        name: name.toUpperCase(),
        color,
        created_at: new Date().toISOString(),
      };
      const updated = [...allLabels, newLabel];
      setAllLabels(updated);
      saveState("labels", updated);
      toast.success(`Etiqueta "${newLabel.name}" criada!`);
      return newLabel;
    },
    [allLabels, currentWorkspace, currentBoard, saveState]
  );

  // CUSTOM FIELDS
  const createCustomField = useCallback(
    (data: { name: string; type: CustomFieldType; options?: CustomFieldOption[]; show_on_card: boolean }) => {
      const newField: CustomField = {
        id: `cf-${Date.now()}`,
        board_id: currentBoard?.id || "",
        name: data.name,
        type: data.type,
        options: data.options || [],
        show_on_card: data.show_on_card,
        created_at: new Date().toISOString(),
      };
      setCustomFields((prev) => {
        const next = [...prev, newField];
        saveState("custom_fields", next);
        return next;
      });
      toast.success(`Campo personalizado "${newField.name}" criado!`);
      return newField;
    },
    [currentBoard, saveState]
  );

  const updateCustomField = useCallback(
    (id: string, data: Partial<CustomField>) => {
      setCustomFields((prev) => {
        const next = prev.map((f) => (f.id === id ? { ...f, ...data } : f));
        saveState("custom_fields", next);
        return next;
      });
      toast.success("Campo personalizado atualizado!");
    },
    [saveState]
  );

  const deleteCustomField = useCallback(
    (id: string) => {
      setCustomFields((prev) => {
        const next = prev.filter((f) => f.id !== id);
        saveState("custom_fields", next);
        return next;
      });
      toast.success("Campo personalizado excluído.");
    },
    [saveState]
  );

  const setCardCustomFieldValue = useCallback(
    (cardId: string, fieldId: string, value: any) => {
      setLists((prev) => {
        const next = prev.map((l) => ({
          ...l,
          cards: l.cards.map((c) => {
            if (c.id === cardId) {
              const currentValues = c.custom_field_values || {};
              const updatedValues = { ...currentValues, [fieldId]: value };
              return { ...c, custom_field_values: updatedValues };
            }
            return c;
          }),
        }));
        saveState("lists", next);
        return next;
      });
    },
    [saveState]
  );

  // TEMPLATES & EXPORT / IMPORT
  const createBoardFromTemplate = useCallback(
    (templateId: string, customTitle?: string) => {
      const template = BOARD_TEMPLATES.find((t) => t.id === templateId) || BOARD_TEMPLATES[0];
      const newBoard: Board = {
        id: `brd-${Date.now()}`,
        workspace_id: currentWorkspace?.id || ECONT_WORKSPACE.id,
        title: customTitle || template.title,
        description: template.description,
        background_type: template.backgroundType,
        background_value: template.backgroundValue,
        visibility: "workspace",
        is_favorite: false,
        is_archived: false,
        position: (boards.length + 1) * 1000,
        created_by: currentUser.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const newLists: ListWithCards[] = template.lists.map((l, lIdx) => {
        const listId = `lst-${Date.now()}-${lIdx}`;
        return {
          id: listId,
          board_id: newBoard.id,
          title: l.title,
          position: (lIdx + 1) * 1000,
          is_archived: false,
          card_limit: l.card_limit || null,
          is_collapsed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          cards: l.cards.map((c, cIdx) => {
            const cardId = `crd-${Date.now()}-${lIdx}-${cIdx}`;
            const due = c.dueInDays
              ? new Date(Date.now() + c.dueInDays * 24 * 60 * 60 * 1000).toISOString()
              : null;
            return {
              id: cardId,
              list_id: listId,
              title: c.title,
              description: c.description || null,
              position: (cIdx + 1) * 1000,
              is_completed: false,
              is_archived: false,
              priority: c.priority,
              due_date: due,
              due_time: due ? "18:00" : null,
              start_date: due ? new Date().toISOString() : null,
              cover_color: null,
              cover_url: null,
              members: [currentUser],
              labels: (c.labels || []).map((lbl, lblIdx) => ({
                id: `lbl-t-${lIdx}-${cIdx}-${lblIdx}`,
                workspace_id: currentWorkspace?.id || ECONT_WORKSPACE.id,
                board_id: newBoard.id,
                name: lbl.name,
                color: lbl.color,
                created_at: new Date().toISOString(),
              })),
              checklists: (c.checklists || []).map((chk, chkIdx) => {
                const chkId = `chk-${Date.now()}-${chkIdx}`;
                return {
                  id: chkId,
                  card_id: cardId,
                  title: chk.title,
                  position: (chkIdx + 1) * 1000,
                  created_at: new Date().toISOString(),
                  items: chk.items.map((itText, itIdx) => ({
                    id: `chki-${Date.now()}-${chkIdx}-${itIdx}`,
                    checklist_id: chkId,
                    title: itText,
                    is_completed: false,
                    position: (itIdx + 1) * 1000,
                    created_at: new Date().toISOString(),
                  })),
                };
              }),
              comments: [],
              attachments: [],
              comments_count: 0,
              attachments_count: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
          }),
        };
      });

      const updatedBoards = [newBoard, ...boards];
      const updatedLists = [...lists, ...newLists];

      setBoards(updatedBoards);
      setLists(updatedLists);
      setCurrentBoard(newBoard);
      saveState("boards", updatedBoards);
      saveState("lists", updatedLists);

      toast.success(`Quadro "${newBoard.title}" criado a partir do modelo! 🎉`);
      return newBoard;
    },
    [boards, currentWorkspace, currentUser, lists, saveState]
  );

  const exportBoardToJson = useCallback(
    (boardId: string) => {
      const board = boards.find((b) => b.id === boardId);
      if (!board) return;
      const boardLists = lists.filter((l) => l.board_id === boardId);
      const data = {
        version: "konti-1.0",
        exportedAt: new Date().toISOString(),
        board,
        lists: boardLists,
        customFields: customFields.filter((f) => f.board_id === boardId),
      };

      const cleanSlug = board.title.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `konti-board-${cleanSlug}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Quadro exportado em JSON com sucesso!");
    },
    [boards, lists, customFields]
  );

  const exportBoardToCsv = useCallback(
    (boardId: string) => {
      const board = boards.find((b) => b.id === boardId);
      if (!board) return;
      const boardLists = lists.filter((l) => l.board_id === boardId && !l.is_archived);

      const rows = [["Lista", "Título do Card", "Prioridade", "Prazo", "Concluído", "Membros", "Etiquetas", "Descrição"]];
      for (const l of boardLists) {
        for (const c of l.cards) {
          if (!c.is_archived) {
            rows.push([
              `"${l.title.replace(/"/g, '""')}"`,
              `"${c.title.replace(/"/g, '""')}"`,
              `"${c.priority}"`,
              `"${c.due_date || ""}"`,
              `"${c.is_completed ? "Sim" : "Não"}"`,
              `"${c.members.map((m) => m.full_name).join(", ").replace(/"/g, '""')}"`,
              `"${c.labels.map((lbl) => lbl.name).join(", ").replace(/"/g, '""')}"`,
              `"${(c.description || "").replace(/"/g, '""')}"`,
            ]);
          }
        }
      }

      const cleanSlug = board.title.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const csvContent = rows.map((r) => r.join(",")).join("\n");
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `konti-board-${cleanSlug}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Quadro exportado em CSV com sucesso!");
    },
    [boards, lists]
  );

  const importBoardFromJson = useCallback(
    (jsonData: any) => {
      try {
        if (!jsonData || !jsonData.board || !jsonData.lists) {
          toast.error("Formato de arquivo inválido.");
          return null;
        }
        const newBoardId = `brd-${Date.now()}`;
        const newBoard: Board = {
          ...jsonData.board,
          id: newBoardId,
          title: `${jsonData.board.title} (Importado)`,
          slug: `${jsonData.board.slug || "import"}-imported`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const newLists: ListWithCards[] = (jsonData.lists || []).map((l: any, lIdx: number) => {
          const listId = `lst-${Date.now()}-${lIdx}`;
          return {
            ...l,
            id: listId,
            board_id: newBoardId,
            cards: (l.cards || []).map((c: any, cIdx: number) => ({
              ...c,
              id: `crd-${Date.now()}-${lIdx}-${cIdx}`,
              list_id: listId,
            })),
          };
        });

        const updatedBoards = [newBoard, ...boards];
        const updatedLists = [...lists, ...newLists];

        setBoards(updatedBoards);
        setLists(updatedLists);
        setCurrentBoard(newBoard);
        saveState("boards", updatedBoards);
        saveState("lists", updatedLists);

        toast.success(`Quadro "${newBoard.title}" importado com sucesso! 🎉`);
        return newBoard;
      } catch (e) {
        console.error("Failed to import board", e);
        toast.error("Erro ao importar dados do quadro.");
        return null;
      }
    },
    [boards, lists, saveState]
  );

  // NOTIFICATIONS
  const markNotificationAsRead = useCallback(
    (id: string) => {
      setNotifications((prev) => {
        const next = prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n));
        saveState("notifications", next);
        return next;
      });
    },
    [saveState]
  );

  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications((prev) => {
      const next = prev.map((n) => n.user_id === currentUser.id
        ? { ...n, is_read: true, read_at: new Date().toISOString() }
        : n);
      saveState("notifications", next);
      return next;
    });
    toast.success("Todas as notificações marcadas como lidas.");
  }, [saveState, currentUser.id]);

  const deleteNotification = useCallback(
    (id: string) => {
      setNotifications((prev) => {
        const next = prev.filter((n) => n.id !== id);
        saveState("notifications", next);
        return next;
      });
    },
    [saveState]
  );

  const value: KontiContextType = {
    isAuthenticated,
    isAuthLoading,
    isPersistenceAvailable,
    login,
    register,
    logout,
    currentUser,
    setCurrentUser,
    allUsers,
    workspaces,
    currentWorkspace,
    setCurrentWorkspace,
    workspaceMembers,
    boards,
    currentBoard,
    setCurrentBoard,
    boardView,
    setBoardView,
    lists,
    allLabels,
    customFields,
    activities,
    notifications,
    unreadNotificationsCount,
    automationRules,
    filterState,
    setFilterState,
    resetFilters,
    activeCardId,
    setActiveCardId,
    activeCard,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    inviteMember,
    createAutomationRule,
    toggleAutomationRule,
    deleteAutomationRule,
    updateMemberRole,
    removeMember,
    createBoard,
    updateBoard,
    duplicateBoard,
    toggleFavoriteBoard,
    archiveBoard,
    deleteBoard,
    createList,
    updateList,
    reorderList,
    duplicateList,
    archiveList,
    restoreList,
    deleteList,
    moveAllCardsInList,
    archiveAllCardsInList,
    sortListCards,
    setListLimit,
    toggleListCollapse,
    createCard,
    updateCard,
    moveCard,
    duplicateCard,
    archiveCard,
    restoreCard,
    deleteCard,
    toggleCardCompleted,
    assignCardMember,
    removeCardMember,
    toggleCardLabel,
    toggleCardVote,
    toggleWatchCard,
    saveCardAsTemplate,
    createCardFromTemplate,
    createChecklist,
    deleteChecklist,
    createChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
    convertChecklistItemToCard,
    updateChecklistItem,
    addComment,
    deleteComment,
    toggleCommentReaction,
    addAttachment,
    deleteAttachment,
    createCustomLabel,
    createCustomField,
    updateCustomField,
    deleteCustomField,
    setCardCustomFieldValue,
    createBoardFromTemplate,
    exportBoardToJson,
    exportBoardToCsv,
    importBoardFromJson,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
  };

  return <KontiContext.Provider value={value}>{children}</KontiContext.Provider>;
}

export function useKonti() {
  const context = useContext(KontiContext);
  if (!context) {
    throw new Error("useKonti must be used within a KontiProvider");
  }
  return context;
}
