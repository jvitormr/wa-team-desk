import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MessageSquare, Users, TrendingUp, Clock, Phone, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface DashboardStats {
  totalConversations: number;
  newConversations: number;
  inProgressConversations: number;
  completedConversations: number;
  totalCustomers: number;
  totalLeads: number;
  avgResponseTime: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalConversations: 0,
    newConversations: 0,
    inProgressConversations: 0,
    completedConversations: 0,
    totalCustomers: 0,
    totalLeads: 0,
    avgResponseTime: "0 min"
  });
  const [loading, setLoading] = useState(true);
  const { operator } = useAuth();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    setLoading(true);
    
    try {
      // Fetch conversations stats
      const { data: conversations } = await supabase
        .from('conversations')
        .select('status');

      // Fetch customers count
      const { count: customersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      // Fetch leads count
      const { count: leadsCount } = await supabase
        .from('sales_leads')
        .select('*', { count: 'exact', head: true });

      if (conversations) {
        const newConversations = conversations.filter(c => c.status === 'new').length;
        const inProgressConversations = conversations.filter(c => c.status === 'in_progress').length;
        const completedConversations = conversations.filter(c => c.status === 'completed').length;

        setStats({
          totalConversations: conversations.length,
          newConversations,
          inProgressConversations,
          completedConversations,
          totalCustomers: customersCount || 0,
          totalLeads: leadsCount || 0,
          avgResponseTime: "2.5 min" // Mock data for now
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
    
    setLoading(false);
  };

  const statCards = [
    {
      title: "Total de Conversas",
      value: stats.totalConversations,
      icon: MessageSquare,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Novas Conversas",
      value: stats.newConversations,
      icon: MessageSquare,
      color: "text-status-new",
      bgColor: "bg-blue-50"
    },
    {
      title: "Em Atendimento",
      value: stats.inProgressConversations,
      icon: Phone,
      color: "text-status-progress",
      bgColor: "bg-yellow-50"
    },
    {
      title: "Concluídas",
      value: stats.completedConversations,
      icon: CheckCircle,
      color: "text-status-completed",
      bgColor: "bg-green-50"
    },
    {
      title: "Total de Clientes",
      value: stats.totalCustomers,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "Leads no Funil",
      value: stats.totalLeads,
      icon: TrendingUp,
      color: "text-whatsapp",
      bgColor: "bg-green-50"
    },
    {
      title: "Tempo Médio de Resposta",
      value: stats.avgResponseTime,
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo, {operator?.name}! Aqui está o resumo do seu CRM.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="h-6 w-6 text-whatsapp" />
          <span className="text-lg font-semibold text-whatsapp">WhatsCRM</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold">
                    {loading ? "..." : stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="cursor-pointer hover:bg-accent transition-colors">
                <CardContent className="p-4 text-center">
                  <MessageSquare className="h-8 w-8 text-whatsapp mx-auto mb-2" />
                  <p className="text-sm font-medium">Nova Conversa</p>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:bg-accent transition-colors">
                <CardContent className="p-4 text-center">
                  <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm font-medium">Adicionar Cliente</p>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:bg-accent transition-colors">
                <CardContent className="p-4 text-center">
                  <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm font-medium">Novo Lead</p>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:bg-accent transition-colors">
                <CardContent className="p-4 text-center">
                  <Clock className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                  <p className="text-sm font-medium">Relatórios</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <MessageSquare className="h-5 w-5 text-whatsapp" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Nova conversa iniciada</p>
                  <p className="text-xs text-muted-foreground">Cliente: +55 11 99999-9999</p>
                </div>
                <span className="text-xs text-muted-foreground">há 5 min</span>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Users className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Cliente cadastrado</p>
                  <p className="text-xs text-muted-foreground">João Silva</p>
                </div>
                <span className="text-xs text-muted-foreground">há 15 min</span>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Lead movido no funil</p>
                  <p className="text-xs text-muted-foreground">Lead → Qualificado</p>
                </div>
                <span className="text-xs text-muted-foreground">há 30 min</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}