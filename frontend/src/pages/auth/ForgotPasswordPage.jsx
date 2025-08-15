import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import Swal from "sweetalert2";
import { authAPI } from "@/services/api.js";

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email) {
      Swal.fire({
        icon: "warning",
        title: "معلومات ناقصة",
        text: "يرجى إدخال البريد الإلكتروني",
        confirmButtonText: "حسناً",
      });
      return;
    }

    try {
      setLoading(true);
      await authAPI.forgotPassword(formData.email);

      Swal.fire({
        icon: "success",
        title: "تم إرسال رمز التحقق",
        text: "تم إرسال رمز التحقق إلى بريدك الإلكتروني",
        confirmButtonText: "حسناً",
      });

      setStep(2);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "خطأ في إرسال رمز التحقق",
        text: error.message || "حدث خطأ أثناء إرسال رمز التحقق",
        confirmButtonText: "حسناً",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSubmit = async (e) => {
    e.preventDefault();

    if (!formData.otp) {
      Swal.fire({
        icon: "warning",
        title: "معلومات ناقصة",
        text: "يرجى إدخال رمز التحقق",
        confirmButtonText: "حسناً",
      });
      return;
    }

    try {
      setLoading(true);
      await authAPI.verifyOTP(formData.email, formData.otp);

      Swal.fire({
        icon: "success",
        title: "تم التحقق من الرمز",
        text: "رمز التحقق صحيح، يمكنك الآن إعادة تعيين كلمة المرور",
        confirmButtonText: "حسناً",
      });

      setStep(3);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "خطأ في التحقق من الرمز",
        text: error.message || "رمز التحقق غير صحيح",
        confirmButtonText: "حسناً",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();

    if (!formData.newPassword || !formData.confirmPassword) {
      Swal.fire({
        icon: "warning",
        title: "معلومات ناقصة",
        text: "يرجى إدخال كلمة المرور الجديدة وتأكيدها",
        confirmButtonText: "حسناً",
      });
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      Swal.fire({
        icon: "error",
        title: "كلمات المرور غير متطابقة",
        text: "يرجى التأكد من تطابق كلمتي المرور",
        confirmButtonText: "حسناً",
      });
      return;
    }

    try {
      setLoading(true);
      await authAPI.resetPassword(
        formData.email,
        formData.otp,
        formData.newPassword,
        formData.confirmPassword
      );

      Swal.fire({
        icon: "success",
        title: "تم إعادة تعيين كلمة المرور",
        text: "تم تغيير كلمة المرور بنجاح، يمكنك الآن تسجيل الدخول",
        confirmButtonText: "ممتاز!",
      });

      navigate("/auth/login");
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "خطأ في إعادة تعيين كلمة المرور",
        text: error.message || "حدث خطأ أثناء إعادة تعيين كلمة المرور",
        confirmButtonText: "حسناً",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <form onSubmit={handleEmailSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="email"
          className="block text-right mb-2 text-white font-medium"
        >
          البريد الإلكتروني
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="أدخل بريدك الإلكتروني"
          value={formData.email}
          onChange={handleInputChange}
          required
          className="w-full text-right border-2 border-white/20 focus:border-white/40 bg-white/10 text-white placeholder-white rounded-xl p-4 transition-all duration-300"
        />
      </div>
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-white/20 to-white/10 hover:from-white/30 hover:to-white/20 text-white font-bold py-4 rounded-xl transition-all duration-300 border border-white/20 disabled:opacity-50"
      >
        {loading ? "جاري الإرسال..." : "إرسال رمز التحقق"}
      </Button>
    </form>
  );

  const renderStep2 = () => (
    <form onSubmit={handleOTPSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="otp"
          className="block text-right mb-2 text-white font-medium"
        >
          رمز التحقق
        </label>
        <Input
          id="otp"
          name="otp"
          type="text"
          placeholder="أدخل رمز التحقق المكون من 6 أرقام"
          value={formData.otp}
          onChange={handleInputChange}
          required
          maxLength={6}
          className="w-full text-right border-2 border-white/20 focus:border-white/40 bg-white/10 text-white placeholder-white rounded-xl p-4 transition-all duration-300"
        />
      </div>
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-white/20 to-white/10 hover:from-white/30 hover:to-white/20 text-white font-bold py-4 rounded-xl transition-all duration-300 border border-white/20 disabled:opacity-50"
      >
        {loading ? "جاري التحقق..." : "التحقق من الرمز"}
      </Button>
    </form>
  );

  const renderStep3 = () => (
    <form onSubmit={handlePasswordReset} className="space-y-6">
      <div>
        <label
          htmlFor="newPassword"
          className="block text-right mb-2 text-white font-medium"
        >
          كلمة المرور الجديدة
        </label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          placeholder="أدخل كلمة المرور الجديدة"
          value={formData.newPassword}
          onChange={handleInputChange}
          required
          className="w-full text-right border-2 border-white/20 focus:border-white/40 bg-white/10 text-white placeholder-white rounded-xl p-4 transition-all duration-300"
        />
      </div>
      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-right mb-2 text-white font-medium"
        >
          تأكيد كلمة المرور
        </label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="أعد إدخال كلمة المرور الجديدة"
          value={formData.confirmPassword}
          onChange={handleInputChange}
          required
          className="w-full text-right border-2 border-white/20 focus:border-white/40 bg-white/10 text-white placeholder-white rounded-xl p-4 transition-all duration-300"
        />
      </div>
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-white/20 to-white/10 hover:from-white/30 hover:to-white/20 text-white font-bold py-4 rounded-xl transition-all duration-300 border border-white/20 disabled:opacity-50"
      >
        {loading ? "جاري إعادة التعيين..." : "إعادة تعيين كلمة المرور"}
      </Button>
    </form>
  );

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return "نسيت كلمة المرور";
      case 2:
        return "التحقق من الرمز";
      case 3:
        return "إعادة تعيين كلمة المرور";
      default:
        return "نسيت كلمة المرور";
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 1:
        return "أدخل بريدك الإلكتروني لإرسال رمز التحقق";
      case 2:
        return "أدخل رمز التحقق المرسل إلى بريدك الإلكتروني";
      case 3:
        return "أدخل كلمة المرور الجديدة";
      default:
        return "أدخل بريدك الإلكتروني لإرسال رمز التحقق";
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
            <h1 className="text-3xl font-bold text-white mb-2">
              {getStepTitle()}
            </h1>
            <p className="text-white/80">{getStepDescription()}</p>
          </div>

          {/* Form */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/20">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}

            {/* Back to Login */}
            <div className="text-center mt-6">
              <p className="text-white/80 mb-4">تذكرت كلمة المرور؟</p>
              <button
                onClick={() => navigate("/auth/login")}
                className="inline-block bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 px-8 rounded-xl transition-all duration-300"
              >
                تسجيل الدخول
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

export default ForgotPasswordPage;
