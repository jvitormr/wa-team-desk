import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Search, 
  Filter, 
  User, 
  Clock,
  Phone,
  CheckCircle2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import { Conversation, Customer } from "@/types/crm";
import { ConversationPanel } from "@/components/inbox/ConversationPanel";
import { ConversationList } from "@/components/inbox/ConversationList";

export default function InboxPage() {
  const [conversations, setConversations] = useState<(Conversation & { customer?: Customer })[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { operator } = useAuth();

  useEffect(() => {
    fetchConversations();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [statusFilter]);

  const fetchConversations = async () => {
    try {
      let query = supabase
        .from('conversations')
        .select(`
          *,
          customer:customers(*),
          assigned_operator:operators(name)
        `)
        .order('last_message_at', { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setConversations((data || []) as any);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar conversas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const assignConversation = async (conversationId: string, operatorId?: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ 
          assigned_operator_id: operatorId || operator?.id,
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      if (error) throw error;

      toast({
        title: "Conversa atribuída",
        description: "A conversa foi atribuída com sucesso."
      });

      fetchConversations();
    } catch (error) {
      console.error('Error assigning conversation:', error);
      toast({
        title: "Erro",
        description: "Erro ao atribuir conversa",
        variant: "destructive"
      });
    }
  };

  const updateConversationStatus = async (conversationId: string, status: string) => {
    try {
      const updates: any = { 
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'completed') {
        updates.auto_closed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('conversations')
        .update(updates)
        .eq('id', conversationId);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: `Conversa marcada como ${getStatusLabel(status).toLowerCase()}.`
      });

      fetchConversations();
    } catch (error) {
      console.error('Error updating conversation status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status da conversa",
        variant: "destructive"
      });
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new': return 'Nova';
      case 'in_progress': return 'Em Atendimento';
      case 'completed': return 'Concluída';
      case 'closed': return 'Fechada';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-500';
      case 'in_progress': return 'bg-yellow-500';
      case 'completed': return 'bg-green-500';
      case 'closed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const searchLower = searchTerm.toLowerCase();
    const customerName = conv.customer?.name?.toLowerCase() || '';
    const customerPhone = conv.customer?.whatsapp_number?.toLowerCase() || '';
    
    return customerName.includes(searchLower) || customerPhone.includes(searchLower);
  });

  const statusCounts = {
    all: conversations.length,
    new: conversations.filter(c => c.status === 'new').length,
    in_progress: conversations.filter(c => c.status === 'in_progress').length,
    completed: conversations.filter(c => c.status === 'completed').length,
    closed: conversations.filter(c => c.status === 'closed').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Caixa de Entrada</h1>
          <p className="text-muted-foreground">
            Gerencie todas as conversas do WhatsApp em um só lugar.
          </p>
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {[
          { key: 'all', label: 'Todas', icon: MessageSquare },
          { key: 'new', label: 'Novas', icon: MessageSquare },
          { key: 'in_progress', label: 'Em Atendimento', icon: Phone },
          { key: 'completed', label: 'Concluídas', icon: CheckCircle2 },
          { key: 'closed', label: 'Fechadas', icon: Clock },
        ].map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={statusFilter === key ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(key)}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <Icon className="h-4 w-4" />
            {label}
            <Badge variant="secondary" className="ml-1">
              {statusCounts[key as keyof typeof statusCounts]}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Search */}
      <Card className="p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Conversations List */}
        <div className="lg:col-span-1">
          <ConversationList
            conversations={filteredConversations}
            selectedConversationId={selectedConversation}
            onSelectConversation={setSelectedConversation}
            onAssignConversation={assignConversation}
            onUpdateStatus={updateConversationStatus}
            getStatusLabel={getStatusLabel}
            getStatusColor={getStatusColor}
          />
        </div>

        {/* Conversation Panel */}
        <div className="lg:col-span-2">
          {selectedConversation ? (
            <ConversationPanel
              conversationId={selectedConversation}
              onUpdateStatus={updateConversationStatus}
              onAssignConversation={assignConversation}
            />
          ) : (
            <Card className="h-full flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Selecione uma conversa</h3>
                <p className="text-muted-foreground">
                  Escolha uma conversa da lista para visualizar as mensagens.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}