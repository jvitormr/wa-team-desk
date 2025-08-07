-- Tabela para armazenar sessões do WhatsApp Web
CREATE TABLE public.whatsapp_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  qr_code TEXT,
  is_connected BOOLEAN DEFAULT false,
  last_ping_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para fluxos de chatbot
CREATE TABLE public.bot_flows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  trigger_keywords TEXT[],
  welcome_message TEXT,
  flow_data JSONB NOT NULL, -- Estrutura do fluxo em JSON
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para nós do fluxo (cada etapa do chatbot)
CREATE TABLE public.flow_nodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_id UUID NOT NULL,
  node_id TEXT NOT NULL, -- ID único dentro do fluxo
  node_type TEXT NOT NULL, -- 'message', 'question', 'condition', 'action'
  content TEXT,
  options JSONB, -- Opções de resposta para questions
  conditions JSONB, -- Condições para nodes de condition
  next_node_id TEXT, -- Próximo nó padrão
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para sessões de conversa do bot
CREATE TABLE public.bot_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  flow_id UUID,
  current_node_id TEXT,
  session_data JSONB DEFAULT '{}', -- Dados coletados durante a conversa
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para respostas rápidas
CREATE TABLE public.quick_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operator_id UUID,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  shortcut TEXT, -- Atalho como /ola
  is_global BOOLEAN DEFAULT false, -- Se pode ser usado por todos os operadores
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar campos necessários à tabela conversations
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS bot_session_id UUID;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'whatsapp';
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS auto_closed_at TIMESTAMP WITH TIME ZONE;

-- Adicionar campos à tabela messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS whatsapp_message_id TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS replied_to_message_id UUID;

-- Tabela para configurações do sistema
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir configurações padrão
INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
('working_hours', '{"enabled": true, "start": "08:00", "end": "18:00", "days": [1,2,3,4,5]}', 'Horário de funcionamento'),
('out_of_hours_message', '{"enabled": true, "message": "Olá! Nosso horário de atendimento é de segunda a sexta, das 8h às 18h. Deixe sua mensagem que retornaremos em breve!"}', 'Mensagem fora do horário'),
('welcome_message', '{"enabled": true, "message": "Olá! Seja bem-vindo ao nosso atendimento. Como posso ajudá-lo hoje?"}', 'Mensagem de boas-vindas'),
('inactivity_timeout', '{"enabled": true, "minutes": 30, "message": "Notei que você não respondeu há um tempo. Caso precise de ajuda, é só enviar uma mensagem!"}', 'Timeout de inatividade');

-- Enable RLS
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Operadores podem ver sessões WhatsApp" ON public.whatsapp_sessions
FOR SELECT USING (EXISTS (SELECT 1 FROM operators WHERE user_id = auth.uid()));

CREATE POLICY "Apenas admins podem gerenciar sessões WhatsApp" ON public.whatsapp_sessions
FOR ALL USING (EXISTS (SELECT 1 FROM operators WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')));

CREATE POLICY "Operadores podem ver fluxos" ON public.bot_flows
FOR SELECT USING (EXISTS (SELECT 1 FROM operators WHERE user_id = auth.uid()));

CREATE POLICY "Apenas admins podem gerenciar fluxos" ON public.bot_flows
FOR ALL USING (EXISTS (SELECT 1 FROM operators WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')));

CREATE POLICY "Operadores podem ver nós dos fluxos" ON public.flow_nodes
FOR SELECT USING (EXISTS (SELECT 1 FROM operators WHERE user_id = auth.uid()));

CREATE POLICY "Apenas admins podem gerenciar nós dos fluxos" ON public.flow_nodes
FOR ALL USING (EXISTS (SELECT 1 FROM operators WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')));

CREATE POLICY "Operadores podem gerenciar sessões do bot" ON public.bot_sessions
FOR ALL USING (EXISTS (SELECT 1 FROM operators WHERE user_id = auth.uid()));

CREATE POLICY "Operadores podem gerenciar próprias respostas rápidas" ON public.quick_replies
FOR ALL USING (EXISTS (SELECT 1 FROM operators WHERE user_id = auth.uid() AND (operators.id = quick_replies.operator_id OR quick_replies.is_global = true)));

CREATE POLICY "Operadores podem ver respostas rápidas" ON public.quick_replies
FOR SELECT USING (EXISTS (SELECT 1 FROM operators WHERE user_id = auth.uid()));

CREATE POLICY "Operadores podem ver configurações" ON public.system_settings
FOR SELECT USING (EXISTS (SELECT 1 FROM operators WHERE user_id = auth.uid()));

CREATE POLICY "Apenas admins podem alterar configurações" ON public.system_settings
FOR ALL USING (EXISTS (SELECT 1 FROM operators WHERE user_id = auth.uid() AND role = 'admin'));

-- Foreign keys
ALTER TABLE public.flow_nodes ADD CONSTRAINT flow_nodes_flow_id_fkey 
FOREIGN KEY (flow_id) REFERENCES public.bot_flows(id) ON DELETE CASCADE;

ALTER TABLE public.bot_sessions ADD CONSTRAINT bot_sessions_conversation_id_fkey 
FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;

ALTER TABLE public.bot_sessions ADD CONSTRAINT bot_sessions_flow_id_fkey 
FOREIGN KEY (flow_id) REFERENCES public.bot_flows(id) ON DELETE SET NULL;

ALTER TABLE public.conversations ADD CONSTRAINT conversations_bot_session_id_fkey 
FOREIGN KEY (bot_session_id) REFERENCES public.bot_sessions(id) ON DELETE SET NULL;

ALTER TABLE public.quick_replies ADD CONSTRAINT quick_replies_operator_id_fkey 
FOREIGN KEY (operator_id) REFERENCES public.operators(id) ON DELETE CASCADE;

-- Triggers para updated_at
CREATE TRIGGER update_whatsapp_sessions_updated_at
BEFORE UPDATE ON public.whatsapp_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bot_flows_updated_at
BEFORE UPDATE ON public.bot_flows
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bot_sessions_updated_at
BEFORE UPDATE ON public.bot_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();