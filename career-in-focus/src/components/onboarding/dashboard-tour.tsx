"use client";

// Shim — the old floating-tooltip tour was replaced by the new
// GuidedWalkthrough (bottom-right card + sidebar pulse ring). We keep
// these wrappers so the existing import sites + `?tour=1` query trigger
// stay backwards compatible without a wider refactor.

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { GuidedWalkthrough, WALKTHROUGH_KEY } from "./guided-walkthrough";

export const DASHBOARD_TOUR_KEY = WALKTHROUGH_KEY;

interface Props {
  /** when true, reset progress and start from step 0 */
  forceOpen?: boolean;
}

export function DashboardTour({ forceOpen }: Props) {
  return <GuidedWalkthrough forceOpen={forceOpen} />;
}

// Restart-tour link anywhere in the app: `/dashboard?tour=1`
export function DashboardTourWithQueryTrigger() {
  const search = useSearchParams();
  const fromQuery = search.get("tour") === "1";
  const [forced, setForced] = useState(false);

  useEffect(() => {
    if (fromQuery) setForced(true);
  }, [fromQuery]);

  return <DashboardTour forceOpen={forced} />;
}
