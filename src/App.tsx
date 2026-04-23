import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { lazy, Suspense } from "react";

const HomePage = lazy(() => import("@/pages/HomePage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const EvaluationPage = lazy(() => import("@/pages/EvaluationPage"));
const EvaluationByProgramPage = lazy(() => import("@/pages/EvaluationByProgramPage"));
const EvaluationSummaryPage = lazy(() => import("@/pages/EvaluationSummaryPage"));
const ProjectOperations = lazy(() => import("@/pages/ProjectOperations"));
const ProjectRegistration = lazy(() => import("@/pages/ProjectRegistration"));
const EvaluateeHome = lazy(() => import("@/pages/EvaluateeHome"));
const PrintCertificate = lazy(() => import("@/pages/PrintCertificate"));
const SettingsPrograms = lazy(() => import("@/pages/SettingsPrograms"));
const SettingsCategories = lazy(() => import("@/pages/SettingsCategories"));
const SettingsIndicators = lazy(() => import("@/pages/SettingsIndicators"));
const SettingsScoringCriteria = lazy(() => import("@/pages/SettingsScoringCriteria"));
const SettingsCertificate = lazy(() => import("@/pages/SettingsCertificate"));
const SettingsDocuments = lazy(() => import("@/pages/SettingsDocuments"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const ProgramDetailPage = lazy(() => import("@/pages/ProgramDetailPage"));
const ReportParticipants = lazy(() => import("@/pages/ReportParticipants"));
const ReportAllGreen = lazy(() => import("@/pages/ReportAllGreen"));
const RegistrationManagement = lazy(() => import("@/pages/RegistrationManagement"));
const SettingsUsers = lazy(() => import("@/pages/SettingsUsers"));
const SettingsProjectDuration = lazy(() => import("@/pages/SettingsProjectDuration"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const LoadingPreviewPage = lazy(() => import("@/pages/LoadingPreviewPage"));
const ResourceUsagePage = lazy(() => import("@/pages/ResourceUsagePage"));
const ResourceUsageFormPage = lazy(() => import("@/pages/ResourceUsageFormPage"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ThemeProvider>
        <AuthProvider>
          <Suspense fallback={null}>
            <Routes>
              {/* Public routes - no sidebar */}
              <Route path="/" element={<HomePage />} />
              <Route path="/program/:slug" element={<ProgramDetailPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/reports/participants" element={<ReportParticipants />} />
              <Route path="/reports/all-green" element={<ReportAllGreen />} />
              <Route path="/certificate/print/:id" element={<PrintCertificate />} />
              <Route path="/dev/loading-preview" element={<LoadingPreviewPage />} />

              {/* Protected routes - with sidebar */}
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/evaluation" element={<EvaluationPage />} />
                <Route path="/evaluation/:programId" element={<EvaluationByProgramPage />} />
                <Route path="/evaluation/:programId/summary" element={<EvaluationSummaryPage />} />
                <Route path="/projects" element={<ProjectOperations />} />
                <Route path="/register" element={<EvaluateeHome />} />
                <Route path="/register/evaluate" element={<ProjectRegistration />} />
                <Route path="/settings/programs" element={<SettingsPrograms />} />
                <Route path="/settings/categories" element={<SettingsCategories />} />
                <Route path="/settings/indicators" element={<SettingsIndicators />} />
                <Route path="/settings/scoring-criteria" element={<SettingsScoringCriteria />} />
                <Route path="/settings/certificate" element={<SettingsCertificate />} />
                <Route path="/settings/documents" element={<SettingsDocuments />} />
                <Route path="/settings/users" element={<SettingsUsers />} />
                <Route path="/settings/project-duration" element={<SettingsProjectDuration />} />
                <Route path="/registration-management" element={<RegistrationManagement />} />
                <Route path="/resource-usage" element={<ResourceUsagePage />} />
                <Route path="/resource-usage/:id" element={<ResourceUsageFormPage />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
