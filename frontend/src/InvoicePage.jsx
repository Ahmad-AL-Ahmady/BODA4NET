import React from "react";
import { Button } from "@/components/ui/button.jsx";

const InvoicePage = ({
  invoiceData,
  onConfirm,
  onCancel,
  paymentStep,
  loading,
  error,
  paymentData,
}) => {
  // Show different content based on payment step
  const renderContent = () => {
    switch (paymentStep) {
      case "checking-status":
        return (
          <div className="text-center space-y-8">
            <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8 rounded-3xl border border-blue-200/50 shadow-2xl backdrop-blur-sm">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg
                  className="w-10 h-10 text-white animate-pulse"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-blue-800 mb-4">
                جاري التحقق من الدفع... ⏳
              </h3>
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-lg"></div>
              </div>
              <p className="text-blue-700 text-lg font-medium">
                يرجى الانتظار، سيتم التحقق من حالة الدفع تلقائياً
              </p>
              {paymentData && (
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl border border-blue-300/50">
                  <p className="text-sm text-blue-800 font-semibold">
                    رمز الدفع:{" "}
                    <span className="font-bold">{paymentData.reference}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      case "processing":
        return (
          <div className="text-center space-y-8">
            <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-8 rounded-3xl border border-green-200/50 shadow-2xl backdrop-blur-sm">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg
                  className="w-10 h-10 text-white animate-bounce"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-green-800 mb-4">
                جاري شحن الرصيد... ⚡
              </h3>
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin shadow-lg"></div>
              </div>
              <p className="text-green-700 text-lg font-medium">
                تم تأكيد الدفع، جاري شحن الرصيد...
              </p>
            </div>
          </div>
        );

      case "completed":
        return (
          <div className="text-center space-y-8">
            <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-8 rounded-3xl border border-green-200/50 shadow-2xl backdrop-blur-sm">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg
                  className="w-12 h-12 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-green-800 mb-4">
                تم الشحن بنجاح! ✅
              </h3>
              <p className="text-green-700 text-lg font-medium">
                تم شحن رصيدك بنجاح
              </p>
            </div>
          </div>
        );

      default: // "invoice"
        return (
          <>
            {/* Enhanced Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg
                  className="w-8 h-8 text-white"
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
              <h2 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                فاتورة شراء
              </h2>
              <p className="text-gray-600 mt-2">مراجعة تفاصيل الطلب</p>
            </div>

            {/* Enhanced Invoice Details */}
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-6 shadow-lg border border-gray-200/50 mb-8">
              <div className="space-y-4 text-lg">
                <div className="flex justify-between items-center py-3 border-b border-gray-200/50">
                  <span className="text-gray-700 font-medium">
                    رقم{" "}
                    {invoiceData.type === "mobile"
                      ? "الهاتف (المراد شحنه)"
                      : "الخط الأرضي"}
                    :
                  </span>
                  <span className="font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {invoiceData.number}
                  </span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-gray-200/50">
                  <span className="text-gray-700 font-medium">مبلغ الشحن:</span>
                  <span className="font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {invoiceData.amount} جنيه
                  </span>
                </div>

                {invoiceData.type === "internet" && (
                  <div className="flex justify-between items-center py-3 border-b border-gray-200/50">
                    <span className="text-gray-700 font-medium">الباقة:</span>
                    <span className="font-bold text-gray-900 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      {invoiceData.packageName}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center py-3 border-b border-gray-200/50">
                  <span className="text-gray-700 font-medium">
                    رسوم الخدمة (20%):
                  </span>
                  <span className="font-bold text-gray-900 bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                    {invoiceData.serviceFee} جنيه
                  </span>
                </div>

                <div className="flex justify-between items-center py-4 mt-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl px-4">
                  <span className="text-xl font-bold text-gray-800">
                    المبلغ المطلوب سداده:
                  </span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                    {invoiceData.totalAmount} جنيه
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-8 p-6 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200/50 rounded-2xl shadow-lg">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-600 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <p className="text-red-700 text-center font-semibold">
                    {error}
                  </p>
                </div>
              </div>
            )}

            {/* Enhanced Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={onConfirm}
                disabled={loading}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 px-8 rounded-2xl text-lg disabled:opacity-50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:transform-none"
              >
                {loading ? (
                  <>
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                    جاري المعالجة...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    تأكيد الشراء
                  </>
                )}
              </Button>
              <Button
                onClick={onCancel}
                disabled={loading}
                className="bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white font-bold py-4 px-8 rounded-2xl text-lg disabled:opacity-50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:transform-none"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                إلغاء
              </Button>
            </div>
          </>
        );
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-gradient-to-br from-red-500 via-red-600 to-red-800 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-400/20 via-transparent to-red-900/30 animate-pulse"></div>
      <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-orange-400/10 to-red-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-tl from-pink-400/10 to-red-600/10 rounded-full blur-3xl"></div>

      <div className="bg-white/95 backdrop-blur-sm text-black rounded-3xl p-10 shadow-2xl max-w-lg w-full mx-4 relative z-10 border border-white/20">
        {renderContent()}
      </div>
    </div>
  );
};

export default InvoicePage;
