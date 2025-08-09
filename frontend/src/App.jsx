import { useState } from "react";
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
import Swal from "sweetalert2";
import "./App.css";

// API Base URL - dynamic based on environment
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? window.location.origin : "http://localhost:3001");

function App() {
  const [phoneNumber, setPhoneNumber] = useState("");
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

    const parsedAmount = parseFloat(amount);
    const serviceFee = parsedAmount * 0.12;
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

    const serviceFee = packageAmount * 0.12;
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

  // Create payment with Sha7nawy
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
        title: "جاري التحقق من المنتج والرصيد...",
        text: "يرجى الانتظار بينما نتحقق من توفر المنتج ورصيد الحساب",
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const response = await fetch(`${API_BASE_URL}/api/payment/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: invoiceData.number,
          amount: invoiceData.amount, // Original amount without service fee
        }),
      });

      const data = await response.json();

      if (!data.success) {
        Swal.close();
        throw new Error(data.message || "فشل في إنشاء طلب الدفع");
      }

      setPaymentData(data);
      setPaymentId(data.paymentId);

      // Show payment instructions with enhanced information
      Swal.fire({
        icon: "success",
        title: "تم التحقق بنجاح!",
        html: `
          <div style="text-align: center; line-height: 1.6;">
            <p style="color: #28a745; font-weight: bold;">✓ تم التحقق من المنتج</p>
            <p style="color: #28a745; font-weight: bold;">✓ تم التحقق من الرصيد</p>
            <p style="color: #28a745; font-weight: bold;">✓ تم إنشاء طلب الدفع</p>
            <hr style="margin: 15px 0;">
            <p><strong>اتصل بـ *9*1# واتبع التعليمات</strong></p>
            <p>رمز الدفع: <span style="font-size: 1.2em; color: #007bff; font-weight: bold;">${data.reference}</span></p>
            <p style="color: #6c757d;">سيتم التحقق من الدفع تلقائياً...</p>
          </div>
        `,
        confirmButtonText: "حسناً",
        allowOutsideClick: false,
      });

      // Start checking payment status automatically
      startPaymentStatusCheck(data.paymentId, data.reference);
    } catch (err) {
      setError(err.message || "حدث خطأ في إنشاء طلب الدفع");
      setPaymentStep("invoice");
      Swal.fire({
        icon: "error",
        title: "خطأ في العملية",
        text: err.message || "حدث خطأ في إنشاء طلب الدفع",
        confirmButtonText: "حسناً",
      });
    } finally {
      setLoading(false);
    }
  };

  // Check payment status and process top-up
  const startPaymentStatusCheck = (paymentId, reference) => {
    setPaymentStep("checking-status");

    const checkInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/payment/check-and-process`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ paymentId, reference }),
          }
        );

        const data = await response.json();

        if (response.status === 202 && data.shouldRetry) {
          // Payment is still pending, continue checking
          return;
        }

        // Clear the interval as we have a final result
        clearInterval(checkInterval);

        if (data.success) {
          // Payment completed and top-up successful
          setPaymentStep("completed");
          Swal.fire({
            icon: "success",
            title: "🎉 تم شحن الرصيد بنجاح!",
            html: `
              <div style="text-align: center; line-height: 1.8;">
                <p style="color: #28a745; font-weight: bold; margin: 10px 0;">✓ تم تأكيد الدفع من Sha7nawy</p>
                <p style="color: #28a745; font-weight: bold; margin: 10px 0;">✓ تم طلب الشحن من Uquid</p>
                <p style="color: #28a745; font-weight: bold; margin: 10px 0;">✓ تم تأكيد الطلب</p>
                <hr style="margin: 15px 0;">
                <p style="font-size: 1.1em; margin: 10px 0;">
                  <strong>المبلغ المشحون:</strong> 
                  <span style="color: #28a745; font-weight: bold;">${
                    data.transaction.topUpAmount
                  } جنيه</span>
                </p>
                <p style="font-size: 1.1em; margin: 10px 0;">
                  <strong>رقم الهاتف:</strong> 
                  <span style="color: #007bff; font-weight: bold;">${
                    data.transaction.phoneNumber
                  }</span>
                </p>
                <p style="font-size: 1em; margin: 10px 0; color: #6c757d;">
                  <strong>رقم الطلب:</strong> ${
                    data.uquidOrder?.batch_id || "غير متوفر"
                  }
                </p>
              </div>
            `,
            confirmButtonText: "ممتاز!",
            timer: 8000,
            timerProgressBar: true,
          });

          // Reset form
          setShowInvoice(false);
          setPhoneNumber("");
          setAmount("");
          resetPaymentFlow();
        } else {
          // Payment failed or rejected
          setError(`فشل في الدفع: ${data.message}`);
          setPaymentStep("invoice");
          Swal.fire({
            icon: "error",
            title: "فشل في العملية",
            text: data.message || "حدث خطأ في عملية الدفع",
            confirmButtonText: "حسناً",
          });
        }
      } catch (error) {
        clearInterval(checkInterval);
        setError(error.message || "حدث خطأ في التحقق من حالة الدفع");
        setPaymentStep("invoice");
        Swal.fire({
          icon: "error",
          title: "خطأ في الاتصال",
          text:
            error.message ||
            "حدث خطأ في التحقق من حالة الدفع. يرجى المحاولة مرة أخرى.",
          confirmButtonText: "حسناً",
        });
      }
    }, 10000); // Check every 10 seconds

    // Stop checking after 10 minutes (60 attempts)
    setTimeout(() => {
      clearInterval(checkInterval);
      if (paymentStep === "checking-status") {
        setError("انتهت مهلة التحقق من الدفع. يرجى المحاولة مرة أخرى.");
        setPaymentStep("invoice");
        Swal.fire({
          icon: "warning",
          title: "انتهت المهلة",
          text: "انتهت مهلة التحقق من الدفع. يرجى المحاولة مرة أخرى.",
          confirmButtonText: "حسناً",
        });
      }
    }, 600000); // 10 minutes
  };

  // Reset payment flow
  const resetPaymentFlow = () => {
    setPaymentStep("invoice");
    setPaymentData(null);
    setPaymentId("");
    setError("");
    setLoading(false);
  };

  const handleCancelPurchase = () => {
    setShowInvoice(false);
    setInvoiceData(null);
    resetPaymentFlow();
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-red-600 to-red-700 text-white"
      dir="rtl"
    >
      {/* الرأس */}
      <header className="bg-red-700 shadow-lg">
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
          <section className="py-20 text-center">
            <div className="container mx-auto px-4">
              <h1 className="text-5xl md:text-6xl font-bold mb-6">
                اشحن رصيدك اسرع , ارخص , آمن
              </h1>
              <p className="text-xl md:text-2xl mb-12 opacity-90">
                كل خدمات فودافون في مكان واحد وباقل تكلفة
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Button
                  size="lg"
                  className="bg-white hover:bg-gray-100 text-black font-bold px-16 py-8 text-xl rounded-full shadow-lg border-2 border-white flex items-center gap-3"
                  onClick={() =>
                    document
                      .getElementById("balance")
                      .scrollIntoView({ behavior: "smooth" })
                  }
                >
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    📱
                  </div>
                  شحن رصيد هاتف المحمول
                </Button>
                <Button
                  size="lg"
                  className="bg-white hover:bg-gray-100 text-black font-bold px-16 py-8 text-xl rounded-full shadow-lg border-2 border-white flex items-center gap-3"
                  onClick={() =>
                    document
                      .getElementById("internet")
                      .scrollIntoView({ behavior: "smooth" })
                  }
                >
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                      <path
                        d="M12 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z"
                        opacity="0.3"
                      />
                      <path d="M12 10c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0-2c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4z" />
                      <path
                        d="M12 6c3.3 0 6 2.7 6 6h2c0-4.4-3.6-8-8-8s-8 3.6-8 8h2c0-3.3 2.7-6 6-6z"
                        opacity="0.5"
                      />
                      <path
                        d="M12 4c4.4 0 8 3.6 8 8h2c0-5.5-4.5-10-10-10S2 6.5 2 12h2c0-4.4 3.6-8 8-8z"
                        opacity="0.3"
                      />
                    </svg>
                  </div>
                  شحن الإنترنت المنزلي
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
          <section id="balance" className="py-16 bg-white">
            <div className="container mx-auto px-4">
              <div className="max-w-lg mx-auto">
                {/* العنوان الرئيسي */}
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-red-600 mb-2">
                    شحن الرصيد
                  </h2>
                  <div className="w-16 h-1 bg-red-600 mx-auto mb-4"></div>

                  {/* أيقونة الهاتف */}
                  <div className="w-16 h-16 bg-red-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                  </div>

                  <h3 className="text-xl font-semibold text-red-600 mb-2">
                    شحن رصيد فودافون
                  </h3>
                  <p className="text-red-500 text-sm">
                    اكتب رقم موبايلك واختر المبلغ المطلوب شحنه
                  </p>
                </div>

                <div className="bg-white rounded-lg p-10 shadow-lg border border-gray-200">
                  {/* حقول الإدخال */}
                  <div className="space-y-6">
                    <div>
                      <label
                        htmlFor="phone"
                        className="text-right block mb-3 text-gray-700 font-medium text-lg"
                      >
                        رقم الهاتف
                      </label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="01xxxxxxxxx"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full text-right border-gray-300 rounded-lg p-4 text-black text-lg"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="amount"
                        className="text-right block mb-3 text-gray-700 font-medium text-lg"
                      >
                        المبلغ (جنيه)
                      </label>
                      <Select value={amount} onValueChange={setAmount}>
                        <SelectTrigger className="w-full text-right border-gray-300 rounded-lg p-4 text-black text-lg">
                          <SelectValue placeholder="اختر المبلغ المطلوب" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="8">8 جنيه</SelectItem>
                          <SelectItem value="9">9 جنيه</SelectItem>
                          <SelectItem value="10">10 جنيه</SelectItem>
                          <SelectItem value="15">15 جنيه</SelectItem>
                          <SelectItem value="20">20 جنيه</SelectItem>
                          <SelectItem value="25">25 جنيه</SelectItem>
                          <SelectItem value="30">30 جنيه</SelectItem>
                          <SelectItem value="35">35 جنيه</SelectItem>
                          <SelectItem value="40">40 جنيه</SelectItem>
                          <SelectItem value="45">45 جنيه</SelectItem>
                          <SelectItem value="50">50 جنيه</SelectItem>
                          <SelectItem value="55">55 جنيه</SelectItem>
                          <SelectItem value="60">60 جنيه</SelectItem>
                          <SelectItem value="65">65 جنيه</SelectItem>
                          <SelectItem value="70">70 جنيه</SelectItem>
                          <SelectItem value="75">75 جنيه</SelectItem>
                          <SelectItem value="100">100 جنيه</SelectItem>
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
                    </div>
                  </div>

                  {/* زر الشحن */}
                  <Button
                    onClick={handleBalanceRecharge}
                    className="w-full mt-8 bg-red-600 hover:bg-red-700 text-white font-bold py-5 text-xl rounded-lg flex items-center justify-center gap-2"
                    disabled={!phoneNumber || !amount}
                  >
                    <svg
                      className="w-6 h-6"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                    شحن الرصيد الآن
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
          <footer className="bg-red-900 py-8 mt-16">
            <div className="container mx-auto px-4 text-center">
              <p className="text-white/80">
                © 2025 Boda 4 Net . جميع الحقوق محفوظة.
              </p>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}

export default App;
