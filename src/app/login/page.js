import Link from "next/link";
import { redirect } from "next/navigation";
import ActionForm from "@/components/ActionForm";
import SubmitButton from "@/components/SubmitButton";
import { loginAction } from "@/app/actions/auth";
import { currentUser } from "@/lib/session";
import { homeForRole } from "@/lib/constants";
import { PAGE_IMAGES } from "@/lib/images";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }) {
  const sp = await searchParams;
  const user = await currentUser();
  if (user) redirect(homeForRole(user.role));
  return (
    <div className="auth-split">
      <div className="card auth-card">
        <span className="kicker">Welcome back</span>
        <h1>Log in</h1>
        <p className="muted">Log in to request help, or to manage your jobs and trips.</p>
        <ActionForm action={loginAction}>
          <input type="hidden" name="next" value={sp?.next || ""} />
          <div>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <SubmitButton className="btn btn-primary btn-block" pendingText="Logging in...">
            Log in
          </SubmitButton>
        </ActionForm>
        <p className="small mt">
          New here? <Link href="/register">Create an account</Link>
        </p>
        <details className="small mt">
          <summary>Demo accounts (fictitious)</summary>
          <ul>
            <li>Customer: sarah@roadrescue.test / Customer@1234</li>
            <li>Customer with a saved car: daniel@roadrescue.test / Customer@1234</li>
            <li>Mechanic: ssali@roadrescue.test / Mechanic@1234</li>
            <li>Driver: brenda@roadrescue.test / Driver@1234</li>
          </ul>
        </details>
      </div>
      <figure className="auth-photo" aria-hidden="true">
        <img src={PAGE_IMAGES.login} alt="" width="900" height="1200" decoding="async" />
        <figcaption>
          <strong>Flat tyre? Flat battery?</strong>
          <span>A verified helper, at a price you see first.</span>
        </figcaption>
      </figure>
    </div>
  );
}
