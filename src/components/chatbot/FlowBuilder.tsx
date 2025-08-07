import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, 
  Trash2, 
  MessageSquare, 
  HelpCircle, 
  ArrowRight,
  Save,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { BotFlow, FlowNode, FlowOption } from "@/types/whatsapp";

interface FlowBuilderProps {
  flow?: BotFlow | null;
  onSave: () => void;
  onCancel: () => void;
}

export function FlowBuilder({ flow, onSave, onCancel }: FlowBuilderProps) {
  const [formData, setFormData] = useState({
    name: flow?.name || "",
    description: flow?.description || "",
    is_active: flow?.is_active ?? true,
    trigger_keywords: flow?.trigger_keywords || [],
    welcome_message: flow?.welcome_message || "",
  });

  const [nodes, setNodes] = useState<FlowNode[]>(
    flow?.flow_data?.nodes || [
      {
        id: "start",
        type: "message",
        title: "Início",
        content: "Olá! Como posso ajudá-lo hoje?",
      }
    ]
  );

  const [newKeyword, setNewKeyword] = useState("");
  const [saving, setSaving] = useState(false);

  const addKeyword = () => {
    if (newKeyword.trim() && !formData.trigger_keywords.includes(newKeyword.trim())) {
      setFormData({
        ...formData,
        trigger_keywords: [...formData.trigger_keywords, newKeyword.trim()]
      });
      setNewKeyword("");
    }
  };

  const removeKeyword = (keyword: string) => {
    setFormData({
      ...formData,
      trigger_keywords: formData.trigger_keywords.filter(k => k !== keyword)
    });
  };

  const addNode = () => {
    const newNode: FlowNode = {
      id: `node_${Date.now()}`,
      type: "message",
      title: `Nó ${nodes.length}`,
      content: "",
    };
    setNodes([...nodes, newNode]);
  };

  const updateNode = (nodeId: string, updates: Partial<FlowNode>) => {
    setNodes(nodes.map(node => 
      node.id === nodeId ? { ...node, ...updates } : node
    ));
  };

  const removeNode = (nodeId: string) => {
    if (nodeId === "start") return; // Não pode remover o nó inicial
    setNodes(nodes.filter(node => node.id !== nodeId));
  };

  const addOption = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const newOption: FlowOption = {
      id: `option_${Date.now()}`,
      text: "",
    };

    updateNode(nodeId, {
      options: [...(node.options || []), newOption]
    });
  };

  const updateOption = (nodeId: string, optionId: string, updates: Partial<FlowOption>) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !node.options) return;

    const updatedOptions = node.options.map(opt =>
      opt.id === optionId ? { ...opt, ...updates } : opt
    );

    updateNode(nodeId, { options: updatedOptions });
  };

  const removeOption = (nodeId: string, optionId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !node.options) return;

    updateNode(nodeId, {
      options: node.options.filter(opt => opt.id !== optionId)
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome do fluxo é obrigatório",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const flowData = {
        nodes,
        connections: [], // Simplified for now
        startNodeId: "start"
      };

      const payload = {
        ...formData,
        flow_data: flowData as any, // Cast to any for JSON compatibility
        trigger_keywords: formData.trigger_keywords.length > 0 ? formData.trigger_keywords : null,
        welcome_message: formData.welcome_message.trim() || null,
        description: formData.description.trim() || null,
      };

      let error;
      
      if (flow?.id) {
        // Update existing flow
        ({ error } = await supabase
          .from('bot_flows')
          .update(payload)
          .eq('id', flow.id));
      } else {
        // Create new flow
        ({ error } = await supabase
          .from('bot_flows')
          .insert(payload));
      }

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Fluxo ${flow?.id ? "atualizado" : "criado"} com sucesso!`
      });

      onSave();
    } catch (error) {
      console.error('Error saving flow:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar fluxo",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Flow Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações do Fluxo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Fluxo</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Atendimento Principal"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Fluxo Ativo</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição do fluxo..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="welcome">Mensagem de Boas-vindas</Label>
            <Textarea
              id="welcome"
              value={formData.welcome_message}
              onChange={(e) => setFormData({ ...formData, welcome_message: e.target.value })}
              placeholder="Olá! Seja bem-vindo ao nosso atendimento..."
            />
          </div>

          <div className="space-y-2">
            <Label>Palavras-chave para Ativação</Label>
            <div className="flex gap-2">
              <Input
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="Ex: oi, olá, ajuda"
                onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
              />
              <Button onClick={addKeyword} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formData.trigger_keywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.trigger_keywords.map((keyword) => (
                  <Badge key={keyword} variant="secondary">
                    {keyword}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 ml-2"
                      onClick={() => removeKeyword(keyword)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Flow Nodes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Nós do Fluxo</CardTitle>
            <Button onClick={addNode} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Nó
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {nodes.map((node, index) => (
            <Card key={node.id} className="border border-muted">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {node.type === "message" ? (
                      <MessageSquare className="h-4 w-4" />
                    ) : (
                      <HelpCircle className="h-4 w-4" />
                    )}
                    <Input
                      value={node.title}
                      onChange={(e) => updateNode(node.id, { title: e.target.value })}
                      className="font-medium"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <select
                      value={node.type}
                      onChange={(e) => updateNode(node.id, { type: e.target.value as any })}
                      className="text-sm border rounded px-2 py-1"
                    >
                      <option value="message">Mensagem</option>
                      <option value="question">Pergunta</option>
                      <option value="handover">Transferir para Humano</option>
                    </select>
                    
                    {node.id !== "start" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeNode(node.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div>
                  <Label>Conteúdo</Label>
                  <Textarea
                    value={node.content || ""}
                    onChange={(e) => updateNode(node.id, { content: e.target.value })}
                    placeholder={node.type === "handover" 
                      ? "Vou transferir você para um de nossos atendentes..." 
                      : "Digite o conteúdo da mensagem..."
                    }
                  />
                </div>

                {node.type === "question" && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Opções de Resposta</Label>
                      <Button onClick={() => addOption(node.id)} size="sm" variant="outline">
                        <Plus className="h-3 w-3 mr-1" />
                        Opção
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      {node.options?.map((option) => (
                        <div key={option.id} className="flex gap-2">
                          <Input
                            value={option.text}
                            onChange={(e) => updateOption(node.id, option.id, { text: e.target.value })}
                            placeholder="Texto da opção..."
                            className="flex-1"
                          />
                          <select
                            value={option.nextNodeId || ""}
                            onChange={(e) => updateOption(node.id, option.id, { nextNodeId: e.target.value })}
                            className="border rounded px-2 py-1"
                          >
                            <option value="">Selecionar próximo nó...</option>
                            {nodes.filter(n => n.id !== node.id).map(n => (
                              <option key={n.id} value={n.id}>{n.title}</option>
                            ))}
                          </select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeOption(node.id, option.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>Salvando...</>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {flow?.id ? "Atualizar" : "Criar"} Fluxo
            </>
          )}
        </Button>
      </div>
    </div>
  );
}