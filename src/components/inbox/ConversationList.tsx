import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  User, 
  Phone, 
  Clock, 
  UserPlus,
  MoreVertical
} from "lucide-react";
import { Conversation, Customer } from "@/types/crm";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ConversationListProps {
  conversations: (Conversation & { customer?: Customer })[];
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onAssignConversation: (conversationId: string) => void;
  onUpdateStatus: (conversationId: string, status: string) => void;
  getStatusLabel: (status: string) => string;
  getStatusColor: (status: string) => string;
}

export function ConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onAssignConversation,
  onUpdateStatus,
  getStatusLabel,
  getStatusColor
}: ConversationListProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffInHours < 48) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit' 
      });
    }
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

  return (
    <Card className="h-full">
      <CardContent className="p-0">
        <div className="max-h-[600px] overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-8 text-center">
              <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma conversa</h3>
              <p className="text-muted-foreground">
                As conversas aparecerão aqui quando chegarem.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`p-4 cursor-pointer hover:bg-accent transition-colors ${
                    selectedConversationId === conversation.id ? 'bg-accent' : ''
                  }`}
                  onClick={() => onSelectConversation(conversation.id)}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(
                          conversation.customer?.name,
                          conversation.customer?.whatsapp_number
                        )}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium truncate">
                            {conversation.customer?.name || 'Cliente sem nome'}
                          </h4>
                          <div
                            className={`w-2 h-2 rounded-full ${getStatusColor(conversation.status)}`}
                          />
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">
                            {formatTime(conversation.last_message_at)}
                          </span>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {conversation.status === 'new' && (
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAssignConversation(conversation.id);
                                  }}
                                >
                                  <UserPlus className="h-3 w-3 mr-2" />
                                  Assumir conversa
                                </DropdownMenuItem>
                              )}
                              
                              {conversation.status === 'in_progress' && (
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdateStatus(conversation.id, 'completed');
                                  }}
                                >
                                  Marcar como concluída
                                </DropdownMenuItem>
                              )}
                              
                              {conversation.status !== 'closed' && (
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdateStatus(conversation.id, 'closed');
                                  }}
                                >
                                  Fechar conversa
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {conversation.customer?.whatsapp_number}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                        >
                          {getStatusLabel(conversation.status)}
                        </Badge>
                        
                        {conversation.assigned_operator && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {typeof conversation.assigned_operator === 'object' 
                                ? conversation.assigned_operator.name 
                                : 'Atribuído'}
                            </span>
                          </div>
                        )}
                        
                        {conversation.priority !== 'normal' && (
                          <Badge 
                            variant={conversation.priority === 'high' || conversation.priority === 'urgent' 
                              ? "destructive" 
                              : "secondary"
                            }
                            className="text-xs"
                          >
                            {conversation.priority === 'high' ? 'Alta' :
                             conversation.priority === 'urgent' ? 'Urgente' : 
                             conversation.priority === 'low' ? 'Baixa' : conversation.priority}
                          </Badge>
                        )}
                      </div>
                      
                      {conversation.unread_count && conversation.unread_count > 0 && (
                        <Badge className="mt-2 text-xs">
                          {conversation.unread_count} nova{conversation.unread_count > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}