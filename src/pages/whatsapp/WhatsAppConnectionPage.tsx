import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Clock, QrCode, Smartphone, MessageSquare, Users, Settings, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import QRCodeLib from 'qrcode';

export default function WhatsAppConnectionPage() {
  const [status, setStatus] = useState<string>('disconnected');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetchStatus();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const fetchStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado",
          variant: "destructive"
        });
        return;
      }

      const response = await supabase.functions.invoke('wa-status', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        console.error('Error fetching status:', response.error);
        toast({
          title: "Erro",
          description: "Erro ao verificar status do WhatsApp",
          variant: "destructive"
        });
      } else {
        setStatus(response.data?.status || 'disconnected');
      }
    } catch (error) {
      console.error('Error fetching status:', error);
      toast({
        title: "Erro",
        description: "Erro ao verificar status do WhatsApp",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const startConnection = async () => {
    setConnecting(true);
    setQrCode(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado",
          variant: "destructive"
        });
        return;
      }

      // Start WA connection
      const { data, error } = await supabase.functions.invoke('wa-start', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error starting connection:', error);
        toast({
          title: "Erro",
          description: "Erro ao iniciar conexão",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Iniciando conexão WhatsApp..."
      });
      
      // Open WebSocket connection
      const wsUrl = `wss://bobpwdzonobaeglewuer.functions.supabase.co/functions/v1/wa-ws?token=${session.access_token}`;
      
      if (wsRef.current) {
        wsRef.current.close();
      }
      
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setStatus('connecting');
      };
      
      wsRef.current.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('WebSocket message:', message);
          
          if (message.type === 'qr') {
            setQrCode(message.qr);
            setStatus('qr_ready');
            
            // Generate QR code image
            if (qrCanvasRef.current) {
              await QRCodeLib.toCanvas(qrCanvasRef.current, message.qr, {
                width: 256,
                margin: 2,
                color: {
                  dark: '#000000',
                  light: '#FFFFFF'
                }
              });
            }
            
            toast({
              title: "QR Code gerado",
              description: "Escaneie com seu WhatsApp"
            });
          } else if (message.type === 'status') {
            setStatus(message.status);
            
            if (message.status === 'connected') {
              setQrCode(null);
              toast({
                title: "Conectado",
                description: "WhatsApp conectado com sucesso!"
              });
            } else if (message.status === 'disconnected') {
              setQrCode(null);
              toast({
                title: "Desconectado",
                description: "WhatsApp desconectado"
              });
            } else if (message.status === 'reconnecting') {
              toast({
                title: "Reconectando",
                description: "Reconectando..."
              });
            }
          } else if (message.type === 'error') {
            toast({
              title: "Erro",
              description: message.message || 'Erro na conexão',
              variant: "destructive"
            });
            setStatus('error');
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast({
          title: "Erro",
          description: "Erro na comunicação com o servidor",
          variant: "destructive"
        });
      };
      
    } catch (error) {
      console.error('Error starting connection:', error);
      toast({
        title: "Erro",
        description: "Erro ao iniciar conexão",
        variant: "destructive"
      });
    } finally {
      setConnecting(false);
    }
  };

  const disconnectSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('wa-logout', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error disconnecting:', error);
        toast({
          title: "Erro",
          description: "Erro ao desconectar",
          variant: "destructive"
        });
      } else {
        console.log('Disconnected:', data);
        toast({
          title: "Sucesso",
          description: "Desconectado com sucesso!"
        });
        setStatus('disconnected');
        setQrCode(null);
        
        // Close WebSocket
        if (wsRef.current) {
          wsRef.current.close();
        }
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast({
        title: "Erro",
        description: "Erro ao desconectar",
        variant: "destructive"
      });
    }
  };

  const getStatusInfo = () => {
    switch (status) {
      case 'connected':
        return {
          text: 'Conectado',
          variant: 'default' as const,
          icon: CheckCircle2,
          description: 'WhatsApp conectado e funcionando'
        };
      case 'connecting':
      case 'qr_ready':
        return {
          text: 'Aguardando',
          variant: 'secondary' as const,
          icon: Clock,
          description: 'Escaneie o QR Code com seu WhatsApp'
        };
      case 'reconnecting':
        return {
          text: 'Reconectando',
          variant: 'secondary' as const,
          icon: Clock,
          description: 'Tentando reconectar automaticamente'
        };
      case 'error':
        return {
          text: 'Erro',
          variant: 'destructive' as const,
          icon: AlertCircle,
          description: 'Erro na conexão. Tente novamente.'
        };
      default:
        return {
          text: 'Desconectado',
          variant: 'destructive' as const,
          icon: AlertCircle,
          description: 'WhatsApp não está conectado'
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

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
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <StatusIcon className="h-5 w-5" />
                  <Badge variant={statusInfo.variant}>
                    {statusInfo.text}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {statusInfo.description}
                </p>
              </div>
              <div className="flex gap-2">
                {status === 'connected' ? (
                  <Button 
                    variant="destructive" 
                    onClick={disconnectSession}
                    size="sm"
                  >
                    Desconectar
                  </Button>
                ) : (
                  <Button 
                    onClick={startConnection} 
                    disabled={connecting || status === 'connecting'}
                    size="sm"
                  >
                    {connecting ? 'Conectando...' : 'Conectar'}
                  </Button>
                )}
              </div>
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
            <CardDescription>
              Escaneie este código com seu WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            {qrCode && status !== 'connected' ? (
              <div className="border rounded-lg p-4 bg-white">
                <canvas 
                  ref={qrCanvasRef}
                  className="w-64 h-64"
                />
              </div>
            ) : (
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 w-64 h-64 flex items-center justify-center">
                <div className="text-center">
                  <QrCode className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {status === 'connected' 
                      ? 'WhatsApp já está conectado' 
                      : status === 'connecting'
                      ? 'Gerando QR Code...'
                      : 'Clique em "Conectar" para gerar o QR Code'
                    }
                  </p>
                </div>
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