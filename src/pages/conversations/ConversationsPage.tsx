import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Search, Filter, Clock, User, Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Conversation, ConversationFilters } from "@/types/crm";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusColors = {
  new: "bg-status-new text-white",
  in_progress: "bg-status-progress text-white", 
  completed: "bg-status-completed text-white",
  closed: "bg-status-closed text-white"
};

const priorityColors = {
  low: "bg-priority-low text-white",
  normal: "bg-priority-normal text-white",
  high: "bg-priority-high text-white",
  urgent: "bg-priority-urgent text-white"
};

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ConversationFilters>({});
  const [error, setError] = useState<string | null>(null);
  const { operator } = useAuth();

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('conversations')
        .select(`
          *,
          customer:customers(*),
          assigned_operator:operators(name)
        `)
        .order('last_message_at', { ascending: false });

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.assigned_operator_id) {
        query = query.eq('assigned_operator_id', filters.assigned_operator_id);
      }

      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }

      const { data, error } = await query;

      if (error) {
        setError('Erro ao carregar conversas');
        console.error(error);
      } else if (data) {
        setConversations(data as Conversation[]);
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar conversas');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchConversations();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('conversations-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => fetchConversations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConversations]);

  const updateConversationStatus = async (conversationId: string, status: string) => {
    const { error } = await supabase
      .from('conversations')
      .update({ 
        status,
        assigned_operator_id: status === 'in_progress' ? operator?.id : null
      })
      .eq('id', conversationId);

    if (!error) {
      fetchConversations();
    }
  };

  const formatStatus = (status: string) => {
    const statusMap = {
      new: 'Novo',
      in_progress: 'Em Atendimento',
      completed: 'Concluído',
      closed: 'Fechado'
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  const formatPriority = (priority: string) => {
    const priorityMap = {
      low: 'Baixa',
      normal: 'Normal',
      high: 'Alta',
      urgent: 'Urgente'
    };
    return priorityMap[priority as keyof typeof priorityMap] || priority;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-whatsapp" />
          <h1 className="text-2xl font-bold">Atendimentos</h1>
        </div>
        <Button className="bg-whatsapp hover:bg-whatsapp-dark">
          <MessageSquare className="mr-2 h-4 w-4" />
          Nova Conversa
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cliente, telefone..."
                  className="pl-10"
                  value={filters.search || ''}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
            </div>
            
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={filters.status ?? 'all'}
                  onValueChange={(value) =>
                    setFilters({ ...filters, status: value === 'all' ? undefined : (value as Conversation['status']) })
                  }
                >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="new">Novo</SelectItem>
                  <SelectItem value="in_progress">Em Atendimento</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="closed">Fechado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
              <div className="space-y-2">
                <label className="text-sm font-medium">Prioridade</label>
                <Select
                  value={filters.priority ?? 'all'}
                  onValueChange={(value) =>
                    setFilters({ ...filters, priority: value === 'all' ? undefined : (value as Conversation['priority']) })
                  }
                >
                <SelectTrigger>
                  <SelectValue placeholder="Todas as prioridades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as prioridades</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Operador</label>
              <Select value={filters.assigned_operator_id ?? 'all'} onValueChange={(value) => {
                if (value === 'all') {
                  setFilters({ ...filters, assigned_operator_id: undefined });
                } else if (value === 'me') {
                  if (operator?.id) setFilters({ ...filters, assigned_operator_id: operator.id });
                } else {
                  setFilters({ ...filters, assigned_operator_id: value });
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os operadores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os operadores</SelectItem>
                  <SelectItem value="me" disabled={!operator?.id}>Meus atendimentos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversations List */}
      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-8">Carregando conversas...</div>
        ) : error ? (
          <Card>
            <CardContent className="py-8 text-center text-destructive">
              {error}
            </CardContent>
          </Card>
        ) : conversations.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma conversa encontrada</p>
            </CardContent>
          </Card>
        ) : (
          conversations.map((conversation) => (
            <Card key={conversation.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {conversation.customer?.name || conversation.customer?.whatsapp_number}
                        </span>
                      </div>
                      
                      <Badge className={statusColors[conversation.status]}>
                        {formatStatus(conversation.status)}
                      </Badge>
                      
                      <Badge className={priorityColors[conversation.priority]}>
                        <Flag className="h-3 w-3 mr-1" />
                        {formatPriority(conversation.priority)}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDistanceToNow(new Date(conversation.last_message_at), {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </div>
                      
                      {conversation.assigned_operator && (
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {conversation.assigned_operator.name}
                        </div>
                      )}
                      
                      <span>{conversation.customer?.whatsapp_number}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {conversation.status === 'new' && (
                      <Button 
                        size="sm" 
                        className="bg-whatsapp hover:bg-whatsapp-dark"
                        onClick={() => updateConversationStatus(conversation.id, 'in_progress')}
                      >
                        Atender
                      </Button>
                    )}
                    
                    {conversation.status === 'in_progress' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => updateConversationStatus(conversation.id, 'completed')}
                      >
                        Concluir
                      </Button>
                    )}
                    
                    <Button size="sm" variant="outline">
                      Ver Conversa
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}