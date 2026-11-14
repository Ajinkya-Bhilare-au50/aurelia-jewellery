"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { MobileIcon } from "./Icons";
import { PhoneOtpField } from "./PhoneOtpField";

/** Account page: add a verified mobile number (for accounts created before OTP existed). */
export function VerifyPhoneCard() {
  const router = useRouter();
  return (
    <div className="card p-6">
      <h2 className="flex items-center gap-3 font-display text-2xl"><MobileIcon size={22} className="text-gold" /> Verify your mobile</h2>
      <p className="mt-2 text-sm text-secondary">Add your number to sign in with an OTP and get delivery updates.</p>
      <div className="mt-5">
        <PhoneOtpField
          verifyLabel="Verify"
          onVerified={async (phoneToken) => {
            await api("/api/account/phone", { phoneToken });
            router.refresh();
          }}
        />
      </div>
    </div>
  );
}
