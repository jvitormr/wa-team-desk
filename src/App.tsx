import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import AuthPage from "./pages/auth/AuthPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import ConversationsPage from "./pages/conversations/ConversationsPage";
import InboxPage from "./pages/inbox/InboxPage";
import WhatsAppConnectionPage from "./pages/whatsapp/WhatsAppConnectionPage";
import ChatbotFlowsPage from "./pages/chatbot/ChatbotFlowsPage";
import NotFound from "./pages/NotFound";
import PlaceholderPage from "./pages/PlaceholderPage";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/auth" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/" element={
            <ProtectedRoute>
              <DashboardLayout>
                <DashboardPage />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/inbox" element={
            <ProtectedRoute>
              <DashboardLayout>
                <InboxPage />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/conversations" element={
            <ProtectedRoute>
              <DashboardLayout>
                <ConversationsPage />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/whatsapp" element={
            <ProtectedRoute>
              <DashboardLayout>
                <WhatsAppConnectionPage />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/chatbot" element={
            <ProtectedRoute>
              <DashboardLayout>
                <ChatbotFlowsPage />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/customers" element={
            <ProtectedRoute>
              <DashboardLayout>
                <PlaceholderPage title="Clientes" />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/sales" element={
            <ProtectedRoute>
              <DashboardLayout>
                <PlaceholderPage title="Funil de Vendas" />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute>
              <DashboardLayout>
                <PlaceholderPage title="Relatórios" />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/auto-responses" element={
            <ProtectedRoute>
              <DashboardLayout>
                <PlaceholderPage title="Respostas Automáticas" />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/bot-settings" element={
            <ProtectedRoute>
              <DashboardLayout>
                <PlaceholderPage title="Configurações do Bot" />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/operators" element={
            <ProtectedRoute>
              <DashboardLayout>
                <PlaceholderPage title="Operadores" />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <DashboardLayout>
                <PlaceholderPage title="Configurações" />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
