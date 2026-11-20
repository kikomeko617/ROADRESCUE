// A template re-mounts on every navigation, so each page fades smoothly in.
export default function Template({ children }) {
  return <div className="page-enter">{children}</div>;
}
