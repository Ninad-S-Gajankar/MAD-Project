import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function generate10DigitId(): string {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

export { triggerRazorpayPayment } from "./paymentUtils";

