export interface AutomationOption {
    value: string;
    label: string;
}

export interface AutomationCondition {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'in';
    value: string;
}

export interface AutomationActionConfig {
    id?: number;
    type: string;
    params: Record<string, string | number | boolean>;
}

export interface AutomationRule {
    id: number;
    name: string;
    triggerType: string;
    conditions: AutomationCondition[];
    enabled: boolean;
    actions: AutomationActionConfig[];
}
