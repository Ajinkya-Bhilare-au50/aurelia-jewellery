"use client";

import { STATES } from "@/lib/states";
import type { Address } from "@/lib/types";

/** Address lines for display: ["Name", "line1, line2", "City, State 400001", "+91 98765 43210"]. */
export function addressLines(a: Address) {
  return [a.name, [a.line1, a.line2].filter(Boolean).join(", "), `${a.city}, ${a.state} ${a.pincode}`, `+91 ${a.phone.replace(/^(\d{5})(\d{5})$/, "$1 $2")}`];
}

/**
 * The address inputs (uncontrolled; read them with FormData). Field names match `Address`.
 * `idPrefix` keeps ids unique when two forms are on one page.
 */
export function AddressFields({ defaults = {}, idPrefix = "" }: { defaults?: Partial<Address>; idPrefix?: string }) {
  const field = (name: keyof Address, label: string, { className, ...props }: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className={className}>
      <label htmlFor={idPrefix + name} className="field-label">{label}</label>
      <input id={idPrefix + name} name={name} defaultValue={defaults[name] ?? ""} {...props} className="input" />
    </div>
  );
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {field("name", "Full name", { required: true, autoComplete: "name", maxLength: 60 })}
      {field("phone", "Mobile number", { required: true, inputMode: "numeric", pattern: "[6-9][0-9]{9}", maxLength: 10, autoComplete: "tel-national", title: "10-digit Indian mobile number" })}
      {field("line1", "Address", { required: true, autoComplete: "address-line1", placeholder: "House no., building, street", maxLength: 120, className: "sm:col-span-2" })}
      {field("line2", "Landmark / area (optional)", { autoComplete: "address-line2", maxLength: 120, className: "sm:col-span-2" })}
      {field("city", "City", { required: true, autoComplete: "address-level2", maxLength: 60 })}
      {field("pincode", "PIN code", { required: true, inputMode: "numeric", pattern: "[1-9][0-9]{5}", maxLength: 6, autoComplete: "postal-code", title: "6-digit PIN code" })}
      <div className="sm:col-span-2">
        <label htmlFor={idPrefix + "state"} className="field-label">State</label>
        <select id={idPrefix + "state"} name="state" required defaultValue={defaults.state ?? ""} className="input cursor-pointer">
          <option value="" disabled>Select state</option>
          {STATES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
    </div>
  );
}
