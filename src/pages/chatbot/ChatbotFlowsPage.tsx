import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  MessageSquare, 
  Plus, 
  Edit, 
  Trash2, 
  Power, 
  PowerOff,
  Search,
  Bot
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import { BotFlow } from "@/types/whatsapp";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FlowBuilder } from "@/components/chatbot/FlowBuilder";

export default function ChatbotFlowsPage() {
  const [flows, setFlows] = useState<BotFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFlow, setSelectedFlow] = useState<BotFlow | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { operator } = useAuth();

  useEffect(() => {
    fetchFlows();
  }, []);

  const fetchFlows = async () => {
    try {
      const { data, error } = await supabase
        .from('bot_flows')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFlows((data || []) as any);
    } catch (error) {
      console.error('Error fetching flows:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar fluxos do chatbot",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleFlowStatus = async (flowId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('bot_flows')
        .update({ is_active: !isActive })
        .eq('id', flowId);

      if (error) throw error;

      toast({
        title: isActive ? "Fluxo desativado" : "Fluxo ativado",
        description: `O fluxo foi ${isActive ? "desativado" : "ativado"} com sucesso.`
      });

      fetchFlows();
    } catch (error) {
      console.error('Error toggling flow status:', error);
      toast({
        title: "Erro",
        description: "Erro ao alterar status do fluxo",
        variant: "destructive"
      });
    }
  };

  const deleteFlow = async (flowId: string) => {
    if (!confirm("Tem certeza que deseja excluir este fluxo?")) return;

    try {
      const { error } = await supabase
        .from('bot_flows')
        .delete()
        .eq('id', flowId);

      if (error) throw error;

      toast({
        title: "Fluxo excluído",
        description: "O fluxo foi excluído com sucesso."
      });

      fetchFlows();
    } catch (error) {
      console.error('Error deleting flow:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir fluxo",
        variant: "destructive"
      });
    }
  };

  const handleCreateFlow = () => {
    setSelectedFlow(null);
    setIsDialogOpen(true);
  };

  const handleEditFlow = (flow: BotFlow) => {
    setSelectedFlow(flow);
    setIsDialogOpen(true);
  };

  const handleFlowSaved = () => {
    setIsDialogOpen(false);
    fetchFlows();
  };

  const filteredFlows = flows.filter(flow =>
    flow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    flow.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fluxos do Chatbot</h1>
          <p className="text-muted-foreground">
            Crie e gerencie fluxos automatizados de atendimento.
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreateFlow}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Fluxo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedFlow ? "Editar Fluxo" : "Criar Novo Fluxo"}
              </DialogTitle>
            </DialogHeader>
            <FlowBuilder 
              flow={selectedFlow} 
              onSave={handleFlowSaved}
              onCancel={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar fluxos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Flows Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFlows.map((flow) => (
          <Card key={flow.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{flow.name}</CardTitle>
                </div>
                <Badge variant={flow.is_active ? "default" : "secondary"}>
                  {flow.is_active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              
              {flow.description && (
                <p className="text-sm text-muted-foreground">{flow.description}</p>
              )}
            </CardHeader>
            
            <CardContent className="space-y-4">
              {flow.trigger_keywords && flow.trigger_keywords.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Palavras-chave:</p>
                  <div className="flex flex-wrap gap-1">
                    {flow.trigger_keywords.map((keyword, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {flow.welcome_message && (
                <div>
                  <p className="text-sm font-medium mb-1">Mensagem de boas-vindas:</p>
                  <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    {flow.welcome_message.length > 100 
                      ? flow.welcome_message.substring(0, 100) + "..."
                      : flow.welcome_message
                    }
                  </p>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEditFlow(flow)}
                  className="flex-1"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Editar
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleFlowStatus(flow.id, flow.is_active)}
                >
                  {flow.is_active ? (
                    <PowerOff className="h-3 w-3" />
                  ) : (
                    <Power className="h-3 w-3" />
                  )}
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => deleteFlow(flow.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              
              <div className="text-xs text-muted-foreground">
                Criado em: {new Date(flow.created_at).toLocaleDateString('pt-BR')}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredFlows.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum fluxo encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm 
                ? "Nenhum fluxo corresponde aos critérios de busca."
                : "Comece criando seu primeiro fluxo de chatbot."
              }
            </p>
            {!searchTerm && (
              <Button onClick={handleCreateFlow}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Fluxo
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}