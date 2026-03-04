import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ThemeProvider } from "./hooks/useTheme";
import AppNav from "./components/AppNav";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import EventDetail from "./pages/EventDetail";
import Checkout from "./pages/Checkout";
import TicketView from "./pages/TicketView";
import Wallet from "./pages/Wallet";
import Scanner from "./pages/Scanner";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <div className="min-h-screen flex flex-col bg-background">
              <AppNav />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/events" element={<Index />} />
                  <Route path="/event/:id" element={<EventDetail />} />
                  <Route path="/checkout/:eventId/:tierId" element={<Checkout />} />
                  <Route path="/ticket/:ticketId" element={<TicketView />} />
                  <Route path="/wallet" element={<Wallet />} />
                  <Route path="/scanner" element={<Scanner />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
