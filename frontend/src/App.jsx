import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./HomePage.jsx";
import LoginPage from "./pages/auth/LoginPage.jsx";
import SignupPage from "./pages/auth/SignupPage.jsx";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage.jsx";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/signup" element={<SignupPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
      </Routes>
    </Router>
  );
}

export default App;
