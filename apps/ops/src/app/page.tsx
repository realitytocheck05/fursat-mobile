export default function StaffHome() {
  return (
    <main style={{ padding: 32, maxWidth: 720 }}>
      <h1>Fursat staff</h1>
      <p>The staff board (orders, calls, tables) is built in session C4. The owner console is session F1.</p>
      <p>API: <code>POST /api/table/join</code>, <code>POST /api/orders</code>, <code>GET /api/health</code></p>
    </main>
  );
}
