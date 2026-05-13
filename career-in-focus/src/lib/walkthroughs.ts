/**
 * Per-screen Coral walkthrough configs.
 *
 * Each entry maps a route key to a video file/URL and a chapter list.
 * Each chapter is a (startSec, label, targetId) tuple — when the
 * video reaches startSec, the page element with the matching
 * data-walkthrough-id="..." gets a teal spotlight outline.
 *
 * Coral's workflow to add a walkthrough for a screen:
 *   1. Record one video walking through that screen end-to-end.
 *   2. Upload to Vercel Blob (or YouTube/Vimeo and use the embed URL).
 *      For Vercel Blob: put the file at /public/walkthroughs/<name>.mp4
 *      then reference it as "/walkthroughs/<name>.mp4" below.
 *   3. Note the timestamps where each new "step" begins.
 *   4. Tag the matching elements on the page with
 *      data-walkthrough-id="<id>" (see the dashboard for examples).
 *   5. Fill in the chapter list here.
 *
 * Set videoUrl to an empty string until the video is recorded — the
 * ScreenExplainer hides the "סיור עם קורל" button when no URL.
 */

import type { WalkthroughChapter } from "@/components/koral-walkthrough";

export interface ScreenWalkthrough {
  videoUrl: string;
  chapters: WalkthroughChapter[];
}

/** Empty config — used as the default until Coral records a video. */
export const EMPTY: ScreenWalkthrough = { videoUrl: "", chapters: [] };

/**
 * Dashboard walkthrough — placeholder until Coral records it.
 * The chapters / targetIds are pre-wired against existing
 * data-walkthrough-id attributes on the dashboard page; once the
 * video file lands at /walkthroughs/dashboard.mp4, swap videoUrl in
 * and the spotlights light up automatically.
 */
export const DASHBOARD: ScreenWalkthrough = {
  videoUrl: "", // e.g. "/walkthroughs/dashboard.mp4"
  chapters: [
    { startSec: 0,  label: "ברוכה הבאה — סקירה",          targetId: undefined },
    { startSec: 12, label: "לוח המשרות",                   targetId: "dashboard-jobs-cta" },
    { startSec: 28, label: "מאמנת ה-AI שלך",               targetId: "dashboard-coach-cta" },
  ],
};

export const PROFILE: ScreenWalkthrough = EMPTY;
export const JOBS: ScreenWalkthrough = EMPTY;
export const COACHING: ScreenWalkthrough = EMPTY;
export const PROGRESS: ScreenWalkthrough = EMPTY;
export const TOOLS: ScreenWalkthrough = EMPTY;
export const SKILLS: ScreenWalkthrough = EMPTY;
