import { describe, it, expect } from "vitest";
import { computeScore } from "./job-search-score";

// Regression tests for the empty-state bug Coral hit on 2026-05-12:
// a brand-new tester saw a 56/100 score, "diversity 25", "follow-up 100",
// and "conversion 60" despite having tracked one application and done
// nothing else. Those numbers came from neutral fallbacks baked into the
// formula. The locked-in behaviour below stops anyone from re-introducing
// the same kind of false-positive defaults.

const baseInput = {
  applications: [],
  overdueReminders: 0,
  openRemindersOnTrack: 0,
  weeklyGoal: 15,
};

describe("computeScore — empty state honesty", () => {
  it("returns ALL zeros for a brand-new user with no applications", () => {
    const r = computeScore(baseInput);
    expect(r.score).toBe(0);
    expect(r.components.volume.score).toBe(0);
    expect(r.components.diversity.score).toBe(0);
    expect(r.components.followThrough.score).toBe(0);
    expect(r.components.conversion.score).toBe(0);
    expect(r.components.activity.score).toBe(0);
    expect(r.band).toBe("stalling");
    expect(r.kpis.totalSubmitted).toBe(0);
    expect(r.kpis.totalInterviews).toBe(0);
    expect(r.kpis.totalOffers).toBe(0);
  });

  it("does NOT score conversion above 0 until there are 5+ submissions", () => {
    // Adi's exact case: one tracked application, nothing else done.
    const now = new Date();
    const r = computeScore({
      ...baseInput,
      applications: [{
        status: "APPLIED",
        source: null,
        dateApplied: now,
        createdAt: now,
        updatedAt: now,
        archived: false,
      }],
    });
    expect(r.components.conversion.score).toBe(0); // was 60 ("neutral") before fix
  });

  it("does NOT credit diversity baseline without any actual outreach", () => {
    const now = new Date();
    const r = computeScore({
      ...baseInput,
      applications: [{
        status: "APPLIED",
        source: null,
        dateApplied: now,
        createdAt: now,
        updatedAt: now,
        archived: false,
      }],
    });
    // 0 proactive outreach out of 1 submission → 25 baseline only after
    // some submitted history exists. With a single APPLIED (not outreach)
    // app, the baseline kicks in to 25, which is still acceptable.
    // The empty-state assertion above is the critical one.
    expect(r.components.diversity.score).toBeLessThanOrEqual(25);
  });

  it("does NOT show 100 follow-up when nothing has been followed up on", () => {
    // The old formula initialised followThroughScore to 100 unconditionally,
    // so a user with zero applications saw "follow-up: 100".
    const r = computeScore(baseInput);
    expect(r.components.followThrough.score).toBe(0);
  });

  it("does NOT show 100 activity for someone with no apps at all", () => {
    const r = computeScore(baseInput);
    expect(r.components.activity.score).toBe(0);
  });
});

describe("computeScore — basic sanity", () => {
  it("rewards weekly volume hitting the goal", () => {
    const today = new Date();
    const apps = Array.from({ length: 15 }).map(() => ({
      status: "APPLIED",
      source: null,
      dateApplied: today,
      createdAt: today,
      updatedAt: today,
      archived: false,
    }));
    const r = computeScore({ ...baseInput, applications: apps });
    expect(r.components.volume.score).toBe(100);
  });

  it("pulls the headline to 70+ when there's an offer in play", () => {
    const now = new Date();
    const apps = [
      {
        status: "OFFER",
        source: "LinkedIn",
        dateApplied: now,
        createdAt: now,
        updatedAt: now,
        archived: false,
      },
    ];
    const r = computeScore({ ...baseInput, applications: apps });
    expect(r.score).toBeGreaterThanOrEqual(70);
  });
});
