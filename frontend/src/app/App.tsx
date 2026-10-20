import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { theme } from "../theme/theme";
import { AuthProvider } from "../hooks/useAuth";
import { ClientLoginPage } from "../pages/auth/ClientLoginPage";
import { SuperAdminLoginPage } from "../pages/auth/SuperAdminLoginPage";
import { ClientForgotPasswordPage } from "../pages/auth/ClientForgotPasswordPage";
import { AdminForgotPasswordPage } from "../pages/auth/AdminForgotPasswordPage";
import { VerifyOtpPage } from "../pages/auth/VerifyOtpPage";
import { ChangePasswordPage } from "../pages/auth/ChangePasswordPage";
import { OnboardingWizardPage } from "../pages/onboarding/OnboardingWizardPage";
import { DashboardPage } from "../pages/client/DashboardPage";
import { ProfilePage } from "../pages/client/ProfilePage";
import { PaymentRenewalPage } from "../pages/client/PaymentRenewalPage";
import { CustomersPage } from "../pages/customers/CustomersPage";
import { CustomerDetailPage } from "../pages/customers/CustomerDetailPage";
import { EnquiriesListPage } from "../pages/enquiries/EnquiriesListPage";
import { EnquiryDetailPage } from "../pages/enquiries/EnquiryDetailPage";
import { PipelinePage } from "../pages/enquiries/PipelinePage";
import { StaffPage } from "../pages/staff/StaffPage";
import { RoleBuilderPage } from "../pages/roles/RoleBuilderPage";
import { QuotationsListPage } from "../pages/quotations/QuotationsListPage";
import { QuotationBuilderPage } from "../pages/quotations/QuotationBuilderPage";
import { QuotationDetailPage } from "../pages/quotations/QuotationDetailPage";
import { ItinerariesListPage } from "../pages/itineraries/ItinerariesListPage";
import { ItineraryBuilderPage } from "../pages/itineraries/ItineraryBuilderPage";
import { PublicItineraryPage } from "../pages/public/PublicItineraryPage";
import { DriverDutySlipMobilePage } from "../pages/duty-slip/DriverDutySlipMobilePage";
import { GuestDocumentUploadPage } from "../pages/public/GuestDocumentUploadPage";
import { PublicLeadCapturePage } from "../pages/public/PublicLeadCapturePage";
import { BookingsListPage } from "../pages/bookings/BookingsListPage";
import { BookingDetailPage } from "../pages/bookings/BookingDetailPage";
import { BookingEditPage } from "../pages/bookings/BookingEditPage";
import { ReceivablesPage } from "../pages/receivables/ReceivablesPage";
import { InvoicesListPage } from "../pages/invoices/InvoicesListPage";
import { InvoiceDetailPage } from "../pages/invoices/InvoiceDetailPage";
import { ReportsPage } from "../pages/reports/ReportsPage";
import { AutomationPage } from "../pages/automation/AutomationPage";
import { BranchesPage } from "../pages/branches/BranchesPage";
import { WhatsAppPage } from "../pages/whatsapp/WhatsAppPage";
import { CustomFieldsPage } from "../pages/custom-fields/CustomFieldsPage";
import { SuppliersPage } from "../pages/suppliers/SuppliersPage";
import { DriversPage } from "../pages/drivers/DriversPage";
import { VehiclesPage } from "../pages/vehicles/VehiclesPage";
import { VehicleDetailPage } from "../pages/vehicles/VehicleDetailPage";
import { TripsListPage } from "../pages/trips/TripsListPage";
import { TripDetailPage } from "../pages/trips/TripDetailPage";
import { ClientLayout } from "../layouts/ClientLayout";
import { SuperAdminDashboardPage } from "../pages/super-admin/SuperAdminDashboardPage";
import { ClientsListPage } from "../pages/super-admin/ClientsListPage";
import { ClientDetailPage } from "../pages/super-admin/ClientDetailPage";
import { PlanManagerPage } from "../pages/super-admin/PlanManagerPage";
import { PaymentNoticesPage } from "../pages/super-admin/PaymentNoticesPage";
import { AuditLogPage } from "../pages/super-admin/AuditLogPage";
import { SystemHealthPage } from "../pages/super-admin/SystemHealthPage";
import { SuperAdminLayout } from "../layouts/SuperAdminLayout";
import { ProtectedRoute } from "../routes/ProtectedRoute";

