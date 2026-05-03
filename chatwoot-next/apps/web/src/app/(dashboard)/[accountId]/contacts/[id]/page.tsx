// Single contact stub.
// Source parity: `app/javascript/dashboard/routes/dashboard/contacts/ContactsView.vue`.
export default async function ContactPage({
  params,
}: {
  params: Promise<{ accountId: string; id: string }>;
}) {
  const { id } = await params;
  return <div className="p-4">Contact #{id}</div>;
}
