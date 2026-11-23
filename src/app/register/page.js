import Link from "next/link";
import RegisterForm from "./RegisterForm";
import { registerAction } from "@/app/actions/auth";
import { AREAS } from "@/lib/constants";
import { PAGE_IMAGES } from "@/lib/images";

export const metadata = { title: "Sign up" };

export default function RegisterPage() {
  return (
    <div className="auth-split">
      <div className="card auth-card wide">
        <span className="kicker">Join ROADRESCUE</span>
        <h1>Create your account</h1>
        <p className="muted">It takes a minute. Then you can request help any time - or start earning as a mechanic or driver.</p>
        <RegisterForm action={registerAction} areas={AREAS} />
        <p className="small mt">
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </div>
      <figure className="auth-photo" aria-hidden="true">
        <img src={PAGE_IMAGES.register} alt="" width="649" height="865" decoding="async" />
        <figcaption>
          <strong>Good at fixing cars, or driving them?</strong>
          <span>Get verified, then get jobs near you.</span>
        </figcaption>
      </figure>
    </div>
  );
}
