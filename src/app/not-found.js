import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card empty" style={{ maxWidth: 520, margin: "0 auto" }}>
      <h1>Page not found</h1>
      <p>That page doesn&apos;t exist, or you don&apos;t have access to it.</p>
      <Link className="btn btn-primary" href="/">
        Go home
      </Link>
    </div>
  );
}
