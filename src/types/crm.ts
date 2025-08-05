export interface Operator {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: 'admin' | 'supervisor' | 'operator';
  is_online: boolean;
  is_available: boolean;
  max_concurrent_chats: number;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  whatsapp_number: string;
  name?: string;
  email?: string;
  cnpj?: string;
  tags?: string[];
  notes?: string;
  custom_fields?: any;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  customer_id: string;
  customer?: Customer;
  assigned_operator_id?: string;
  assigned_operator?: { name: string } | Operator;
  status: 'new' | 'in_progress' | 'completed' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  last_message_at: string;
  created_at: string;
  updated_at: string;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'customer' | 'operator' | 'bot';
  sender_id?: string;
  content: string;
  message_type: 'text' | 'image' | 'audio' | 'video' | 'document';
  is_read: boolean;
  created_at: string;
}

export interface SalesStage {
  id: string;
  name: string;
  description?: string;
  order_position: number;
  color: string;
  created_at: string;
}

export interface SalesLead {
  id: string;
  customer_id: string;
  customer?: Customer;
  stage_id: string;
  stage?: SalesStage;
  assigned_operator_id?: string;
  assigned_operator?: Operator;
  value?: number;
  probability: number;
  notes?: string;
  next_followup_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AutoResponse {
  id: string;
  trigger_keyword: string;
  response_text: string;
  is_active: boolean;
  priority: number;
  created_at: string;
}

export interface BotSetting {
  id: string;
  setting_key: string;
  setting_value: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ConversationFilters {
  status?: 'new' | 'in_progress' | 'completed' | 'closed';
  assigned_operator_id?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  search?: string;
}