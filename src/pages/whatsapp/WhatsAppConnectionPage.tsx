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
  const [sessionName, setSessionName] = useState<string>('');
  const [qrImageUrl, setQrImageUrl] = useState<string>('');
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (qrCode && qrCanvasRef.current) {
      QRCodeLib.toCanvas(qrCanvasRef.current, qrCode, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    }
  }, [qrCode]);

  useEffect(() => {
    fetchStatus();
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

      console.log('Fetching WhatsApp status...');
      const response = await supabase.functions.invoke('wa-status', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log('Status response:', response);

      if (response.error) {
        console.error('Error fetching status:', response.error);
        toast({
          title: "Erro",
          description: "Erro ao verificar status do WhatsApp",
          variant: "destructive"
        });
      } else {
        const currentStatus = response.data?.status || 'disconnected';
        const sessionName = response.data?.session_name || '';
        console.log('Current status:', currentStatus, 'Session:', sessionName);
        setStatus(currentStatus);
        setSessionName(sessionName);
        
        // Se conectando, buscar QR code
        if (currentStatus === 'connecting' && sessionName) {
          await fetchQRCode(sessionName);
        }
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

  const fetchQRCode = async (session: string) => {
    try {
      const { data: authSession } = await supabase.auth.getSession();
      
      if (!authSession?.session) {
        console.error('No auth session found');
        return;
      }

      console.log('Fetching QR code for session:', session);
      const response = await supabase.functions.invoke('waha-screenshot', {
        headers: {
          Authorization: `Bearer ${authSession.session.access_token}`,
        },
      });

      if (response.error) {
        console.error('Error fetching QR code:', response.error);
        // Retry after a delay if session is still connecting
        if (status === 'connecting') {
          setTimeout(() => fetchQRCode(session), 3000);
        }
      } else if (response.data) {
        // Create object URL for the image
        const blob = new Blob([response.data], { type: 'image/png' });
        const imageUrl = URL.createObjectURL(blob);
        setQrImageUrl(imageUrl);
        setStatus('qr_ready');
      }
    } catch (error) {
      console.error('Error fetching QR code:', error);
    }
  };

  const startConnection = async () => {
    setConnecting(true);
    setQrCode(null);
    setQrImageUrl('');
    
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

      console.log('Starting WAHA session...');
      
      // Start WAHA session
      const { data: startData, error } = await supabase.functions.invoke('waha-start-session', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {}
      });

      console.log('waha-start-session response:', startData, error);

      if (error) {
        console.error('Error starting session:', error);
        toast({
          title: "Erro",
          description: `Erro ao iniciar sessão: ${error?.message}`,
          variant: "destructive"
        });
        return;
      }

      setStatus('connecting');
      toast({
        title: "Sucesso",
        description: "Iniciando sessão WhatsApp..."
      });

      // Start polling for QR code
      const pollQRCode = async () => {
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes max
        
        const poll = setInterval(async () => {
          attempts++;
          
          if (attempts > maxAttempts) {
            clearInterval(poll);
            toast({
              title: "Timeout",
              description: "Tempo limite excedido para gerar QR code",
              variant: "destructive"
            });
            setStatus('error');
            return;
          }

          // Check current status
          await fetchStatus();
          
          // If session name is available, try to get QR code
          if (sessionName) {
            await fetchQRCode(sessionName);
          }
          
          // Stop polling if connected or error
          if (status === 'connected' || status === 'error') {
            clearInterval(poll);
          }
        }, 5000); // Poll every 5 seconds
      };

      // Start polling after a short delay
      setTimeout(pollQRCode, 2000);
      
    } catch (error) {
      console.error('Error starting connection:', error);
      toast({
        title: "Erro",
        description: "Erro ao iniciar conexão",
        variant: "destructive"
      });
      setStatus('error');
    } finally {
      setConnecting(false);
    }
  };

  const disconnectSession = async () => {
    setLoading(true);
    
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

      // Clear QR image URL
      setQrImageUrl('');
      setQrCode(null);

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
        
        // Refresh status after disconnect
        setTimeout(() => fetchStatus(), 1000);
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast({
        title: "Erro",
        description: "Erro ao desconectar",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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
            {(qrCode || qrImageUrl) && status !== 'connected' ? (
              <div className="border rounded-lg p-4 bg-white">
                {qrImageUrl ? (
                  <img 
                    src={qrImageUrl}
                    alt="QR Code WhatsApp"
                    className="w-64 h-64 object-contain"
                  />
                ) : (
                  <canvas 
                    ref={qrCanvasRef}
                    className="w-64 h-64"
                  />
                )}
              </div>
            ) : (
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 w-64 h-64 flex items-center justify-center">
                <div className="text-center">
                  <QrCode className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {status === 'connected' 
                      ? 'WhatsApp já está conectado' 
                      : status === 'connecting' || status === 'qr_ready'
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