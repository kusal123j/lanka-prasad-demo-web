import React from "react";
import { CreditCard, Maximize2 } from "lucide-react";

const MakePayment = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-neutral-950 to-black text-neutral-100 antialiased">
      <header className="sticky top-0 z-20 bg-black/40 backdrop-blur border-b border-red-500/20">
        <div className="mx-auto max-w-7xl h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-600/20 ring-1 ring-red-500/40">
              <CreditCard className="h-5 w-5 text-red-500" aria-hidden="true" />
            </span>
            <span className="text-base font-semibold tracking-wide">
              Make Payment
            </span>
          </div>
          <a
            href="https://lasithaprasad.b-cdn.net/make-payment.jpg"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-500/20 bg-neutral-900/60 text-neutral-200 hover:border-red-500/40 hover:ring-1 hover:ring-red-500/30 transition"
            aria-label="Open full image"
          >
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="relative rounded-3xl bg-neutral-950 ring-1 ring-red-600/20 shadow-2xl shadow-red-900/30">
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-tr from-red-600/10 via-transparent to-red-600/10" />
          <div className="p-2 sm:p-4 md:p-6">
            <img
              src="https://lasithaprasad.b-cdn.net/make-payment.jpg"
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
