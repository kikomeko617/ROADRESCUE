import Link from "next/link";
import { currentUser } from "@/lib/session";
import { unreadCount } from "@/lib/notifications";
import { cartCount } from "@/lib/cart";
import { logoutAction } from "@/app/actions/auth";

export default async function Header() {
  const user = await currentUser();
  const [unread, inCart] = user ? await Promise.all([unreadCount(user.id), user.role === "customer" ? cartCount(user.id) : 0]) : [0, 0];
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand" aria-label="ROADRESCUE home">
          <img src="/logo.svg" alt="" width="34" height="34" />
          ROADRESCUE
        </Link>
        <nav className="nav" aria-label="Main">
          {(!user || user.role === "customer") && <Link href="/services">Services</Link>}
          {!user && <Link href="/#nearby">Near you</Link>}
          {user?.role === "customer" && (
            <>
              <Link href="/cart">
                Cart{inCart > 0 && <span className="count" aria-label={`${inCart} items`}>{inCart}</span>}
              </Link>
              <Link href="/orders">My orders</Link>
            </>
          )}
          {user?.role === "mechanic" && <Link href="/mechanic">My jobs</Link>}
          {user?.role === "driver" && <Link href="/driver">My trips</Link>}
          {user?.role === "admin" && <Link href="/admin">Admin</Link>}
          {user && (
            <Link href="/notifications">
              Alerts{unread > 0 && <span className="count" aria-label={`${unread} unread`}>{unread}</span>}
            </Link>
          )}
          {user ? (
            <>
              <span className="who">
                {user.name} ({user.role})
              </span>
              <form action={logoutAction}>
                <button type="submit" className="linklike">
                  Log out
                </button>
              </form>
              {user.role === "customer" && (
                <Link href="/request" className="pill">
                  Get help
                </Link>
              )}
            </>
          ) : (
            <>
              <Link href="/login">Log in</Link>
              <Link href="/register" className="pill">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
