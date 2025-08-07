import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Send, 
  User, 
  Phone, 
  Clock, 
  CheckCircle2,
  UserPlus,
  Paperclip,
  Smile
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import { Message, Conversation, Customer } from "@/types/crm";

interface ConversationPanelProps {
  conversationId: string;
  onUpdateStatus: (conversationId: string, status: string) => void;
  onAssignConversation: (conversationId: string) => void;
}

export function ConversationPanel({
  conversationId,
  onUpdateStatus,
  onAssignConversation
}: ConversationPanelProps) {
  const [conversation, setConversation] = useState<(Conversation & { customer?: Customer }) | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { operator } = useAuth();

  useEffect(() => {
    if (conversationId) {
      fetchConversation();
      fetchMessages();
      
      // Set up real-time subscription for messages
      const channel = supabase
        .channel(`messages-${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`
          },
          (payload) => {
            setMessages(prev => [...prev, payload.new as Message]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversation = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          customer:customers(*),
          assigned_operator:operators(name)
        `)
        .eq('id', conversationId)
        .single();

      if (error) throw error;
      setConversation(data as any);
    } catch (error) {
      console.error('Error fetching conversation:', error);
    }
  };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []) as any);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar mensagens",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert([{
          conversation_id: conversationId,
          sender_type: 'operator',
          sender_id: operator?.id,
          content: newMessage.trim(),
          message_type: 'text',
          is_read: true
        }]);

      if (error) throw error;

      // Update conversation last_message_at and status if needed
      await supabase
        .from('conversations')
        .update({ 
          last_message_at: new Date().toISOString(),
          status: conversation?.status === 'new' ? 'in_progress' : conversation?.status
        })
        .eq('id', conversationId);

      setNewMessage("");
      toast({
        title: "Mensagem enviada",
        description: "Sua mensagem foi enviada com sucesso."
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar mensagem",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitials = (name?: string, phone?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (phone) {
      return phone.slice(-2);
    }
    return '??';
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (!conversation) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <p>Conversa não encontrada</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      {/* Header */}
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(
                  conversation.customer?.name,
                  conversation.customer?.whatsapp_number
                )}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <CardTitle className="text-lg">
                {conversation.customer?.name || 'Cliente sem nome'}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3 w-3" />
                {conversation.customer?.whatsapp_number}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge 
              variant={conversation.status === 'new' ? 'default' : 'outline'}
            >
              {conversation.status === 'new' ? 'Nova' :
               conversation.status === 'in_progress' ? 'Em Atendimento' :
               conversation.status === 'completed' ? 'Concluída' : 'Fechada'}
            </Badge>
            
            {conversation.status === 'new' && (
              <Button 
                size="sm" 
                onClick={() => onAssignConversation(conversationId)}
              >
                <UserPlus className="h-3 w-3 mr-1" />
                Assumir
              </Button>
            )}
            
            {conversation.status === 'in_progress' && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onUpdateStatus(conversationId, 'completed')}
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Concluir
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 p-0 overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Clock className="h-8 w-8 mx-auto mb-2" />
                <p>Nenhuma mensagem ainda</p>
                <p className="text-sm">Seja o primeiro a enviar uma mensagem!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender_type === 'operator' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      message.sender_type === 'operator'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs opacity-70">
                        {formatTime(message.created_at)}
                      </span>
                      {message.sender_type === 'operator' && (
                        <span className="text-xs opacity-70">
                          {message.is_read ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Paperclip className="h-4 w-4" />
              </Button>
              
              <div className="flex-1">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="min-h-[80px] resize-none"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
              </div>
              
              <div className="flex flex-col gap-2">
                <Button variant="outline" size="sm">
                  <Smile className="h-4 w-4" />
                </Button>
                
                <Button 
                  onClick={sendMessage} 
                  disabled={!newMessage.trim() || sending}
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}