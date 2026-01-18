import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import RobotDashboard from "./pages/RobotDashboard";
import RobotControl from "./pages/RobotControl";
import RobotCatalog from "./pages/RobotCatalog";
import RobotDetail from "./pages/RobotDetail";
import Auth from "./pages/Auth";
import AdminPanel from "./pages/AdminPanel";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ProtectedRoute><RobotDashboard /></ProtectedRoute>} />
          <Route path="/robot/:id" element={<ProtectedRoute><RobotControl /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
          <Route path="/catalog" element={<RobotCatalog />} />
          <Route path="/catalog/:id" element={<RobotDetail />} />
          <Route path="/auth" element={<Auth />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
