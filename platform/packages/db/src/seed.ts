import { eq } from 'drizzle-orm';
import { createClient, type Database } from './client.js';
import {
  users,
  permissions,
  channels,
  conversations,
  conversationParticipants,
  messages,
  teams,
  teamMembers,
  labels,
  cannedResponses,
} from './schema/index.js';

/**
 * Seed the database with sample data for local development.
 * Idempotent: checks for existing records before inserting.
 */
export async function seed(db: Database) {
  // --- Users ---
  const existingAdmin = await db
    .select()
    .from(users)
    .where(eq(users.email, 'admin@buildpass.ai'))
    .limit(1);

  if (existingAdmin.length > 0) {
    console.log('Seed data already exists, skipping.');
    return;
  }

  // Admin user
  const [admin] = await db
    .insert(users)
    .values({
      type: 'human_agent',
      name: 'Admin User',
      email: 'admin@buildpass.ai',
      metadata: { department: 'support' },
    })
    .returning();
  const adminId = admin.id;

  // Bot user (Ron Swanson)
  const [bot] = await db
    .insert(users)
    .values({
      type: 'ai_agent',
      name: 'Ron Swanson',
      email: null,
      metadata: {
        model: 'claude-opus-4-7',
        capabilities: ['triage', 'draft', 'escalate'],
      },
    })
    .returning();
  const botId = bot.id;

  // Contacts
  const [contact1] = await db
    .insert(users)
    .values({
      type: 'contact',
      name: 'Alice Builder',
      email: 'alice@example.com',
      metadata: { company: 'Builder Co' },
    })
    .returning();
  const contact1Id = contact1.id;

  const [contact2] = await db
    .insert(users)
    .values({
      type: 'contact',
      name: 'Bob Certifier',
      email: 'bob@example.com',
      metadata: { company: 'Certify Ltd' },
    })
    .returning();
  const contact2Id = contact2.id;

  console.log('Seeded 4 users.');

  // --- Permissions ---
  await db.insert(permissions).values([
    { userId: adminId, role: 'admin', capabilities: ['assign', 'resolve', 'escalate', 'view_internal', 'manage_kb'] },
    { userId: botId, role: 'bot', capabilities: ['assign', 'resolve', 'escalate', 'view_internal'] },
  ]);
  console.log('Seeded permissions.');

  // --- Channels ---
  await db.insert(channels).values([
    {
      type: 'web_chat',
      name: 'Website Chat',
      config: { widgetColor: '#4F46E5' },
    },
    {
      type: 'email',
      name: 'Support Email',
      config: { fromAddress: 'support@buildpass.ai' },
    },
  ]);

  console.log('Seeded 2 channels.');

  // --- Conversations ---
  const [conv1] = await db
    .insert(conversations)
    .values({
      status: 'open',
      channelOrigin: 'web_chat',
      assigneeId: adminId,
      subject: 'Cannot upload compliance documents',
      priority: 'high',
    })
    .returning();

  const [conv2] = await db
    .insert(conversations)
    .values({
      status: 'resolved',
      channelOrigin: 'email',
      assigneeId: adminId,
      subject: 'How to add a new project',
      priority: 'low',
      resolvedAt: new Date(),
    })
    .returning();

  console.log('Seeded 2 conversations.');

  // --- Participants ---
  await db.insert(conversationParticipants).values([
    { conversationId: conv1.id, userId: contact1Id, role: 'contact' },
    { conversationId: conv1.id, userId: adminId, role: 'assignee' },
    { conversationId: conv1.id, userId: botId, role: 'copilot' },
    { conversationId: conv2.id, userId: contact2Id, role: 'contact' },
    { conversationId: conv2.id, userId: adminId, role: 'assignee' },
  ]);
  console.log('Seeded conversation participants.');

  // --- Messages ---
  await db.insert(messages).values([
    {
      conversationId: conv1.id,
      senderId: contact1Id,
      type: 'text',
      visibility: 'public',
      body: 'Hi, I\'m having trouble uploading my compliance documents. The upload keeps failing.',
    },
    {
      conversationId: conv1.id,
      senderId: botId,
      type: 'text',
      visibility: 'internal',
      body: 'Suggested response: Ask for browser/OS details and file size. Known issue with files > 25MB on Safari.',
      metadata: { confidence: 0.87, reasoning: 'Matched against known upload issues in KB' },
    },
    {
      conversationId: conv1.id,
      senderId: adminId,
      type: 'text',
      visibility: 'public',
      body: 'Hi Alice, sorry about that. Could you tell me which browser you\'re using and the file size? We have a known issue with large files on certain browsers.',
    },
    {
      conversationId: conv2.id,
      senderId: contact2Id,
      type: 'text',
      visibility: 'public',
      body: 'How do I add a new project to my account?',
    },
    {
      conversationId: conv2.id,
      senderId: adminId,
      type: 'text',
      visibility: 'public',
      body: 'Go to Dashboard > Projects > New Project. Let me know if you need any help!',
    },
  ]);
  console.log('Seeded messages.');

  // --- Team ---
  const [team] = await db
    .insert(teams)
    .values({ name: 'Support Team' })
    .returning();

  await db.insert(teamMembers).values([
    { teamId: team.id, userId: adminId, role: 'lead' },
    { teamId: team.id, userId: botId, role: 'member' },
  ]);
  console.log('Seeded 1 team with 2 members.');

  // --- Labels ---
  await db.insert(labels).values([
    { name: 'billing', color: '#EF4444' },
    { name: 'onboarding', color: '#3B82F6' },
    { name: 'bug', color: '#F97316' },
  ]);
  console.log('Seeded 3 labels.');

  // --- Canned Responses ---
  await db.insert(cannedResponses).values([
    {
      title: 'Greeting',
      body: 'Hi there! Thanks for reaching out to Buildpass support. How can I help you today?',
      createdBy: adminId,
    },
    {
      title: 'Closing',
      body: 'Is there anything else I can help you with? If not, I\'ll go ahead and resolve this conversation.',
      createdBy: adminId,
    },
  ]);
  console.log('Seeded 2 canned responses.');

  console.log('Seed complete.');
}

// Run directly via `tsx src/seed.ts`
if (process.argv[1]?.match(/\/seed\.[tj]s$/)) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL environment variable is required.');
    process.exit(1);
  }
  const db = createClient(url);
  seed(db).catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
