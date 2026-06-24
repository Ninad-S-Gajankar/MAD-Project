interface TriggerPaymentOptions {
  amount: number;
  description: string;
  prefillName?: string;
  prefillEmail?: string;
  prefillPhone?: string;
  onSuccess: (paymentId: string) => void;
  onDismiss?: () => void;
}

/**
 * Directly triggers the official Razorpay Checkout widget.
 * Enables Cards, Netbanking, Wallets, UPI, and QR Codes.
 */
export function triggerRazorpayPayment(options: TriggerPaymentOptions) {
  if (typeof (window as any).Razorpay === "undefined") {
    alert("Razorpay SDK not loaded. Simulating successful payment...");
    options.onSuccess("mock_" + Math.random().toString(36).substring(2, 11));
    return;
  }

  const opts = {
    key: "rzp_test_SwpeFo3M2LnrNY",
    amount: Math.round(options.amount * 100), // in paise
    currency: "INR",
    name: "Campus Connect",
    description: options.description,
    handler: (response: any) => {
      options.onSuccess(response.razorpay_payment_id);
    },
    prefill: {
      name: options.prefillName || "Nischal",
      email: options.prefillEmail || "nischal@gmail.com",
      contact: options.prefillPhone || "6362206366",
    },
    method: {
      card: true,
      netbanking: true,
      wallet: true,
      upi: true,
    },
    theme: {
      color: "#0f766e",
    },
    modal: {
      ondismiss: () => {
        if (options.onDismiss) options.onDismiss();
      },
    },
  };

  const rzp = new (window as any).Razorpay(opts);
  rzp.open();
}
