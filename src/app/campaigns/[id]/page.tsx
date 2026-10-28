import { redirect } from "next/navigation";

// No campaign detail view yet — campaigns are managed from the list page
export default function CampaignPage() {
  redirect("/campaigns");
}
