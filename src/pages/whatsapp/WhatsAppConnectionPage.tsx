import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QrCode, Smartphone, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import { WhatsAppSession } from "@/types/whatsapp";

export default function WhatsAppConnectionPage() {
  const [session, setSession] = useState<WhatsAppSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const { operator } = useAuth();

  useEffect(() => {
    fetchSession();
    
    // Set up real-time subscription for session updates
    const channel = supabase
      .channel('whatsapp-session-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_sessions'
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            setSession(payload.new as WhatsAppSession);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSession = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setSession(data);
    } catch (error) {
      console.error('Error fetching WhatsApp session:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar sessão do WhatsApp",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const startConnection = async () => {
    setConnecting(true);
    try {
      const { error } = await supabase.functions.invoke('whatsapp-connect');
      
      if (error) throw error;
      
      toast({
        title: "Conexão iniciada",
        description: "Iniciando conexão com WhatsApp Web..."
      });
      
      // Refresh session data
      setTimeout(fetchSession, 2000);
    } catch (error) {
      console.error('Error starting WhatsApp connection:', error);
      toast({
        title: "Erro",
        description: "Erro ao iniciar conexão com WhatsApp",
        variant: "destructive"
      });
    } finally {
      setConnecting(false);
    }
  };

  const disconnectSession = async () => {
    try {
      const { error } = await supabase.functions.invoke('whatsapp-disconnect');
      
      if (error) throw error;
      
      toast({
        title: "Desconectado",
        description: "Sessão do WhatsApp desconectada"
      });
      
      fetchSession();
    } catch (error) {
      console.error('Error disconnecting WhatsApp:', error);
      toast({
        title: "Erro",
        description: "Erro ao desconectar WhatsApp",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Conexão WhatsApp</h1>
        <p className="text-muted-foreground">
          Gerencie a conexão com o WhatsApp Web para receber e enviar mensagens.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Status da Conexão
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Status:</span>
              <Badge variant={session?.is_connected ? "default" : "secondary"}>
                {session?.is_connected ? (
                  <>
                    <Wifi className="h-3 w-3 mr-1" />
                    Conectado
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3 mr-1" />
                    Desconectado
                  </>
                )}
              </Badge>
            </div>
            
            {session?.last_ping_at && (
              <div className="flex items-center justify-between">
                <span>Última atividade:</span>
                <span className="text-sm text-muted-foreground">
                  {new Date(session.last_ping_at).toLocaleString('pt-BR')}
                </span>
              </div>
            )}

            <div className="flex gap-2">
              {!session?.is_connected ? (
                <Button 
                  onClick={startConnection} 
                  disabled={connecting}
                  className="flex-1"
                >
                  {connecting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Conectando...
                    </>
                  ) : (
                    <>
                      <Wifi className="h-4 w-4 mr-2" />
                      Conectar
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  onClick={disconnectSession}
                  variant="outline"
                  className="flex-1"
                >
                  <WifiOff className="h-4 w-4 mr-2" />
                  Desconectar
                </Button>
              )}
              
              <Button variant="outline" onClick={fetchSession}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* QR Code Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Code
            </CardTitle>
          </CardHeader>
          <CardContent>
            {session?.qr_code && !session.is_connected ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <img 
                    src={session.qr_code} 
                    alt="QR Code WhatsApp" 
                    className="w-48 h-48 border rounded-lg"
                  />
                </div>
                <Alert>
                  <Smartphone className="h-4 w-4" />
                  <AlertDescription>
                    Escaneie este QR Code com o WhatsApp do seu celular em:
                    <br />
                    <strong>WhatsApp → Menu → Aparelhos conectados → Conectar um aparelho</strong>
                  </AlertDescription>
                </Alert>
              </div>
            ) : session?.is_connected ? (
              <div className="text-center py-8">
                <Wifi className="h-12 w-12 text-whatsapp mx-auto mb-4" />
                <p className="text-lg font-medium text-whatsapp">WhatsApp Conectado!</p>
                <p className="text-sm text-muted-foreground">
                  Pronto para enviar e receber mensagens
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
                <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">Aguardando QR Code</p>
                <p className="text-sm text-muted-foreground">
                  Clique em "Conectar" para gerar o QR Code
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Como conectar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-white font-bold">1</span>
              </div>
              <h3 className="font-medium">Clique em Conectar</h3>
              <p className="text-sm text-muted-foreground">
                Inicie o processo de conexão
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-white font-bold">2</span>
              </div>
              <h3 className="font-medium">Escaneie o QR Code</h3>
              <p className="text-sm text-muted-foreground">
                Use o WhatsApp do seu celular
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-white font-bold">3</span>
              </div>
              <h3 className="font-medium">Pronto!</h3>
              <p className="text-sm text-muted-foreground">
                WhatsApp conectado e funcionando
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}