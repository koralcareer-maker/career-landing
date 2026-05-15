import { LaunchKitClient } from "./launch-kit-client";

export const metadata = { title: "ערכת השקה | אדמין" };
export const dynamic = "force-dynamic";

/**
 * Launch Kit — operator-only page that holds every piece of campaign
 * copy I prepared for Coral's 500-paying-members push. Lives at
 * /admin/launch-kit so she can return to it any time, copy a template
 * to her clipboard, and paste it where it belongs (Meta, LinkedIn,
 * email, WhatsApp, etc.).
 *
 * Pure-content page. All the heavy lifting is in launch-kit-client,
 * which adds per-section copy buttons + collapsible navigation.
 */
export default function LaunchKitPage() {
  return <LaunchKitClient />;
}
