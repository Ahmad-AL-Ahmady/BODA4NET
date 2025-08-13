import React from "react";
import { useMobileFeatures } from "../hooks/use-mobile.js";

// Mobile-optimized button component
export function MobileButton({
  children,
  onClick,
  className = "",
  disabled = false,
  variant = "primary",
  size = "default",
}) {
  const { isMobile, isTouchDevice } = useMobileFeatures();

  const baseClasses =
    "font-bold transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none";

  const variantClasses = {
    primary:
      "bg-gradient-to-r from-red-600 via-orange-600 to-red-700 hover:from-red-700 hover:via-orange-700 hover:to-red-800 text-white shadow-2xl hover:shadow-3xl",
    secondary:
      "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300 shadow-lg",
    success:
      "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-xl",
  };

  const sizeClasses = {
    small: "px-4 py-2 text-sm rounded-lg",
    default: "px-6 py-3 text-base rounded-xl",
    large: "px-8 py-4 text-lg rounded-2xl",
  };

  const mobileClasses = isMobile ? "touch-target-large" : "";
  const touchClasses = isTouchDevice ? "active:scale-98" : "hover:scale-105";

  const handleClick = (e) => {
    if (disabled) return;

    // Haptic feedback for mobile devices
    if (isMobile && navigator.vibrate) {
      navigator.vibrate(50);
    }

    onClick?.(e);
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${mobileClasses} ${touchClasses} ${className}`}
    >
      {children}
    </button>
  );
}

// Mobile-optimized input component
export function MobileInput({
  value,
  onChange,
  placeholder,
  type = "text",
  className = "",
  ...props
}) {
  const { isMobile } = useMobileFeatures();

  const baseClasses =
    "w-full text-right border-2 border-gray-200 focus:border-red-500 transition-all duration-300 shadow-lg focus:shadow-xl focus:ring-4 focus:ring-red-500/20";
  const mobileClasses = isMobile ? "touch-target-large mobile-focus" : "";
  const sizeClasses = isMobile
    ? "p-4 text-lg rounded-xl"
    : "p-6 text-xl rounded-2xl";

  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`${baseClasses} ${mobileClasses} ${sizeClasses} ${className}`}
      {...props}
    />
  );
}

// Mobile-optimized card component
export function MobileCard({ children, className = "", variant = "default" }) {
  const { isMobile } = useMobileFeatures();

  const baseClasses =
    "bg-white/80 backdrop-blur-sm border-0 ring-1 ring-gray-200/50 relative overflow-hidden";
  const mobileClasses = isMobile ? "mobile-card" : "";

  const variantClasses = {
    default: "rounded-2xl md:rounded-3xl p-6 md:p-10 shadow-2xl",
    compact: "rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg",
    elevated:
      "rounded-2xl md:rounded-3xl p-6 md:p-10 shadow-2xl border border-white/20",
  };

  return (
    <div
      className={`${baseClasses} ${mobileClasses} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </div>
  );
}

// Mobile-optimized amount selector
export function MobileAmountSelector({
  amounts = ["10", "20", "50", "100"],
  selectedAmount,
  onAmountSelect,
  className = "",
}) {
  const { isMobile } = useMobileFeatures();

  const gridClasses = isMobile ? "grid-cols-2 gap-3" : "grid-cols-4 gap-4";

  return (
    <div className={`grid ${gridClasses} mb-4 md:mb-6 ${className}`}>
      {amounts.map((amount) => (
        <MobileButton
          key={amount}
          onClick={() => onAmountSelect(amount)}
          variant={selectedAmount === amount ? "primary" : "secondary"}
          size={isMobile ? "default" : "large"}
          className="text-center"
        >
          {amount} ج
        </MobileButton>
      ))}
    </div>
  );
}

// Mobile-optimized summary card
export function MobileSummaryCard({
  amount,
  serviceFee,
  totalAmount,
  className = "",
}) {
  const { isMobile } = useMobileFeatures();

  if (!amount) return null;

  return (
    <MobileCard
      variant="compact"
      className={`mt-4 md:mt-6 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200/50 ${className}`}
    >
      <div className="text-right">
        <p className="text-blue-800 font-bold text-base md:text-lg mb-2 md:mb-3 mobile-text-lg">
          ملخص الشحن:
        </p>
        <div className="space-y-1 md:space-y-2">
          <p className="text-xs md:text-sm text-blue-700 font-medium mobile-text-lg">
            مبلغ الشحن: <span className="font-bold">{amount} جنيه</span>
          </p>
          <p className="text-xs md:text-sm text-blue-600 font-medium mobile-text-lg">
            رسوم خدمة: <span className="font-bold">{serviceFee} جنيه</span>
          </p>
          <div className="border-t border-blue-200 pt-2 mt-2 md:mt-3">
            <p className="text-lg md:text-xl font-bold text-blue-900 mobile-text-xl">
              المجموع: {totalAmount} جنيه
            </p>
          </div>
        </div>
      </div>
    </MobileCard>
  );
}

// Mobile-optimized service banner
export function MobileServiceBanner({
  title = "خدمة فورية وآمنة",
  subtitle = "شحن رصيد فودافون بأسرع وقت وأقل تكلفة",
  icon = "⚡",
  className = "",
}) {
  const { isMobile } = useMobileFeatures();

  return (
    <div
      className={`mb-6 md:mb-8 p-4 md:p-6 bg-gradient-to-r from-green-400/10 via-emerald-400/10 to-teal-400/10 border border-green-300/30 rounded-xl md:rounded-2xl backdrop-blur-sm ${className}`}
    >
      <div className="flex items-center justify-center gap-2 md:gap-3">
        <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg md:rounded-xl flex items-center justify-center">
          <span className="text-white text-lg md:text-xl">{icon}</span>
        </div>
        <div className="text-center">
          <p className="text-green-800 font-bold text-base md:text-lg mobile-text-lg">
            {title}
          </p>
          <p className="text-green-700 font-medium text-xs md:text-sm mobile-text-lg">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}
