import Link from "next/link";
import { requirePageUser } from "@/lib/session";
import { listNotifications } from "@/lib/notifications";
import { markReadAction } from "@/app/actions/notifications";
import ActionForm from "@/components/ActionForm";
import SubmitButton from "@/components/SubmitButton";
import { timeAgo } from "@/lib/format";

export const metadata = { title: "Alerts" };

export default async function NotificationsPage() {
  const user = await requirePageUser();
  const items = await listNotifications(user.id);
  const unread = items.filter((n) => !n.is_read).length;
  return (
    <>
      <div className="row between page-head">
        <h1>Alerts</h1>
        {unread > 0 && (
          <ActionForm action={markReadAction} className="">
            <SubmitButton className="btn btn-ghost btn-sm" pendingText="...">
              Mark all as read
            </SubmitButton>
          </ActionForm>
        )}
      </div>
      <div className="card">
        {items.length === 0 ? (
          <p className="empty">No alerts yet.</p>
        ) : (
          items.map((n) => (
            <div key={n.id} className={`notif ${n.is_read ? "" : "unread"}`}>
              <div className="icon-circle" aria-hidden="true">
                {n.is_read ? "•" : "🔔"}
              </div>
              <div>
                {n.link ? <Link href={n.link}>{n.message}</Link> : n.message}
                <div className="tiny muted">
                  {timeAgo(n.created_at)}
                  {!n.is_read && <span className="sr-only"> (unread)</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