const queryClient = new QueryClient();

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<ClientLoginPage />} />
              <Route path="/view/:shareSlug" element={<PublicItineraryPage />} />
              <Route path="/duty-slip/:shareToken" element={<DriverDutySlipMobilePage />} />
              <Route path="/upload-docs/:shareToken" element={<GuestDocumentUploadPage />} />
              <Route path="/lead-form/:clientCode" element={<PublicLeadCapturePage />} />
              <Route path="/inquiry/:clientCode" element={<PublicLeadCapturePage />} />
              <Route path="/admin/login" element={<SuperAdminLoginPage />} />
              <Route path="/forgot-password" element={<ClientForgotPasswordPage />} />
              <Route path="/reset-password" element={<ClientForgotPasswordPage />} />
              <Route path="/admin/forgot-password" element={<AdminForgotPasswordPage />} />
              <Route path="/verify-otp" element={<VerifyOtpPage />} />

              <Route element={<ProtectedRoute allow={["CLIENT_USER"]} />}>
                <Route path="/change-password" element={<ChangePasswordPage />} />
                <Route path="/onboarding" element={<OnboardingWizardPage />} />
                <Route path="/payment-renewal" element={<PaymentRenewalPage />} />

                <Route element={<ClientLayout />}>
                  <Route path="/app/dashboard" element={<DashboardPage />} />
                  <Route path="/app/profile" element={<ProfilePage />} />
                  <Route path="/app/customers" element={<CustomersPage />} />
                  <Route path="/app/customers/:id" element={<CustomerDetailPage />} />
                  <Route path="/app/enquiries" element={<EnquiriesListPage />} />
                  <Route path="/app/enquiries/:id" element={<EnquiryDetailPage />} />
                  <Route path="/app/pipeline" element={<PipelinePage />} />
                  <Route path="/app/staff" element={<StaffPage />} />
                  <Route path="/app/roles" element={<RoleBuilderPage />} />
                  <Route path="/app/quotations" element={<QuotationsListPage />} />
                  <Route path="/app/quotations/new" element={<QuotationBuilderPage />} />
                  <Route path="/app/quotations/:id" element={<QuotationDetailPage />} />
                  <Route path="/app/quotations/:id/new-version" element={<QuotationBuilderPage />} />
                  <Route path="/app/itineraries" element={<ItinerariesListPage />} />
                  <Route path="/app/itineraries/new" element={<ItineraryBuilderPage />} />
                  <Route path="/app/itineraries/:id/edit" element={<ItineraryBuilderPage />} />
                  <Route path="/app/bookings" element={<BookingsListPage />} />
                  <Route path="/app/bookings/:id" element={<BookingDetailPage />} />
                  <Route path="/app/bookings/:id/edit" element={<BookingEditPage />} />
                  <Route path="/app/suppliers" element={<SuppliersPage />} />
                  <Route path="/app/receivables" element={<ReceivablesPage />} />
                  <Route path="/app/invoices" element={<InvoicesListPage />} />
                  <Route path="/app/invoices/:id" element={<InvoiceDetailPage />} />
                  <Route path="/app/reports" element={<ReportsPage />} />
                  <Route path="/app/automation" element={<AutomationPage />} />
                  <Route path="/app/branches" element={<BranchesPage />} />
                  <Route path="/app/whatsapp" element={<WhatsAppPage />} />
                  <Route path="/app/custom-fields" element={<CustomFieldsPage />} />
                  <Route path="/app/trips" element={<TripsListPage />} />
                  <Route path="/app/trips/:id" element={<TripDetailPage />} />
                  <Route path="/app/drivers" element={<DriversPage />} />
                  <Route path="/app/vehicles" element={<VehiclesPage />} />
                  <Route path="/app/vehicles/:id" element={<VehicleDetailPage />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute allow={["SUPER_ADMIN"]} />}>
                <Route element={<SuperAdminLayout />}>
                  <Route path="/super-admin/dashboard" element={<SuperAdminDashboardPage />} />
                  <Route path="/super-admin/clients" element={<ClientsListPage />} />
                  <Route path="/super-admin/clients/:id" element={<ClientDetailPage />} />
                  <Route path="/super-admin/plans" element={<PlanManagerPage />} />
                  <Route path="/super-admin/payment-notices" element={<PaymentNoticesPage />} />
                  <Route path="/super-admin/audit-logs" element={<AuditLogPage />} />
                  <Route path="/super-admin/system-health" element={<SystemHealthPage />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
