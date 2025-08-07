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
          <div className="text-center space-y-6">
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <h3 className="text-xl font-bold text-blue-800 mb-4">
                جاري التحقق من الدفع... ⏳
              </h3>
              <div className="flex justify-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-blue-700 mt-4">
                يرجى الانتظار، سيتم التحقق من حالة الدفع تلقائياً
              </p>
              {paymentData && (
                <div className="mt-4 p-4 bg-blue-100 rounded-lg">
                  <p className="text-sm text-blue-800">
                    رمز الدفع: {paymentData.reference}
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      case "processing":
        return (
          <div className="text-center space-y-6">
            <div className="bg-green-50 p-6 rounded-lg border border-green-200">
              <h3 className="text-xl font-bold text-green-800 mb-4">
                جاري شحن الرصيد... ⚡
              </h3>
              <div className="flex justify-center">
                <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-green-700 mt-4">
                تم تأكيد الدفع، جاري شحن الرصيد...
              </p>
            </div>
          </div>
        );

      case "completed":
        return (
          <div className="text-center space-y-6">
            <div className="bg-green-50 p-6 rounded-lg border border-green-200">
              <h3 className="text-xl font-bold text-green-800 mb-4">
                تم الشحن بنجاح! ✅
              </h3>
              <p className="text-green-700">تم شحن رصيدك بنجاح</p>
            </div>
          </div>
        );

      default: // "invoice"
        return (
          <>
            <h2 className="text-3xl font-bold text-center mb-6">فاتورة شراء</h2>
            <div className="space-y-4 text-lg">
              <div className="flex justify-between">
                <span>
                  رقم {invoiceData.type === "mobile" ? "الهاتف" : "الخط الأرضي"}
                  :
                </span>
                <span className="font-semibold">{invoiceData.number}</span>
              </div>
              <div className="flex justify-between">
                <span>مبلغ الشحن:</span>
                <span className="font-semibold">{invoiceData.amount} جنيه</span>
              </div>
              {invoiceData.type === "internet" && (
                <div className="flex justify-between">
                  <span>الباقة:</span>
                  <span className="font-semibold">
                    {invoiceData.packageName}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>رسوم الخدمة (12%):</span>
                <span className="font-semibold">
                  {invoiceData.serviceFee} جنيه
                </span>
              </div>
              <div className="flex justify-between text-xl font-bold border-t-2 border-gray-300 pt-4 mt-4">
                <span>المبلغ المطلوب سداده:</span>
                <span className="text-red-600">
                  {invoiceData.totalAmount} جنيه
                </span>
              </div>
            </div>

            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-center">{error}</p>
              </div>
            )}

            <div className="flex justify-around mt-8 space-x-4">
              <Button
                onClick={onConfirm}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-lg disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    جاري المعالجة...
                  </>
                ) : (
                  "تأكيد الشراء"
                )}
              </Button>
              <Button
                onClick={onCancel}
                disabled={loading}
                className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg text-lg disabled:opacity-50"
              >
                إلغاء
              </Button>
            </div>
          </>
        );
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-red-600">
      <div className="bg-white text-black rounded-lg p-8 shadow-lg max-w-md w-full mx-4">
        {renderContent()}
      </div>
    </div>
  );
};

export default InvoicePage;
