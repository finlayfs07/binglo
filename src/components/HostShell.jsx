// The wide layout for host screens, which are usually projected on a laptop.
// Players' screens use the phone-width AppShell instead.
function HostShell({ children }) {
  return (
    <main className="min-h-dvh bg-navy px-8 py-10">
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-6xl flex-col">
        {children}
      </div>
    </main>
  )
}

export default HostShell
