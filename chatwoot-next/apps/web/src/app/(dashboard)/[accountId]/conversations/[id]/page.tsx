// Single conversation stub.
// Source parity: `app/javascript/dashboard/routes/dashboard/conversation/ConversationBox.vue`.
export default async function ConversationPage({
  params,
}: {
  params: Promise<{ accountId: string; id: string }>;
}) {
  const { id } = await params;
  return <div className="p-4">Conversation #{id}</div>;
}
