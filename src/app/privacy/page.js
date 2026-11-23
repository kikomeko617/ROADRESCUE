export const metadata = { title: "Privacy and data use" };

export default function PrivacyPage() {
  return (
    <div className="card" style={{ maxWidth: 800, margin: "0 auto" }}>
      <span className="kicker">Privacy notice</span>
      <h1>How ROADRESCUE uses your data</h1>
      <p className="alert alert-info">This is a student prototype for MGT3151 at Uganda Christian University. Every person, car and payment in it is fictitious.</p>
      <h2 className="mt">What we collect, and why</h2>
      <ul>
        <li><strong>Name, email and phone</strong> - to log you in and so your mechanic or driver can call you.</li>
        <li><strong>Area and a landmark</strong> - so your helper can find you. We do not store exact GPS coordinates.</li>
        <li><strong>Your car&apos;s make, model, type and colour</strong> - so the helper knows what to bring, and so we can fill it in next time. You can change it on every request.</li>
        <li><strong>Last 3 digits of your payment number</strong> - so you can recognise the payment. The full number is not stored.</li>
      </ul>
      <h2 className="mt">The map and your location</h2>
      <ul>
        <li>&quot;Use my location&quot; only runs when you press it, and your browser asks your permission first.</li>
        <li>Your exact position stays on your device. It is used to centre the map and pick the nearest area. Only the area <em>name</em> (for example &quot;Ntinda&quot;) is sent to us.</li>
        <li>Mechanics and drivers are shown near the centre of the area they work in, not at their real position.</li>
        <li>Map pictures are loaded from OpenStreetMap&apos;s tile servers. Like any website, they can see your internet address and which part of the map you are looking at. They receive no account details from us.</li>
      </ul>
      <h2 className="mt">Faces</h2>
      <ul>
        <li>Helper profile pictures are drawn illustrations. We do not collect or store photos of anyone.</li>
        <li>The photos around the site come from free photo libraries (Unsplash, Pexels, Pixabay) and a friend of the team. They only illustrate the service: the people in them are not our mechanics or drivers.</li>
      </ul>
      <h2 className="mt">What we never collect</h2>
      <ul>
        <li>Mobile money PINs, OTP codes or card numbers</li>
        <li>National ID numbers, photos or fingerprints</li>
        <li>Health or other sensitive personal information</li>
      </ul>
      <h2 className="mt">How we protect it</h2>
      <ul>
        <li>Passwords are stored as bcrypt hashes, never as plain text.</li>
        <li>Your login is kept in a secure, httpOnly cookie that expires after 8 hours.</li>
        <li>Each role only sees what it needs: mechanics and drivers see the jobs they take, not other customers&apos; history.</li>
        <li>The site is served over HTTPS when hosted, and important actions are written to an audit log.</li>
      </ul>
      <h2 className="mt">How long we keep it</h2>
      <ul>
        <li>Orders and payments: 2 years (for warranty, disputes and accounting).</li>
        <li>Audit logs: 12 months.</li>
        <li>Notifications: 90 days.</li>
        <li>You can ask for your account to be deleted. Past orders are then kept without your name.</li>
      </ul>
    </div>
  );
}
