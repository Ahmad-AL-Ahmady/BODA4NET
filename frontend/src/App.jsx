import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import InvoicePage from "./InvoicePage.jsx";
import KashierPaymentModal from "./components/KashierPaymentModal.jsx";
import Swal from "sweetalert2";
import {
  useMobileFeatures,
  useMobileInteractions,
  usePreventZoom,
} from "./hooks/use-mobile.js";
import "./App.css";

// Add custom animations for floating elements
const customStyles = `
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-20px); }
  }
  @keyframes float-delayed {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-15px); }
  }
  @keyframes float-slow {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.3); }
    50% { box-shadow: 0 0 30px rgba(239, 68, 68, 0.6); }
  }
  @keyframes slide-up {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes scale-in {
    from { transform: scale(0.9); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
  .animate-float {
    animation: float 6s ease-in-out infinite;
  }
  .animate-float-delayed {
    animation: float-delayed 8s ease-in-out infinite;
  }
  .animate-float-slow {
    animation: float-slow 10s ease-in-out infinite;
  }
  .animate-pulse-glow {
    animation: pulse-glow 2s ease-in-out infinite;
  }
  .animate-slide-up {
    animation: slide-up 0.6s ease-out;
  }
  .animate-scale-in {
    animation: scale-in 0.4s ease-out;
  }
  
  /* Mobile-specific enhancements */
  @media (max-width: 768px) {
    .mobile-padding {
      padding: 1rem;
    }
    .mobile-text-lg {
      font-size: 1.125rem;
    }
    .mobile-text-xl {
      font-size: 1.25rem;
    }
    .mobile-text-2xl {
      font-size: 1.5rem;
    }
    .mobile-text-3xl {
      font-size: 1.875rem;
    }
    .mobile-gap-2 {
      gap: 0.5rem;
    }
    .mobile-gap-3 {
      gap: 0.75rem;
    }
    .mobile-gap-4 {
      gap: 1rem;
    }
    .mobile-mb-4 {
      margin-bottom: 1rem;
    }
    .mobile-mb-6 {
      margin-bottom: 1.5rem;
    }
    .mobile-mb-8 {
      margin-bottom: 2rem;
    }
    .mobile-p-4 {
      padding: 1rem;
    }
    .mobile-p-6 {
      padding: 1.5rem;
    }
    .mobile-p-8 {
      padding: 2rem;
    }
    .mobile-rounded-2xl {
      border-radius: 1rem;
    }
    .mobile-rounded-3xl {
      border-radius: 1.5rem;
    }
  }
  
  /* Enhanced touch targets for mobile */
  @media (max-width: 768px) {
    .touch-target {
      min-height: 44px;
      min-width: 44px;
    }
    .touch-target-large {
      min-height: 56px;
      min-width: 56px;
    }
  }
  
  /* Improved focus states for mobile */
  .mobile-focus:focus {
    outline: 2px solid #ef4444;
    outline-offset: 2px;
  }
  
  /* Enhanced button states */
  .btn-mobile-active:active {
    transform: scale(0.95);
  }
  
  /* Smooth scrolling for mobile */
  html {
    scroll-behavior: smooth;
  }
  
  /* Prevent zoom on input focus for iOS */
  @media screen and (-webkit-min-device-pixel-ratio: 0) {
    input[type="tel"],
    input[type="number"],
    select {
      font-size: 16px;
    }
  }
`;

// Inject styles
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = customStyles;
  document.head.appendChild(style);
}

// API Base URL - dynamic based on environment
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? window.location.origin : "http://localhost:3001");

