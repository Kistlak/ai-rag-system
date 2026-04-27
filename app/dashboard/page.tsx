import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/db/server";
import { redirect } from "next/navigation";
import AssistantGrid from "./AssistantGrid";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const admin = createAdminSupabaseClient();
  const { data: assistants } = await admin
    .from("assistants")
    .select("id, name, slug, description, is_public, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  return <AssistantGrid assistants={assistants ?? []} />;
}
