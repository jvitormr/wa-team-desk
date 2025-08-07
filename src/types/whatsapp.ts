export interface WhatsAppSession {
  id: string;
  session_id: string;
  qr_code?: string;
  is_connected: boolean;
  last_ping_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BotFlow {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  trigger_keywords?: string[];
  welcome_message?: string;
  flow_data: any; // JSON type from Supabase
  created_at: string;
  updated_at: string;
}

export interface FlowData {
  nodes: FlowNode[];
  connections: FlowConnection[];
  startNodeId: string;
}

export interface FlowNode {
  id: string;
  type: 'message' | 'question' | 'condition' | 'action' | 'handover';
  title: string;
  content?: string;
  options?: FlowOption[];
  position?: { x: number; y: number };
}

export interface FlowOption {
  id: string;
  text: string;
  nextNodeId?: string;
}

export interface FlowConnection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  label?: string;
}

export interface BotSession {
  id: string;
  conversation_id: string;
  flow_id?: string;
  current_node_id?: string;
  session_data: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuickReply {
  id: string;
  operator_id?: string;
  title: string;
  content: string;
  shortcut?: string;
  is_global: boolean;
  created_at: string;
}

export interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: Record<string, any>;
  description?: string;
  created_at: string;
  updated_at: string;
}