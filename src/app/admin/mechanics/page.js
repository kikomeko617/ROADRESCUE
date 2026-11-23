import { requirePageUser } from "@/lib/session";
import { listMechanics } from "@/lib/admin";
import { mechanicStatusAction } from "@/app/actions/admin";
import AdminNav from "@/components/AdminNav";
import ActionForm from "@/components/ActionForm";
import SubmitButton from "@/components/SubmitButton";
import StatusBadge from "@/components/StatusBadge";
import Avatar from "@/components/Avatar";
import { PROVIDER_LABEL } from "@/lib/constants";
import { when } from "@/lib/format";

export const metadata = { title: "Mechanics and drivers" };

export default async function MechanicsAdmin() {
  const user = await requirePageUser(["admin"]);
  const helpers = await listMechanics(user);
  return (
    <>
      <div className="page-head">
        <span className="kicker">Admin</span>
        <h1>Mechanics and drivers</h1>
        <p>Approve new mechanics and drivers after checking them (mock verification - no real ID numbers or photos are collected), or suspend someone after complaints.</p>
      </div>
      <AdminNav active="/admin/mechanics" />
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Type</th>
              <th scope="col">Area and skills</th>
              <th scope="col">Jobs / rating</th>
              <th scope="col">Status</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {helpers.map((m) => (
              <tr key={m.id}>
                <td>
                  <div className="row" style={{ flexWrap: "nowrap" }}>
                    <Avatar id={m.id} kind={m.role} look={m.avatar_style} size={36} />
                    <div>
                      <strong>{m.name}</strong>
                      <div className="tiny muted">
                        {m.email} · {m.phone} · joined {when(m.created_at)}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`type-badge type-${m.role}`}>{PROVIDER_LABEL[m.role]}</span>
                </td>
                <td>
                  {m.area}
                  <div className="tiny muted">{m.skills || "-"}</div>
                </td>
                <td>
                  {m.jobs_done} jobs · {m.rating ? `★ ${m.rating}` : "no reviews"}
                </td>
                <td>
                  <StatusBadge status={m.status} />
                </td>
                <td>
                  <ActionForm action={mechanicStatusAction} className="row">
                    <input type="hidden" name="mechanicId" value={m.id} />
                    {m.status !== "APPROVED" ? (
                      <SubmitButton className="btn btn-teal btn-sm" name="status" value="APPROVED" pendingText="...">
                        Approve
                      </SubmitButton>
                    ) : (
                      <SubmitButton className="btn btn-danger btn-sm" name="status" value="SUSPENDED" pendingText="...">
                        Suspend
                      </SubmitButton>
                    )}
                  </ActionForm>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
