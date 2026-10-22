export const metadata = {
  title: 'AngveyCore – Reliable Agent Trace & Context Hub',
  description: 'Stop silent AI agent failures. Track every step, persist context, and build reliable agents.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, padding: 0, background: '#0f172a', color: '#e2e8f0' }}>
        {children}
      </body>
    </html>
  );
}
