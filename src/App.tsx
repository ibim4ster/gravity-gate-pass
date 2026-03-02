import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppNav from "./components/AppNav";
import Index from "./pages/Index";
import EventDetail from "./pages/EventDetail";
import Checkout from "./pages/Checkout";
import TicketView from "./pages/TicketView";
import Wallet from "./pages/Wallet";
import Scanner from "./pages/Scanner";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="min-h-screen flex flex-col">
          <AppNav />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/event/:id" element={<EventDetail />} />
              <Route path="/checkout/:eventId/:tierId" element={<Checkout />} />
              <Route path="/ticket/:ticketId" element={<TicketView />} />
              <Route path="/wallet" element={<Wallet />} />
              <Route path="/scanner" element={<Scanner />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
