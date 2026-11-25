import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePageUser } from "@/lib/session";
import { getOrderDetail } from "@/lib/orders";
import { approvePaymentAction, declinePaymentAction, cancelAction } from "@/app/actions/orders";
import ActionForm from "@/components/ActionForm";
import SubmitButton from "@/components/SubmitButton";
import StatusBadge from "@/components/StatusBadge";
import { ugx } from "@/lib/format";

export const metadata = { title: "Approve payment" };

export default async function PayPage({ params }) {
  const user = await requirePageUser(["customer"]);
  const { id } = await params;
  let order;
  try {
    order = await getOrderDetail(user, Number(id));
  } catch {
    notFound();
  }
  if (!order) notFound();
  if (order.status !== "PENDING_PAYMENT") redirect(`/orders/${order.id}`);
  const network = order.payment.method === "MOCK_AIRTEL" ? "Airtel Money" : "MTN MoMo";
  return (
    <>
      <div className="page-head" style={{ textAlign: "center" }}>
        <span className="kicker">Step 5 · Mock payment</span>
        <h1>Approve the payment on your phone</h1>
        <p style={{ margin: "0 auto" }}>This screen pretends to be the {network} prompt. Nothing real is charged.</p>
      </div>
      <div className="phone-mock">
        <p className="kicker">{network} (sandbox)</p>
        <p className="small muted">Request from ROADRESCUE to {order.payment.payer_phone_masked}</p>
        <p className="amount">{ugx(order.payment.amount)}</p>
        <p className="small">
          Order {order.order_no} · {order.service_name}
        </p>
        <p className="small">
          Payment status: <StatusBadge status={order.payment.status} />
        </p>
        <ActionForm action={approvePaymentAction}>
          <input type="hidden" name="orderId" value={order.id} />
          <SubmitButton className="btn btn-teal btn-block" pendingText="Approving...">
            Approve (simulate)
          </SubmitButton>
        </ActionForm>
        <ActionForm action={declinePaymentAction} className="form mt">
          <input type="hidden" name="orderId" value={order.id} />
          <SubmitButton className="btn btn-ghost btn-block" pendingText="Declining...">
            Decline (simulate)
          </SubmitButton>
        </ActionForm>
        <p className="tiny muted mt">A real prompt would ask for your PIN on your own phone. ROADRESCUE never sees or stores it.</p>
      </div>
      <div style={{ maxWidth: 360, margin: "16px auto 0" }}>
        <ActionForm action={cancelAction}>
          <input type="hidden" name="orderId" value={order.id} />
          <input type="hidden" name="reason" value="Cancelled before payment" />
          <SubmitButton className="btn btn-danger btn-block btn-sm" pendingText="Cancelling...">
            Cancel this order
          </SubmitButton>
        </ActionForm>
        <p className="small" style={{ textAlign: "center" }}>
          <Link href={`/orders/${order.id}`}>View order details</Link>
        </p>
      </div>
    </>
  );
}
