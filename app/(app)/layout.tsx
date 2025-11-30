export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Editor has its own header, so no app-level header needed */}
      {children}
    </>
  );
}
