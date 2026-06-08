export type MacroParamKind = 'percent' | 'currency' | 'integer' | 'csv' | 'text' | 'enum';

export type MacroParamGroup =
  | 'overflow'
  | 'credito'
  | 'limite_estado'
  | 'milestone'
  | 'liquidez'
  | 'antifraude'
  | 'tesouraria';

export interface MacroParamOption {
  value: string;
  label: string;
  description?: string;
}

export interface MacroParamMeta {
  label: string;
  description: string;
  hint: string;
  unit: string;
  kind: MacroParamKind;
  default: string;
  example?: string;
  group: MacroParamGroup;
  options?: MacroParamOption[];
}

export const MACRO_PARAM_CATALOG: Record<string, MacroParamMeta> = {
  overflow_debt_pct: {
    label: 'Excedente → Dívida',
    description:
      'Quando o caixa do grupo enche, esta porcentagem do que sobrou vai automaticamente para abater a dívida ativa do grupo (empréstimos em aberto).',
    hint: 'Parte do excedente que quita dívida',
    unit: '%',
    kind: 'percent',
    default: '50',
    example: '50 = metade do excedente quita dívida',
    group: 'overflow',
  },
  overflow_reserve_pct: {
    label: 'Excedente → Reserva',
    description:
      'Porcentagem do excedente que vai para recompor a reserva mínima de liquidez do grupo. Mantém o grupo protegido contra saques inesperados.',
    hint: 'Parte do excedente que vira reserva',
    unit: '%',
    kind: 'percent',
    default: '20',
    example: '20 = 1/5 do excedente fortalece a reserva',
    group: 'overflow',
  },
  overflow_locked_pct: {
    label: 'Excedente → Bloqueado',
    description:
      'Porcentagem do excedente que vai para o caixa BLOQUEADO do grupo. Esse dinheiro não pode ser gasto na hora, garantindo estabilidade de longo prazo.',
    hint: 'Parte do excedente que fica travada',
    unit: '%',
    kind: 'percent',
    default: '30',
    example: '30 = quase 1/3 do excedente fica travado',
    group: 'overflow',
  },
  overflow_recovery_debt_pct: {
    label: 'Recuperação → Dívida',
    description:
      'Quando o grupo está em estado de RECUPERAÇÃO (saúde ruim), esta porcentagem maior do excedente é forçada para amortizar dívida, até regularizar.',
    hint: 'Override agressivo em Recuperação',
    unit: '%',
    kind: 'percent',
    default: '80',
    example: '80 = quase todo o excedente quita dívida em Recuperação',
    group: 'overflow',
  },
  taxa_base_mensal: {
    label: 'Juros base do empréstimo',
    description:
      'Taxa inicial cobrada em empréstimos antes de aplicar prêmio de risco, prêmio de alavancagem e alívio social. É a "porta de entrada" do cálculo.',
    hint: 'Juros mensais antes dos ajustes',
    unit: '% ao mês',
    kind: 'percent',
    default: '2.0',
    example: '2.0 = 2% ao mês para um empréstimo médio',
    group: 'credito',
  },
  piso_juros_mensal: {
    label: 'Juros mínimos',
    description:
      'Limite mínimo absoluto da taxa final cobrada em empréstimos. Mesmo com todos os descontos (risco baixo, alívio social), a taxa nunca cai abaixo deste valor.',
    hint: 'Piso absoluto de juros',
    unit: '% ao mês',
    kind: 'percent',
    default: '1.0',
    example: '1.0 = taxa nunca fica abaixo de 1% ao mês',
    group: 'credito',
  },
  teto_juros_mensal: {
    label: 'Juros máximos',
    description:
      'Limite máximo absoluto da taxa final cobrada em empréstimos. Mesmo com risco alto, a taxa nunca passa deste valor — protege o usuário de juros abusivos.',
    hint: 'Teto absoluto de juros',
    unit: '% ao mês',
    kind: 'percent',
    default: '8.0',
    example: '8.0 = taxa nunca passa de 8% ao mês',
    group: 'credito',
  },
  multa_atraso_dia: {
    label: 'Multa por dia de atraso',
    description:
      'Multa diária sobre cada parcela em atraso, limitada a 10% do valor da parcela. Desencoraja calote e compensa o grupo pelo tempo sem o dinheiro.',
    hint: 'Multa diária em parcelas atrasadas',
    unit: '% ao dia',
    kind: 'percent',
    default: '0.15',
    example: '0.15 = 0,15% por dia de atraso (capped em 10% por parcela)',
    group: 'credito',
  },
  limite_saudavel_pct_receita_7d: {
    label: 'Limite de crédito — Saudável (7d)',
    description:
      'Quando o grupo está SAUDÁVEL, ele pode emprestar até este percentual da receita dos últimos 7 dias. É o teto mais generoso, usado quando tudo vai bem.',
    hint: 'Teto de dívida em grupos Saudáveis',
    unit: '% da receita 7d',
    kind: 'percent',
    default: '35',
    example: '35 = grupo saudável pode dever até 35% da receita semanal',
    group: 'limite_estado',
  },
  limite_atencao_pct_receita_7d: {
    label: 'Limite de crédito — Atenção (7d)',
    description:
      'Quando o grupo está em ATENÇÃO (saúde média), o teto de dívida cai para este percentual da receita dos últimos 7 dias. Restringe novos empréstimos para evitar piora.',
    hint: 'Teto de dívida em grupos em Atenção',
    unit: '% da receita 7d',
    kind: 'percent',
    default: '20',
    example: '20 = grupo em Atenção pode dever até 20% da receita semanal',
    group: 'limite_estado',
  },
  limite_recuperacao_pct_receita_7d: {
    label: 'Limite de crédito — Recuperação (7d)',
    description:
      'Quando o grupo está em RECUPERAÇÃO (saúde ruim), o teto de dívida é o mais restrito, forçando o grupo a quitar o que deve antes de tomar mais empréstimos.',
    hint: 'Teto de dívida em grupos em Recuperação',
    unit: '% da receita 7d',
    kind: 'percent',
    default: '10',
    example: '10 = grupo em Recuperação pode dever no máximo 10% da receita semanal',
    group: 'limite_estado',
  },
  hard_cap_divida_pct_receita_30d: {
    label: 'Teto duro de dívida (30d)',
    description:
      'Limite rígido e absoluto: a dívida ativa do grupo NUNCA pode passar deste percentual da receita dos últimos 30 dias, independente do estado de saúde. É a última rede de segurança.',
    hint: 'Teto absoluto baseado em 30 dias',
    unit: '% da receita 30d',
    kind: 'percent',
    default: '60',
    example: '60 = dívida ativa nunca passa de 60% da receita mensal',
    group: 'limite_estado',
  },
  user_milestone_target: {
    label: 'Mensagens para ganhar o bônus',
    description:
      'Quantidade de mensagens que o usuário precisa enviar dentro do período definido (ver "Período do bônus" abaixo) para receber o bônus de marco.',
    hint: 'Volume de mensagens para liberar o bônus',
    unit: ' msgs',
    kind: 'integer',
    default: '50',
    example: '50 = a cada 50 mensagens, o usuário recebe o bônus',
    group: 'milestone',
  },
  user_milestone_period: {
    label: 'Período do bônus',
    description:
      'Define como a contagem de mensagens para o bônus se comporta. "Uma única vez" conta o total desde o início (não reseta). As outras opções resetam a contagem depois de cada bônus pago.',
    hint: 'Quando a contagem reseta',
    unit: '',
    kind: 'enum',
    default: 'once',
    example: 'day = o usuário recebe o bônus uma vez por dia',
    group: 'milestone',
    options: [
      { value: 'once', label: 'Uma única vez', description: 'Conta o total acumulado (não reseta)' },
      { value: 'hour', label: 'A cada hora', description: 'Reseta a cada 1 hora' },
      { value: 'day', label: 'A cada dia', description: 'Reseta a cada 24 horas' },
      { value: 'week', label: 'A cada semana', description: 'Reseta a cada 7 dias' },
      { value: 'month', label: 'A cada mês', description: 'Reseta a cada 30 dias' },
    ],
  },
  user_milestone_reward: {
    label: 'Valor do bônus',
    description:
      'Quanto o usuário recebe (em moeda do bot) cada vez que atinge o marco de mensagens. Sai do caixa do grupo, sujeito à liquidez disponível.',
    hint: 'Recompensa em dinheiro por marco',
    unit: ' R$',
    kind: 'currency',
    default: '5',
    example: '5 = R$ 5,00 por marco atingido',
    group: 'milestone',
  },
  user_milestone_cooldown_minutes: {
    label: 'Cooldown do bônus (anti-flood)',
    description:
      'Tempo mínimo em minutos entre dois pagamentos de bônus para o MESMO usuário. Evita que um único usuário floodando mensagens receba vários bônus em sequência rápida.',
    hint: 'Espaço mínimo entre bônus do mesmo usuário',
    unit: ' min',
    kind: 'integer',
    default: '0',
    example: '0 = sem cooldown (pode receber vários em sequência). Use 5-10 para evitar flood.',
    group: 'milestone',
  },
  reserva_minima_liquidez_pct: {
    label: 'Reserva mínima de liquidez',
    description:
      'Percentual das saídas previstas nos próximos 7 dias que deve estar SEMPRE disponível no caixa. Se o caixa cair abaixo, o bot automaticamente prioriza recompor.',
    hint: 'Colchão mínimo de caixa',
    unit: '% das saídas 7d',
    kind: 'percent',
    default: '25',
    example: '25 = 1/4 das saídas semanais precisa estar sempre disponível',
    group: 'liquidez',
  },
  cooldown_per_user_minutes: {
    label: 'Cooldown geral (anti-spam)',
    description:
      'Tempo mínimo em minutos entre QUALQUER ação econômica de um mesmo usuário (compras, vendas, uso de itens, etc). É diferente do cooldown do bônus: este é geral, o do bônus é só para a recompensa.',
    hint: 'Espaço mínimo entre ações do mesmo usuário',
    unit: ' min',
    kind: 'integer',
    default: '10',
    example: '10 = o usuário só pode fazer ações a cada 10 minutos',
    group: 'antifraude',
  },
};

