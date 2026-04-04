const extractRawMessage = (err) => {
  if (!err) return "";
  if (typeof err === "string") return err;
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    err?.error ||
    ""
  );
};

export function getPaymentErrorMessage(err, t = {}) {
  const raw = String(extractRawMessage(err) || "").trim();
  const m = raw.toLowerCase();

  if (!raw) return t.paymentFailedGeneric || "Payment failed. Please try again.";
  if (m.includes("studentid is required")) return t.paymentErrStudentRequired || "Student is required.";
  if (m.includes("student not found")) return t.paymentErrStudentNotFound || "Student not found.";
  if (m.includes("group not found")) return t.paymentErrGroupNotFound || "Group not found.";
  if (m.includes("amount must be >= 0")) return t.paymentErrAmountInvalid || "Amount must be valid.";
  if (m.includes("period is required for monthly")) return t.paymentErrMonthlyPeriodRequired || "Period is required for monthly payment.";
  if (m.includes("period (session date) is required for per_session")) return t.paymentErrSessionPeriodRequired || "Session date is required for per-session payment.";
  if (m.includes("period (session date) is required for per_hour")) return t.paymentErrHourPeriodRequired || "Session date is required for hourly payment.";
  if (m.includes("hours must be > 0 for per_hour")) return t.paymentErrHourHoursRequired || "Hours must be greater than zero for hourly payment.";
  if (m.includes("provide items or globalamount or set usewalletfirst=true")) {
    return t.paymentErrNoInput || "Select rows, enter an amount, or enable use credit first.";
  }
  if (m.includes("timeout") || m.includes("network")) return t.paymentErrNetwork || "Network issue. Check connection and server.";
  if (m.includes("unauthorized") || m.includes("forbidden")) return t.paymentErrUnauthorized || "Your session expired. Please sign in again.";

  // Keep exact backend detail for unknown errors while still localizing the prefix.
  const generic = t.paymentFailedGeneric || "Payment failed. Please try again.";
  return `${generic} (${raw})`;
}

