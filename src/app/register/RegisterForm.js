"use client";
import { useState } from "react";
import ActionForm from "@/components/ActionForm";
import SubmitButton from "@/components/SubmitButton";

const ROLES = [
  ["customer", "I need help", "Driver / customer"],
  ["mechanic", "I'm a mechanic", "Fix cars near you"],
  ["driver", "I'm a driver", "Drive people in their cars"],
];

export default function RegisterForm({ action, areas }) {
  const [role, setRole] = useState("customer");
  const helper = role !== "customer";
  return (
    <ActionForm action={action}>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="sr-only">I am a</legend>
        <div className="radio-cards three">
          {ROLES.map(([value, label, hint]) => (
            <label key={value} className="radio-card">
              <input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} />
              <span>
                {label}
                <span className="hint">{hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="name">Full name</label>
        <input id="name" name="name" type="text" autoComplete="name" required minLength={2} maxLength={80} />
      </div>
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <label htmlFor="phone">
          Phone number <span className="hint">Use a made-up number like 0772123456 for this prototype.</span>
        </label>
        <input id="phone" name="phone" type="tel" inputMode="numeric" pattern="07[0-9]{8}" placeholder="07XXXXXXXX" required />
      </div>
      {helper && (
        <>
          <div>
            <label htmlFor="area">Area you work in</label>
            <select id="area" name="area" required defaultValue="">
              <option value="" disabled>
                Choose an area
              </option>
              {areas.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="skills">{role === "driver" ? "Licence and experience (optional)" : "Skills (optional)"}</label>
            <input
              id="skills"
              name="skills"
              type="text"
              maxLength={120}
              placeholder={role === "driver" ? "e.g. Class B licence, 5 years, automatic and manual" : "e.g. batteries, tyres, engines"}
            />
          </div>
          <p className="alert alert-info small">
            New {role}s are checked by our team before they can take jobs. We never ask for your National ID number or photos in this prototype - your profile uses an illustrated avatar.
          </p>
        </>
      )}
      <div>
        <label htmlFor="password">
          Password <span className="hint">At least 8 characters, with a letter and a number.</span>
        </label>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </div>
      <SubmitButton className="btn btn-primary btn-block" pendingText="Creating account...">
        Create account
      </SubmitButton>
    </ActionForm>
  );
}