export const MACRO_PARAM_GROUP_LABELS: Record<MacroParamGroup, string> = {
  overflow: 'Distribuição do Excedente',
  credito: 'Crédito e Juros',
  limite_estado: 'Limite de Dívida por Estado',
  milestone: 'Bônus por Engajamento',
  liquidez: 'Liquidez da Tesouraria',
  antifraude: 'Anti-Spam e Segurança',
  tesouraria: 'Tesouraria',
};

export const MACRO_PARAM_GROUP_ORDER: MacroParamGroup[] = [
  'milestone',
  'credito',
  'limite_estado',
  'liquidez',
  'overflow',
  'antifraude',
  'tesouraria',
];

export function getMeta(key: string): MacroParamMeta | undefined {
  return MACRO_PARAM_CATALOG[key];
}

export function isEnumParam(meta: MacroParamMeta): boolean {
  return meta.kind === 'enum' && Array.isArray(meta.options) && meta.options.length > 0;
}

export function formatValue(raw: string, kind: MacroParamKind): string {
  if (kind === 'csv' || kind === 'text') return raw;
  if (kind === 'enum') {
    const meta = Object.values(MACRO_PARAM_CATALOG).find((m) => m.kind === 'enum' && m.options?.some((o) => o.value === raw));
    const opt = meta?.options?.find((o) => o.value === raw);
    return opt?.label || raw;
  }
  if (raw === '') return '—';
  const n = Number(raw);
  if (Number.isNaN(n)) return raw;
  if (kind === 'percent') return `${n}%`;
  if (kind === 'currency') return `R$ ${n}`;
  if (kind === 'integer') return String(n);
  return raw;
}
