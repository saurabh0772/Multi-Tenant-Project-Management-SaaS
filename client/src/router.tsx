import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedLayout } from "./components/layout/ProtectedLayout.js";
import { LoginPage } from "./pages/auth/LoginPage.js";
import { RegisterPage } from "./pages/auth/RegisterPage.js";
import { DashboardPage } from "./pages/dashboard/DashboardPage.js";
import { ProjectsPage } from "./pages/projects/ProjectsPage.js";
import { ProjectDetailsPage } from "./pages/projects/ProjectDetailsPage.js";
import { MembersPage } from "./pages/members/MembersPage.js";
import { NotificationsPage } from "./pages/notifications/NotificationsPage.js";
import { OrganizationSettingsPage } from "./pages/settings/OrganizationSettingsPage.js";
import { AnalyticsPage } from "./pages/analytics/AnalyticsPage.js";

import { AcceptInvitationPage } from "./pages/auth/AcceptInvitationPage.js";

export const router = createBrowserRouter([
  // Public Auth Routes
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/accept-invitation",
    element: <AcceptInvitationPage />,
  },

  // Protected SaaS Routes
  {
    element: <ProtectedLayout />,
    children: [
      {
        path: "/",
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: "/dashboard",
        element: <DashboardPage />,
      },
      {
        path: "/projects",
        element: <ProjectsPage />,
      },
      {
        path: "/projects/:projectId",
        element: <ProjectDetailsPage />,
      },
      {
        path: "/members",
        element: <MembersPage />,
      },
      {
        path: "/notifications",
        element: <NotificationsPage />,
      },
      {
        path: "/analytics",
        element: <AnalyticsPage />,
      },
      {
        path: "/settings",
        element: <OrganizationSettingsPage />,
      },
      {
        path: "*",
        element: <Navigate to="/dashboard" replace />,
      },
    ],
  },
]);
