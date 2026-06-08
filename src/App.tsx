import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { MainLayout } from "@/layouts/MainLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import AthleteRegister from "@/pages/athlete/Register";
import AthleteList from "@/pages/athlete/List";
import AthleteProfile from "@/pages/athlete/Profile";
import ScheduleGenerate from "@/pages/schedule/Generate";
import ScheduleCalendar from "@/pages/schedule/Calendar";
import ResultEntry from "@/pages/result/Entry";
import ResultRanking from "@/pages/result/Ranking";
import ResultMedal from "@/pages/result/Medal";
import DopingTest from "@/pages/doping/Test";
import DopingResult from "@/pages/doping/Result";
import VolunteerRegister from "@/pages/volunteer/Register";
import VolunteerManage from "@/pages/volunteer/Manage";
import VolunteerCheckin from "@/pages/volunteer/Checkin";
import SecurityHeatmap from "@/pages/security/Heatmap";
import SecurityPatrol from "@/pages/security/Patrol";
import TicketBuy from "@/pages/ticket/Buy";
import TicketOrder from "@/pages/ticket/Order";
import MedicalReport from "@/pages/medical/Report";
import MedicalDispatch from "@/pages/medical/Dispatch";
import Messages from "@/pages/Messages";
import Profile from "@/pages/Profile";
import { useToast } from "@/components/Toast";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const currentUser = useAppStore(state => state.currentUser);
  const { showToast } = useToast();

  useEffect(() => {
    if (!currentUser) {
      showToast("warning", "请先登录");
    } else if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
      showToast("error", "您没有权限访问该页面");
    }
  }, [currentUser, allowedRoles, showToast]);

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const currentUser = useAppStore(state => state.currentUser);

  return (
    <Routes>
      <Route 
        path="/" 
        element={currentUser ? <Navigate to="/dashboard" replace /> : <Login />} 
      />
      
      <Route element={<ProtectedRoute><MainLayout><Outlet /></MainLayout></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        
        <Route path="/athlete/register" element={
          <ProtectedRoute allowedRoles={['admin', 'athlete']}>
            <AthleteRegister />
          </ProtectedRoute>
        } />
        <Route path="/athlete/list" element={
          <ProtectedRoute allowedRoles={['admin', 'referee']}>
            <AthleteList />
          </ProtectedRoute>
        } />
        <Route path="/athlete/profile" element={
          <ProtectedRoute allowedRoles={['athlete']}>
            <AthleteProfile />
          </ProtectedRoute>
        } />
        
        <Route path="/schedule/generate" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ScheduleGenerate />
          </ProtectedRoute>
        } />
        <Route path="/schedule/calendar" element={
          <ProtectedRoute>
            <ScheduleCalendar />
          </ProtectedRoute>
        } />
        
        <Route path="/result/entry" element={
          <ProtectedRoute allowedRoles={['referee']}>
            <ResultEntry />
          </ProtectedRoute>
        } />
        <Route path="/result/ranking" element={
          <ProtectedRoute>
            <ResultRanking />
          </ProtectedRoute>
        } />
        <Route path="/result/medal" element={
          <ProtectedRoute>
            <ResultMedal />
          </ProtectedRoute>
        } />
        
        <Route path="/doping/test" element={
          <ProtectedRoute allowedRoles={['doping']}>
            <DopingTest />
          </ProtectedRoute>
        } />
        <Route path="/doping/result" element={
          <ProtectedRoute allowedRoles={['doping']}>
            <DopingResult />
          </ProtectedRoute>
        } />
        
        <Route path="/volunteer/register" element={
          <VolunteerRegister />
        } />
        <Route path="/volunteer/manage" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <VolunteerManage />
          </ProtectedRoute>
        } />
        <Route path="/volunteer/checkin" element={
          <ProtectedRoute allowedRoles={['volunteer']}>
            <VolunteerCheckin />
          </ProtectedRoute>
        } />
        
        <Route path="/security/heatmap" element={
          <ProtectedRoute allowedRoles={['admin', 'security']}>
            <SecurityHeatmap />
          </ProtectedRoute>
        } />
        <Route path="/security/patrol" element={
          <ProtectedRoute allowedRoles={['security']}>
            <SecurityPatrol />
          </ProtectedRoute>
        } />
        
        <Route path="/ticket/buy" element={
          <ProtectedRoute allowedRoles={['audience']}>
            <TicketBuy />
          </ProtectedRoute>
        } />
        <Route path="/ticket/order" element={
          <ProtectedRoute allowedRoles={['audience']}>
            <TicketOrder />
          </ProtectedRoute>
        } />
        
        <Route path="/medical/report" element={
          <ProtectedRoute>
            <MedicalReport />
          </ProtectedRoute>
        } />
        <Route path="/medical/dispatch" element={
          <ProtectedRoute allowedRoles={['medical', 'admin']}>
            <MedicalDispatch />
          </ProtectedRoute>
        } />
        
        <Route path="/messages" element={
          <ProtectedRoute>
            <Messages />
          </ProtectedRoute>
        } />
        
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
      </Route>
      
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}
