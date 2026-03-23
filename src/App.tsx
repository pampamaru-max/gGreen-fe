import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import EvaluationPage from "@/pages/EvaluationPage";
import EvaluationByProgramPage from "@/pages/EvaluationByProgramPage";
import ProjectOperations from "@/pages/ProjectOperations";
import ProjectRegistration from "@/pages/ProjectRegistration";
import EvaluateeHome from "@/pages/EvaluateeHome";
import SettingsPrograms from "@/pages/SettingsPrograms";
import SettingsCategories from "@/pages/SettingsCategories";
import SettingsIndicators from "@/pages/SettingsIndicators";
import SettingsScoringCriteria from "@/pages/SettingsScoringCriteria";
import SettingsCertificate from "@/pages/SettingsCertificate";
import SettingsDocuments from "@/pages/SettingsDocuments";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import ProgramDetailPage from "@/pages/ProgramDetailPage";
import ReportParticipants from "@/pages/ReportParticipants";
import ReportAllGreen from "@/pages/ReportAllGreen";
import RegistrationManagement from "@/pages/RegistrationManagement";
import SettingsUsers from "@/pages/SettingsUsers";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes - no sidebar */}
            <Route path="/" element={<HomePage />} />
            <Route path="/program/:slug" element={<ProgramDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/reports/participants" element={<ReportParticipants />} />
            <Route path="/reports/all-green" element={<ReportAllGreen />} />

            {/* Protected routes - with sidebar */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/evaluation" element={<EvaluationPage />} />
              <Route path="/evaluation/:programId" element={<EvaluationByProgramPage />} />
              <Route path="/projects" element={<ProjectOperations />} />
              <Route path="/register" element={<ProjectRegistration />} />
              <Route path="/settings/programs" element={<SettingsPrograms />} />
              <Route path="/settings/categories" element={<SettingsCategories />} />
              <Route path="/settings/indicators" element={<SettingsIndicators />} />
              <Route path="/settings/scoring-criteria" element={<SettingsScoringCriteria />} />
              <Route path="/settings/certificate" element={<SettingsCertificate />} />
              <Route path="/settings/documents" element={<SettingsDocuments />} />
              <Route path="/settings/users" element={<SettingsUsers />} />
              <Route path="/registration-management" element={<RegistrationManagement />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
