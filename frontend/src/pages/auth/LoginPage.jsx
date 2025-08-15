import { useState } from "react";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { authAPI, authUtils } from "@/services/api.js";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      Swal.fire({
        icon: "warning",
        title: "معلومات ناقصة",
        text: "يرجى إدخال البريد الإلكتروني وكلمة المرور",
        confirmButtonText: "حسناً",
      });
      return;
    }

    try {
      setLoading(true);

      // Call the real API
      const response = await authAPI.login({ email, password });

      // Store token and user data
      authUtils.setToken(response.token);
      authUtils.setUser(response.data.user);

      Swal.fire({
        icon: "success",
        title: "تم تسجيل الدخول بنجاح",
        text: "مرحباً بك في BODA 4 NET",
        confirmButtonText: "ممتاز!",
      });

      // Redirect to main page
      navigate("/");
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "خطأ في تسجيل الدخول",
        text: error.message || "حدث خطأ أثناء تسجيل الدخول",
        confirmButtonText: "حسناً",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-500 via-red-600 to-red-800 text-white relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-400/20 via-transparent to-red-900/30 animate-pulse"></div>
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-orange-400/10 to-red-500/10 rounded-full blur-3xl animate-bounce"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-pink-400/10 to-red-600/10 rounded-full blur-3xl animate-pulse"></div>

      {/* Header */}
      <header className="bg-gradient-to-r from-red-700 via-red-800 to-red-900 shadow-2xl backdrop-blur-sm border-b border-red-600/30 relative z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* BODA 4 NET - Left Side */}
            <div className="text-2xl font-bold text-white">
              <span className="bg-green-600 px-2 py-1 rounded">BODA</span>
              <span className="ml-1">4NET</span>
            </div>

            {/* Empty div for spacing */}
            <div></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="max-w-md mx-auto">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-white/30 to-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-2xl">
                <svg
                  className="w-10 h-10 text-white drop-shadow-lg"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">تسجيل الدخول</h1>
            <p className="text-white/80">مرحباً بك في BODA 4 NET</p>
          </div>

          {/* Login Form */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/20">
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-right mb-2 text-white font-medium"
                >
                  البريد الإلكتروني
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="أدخل بريدك الإلكتروني"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-right border-2 border-white/20 focus:border-white/40 bg-white/10 text-white placeholder-white rounded-xl p-4 transition-all duration-300"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-right mb-2 text-white font-medium"
                >
                  كلمة المرور
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="أدخل كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-right border-2 border-white/20 focus:border-white/40 bg-white/10 text-white placeholder-white rounded-xl p-4 transition-all duration-300"
                  required
                />
              </div>

              <div className="flex items-center justify-end mb-6">
                <Button
                  type="button"
                  onClick={() => navigate("/auth/forgot-password")}
                  variant="ghost"
                  className="text-white/80 hover:text-white hover:bg-white/10 text-sm transition-all duration-300 px-4 py-2 rounded-lg border border-white/20"
                >
                  نسيت كلمة المرور؟
                </Button>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-white/20 to-white/10 hover:from-white/30 hover:to-white/20 text-white font-bold py-4 rounded-xl transition-all duration-300 border border-white/20 disabled:opacity-50"
              >
                {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
              </Button>
            </form>

            {/* Divider */}
            <div className="my-8 flex items-center">
              <div className="flex-1 border-t border-white/20"></div>
              <span className="px-4 text-white/60 text-sm">أو</span>
              <div className="flex-1 border-t border-white/20"></div>
            </div>

            {/* Google Login Button */}
            <Button
              onClick={() =>
                (window.location.href = "http://localhost:3001/api/auth/google")
              }
              className="w-full bg-white text-gray-900 hover:bg-gray-100 border-2 border-white/30 hover:border-white/50 rounded-xl py-4 transition-all duration-300 font-medium shadow-lg hover:shadow-xl mb-6"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              تسجيل الدخول بـ Google
            </Button>

            {/* Sign Up Link */}
            <div className="text-center">
              <p className="text-white/80 mb-4">ليس لديك حساب؟</p>
              <button
                onClick={() => navigate("/auth/signup")}
                className="inline-block bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 px-8 rounded-xl transition-all duration-300"
              >
                إنشاء حساب جديد
              </button>
            </div>
          </div>

          {/* Back to Home */}
          <div className="text-center mt-6">
            <button
              onClick={() => navigate("/")}
              className="text-white/80 hover:text-white transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
              العودة للصفحة الرئيسية
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
