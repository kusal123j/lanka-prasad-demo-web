import React from "react";
import { CreditCard, Maximize2 } from "lucide-react";
import paymentDetailsImage from "../../assets/payment-guidelines.jpg";

const MakePayment = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-neutral-50 to-white text-neutral-900 antialiased">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-neutral-200">
        <div className="mx-auto max-w-7xl h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 ring-1 ring-red-200">
              <CreditCard className="h-5 w-5 text-red-600" aria-hidden="true" />
            </span>
            <span className="text-base font-semibold tracking-wide">
              Make Payment
            </span>
          </div>
          <a
            href={paymentDetailsImage}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-600 hover:text-neutral-900 hover:border-neutral-300 hover:ring-1 hover:ring-red-200 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            aria-label="Open full image"
          >
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="relative rounded-3xl bg-white ring-1 ring-neutral-200 shadow-xl">
          <div className="pointer-events-none absolute inset-0 rounded-3xl " />
          <div className="p-2 sm:p-4 md:p-6">
            <img
              src={paymentDetailsImage}
              alt="Bank payment details"
              className="mx-auto w-full max-h-[80vh] object-contain rounded-2xl select-none"
              draggable="false"
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default MakePayment;
