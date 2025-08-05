-- Criar tabela de operadores
CREATE TABLE public.operators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'supervisor', 'operator')),
  is_online BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  max_concurrent_chats INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de clientes
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  whatsapp_number TEXT NOT NULL UNIQUE,
  name TEXT,
  email TEXT,
  cnpj TEXT,
  tags TEXT[],
  notes TEXT,
  custom_fields JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de conversas
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  assigned_operator_id UUID REFERENCES public.operators(id),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'completed', 'closed')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de mensagens
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'operator', 'bot')),
  sender_id UUID, -- operator_id se for operador
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'video', 'document')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de funil de vendas (etapas)
CREATE TABLE public.sales_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  order_position INTEGER NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de leads no funil
CREATE TABLE public.sales_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES public.sales_stages(id),
  assigned_operator_id UUID REFERENCES public.operators(id),
  value DECIMAL(10,2),
  probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  notes TEXT,
  next_followup_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de respostas automáticas
CREATE TABLE public.auto_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger_keyword TEXT NOT NULL,
  response_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de configurações do bot
CREATE TABLE public.bot_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para operadores
CREATE POLICY "Operadores podem ver outros operadores" ON public.operators FOR SELECT USING (true);
CREATE POLICY "Operadores podem atualizar próprio perfil" ON public.operators FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Apenas admins podem inserir operadores" ON public.operators FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.operators WHERE user_id = auth.uid() AND role = 'admin')
);

-- Políticas RLS para clientes
CREATE POLICY "Operadores podem ver todos os clientes" ON public.customers FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.operators WHERE user_id = auth.uid())
);
CREATE POLICY "Operadores podem criar/atualizar clientes" ON public.customers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.operators WHERE user_id = auth.uid())
);

-- Políticas RLS para conversas
CREATE POLICY "Operadores podem ver todas as conversas" ON public.conversations FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.operators WHERE user_id = auth.uid())
);
CREATE POLICY "Operadores podem criar/atualizar conversas" ON public.conversations FOR ALL USING (
  EXISTS (SELECT 1 FROM public.operators WHERE user_id = auth.uid())
);

-- Políticas RLS para mensagens
CREATE POLICY "Operadores podem ver todas as mensagens" ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.operators WHERE user_id = auth.uid())
);
CREATE POLICY "Operadores podem enviar mensagens" ON public.messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.operators WHERE user_id = auth.uid())
);

-- Políticas RLS para funil de vendas
CREATE POLICY "Operadores podem ver etapas do funil" ON public.sales_stages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.operators WHERE user_id = auth.uid())
);
CREATE POLICY "Apenas admins podem gerenciar etapas" ON public.sales_stages FOR ALL USING (
  EXISTS (SELECT 1 FROM public.operators WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor'))
);

CREATE POLICY "Operadores podem ver leads" ON public.sales_leads FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.operators WHERE user_id = auth.uid())
);
CREATE POLICY "Operadores podem gerenciar leads" ON public.sales_leads FOR ALL USING (
  EXISTS (SELECT 1 FROM public.operators WHERE user_id = auth.uid())
);

-- Políticas RLS para respostas automáticas
CREATE POLICY "Operadores podem ver respostas automáticas" ON public.auto_responses FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.operators WHERE user_id = auth.uid())
);
CREATE POLICY "Apenas admins podem gerenciar respostas automáticas" ON public.auto_responses FOR ALL USING (
  EXISTS (SELECT 1 FROM public.operators WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor'))
);

-- Políticas RLS para configurações do bot
CREATE POLICY "Operadores podem ver configurações" ON public.bot_settings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.operators WHERE user_id = auth.uid())
);
CREATE POLICY "Apenas admins podem alterar configurações" ON public.bot_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.operators WHERE user_id = auth.uid() AND role = 'admin')
);

-- Inserir etapas padrão do funil
INSERT INTO public.sales_stages (name, description, order_position, color) VALUES
('Lead', 'Contato inicial identificado', 1, '#6B7280'),
('Qualificado', 'Lead qualificado e com interesse', 2, '#3B82F6'),
('Proposta', 'Proposta enviada ao cliente', 3, '#F59E0B'),
('Negociação', 'Em processo de negociação', 4, '#EF4444'),
('Fechado', 'Venda realizada com sucesso', 5, '#10B981');

-- Inserir configurações padrão do bot
INSERT INTO public.bot_settings (setting_key, setting_value) VALUES
('welcome_message', '{"text": "Olá! Bem-vindo ao nosso atendimento. Como posso ajudá-lo hoje?"}'),
('menu_options', '{"options": [{"key": "1", "text": "Vendas", "action": "transfer_sales"}, {"key": "2", "text": "Suporte", "action": "transfer_support"}, {"key": "3", "text": "Falar com atendente", "action": "transfer_human"}]}'),
('business_hours', '{"start": "08:00", "end": "18:00", "timezone": "America/Sao_Paulo"}'),
('out_of_hours_message', '{"text": "No momento estamos fora do horário de atendimento. Nosso horário é de segunda a sexta, das 8h às 18h. Deixe sua mensagem que retornaremos em breve!"}');

-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar triggers para updated_at
CREATE TRIGGER update_operators_updated_at BEFORE UPDATE ON public.operators FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sales_leads_updated_at BEFORE UPDATE ON public.sales_leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bot_settings_updated_at BEFORE UPDATE ON public.bot_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar realtime
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.operators REPLICA IDENTITY FULL;

-- Adicionar tabelas à publicação realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.operators;