function App() {
  // Mobile-specific hooks
  const mobileFeatures = useMobileFeatures();
  const mobileInteractions = useMobileInteractions();
  usePreventZoom();

  const [phoneNumber, setPhoneNumber] = useState("");

  // Helper function to format phone number
  const formatPhoneNumber = (value) => {
    // Remove all non-digits
    const cleaned = value.replace(/\D/g, "");

    // If it starts with 10, add 0 prefix
    if (cleaned.startsWith("10") && cleaned.length === 10) {
      return "0" + cleaned;
    }

    // If it starts with 010, keep as is
    if (cleaned.startsWith("010") && cleaned.length === 11) {
      return cleaned;
    }

    // Otherwise, return as entered
    return cleaned;
  };

  const handlePhoneNumberChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const [amount, setAmount] = useState("");
  const [landlineNumber, setLandlineNumber] = useState("");
  const [internetPackage, setInternetPackage] = useState("");
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);

  // Payment flow states
  const [paymentStep, setPaymentStep] = useState("invoice"); // invoice, payment-created, checking-status, processing, completed
  const [paymentData, setPaymentData] = useState(null);
  const [paymentId, setPaymentId] = useState(""); // eslint-disable-line no-unused-vars
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Kashier payment states
  const [showKashierModal, setShowKashierModal] = useState(false);
  const [kashierSession, setKashierSession] = useState(null);

  const handleBalanceRecharge = () => {
    if (!phoneNumber || !amount) {
      Swal.fire({
        icon: "warning",
        title: "معلومات ناقصة",
        text: "يرجى إدخال رقم الهاتف واختيار المبلغ",
        confirmButtonText: "حسناً",
      });
      return;
    }

    // Validate phone number format
    const phoneRegex = /^010[0-9]{8}$/;
    if (!phoneRegex.test(phoneNumber)) {
      Swal.fire({
        icon: "error",
        title: "رقم هاتف غير صحيح",
        text: "يرجى إدخال رقم هاتف فودافون مصر صحيح (يبدأ بـ 010)",
        confirmButtonText: "حسناً",
      });
      return;
    }

    const parsedAmount = parseFloat(amount);
    const serviceFee = parsedAmount * 0.2;
    const totalAmount = parsedAmount + serviceFee;

    setInvoiceData({
      type: "mobile",
      number: phoneNumber,

      amount: parsedAmount,
      serviceFee: serviceFee,
      totalAmount: totalAmount,
    });
    setShowInvoice(true);
  };

  const handleInternetRecharge = () => {
    if (!landlineNumber || !internetPackage) {
      Swal.fire({
        icon: "warning",
        title: "معلومات ناقصة",
        text: "يرجى إدخال رقم الخط الأرضي واختيار الباقة",
        confirmButtonText: "حسناً",
      });
      return;
    }

    let packageAmount = 0;
    let packageName = "";
    switch (internetPackage) {
      case "140gb":
        packageAmount = 140;
        packageName = "140 جيجا";
        break;
      case "250gb":
        packageAmount = 200;
        packageName = "250 جيجا";
        break;
      case "400gb":
        packageAmount = 300;
        packageName = "400 جيجا";
        break;
      case "600gb":
        packageAmount = 400;
        packageName = "600 جيجا";
        break;
      default:
        Swal.fire({
          icon: "error",
          title: "خطأ",
          text: "باقة إنترنت غير صالحة",
          confirmButtonText: "حسناً",
        });
        return;
    }

    const serviceFee = packageAmount * 0.2;
    const totalAmount = packageAmount + serviceFee;

    setInvoiceData({
      type: "internet",
      number: landlineNumber,
      amount: packageAmount,
      packageName: packageName,
      serviceFee: serviceFee,
      totalAmount: totalAmount,
    });
    setShowInvoice(true);
  };

  // Create Kashier payment session
  const handleConfirmPurchase = async () => {
    if (!invoiceData) return;

    try {
      setLoading(true);
      setError("");
      setPaymentStep("payment-created");

      // Only process mobile top-ups for now (internet packages can be added later)
      if (invoiceData.type !== "mobile") {
        Swal.fire({
          icon: "info",
          title: "خدمة غير متوفرة",
          text: "شحن الإنترنت غير متوفر حالياً. يرجى المحاولة لاحقاً.",
          confirmButtonText: "حسناً",
        });
        return;
      }

      // Show initial processing message
      Swal.fire({
        icon: "info",
        title: "جاري إنشاء جلسة الدفع...",
        text: "يرجى الانتظار بينما نقوم بإنشاء جلسة الدفع الآمنة",
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const response = await fetch(
        `${API_BASE_URL}/api/kashier/create-session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phoneNumber: invoiceData.number,

            amount: invoiceData.amount, // Original amount without service fee
          }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        Swal.close();
        throw new Error(data.message || "فشل في إنشاء جلسة الدفع");
      }

      setPaymentData(data);
      setPaymentId(data.sessionId);

      // Store payment info in localStorage for success message
      const paymentInfo = {
        phoneNumber: invoiceData.number,
        amount: invoiceData.totalAmount, // Store the total amount that was actually paid
        originalAmount: invoiceData.amount, // Store original amount for reference
        serviceFee: invoiceData.serviceFee, // Store service fee for transparency
        orderId: data.orderId,
        sessionId: data.sessionId,
      };
      localStorage.setItem("paymentData", JSON.stringify(paymentInfo));

      // Close loading dialog
      Swal.close();

      // Redirect to backend-served iframe page (bypasses CSP issues)
      const iframeUrl = `${API_BASE_URL}/api/kashier/iframe/${data.sessionId}`;
      window.location.href = iframeUrl;
    } catch (err) {
      setError(err.message || "حدث خطأ في إنشاء جلسة الدفع");
      setPaymentStep("invoice");
      Swal.fire({
        icon: "error",
        title: "خطأ في العملية",
        text: err.message || "حدث خطأ في إنشاء جلسة الدفع",
        confirmButtonText: "حسناً",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle Kashier payment success
  const handlePaymentSuccess = () => {
    setShowKashierModal(false);
    setKashierSession(null);

    // Get stored payment data if available
    const storedData = localStorage.getItem("paymentData");
    let paymentInfo = null;
    if (storedData) {
      try {
        paymentInfo = JSON.parse(storedData);
      } catch (e) {
        console.error("Error parsing stored payment data:", e);
      }
    }

    Swal.fire({
      icon: "success",
      title: `🎉 تم شحن الرصيد بنجاح!`,
      html: `
        <div style="text-align: center; line-height: 1.8;">
          <p style="color: #28a745; font-weight: bold; margin: 10px 0;">✓ تم تأكيد الدفع</p>
          <p style="color: #28a745; font-weight: bold; margin: 10px 0;">✓ تم شحن الرصيد بنجاح</p>
          <hr style="margin: 15px 0;">
          <p style="font-size: 1.1em; margin: 10px 0;">
            <strong>المبلغ المدفوع:</strong> 
            <span style="color: #28a745; font-weight: bold;">${
              paymentInfo?.amount || invoiceData?.totalAmount || "10"
            } جنيه</span>
          </p>
          <p style="font-size: 1em; margin: 8px 0; color: #6b7280;">
            <strong>المبلغ المشحون:</strong> 
            <span style="color: #059669; font-weight: bold;">${
              paymentInfo?.originalAmount || invoiceData?.amount || "8"
            } جنيه</span>
            ${
              paymentInfo?.serviceFee
                ? `<br><small>رسوم الخدمة: ${paymentInfo.serviceFee} جنيه</small>`
                : ""
            }
          </p>
          <p style="font-size: 1.1em; margin: 10px 0;">
            <strong>رقم الهاتف:</strong> 
            <span style="color: #007bff; font-weight: bold;">${
              paymentInfo?.phoneNumber || invoiceData?.number || "تم شحنه بنجاح"
            }</span>
          </p>
          <p style="color: #6b7280; font-size: 0.9em; margin-top: 15px;">
            سيتم إضافة الرصيد خلال دقائق قليلة
          </p>
          <p style="font-size: 1.1em; margin: 10px 0;">
            <strong>حالة العملية:</strong> 
            <span style="color: #28a745; font-weight: bold;">مكتملة ✅</span>
          </p>
        </div>
      `,
      confirmButtonText: "ممتاز!",
      timer: 8000,
      timerProgressBar: true,
    });

    // Clean up localStorage
    localStorage.removeItem("paymentData");

    // Reset form
    setShowInvoice(false);
    setPhoneNumber("");
    setAmount("");
    resetPaymentFlow();
  };

  // Check URL parameters for payment redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get("success");
    const error = urlParams.get("error");
    const orderId = urlParams.get("orderId");

    if (success === "true" && orderId) {
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);

      // Show success message
      handlePaymentSuccess(orderId);
    } else if (error && orderId) {
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);

      // Show error message
      handlePaymentError(
        error === "payment_failed" ? "فشل في عملية الدفع" : "حدث خطأ في العملية"
      );
    }
  }, []);

  // Handle Kashier payment error
  const handlePaymentError = (error) => {
    setShowKashierModal(false);
    setKashierSession(null);

    Swal.fire({
      icon: "error",
      title: "فشل في الدفع",
      text: error || "حدث خطأ في عملية الدفع",
      confirmButtonText: "حسناً",
    });

    resetPaymentFlow();
  };

  // Reset payment flow
  const resetPaymentFlow = () => {
    setPhoneNumber("");
    setAmount("");
    setLandlineNumber("");
    setInternetPackage("");
    setPaymentStep("invoice");
    setPaymentData(null);
    setPaymentId("");
    setError("");
    setLoading(false);
    setShowKashierModal(false);
    setKashierSession(null);
  };

  const handleCancelPurchase = () => {
    setShowInvoice(false);
    setInvoiceData(null);
    resetPaymentFlow();
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-red-500 via-red-600 to-red-800 text-white relative overflow-hidden"
      dir="rtl"
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-400/20 via-transparent to-red-900/30 animate-pulse"></div>
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-orange-400/10 to-red-500/10 rounded-full blur-3xl animate-bounce"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-pink-400/10 to-red-600/10 rounded-full blur-3xl animate-pulse"></div>
      {/* الرأس */}
      <header className="bg-gradient-to-r from-red-700 via-red-800 to-red-900 shadow-2xl backdrop-blur-sm border-b border-red-600/30 relative z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* أيقونة الإشارة */}
            <div className="flex items-center">
              <div className="flex space-x-1 items-end">
                <div className="w-3 h-3 bg-white rounded-sm"></div>
                <div className="w-3 h-4 bg-white rounded-sm"></div>
                <div className="w-3 h-5 bg-white rounded-sm"></div>
                <div className="w-3 h-6 bg-white rounded-sm"></div>
                <div className="w-3 h-7 bg-white rounded-sm"></div>
              </div>
            </div>

            {/* BODA 4 NET */}
            <div className="text-2xl font-bold text-white">
              <span className="bg-green-600 px-2 py-1 rounded">BODA</span>
              <span className="ml-1">4NET</span>
            </div>
          </div>
        </div>
      </header>

      {showInvoice ? (
        <InvoicePage
          invoiceData={invoiceData}
          onConfirm={handleConfirmPurchase}
          onCancel={handleCancelPurchase}
          paymentStep={paymentStep}
          loading={loading}
          error={error}
          paymentData={paymentData}
        />
      ) : (
        <>
          {/* قسم البطل */}
          <section className="py-32 text-center relative">
            {/* Enhanced background decoration */}
            <div className="absolute inset-0 bg-gradient-to-b from-red-500/30 via-red-600/20 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-red-800/20 via-transparent to-red-500/10"></div>

            {/* Floating elements */}
            <div className="absolute top-20 left-10 w-20 h-20 bg-gradient-to-br from-orange-400/20 to-red-500/20 rounded-full blur-xl animate-float"></div>
            <div className="absolute top-40 right-20 w-16 h-16 bg-gradient-to-br from-pink-400/20 to-red-600/20 rounded-full blur-xl animate-float-delayed"></div>
            <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-gradient-to-br from-yellow-400/20 to-orange-500/20 rounded-full blur-xl animate-float-slow"></div>

            <div className="container mx-auto px-4 relative z-10">
              <div className="text-center mb-12">
                {/* Enhanced logo section */}
                <div className="inline-flex items-center gap-4 mb-8 group">
                  <div className="w-16 h-16 bg-gradient-to-br from-white/30 to-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-2xl group-hover:scale-110 transition-all duration-300">
                    <svg
                      className="w-10 h-10 text-white drop-shadow-lg"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                  </div>
                  <div className="text-6xl md:text-7xl font-bold text-white tracking-wide drop-shadow-2xl">
                    <span className="bg-gradient-to-r from-white via-yellow-100 to-orange-100 bg-clip-text text-transparent">
                      Wahba
                    </span>
                  </div>
                </div>

                {/* Enhanced main title */}
                <div className="text-4xl md:text-5xl font-bold text-white/95 leading-tight mb-6 drop-shadow-xl">
                  <span className="bg-gradient-to-r from-white via-yellow-50 to-orange-50 bg-clip-text text-transparent">
                    اشحن رصيدك أسرع وأرخص وآمن
                  </span>
                </div>

                {/* Enhanced service badge */}
                <div className="inline-block px-8 py-3 bg-gradient-to-r from-green-400/20 to-emerald-500/20 rounded-full border border-green-300/30 backdrop-blur-md shadow-lg">
                  <span className="text-white font-semibold text-lg flex items-center gap-2">
                    <span className="text-2xl">⚡</span>
                    خدمة فورية وآمنة
                  </span>
                </div>
              </div>

              {/* Enhanced subtitle */}
              <p className="text-2xl md:text-3xl mb-16 opacity-90 max-w-3xl mx-auto font-medium drop-shadow-lg">
                <span className="bg-gradient-to-r from-white/90 via-yellow-50/90 to-orange-50/90 bg-clip-text text-transparent">
                  كل خدمات فودافون في مكان واحد وبأقل تكلفة
                </span>
              </p>

              {/* Enhanced service buttons */}
              <div className="flex flex-col sm:flex-row gap-8 justify-center max-w-5xl mx-auto">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-white/95 via-yellow-50/95 to-orange-50/95 hover:from-white hover:via-yellow-100 hover:to-orange-100 text-red-600 font-bold px-16 py-8 text-xl rounded-3xl shadow-2xl hover:shadow-3xl border-0 flex items-center gap-4 transition-all duration-500 hover:scale-110 backdrop-blur-sm"
                  onClick={() =>
                    document
                      .getElementById("balance")
                      .scrollIntoView({ behavior: "smooth" })
                  }
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg">
                    📱
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-xl">شحن رصيد المحمول</div>
                    <div className="text-sm text-gray-600 font-medium">
                      فوري وآمن
                    </div>
                  </div>
                </Button>
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-white/10 via-blue-500/10 to-purple-500/10 hover:from-white/20 hover:via-blue-500/20 hover:to-purple-500/20 text-white font-bold px-16 py-8 text-xl rounded-3xl shadow-2xl hover:shadow-3xl border border-white/40 flex items-center gap-4 transition-all duration-500 hover:scale-110 backdrop-blur-sm"
                  onClick={() =>
                    document
                      .getElementById("internet")
                      .scrollIntoView({ behavior: "smooth" })
                  }
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg
                      className="w-7 h-7 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                      <path d="M12 15c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" />
                      <path d="M12 13c-1.1 0-2 .9-2 2h4c0-1.1-.9-2-2-2z" />
                      <path d="M12 11c-1.66 0-3 1.34-3 3h1c0-1.1.9-2 2-2s2 .9 2 2h1c0-1.66-1.34-3-3-3z" />
                    </svg>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-xl">
                      شحن الإنترنت المنزلي
                    </div>
                    <div className="text-sm text-white/80 font-medium">
                      قريباً
                    </div>
                  </div>
                </Button>
              </div>
            </div>
          </section>

          {/* رسالة التواصل في حالة الخطأ */}
          <section className="py-8 bg-yellow-50 border-b border-yellow-200">
            <div className="container mx-auto px-4">
              <div className="text-center">
                <p className="text-gray-700 text-lg">
                  عند حدوث اي خطا برجاء التواصل عبر البريد الالكتروني
                </p>
                <a
                  href="https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=mediaabuerr@gmail.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-3 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                  </svg>
                  mediaabuerr@gmail.com
                </a>
              </div>
            </div>
          </section>

          {/* قسم شحن الرصيد */}
          <section
            id="balance"
            className="py-8 md:py-20 bg-gradient-to-br from-gray-50 via-white to-red-50 relative"
          >
            {/* Enhanced Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-100/20 via-transparent to-orange-100/10"></div>
            <div className="absolute top-0 left-0 w-32 h-32 md:w-64 md:h-64 bg-gradient-to-br from-red-200/10 to-orange-200/10 rounded-full blur-2xl md:blur-3xl"></div>
            <div className="absolute bottom-0 right-0 w-32 h-32 md:w-64 md:h-64 bg-gradient-to-tl from-pink-200/10 to-red-200/10 rounded-full blur-2xl md:blur-3xl"></div>
            <div className="container mx-auto px-4 mobile-padding">
              <div className="max-w-lg mx-auto animate-slide-up">
                {/* Enhanced العنوان الرئيسي */}
                <div className="text-center mb-6 md:mb-8">
                  <h2 className="text-2xl md:text-3xl font-bold text-red-600 mb-2 mobile-text-2xl">
                    شحن الرصيد
                  </h2>
                  <div className="w-12 md:w-16 h-1 bg-red-600 mx-auto mb-3 md:mb-4"></div>

                  {/* Enhanced أيقونة الهاتف with pulse effect */}
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-xl md:rounded-lg flex items-center justify-center mx-auto mb-3 md:mb-4 animate-pulse-glow shadow-lg">
                    <svg
                      className="w-6 h-6 md:w-8 md:h-8 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                  </div>

                  <h3 className="text-lg md:text-xl font-semibold text-red-600 mb-2 mobile-text-xl">
                    شحن رصيد فودافون
                  </h3>
                  <p className="text-red-500 text-sm mobile-text-lg">
                    أدخل رقم الهاتف المراد شحنه واختر المبلغ
                  </p>
                </div>

                <div
                  className={`bg-white/80 backdrop-blur-sm rounded-2xl md:rounded-3xl p-6 md:p-10 shadow-2xl border-0 ring-1 ring-gray-200/50 relative overflow-hidden animate-scale-in ${
                    mobileFeatures.isMobile ? "mobile-card" : ""
                  }`}
                >
                  {/* Enhanced Service Banner */}
                  <div className="mb-6 md:mb-8 p-4 md:p-6 bg-gradient-to-r from-green-400/10 via-emerald-400/10 to-teal-400/10 border border-green-300/30 rounded-xl md:rounded-2xl backdrop-blur-sm">
                    <div className="flex items-center justify-center gap-2 md:gap-3">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg md:rounded-xl flex items-center justify-center">
                        <span className="text-white text-lg md:text-xl">
                          ⚡
                        </span>
                      </div>
                      <div className="text-center">
                        <p className="text-green-800 font-bold text-base md:text-lg mobile-text-lg">
                          خدمة فورية وآمنة
                        </p>
                        <p className="text-green-700 font-medium text-xs md:text-sm mobile-text-lg">
                          شحن رصيد فودافون بأسرع وقت وأقل تكلفة
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* حقول الإدخال */}
                  <div className="space-y-6 md:space-y-10">
                    <div>
                      <label
                        htmlFor="phone"
                        className="text-right block mb-3 md:mb-4 text-gray-800 font-bold text-lg md:text-xl flex items-center justify-end gap-2 md:gap-3 mobile-text-xl"
                      >
                        <span className="bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                          رقم الهاتف المراد شحنه
                        </span>
                        <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg touch-target">
                          <svg
                            className="w-4 h-4 md:w-5 md:h-5 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                          </svg>
                        </div>
                      </label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="010XXXXXXXX"
                        value={phoneNumber}
                        onChange={handlePhoneNumberChange}
                        className="w-full text-right border-2 border-gray-200 focus:border-red-500 rounded-xl md:rounded-2xl p-4 md:p-6 text-black text-lg md:text-xl font-medium transition-all duration-300 shadow-lg focus:shadow-xl focus:ring-4 focus:ring-red-500/20 mobile-focus touch-target-large"
                      />
                      <p className="text-gray-600 text-xs md:text-sm mt-2 md:mt-3 text-right font-medium mobile-text-lg">
                        رقم فودافون يبدأ بـ 010
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="amount"
                        className="text-right block mb-4 md:mb-6 text-gray-800 font-bold text-lg md:text-xl flex items-center justify-end gap-2 md:gap-3 mobile-text-xl"
                      >
                        <span className="bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                          مبلغ الشحن
                        </span>
                        <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg touch-target">
                          <svg
                            className="w-4 h-4 md:w-5 md:h-5 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      </label>

                      {/* Enhanced Popular amounts as quick buttons */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
                        {["10", "20", "50", "100"].map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setAmount(value)}
                            className={`p-3 md:p-4 rounded-xl md:rounded-2xl text-center font-bold text-base md:text-lg transition-all duration-300 transform hover:scale-105 btn-mobile-active touch-target ${
                              amount === value
                                ? "bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-xl scale-105"
                                : "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300 shadow-lg"
                            }`}
                          >
                            {value} ج
                          </button>
                        ))}
                      </div>

                      <Select value={amount} onValueChange={setAmount}>
                        <SelectTrigger className="w-full text-right border-2 border-gray-200 focus:border-red-500 rounded-xl md:rounded-2xl p-4 md:p-6 text-black text-lg md:text-xl font-medium transition-all duration-300 shadow-lg focus:shadow-xl focus:ring-4 focus:ring-red-500/20 mobile-focus touch-target-large">
                          <SelectValue placeholder="أو اختر مبلغاً آخر" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl md:rounded-2xl">
                          <SelectItem value="8">8 جنيه</SelectItem>
                          <SelectItem value="9">9 جنيه</SelectItem>
                          <SelectItem value="15">15 جنيه</SelectItem>
                          <SelectItem value="25">25 جنيه</SelectItem>
                          <SelectItem value="30">30 جنيه</SelectItem>
                          <SelectItem value="35">35 جنيه</SelectItem>
                          <SelectItem value="40">40 جنيه</SelectItem>
                          <SelectItem value="45">45 جنيه</SelectItem>
                          <SelectItem value="55">55 جنيه</SelectItem>
                          <SelectItem value="60">60 جنيه</SelectItem>
                          <SelectItem value="65">65 جنيه</SelectItem>
                          <SelectItem value="70">70 جنيه</SelectItem>
                          <SelectItem value="75">75 جنيه</SelectItem>
                          <SelectItem value="115">115 جنيه</SelectItem>
                          <SelectItem value="125">125 جنيه</SelectItem>
                          <SelectItem value="140">140 جنيه</SelectItem>
                          <SelectItem value="150">150 جنيه</SelectItem>
                          <SelectItem value="200">200 جنيه</SelectItem>
                          <SelectItem value="500">500 جنيه</SelectItem>
                          <SelectItem value="750">750 جنيه</SelectItem>
                          <SelectItem value="1000">1000 جنيه</SelectItem>
                          <SelectItem value="1500">1500 جنيه</SelectItem>
                          <SelectItem value="2000">2000 جنيه</SelectItem>
                        </SelectContent>
                      </Select>

                      {amount && (
                        <div className="mt-4 md:mt-6 p-4 md:p-6 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-xl md:rounded-2xl border border-blue-200/50 shadow-lg animate-scale-in">
                          <div className="text-right">
                            <p className="text-blue-800 font-bold text-base md:text-lg mb-2 md:mb-3 mobile-text-lg">
                              ملخص الشحن:
                            </p>
                            <div className="space-y-1 md:space-y-2">
                              <p className="text-xs md:text-sm text-blue-700 font-medium mobile-text-lg">
                                مبلغ الشحن:{" "}
                                <span className="font-bold">{amount} جنيه</span>
                              </p>
                              <p className="text-xs md:text-sm text-blue-600 font-medium mobile-text-lg">
                                رسوم خدمة:{" "}
                                <span className="font-bold">
                                  {(parseFloat(amount) * 0.2).toFixed(0)} جنيه
                                </span>
                              </p>
                              <div className="border-t border-blue-200 pt-2 mt-2 md:mt-3">
                                <p className="text-lg md:text-xl font-bold text-blue-900 mobile-text-xl">
                                  المجموع:{" "}
                                  {(parseFloat(amount) * 1.2).toFixed(0)} جنيه
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Enhanced زر الشحن */}
                  <Button
                    onClick={handleBalanceRecharge}
                    className={`w-full mt-6 md:mt-10 bg-gradient-to-r from-red-600 via-orange-600 to-red-700 hover:from-red-700 hover:via-orange-700 hover:to-red-800 text-white font-bold py-6 md:py-8 text-xl md:text-2xl rounded-2xl md:rounded-3xl flex items-center justify-center gap-3 md:gap-4 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none btn-mobile-active touch-target-large ${
                      mobileInteractions.isScrolling ? "opacity-90" : ""
                    }`}
                    disabled={!phoneNumber || !amount}
                  >
                    <div className="w-6 h-6 md:w-8 md:h-8 bg-white/20 rounded-lg md:rounded-xl flex items-center justify-center">
                      <svg
                        className="w-4 h-4 md:w-5 md:h-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                      </svg>
                    </div>
                    <span className="font-bold mobile-text-xl">
                      اشحن الرصيد الآن
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* خط فاصل أسود */}
          <div className="bg-white py-4">
            <div className="container mx-auto px-4">
              <div className="w-full h-px bg-black"></div>
            </div>
          </div>

          {/* قسم شحن الإنترنت */}
          <section id="internet" className="py-16 bg-white">
            <div className="container mx-auto px-4">
              <div className="max-w-lg mx-auto">
                {/* العنوان الرئيسي */}
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-red-600 mb-2">
                    شحن الإنترنت
                  </h2>
                  <div className="w-16 h-1 bg-red-600 mx-auto mb-4"></div>

                  {/* أيقونة الإنترنت */}
                  <div className="w-16 h-16 bg-red-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-10 h-10 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {/* شكل المنزل */}
                      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                      {/* إشارات Wi-Fi */}
                      <path d="M12 15c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" />
                      <path d="M12 13c-1.1 0-2 .9-2 2h4c0-1.1-.9-2-2-2z" />
                      <path d="M12 11c-1.66 0-3 1.34-3 3h1c0-1.1.9-2 2-2s2 .9 2 2h1c0-1.66-1.34-3-3-3z" />
                      <path d="M12 9c-2.21 0-4 1.79-4 4h1c0-1.66 1.34-3 3-3s3 1.34 3 3h1c0-2.21-1.79-4-4-4z" />
                    </svg>
                  </div>

                  <h3 className="text-xl font-semibold text-red-600 mb-2">
                    شحن انترنت منزلي فودافون
                  </h3>
                  <p className="text-red-500 text-sm">
                    اكتب رقم الخط الارضي واختار الباقة
                  </p>
                </div>

                <div className="bg-white rounded-lg p-10 shadow-lg border border-gray-200">
                  {/* حقول الإدخال */}
                  <div className="space-y-6">
                    <div>
                      <label
                        htmlFor="landline"
                        className="text-right block mb-3 text-gray-700 font-medium text-lg"
                      >
                        رقم الارضي
                      </label>
                      <Input
                        id="landline"
                        type="tel"
                        placeholder="02xxxxxxxx"
                        value={landlineNumber}
                        onChange={(e) => setLandlineNumber(e.target.value)}
                        className="w-full text-right border-gray-300 rounded-lg p-4 text-black text-lg"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="internet-package"
                        className="text-right block mb-3 text-gray-700 font-medium text-lg"
                      >
                        باقة الإنترنت
                      </label>
                      <Select
                        value={internetPackage}
                        onValueChange={setInternetPackage}
                      >
                        <SelectTrigger className="w-full text-right border-gray-300 rounded-lg p-4 text-black text-lg">
                          <SelectValue placeholder="اختر باقة الإنترنت" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="140gb">
                            140 جيجا - 140 جنيه
                          </SelectItem>
                          <SelectItem value="250gb">
                            250 جيجا - 200 جنيه
                          </SelectItem>
                          <SelectItem value="400gb">
                            400 جيجا - 300 جنيه
                          </SelectItem>
                          <SelectItem value="600gb">
                            600 جيجا - 400 جنيه
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* زر الشحن */}
                  <Button
                    onClick={handleInternetRecharge}
                    className="w-full mt-8 bg-red-600 hover:bg-red-700 text-white font-bold py-5 text-xl rounded-lg flex items-center justify-center gap-2"
                    disabled={!landlineNumber || !internetPackage}
                  >
                    <svg
                      className="w-6 h-6"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    شحن الإنترنت الآن
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* زر التواصل عبر جيميل - مصغر */}
          <div className="fixed bottom-6 left-6">
            <Button
              size="sm"
              className="bg-red-500 hover:bg-red-600 rounded-full p-3 shadow-md opacity-80 hover:opacity-100 transition-opacity"
              onClick={() =>
                window.open(
                  "https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=mediaabuerr@gmail.com",
                  "_blank"
                )
              }
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
              </svg>
            </Button>
          </div>

          {/* التذييل */}
          <footer className="bg-gradient-to-r from-red-900 via-red-800 to-red-900 py-12 mt-20 relative">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-b from-red-800/50 via-transparent to-red-900/50"></div>
            <div className="container mx-auto px-4 text-center relative z-10">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-white/20 to-white/10 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                </div>
                <span className="text-2xl font-bold text-white">
                  <span className="bg-gradient-to-r from-white via-yellow-100 to-orange-100 bg-clip-text text-transparent">
                    Boda 4 Net
                  </span>
                </span>
              </div>
              <p className="text-white/90 text-lg font-medium">
                © 2025 جميع الحقوق محفوظة
              </p>
              <p className="text-white/70 text-sm mt-2">
                شحن رصيد فودافون أسرع وأرخص وآمن
              </p>
            </div>
          </footer>
        </>
      )}

      {/* Kashier Payment Modal */}
      <KashierPaymentModal
        isOpen={showKashierModal}
        onClose={() => setShowKashierModal(false)}
        sessionUrl={kashierSession?.sessionUrl}
        orderId={kashierSession?.orderId}
        amount={kashierSession?.amount}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentError={handlePaymentError}
      />
    </div>
  );
}

export default App;
