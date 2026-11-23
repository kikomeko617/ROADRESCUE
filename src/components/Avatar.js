// An illustrated face for a helper (no real photos). Decorative: the name is always shown next to it.
import { avatarDataUri } from "@/lib/avatar";

export default function Avatar({ id, kind = "mechanic", look, size = 56, online }) {
  return (
    <span className="avatar" style={{ width: size, height: size }}>
      <img src={avatarDataUri({ seed: id, kind, style: look })} alt="" width={size} height={size} />
      {online != null && <span className={`presence ${online ? "on" : "off"}`} aria-hidden="true" />}
    </span>
  );
}
