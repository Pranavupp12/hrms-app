import { Route, Routes } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { EmployeeDashboard } from './pages/employee/EmployeeDashboard';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { HrDashboard } from './pages/hr/HrDashboard';
import { Toaster } from 'sonner'; 
import { AdditionalDetailsPage } from './pages/AdditionalDetailsPage';

function App() {
  return (
    <main>
      <Routes>
        {/* The default route and login route both point to the LoginPage */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Your protected routes */}
        <Route path="/employee" element={<EmployeeDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/hr" element={<HrDashboard />} /> {/* Add HR Dashboard Route */}

        {/*Additional details page route*/ }
        <Route path="/details/:id" element={<AdditionalDetailsPage />} />

        {/* A catch-all route for any undefined paths */}
        <Route path="*" element={<div>404: Page Not Found</div>} />
      </Routes>
      <Toaster richColors /> {/* 2. Add Toaster here */}
    </main>
  );
}

export default App;
