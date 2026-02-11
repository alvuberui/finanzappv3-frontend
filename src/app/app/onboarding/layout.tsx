export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Este layout “separa” onboarding del gate.
  return <>{children}</>;
}
