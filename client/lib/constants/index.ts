export const BACKGROUND_PRESETS = {
  gradients: [
    {
      id: 'midnight-violet',
      name: 'Midnight Violet',
      value: 'linear-gradient(135deg, #090d16 0%, #1e1b4b 50%, #311042 100%)',
    },
    {
      id: 'deep-ocean',
      name: 'Deep Ocean',
      value: 'linear-gradient(135deg, #022c22 0%, #064e3b 50%, #042f2e 100%)',
    },
    {
      id: 'aurora-borealis',
      name: 'Aurora',
      value: 'linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #0369a1 100%)',
    },
    {
      id: 'crimson-dusk',
      name: 'Crimson Dusk',
      value: 'linear-gradient(135deg, #18181b 0%, #450a0a 50%, #7f1d1d 100%)',
    },
    {
      id: 'cyber-mesh',
      name: 'Cyber Slate',
      value: 'linear-gradient(135deg, #030712 0%, #111827 50%, #1f2937 100%)',
    },
    {
      id: 'sunset-ember',
      name: 'Sunset Ember',
      value: 'linear-gradient(135deg, #1c1917 0%, #431407 50%, #7c2d12 100%)',
    },
  ],
  colors: [
    { id: 'slate', name: 'Slate Gray', value: '#0f172a' },
    { id: 'zinc', name: 'Zinc Dark', value: '#18181b' },
    { id: 'indigo', name: 'Indigo Night', value: '#1e1b4b' },
    { id: 'emerald', name: 'Forest Emerald', value: '#064e3b' },
    { id: 'rose', name: 'Deep Rose', value: '#4c0519' },
    { id: 'amber', name: 'Amber Wood', value: '#451a03' },
  ],
  images: [
    {
      id: 'nordic-mountains',
      name: 'Nordic Peak',
      value: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=80',
    },
    {
      id: 'dark-nebula',
      name: 'Dark Nebula',
      value: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80',
    },
    {
      id: 'minimal-architecture',
      name: 'Architectural Shadow',
      value: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1920&q=80',
    },
    {
      id: 'coastal-mist',
      name: 'Coastal Mist',
      value: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=1920&q=80',
    },
  ],
};

export const PRIORITY_CONFIG = {
  none: {
    label: 'Sem prioridade',
    color: 'text-muted-foreground bg-muted/40 border-border/50',
    badgeColor: 'bg-muted text-muted-foreground',
    iconColor: 'text-muted-foreground',
  },
  low: {
    label: 'Baixa',
    color: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
    badgeColor: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    iconColor: 'text-sky-500',
  },
  medium: {
    label: 'Média',
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    iconColor: 'text-amber-500',
  },
  high: {
    label: 'Alta',
    color: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
    badgeColor: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    iconColor: 'text-orange-500',
  },
  urgent: {
    label: 'Urgente',
    color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    badgeColor: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    iconColor: 'text-rose-500',
  },
} as const;

export const DEFAULT_LABEL_PALETTES = [
  { name: 'Red', color: '#ef4444' },
  { name: 'Orange', color: '#f97316' },
  { name: 'Amber', color: '#f59e0b' },
  { name: 'Green', color: '#10b981' },
  { name: 'Emerald', color: '#059669' },
  { name: 'Teal', color: '#14b8a6' },
  { name: 'Cyan', color: '#06b6d4' },
  { name: 'Blue', color: '#3b82f6' },
  { name: 'Indigo', color: '#6366f1' },
  { name: 'Violet', color: '#8b5cf6' },
  { name: 'Purple', color: '#a855f7' },
  { name: 'Pink', color: '#ec4899' },
  { name: 'Rose', color: '#f43f5e' },
];

export const COVER_COLORS = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#64748b',
];

export const CARD_COVER_IMAGES = [
  {
    id: 'cover-gradient-1',
    name: 'Cosmic Purple',
    url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'cover-mountains',
    name: 'Mountain Sun',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'cover-tech',
    name: 'Tech Code',
    url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'cover-geometric',
    name: 'Abstract Fluid',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
  },
];
