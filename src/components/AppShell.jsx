// The navy app column every page sits in. Fills the screen on phones,
// and shows the sea background on either side on wider screens.
function AppShell({ children }) {
  return (
    <main className="relative mx-auto flex min-h-dvh max-w-[440px] flex-col overflow-hidden bg-navy px-6">
      {children}
    </main>
  )
}

export default AppShell
