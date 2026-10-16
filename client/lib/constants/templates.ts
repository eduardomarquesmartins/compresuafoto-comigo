import { CardPriority, BoardBackgroundType, BoardVisibility } from "@/types";

export interface BoardTemplate {
  id: string;
  title: string;
  category: "Engenharia" | "Vendas & CRM" | "Marketing" | "RH & Operações" | "Gestão de Produto";
  description: string;
  icon: string;
  backgroundType: BoardBackgroundType;
  backgroundValue: string;
  lists: {
    title: string;
    card_limit?: number;
    cards: {
      title: string;
      description?: string;
      priority: CardPriority;
      labels?: { name: string; color: string }[];
      checklists?: { title: string; items: string[] }[];
      dueInDays?: number;
    }[];
  }[];
}

export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    id: "scrum-sprint",
    title: "Sprint Scrum & Engenharia",
    category: "Engenharia",
    description: "Estrutura ágil completa para planejamento de sprint, desenvolvimento, code review e entrega contínua.",
    icon: "Code",
    backgroundType: "gradient",
    backgroundValue: "linear-gradient(135deg, #090d16 0%, #1e1b4b 50%, #311042 100%)",
    lists: [
      {
        title: "Backlog do Produto",
        cards: [
          {
            title: "Implementar autenticação OAuth 2.0 com GitHub",
            description: "Permitir que usuários façam login com suas contas do GitHub via fluxo OAuth.",
            priority: "high",
            labels: [{ name: "BACKEND", color: "#3b82f6" }, { name: "SEGURANÇA", color: "#ef4444" }],
            checklists: [
              {
                title: "Critérios de Aceite",
                items: [
                  "Configurar app no GitHub Developer Settings",
                  "Criar endpoint de callback seguro",
                  "Gerar JWT de sessão no KONTI",
                ],
              },
            ],
            dueInDays: 5,
          },
          {
            title: "Refatorar queries do banco com índices compostos",
            description: "Melhorar a performance de carregamento das listas do quadro em 40%.",
            priority: "medium",
            labels: [{ name: "PERFORMANCE", color: "#10b981" }],
            dueInDays: 7,
          },
        ],
      },
      {
        title: "Sprint Backlog",
        cards: [
          {
            title: "Criar componente de visualização de Timeline / Gantt",
            description: "Linha do tempo interativa para exibir os cards com data de início e fim.",
            priority: "urgent",
            labels: [{ name: "FRONTEND", color: "#8b5cf6" }, { name: "FEATURE", color: "#06b6d4" }],
            checklists: [
              {
                title: "Etapas",
                items: ["Calcular dias no cabeçalho", "Renderizar barras de progresso", "Permitir arrastar datas"],
              },
            ],
            dueInDays: 3,
          },
        ],
      },
      {
        title: "Em Desenvolvimento",
        card_limit: 3,
        cards: [
          {
            title: "Sistema de Campos Personalizados (Custom Fields)",
            description: "Permitir adicionar campos de Número, Dropdown, Moeda e Checkbox aos cards.",
            priority: "urgent",
            labels: [{ name: "CORE", color: "#f97316" }],
            dueInDays: 1,
          },
        ],
      },
      {
        title: "Code Review & QA",
        card_limit: 3,
        cards: [
          {
            title: "Notificações em tempo real para @menções",
            description: "Garantir que usuários mencionados com @ em comentários recebam notificação.",
            priority: "medium",
            labels: [{ name: "TESTE", color: "#f59e0b" }],
            dueInDays: 2,
          },
        ],
      },
      {
        title: "Concluído",
        cards: [
          {
            title: "Setup inicial da infraestrutura Next.js e Supabase",
            description: "Configuração do repositório base com TypeScript e TailwindCSS.",
            priority: "low",
            labels: [{ name: "INFRA", color: "#64748b" }],
          },
        ],
      },
    ],
  },
  {
    id: "sales-crm",
    title: "Funil de Vendas & CRM",
    category: "Vendas & CRM",
    description: "Acompanhe oportunidades de negócios desde a prospecção até o fechamento de contrato.",
    icon: "TrendingUp",
    backgroundType: "gradient",
    backgroundValue: "linear-gradient(135deg, #022c22 0%, #064e3b 50%, #042f2e 100%)",
    lists: [
      {
        title: "Leads Recebidos",
        cards: [
          {
            title: "Empresa Alpha Tech (50 licenças)",
            description: "Contato inicial feito via formulário do site. Interesse no plano Enterprise.",
            priority: "high",
            labels: [{ name: "INBOUND", color: "#3b82f6" }, { name: "ENTERPRISE", color: "#a855f7" }],
            dueInDays: 1,
          },
        ],
      },
      {
        title: "Primeiro Contato",
        cards: [
          {
            title: "Beta Soluções Digitais",
            description: "Reunião de diagnóstico marcada para quinta-feira às 14h.",
            priority: "medium",
            labels: [{ name: "REUNIÃO", color: "#f59e0b" }],
            dueInDays: 2,
          },
        ],
      },
      {
        title: "Proposta Enviada",
        cards: [
          {
            title: "Gamma Logistics - Proposta R$ 45.000",
            description: "Proposta anual enviada para o Diretor de Operações.",
            priority: "urgent",
            labels: [{ name: "PROPOSTA", color: "#06b6d4" }],
            dueInDays: 4,
          },
        ],
      },
      {
        title: "Em Negociação",
        card_limit: 4,
        cards: [
          {
            title: "Delta Finance Corp",
            description: "Negociando SLA e suporte 24/7. Revisão com jurídico em andamento.",
            priority: "high",
            labels: [{ name: "JURÍDICO", color: "#f97316" }],
            dueInDays: 3,
          },
        ],
      },
      {
        title: "Fechado / Ganho 🎉",
        cards: [
          {
            title: "Omni Retail - Contrato Assinado",
            description: "Contrato de 2 anos assinado com sucesso. Passar para time de Onboarding.",
            priority: "low",
            labels: [{ name: "CONTRATO FECHADO", color: "#10b981" }],
          },
        ],
      },
    ],
  },
  {
    id: "content-marketing",
    title: "Gestão de Conteúdo & Marketing",
    category: "Marketing",
    description: "Planejamento editorial de posts de blog, mídias sociais, newsletters e campanhas de anúncios.",
    icon: "Megaphone",
    backgroundType: "gradient",
    backgroundValue: "linear-gradient(135deg, #18181b 0%, #450a0a 50%, #7f1d1d 100%)",
    lists: [
      {
        title: "Ideias de Pauta",
        cards: [
          {
            title: "10 Melhores Práticas de Gestão Ágil em 2026",
            description: "Artigo de topo de funil focado em líderes de tecnologia.",
            priority: "medium",
            labels: [{ name: "BLOG", color: "#3b82f6" }],
          },
          {
            title: "Vídeo Case de Sucesso com Cliente X",
            description: "Vídeo depoimento de 2 minutos para YouTube e LinkedIn.",
            priority: "high",
            labels: [{ name: "VÍDEO", color: "#ef4444" }],
          },
        ],
      },
      {
        title: "Em Produção / Redação",
        card_limit: 4,
        cards: [
          {
            title: "E-book: O Guia Definitivo do Kanban Moderno",
            description: "Redação dos capítulos 3 e 4 em andamento.",
            priority: "urgent",
            labels: [{ name: "E-BOOK", color: "#a855f7" }],
            dueInDays: 4,
          },
        ],
      },
      {
        title: "Design & Criativos",
        card_limit: 3,
        cards: [
          {
            title: "Carrossel do Instagram: Gestão de Tempo",
            description: "Criar 6 lâminas visuais com identidade visual do KONTI.",
            priority: "medium",
            labels: [{ name: "DESIGN", color: "#ec4899" }, { name: "INSTAGRAM", color: "#f97316" }],
            dueInDays: 2,
          },
        ],
      },
      {
        title: "Aguardando Aprovação",
        cards: [
          {
            title: "Newsletter Semanal Edição #42",
            description: "Texto pronto aguardando revisão final de copywriting.",
            priority: "high",
            labels: [{ name: "NEWSLETTER", color: "#06b6d4" }],
            dueInDays: 1,
          },
        ],
      },
      {
        title: "Publicado / Agendado",
        cards: [
          {
            title: "Anúncio do Lançamento do KONTI v2.0",
            description: "Publicado no Blog, LinkedIn e enviado para base de e-mails.",
            priority: "low",
            labels: [{ name: "LANÇAMENTO", color: "#10b981" }],
          },
        ],
      },
    ],
  },
  {
    id: "hr-onboarding",
    title: "Onboarding de Colaboradores",
    category: "RH & Operações",
    description: "Processo estruturado para acolher novos membros da equipe do primeiro dia até o terceiro mês.",
    icon: "UserCheck",
    backgroundType: "gradient",
    backgroundValue: "linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #0369a1 100%)",
    lists: [
      {
        title: "Antes do 1º Dia",
        cards: [
          {
            title: "Configurar e-mail corporativo e acessos (Slack, GitHub, KONTI)",
            description: "Criar contas com autenticação 2FA ativada.",
            priority: "urgent",
            labels: [{ name: "TI / ACESSOS", color: "#3b82f6" }],
            dueInDays: 1,
          },
          {
            title: "Envio do Kit de Boas-Vindas e Notebook",
            description: "Verificar código de rastreamento com transportadora.",
            priority: "high",
            labels: [{ name: "LOGÍSTICA", color: "#f59e0b" }],
          },
        ],
      },
      {
        title: "Primeira Semana",
        cards: [
          {
            title: "Apresentação com a equipe e Mentor / Buddy",
            description: "Reunião de 45 minutos para ambientação e dúvidas gerais.",
            priority: "medium",
            labels: [{ name: "CULTURA", color: "#10b981" }],
            dueInDays: 3,
          },
          {
            title: "Treinamento de Arquitetura e Diretrizes de Código",
            description: "Sessão técnica com o Tech Lead.",
            priority: "medium",
            labels: [{ name: "TREINAMENTO", color: "#8b5cf6" }],
            dueInDays: 5,
          },
        ],
      },
      {
        title: "Primeiro Mês (30 Dias)",
        cards: [
          {
            title: "1-on-1 de Alinhamento dos Primeiros 30 Dias",
            description: "Coletar feedback, avaliar adaptação e definir metas do trimestre.",
            priority: "high",
            labels: [{ name: "1-ON-1", color: "#f97316" }],
            dueInDays: 30,
          },
        ],
      },
      {
        title: "Onboarding Concluído",
        cards: [
          {
            title: "Integração do Desenvolvedor Pleno finalizada",
            description: "Primeiro PR entregue e aprovado em produção!",
            priority: "low",
            labels: [{ name: "CONCLUÍDO", color: "#10b981" }],
          },
        ],
      },
    ],
  },
  {
    id: "product-roadmap",
    title: "Roadmap de Produto",
    category: "Gestão de Produto",
    description: "Visão estratégica de médio e longo prazo dos lançamentos e evoluções de produto.",
    icon: "Compass",
    backgroundType: "gradient",
    backgroundValue: "linear-gradient(135deg, #1c1917 0%, #431407 50%, #7c2d12 100%)",
    lists: [
      {
        title: "Descoberta & Pesquisa",
        cards: [
          {
            title: "Entrevistas de UX com 15 clientes corporativos",
            description: "Identificar gargalos no fluxo de aprovação de tarefas.",
            priority: "medium",
            labels: [{ name: "RESEARCH", color: "#ec4899" }],
          },
        ],
      },
      {
        title: "Planejamento (Próximo Q)",
        cards: [
          {
            title: "Aplicativo Mobile Nativo (iOS e Android)",
            description: "Desenvolvimento do app mobile com notificações push nativas.",
            priority: "high",
            labels: [{ name: "MOBILE", color: "#3b82f6" }],
            dueInDays: 45,
          },
        ],
      },
      {
        title: "Em Execução (Trimestre Atual)",
        card_limit: 3,
        cards: [
          {
            title: "Campos Personalizados e Visualização de Timeline",
            description: "Permitir estruturação de dados customizados e gráficos de Gantt.",
            priority: "urgent",
            labels: [{ name: "Q1 GOAL", color: "#10b981" }],
            dueInDays: 15,
          },
        ],
      },
      {
        title: "Lançado no Mercado 🚀",
        cards: [
          {
            title: "Visualização em Calendário e Tabela no KONTI",
            description: "Lançamento oficial das novas visões de produtividade.",
            priority: "low",
            labels: [{ name: "RELEASED", color: "#06b6d4" }],
          },
        ],
      },
    ],
  },
];
