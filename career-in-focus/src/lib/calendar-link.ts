/**
 * Build calendar URLs for "Add to calendar" buttons.
 * - Google Calendar: deep-link via google.com/calendar/render
 * - Apple Calendar / generic ICS download
 * - Outlook (Office 365 web)
 *
 * All three share the same input shape so the UI can render three
 * buttons from one event row.
 */

export interface CalendarEvent {
  title:       string;
  description: string;
  location:    string;
  startAt:     Date;
  endAt?:      Date;
}

function fmtUtc(d: Date): string {
  // YYYYMMDDTHHmmssZ — the format Google + ICS both accept.
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) + "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) + "Z"
  );
}

function endOrPlusHour(ev: CalendarEvent): Date {
  return ev.endAt ?? new Date(ev.startAt.getTime() + 60 * 60 * 1000);
}

export function googleCalendarUrl(ev: CalendarEvent): string {
  const start = fmtUtc(ev.startAt);
  const end = fmtUtc(endOrPlusHour(ev));
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    details: ev.description,
    location: ev.location,
    dates: `${start}/${end}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function outlookCalendarUrl(ev: CalendarEvent): string {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: ev.title,
    body: ev.description,
    location: ev.location,
    startdt: ev.startAt.toISOString(),
    enddt: endOrPlusHour(ev).toISOString(),
  });
  return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Apple Calendar (and any other client that respects ICS) downloads
 * a .ics file with the event. Returned as a data URL so we don't need
 * a backend route — the browser downloads it directly.
 */
export function appleIcsDataUrl(ev: CalendarEvent): string {
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Career in Focus//Workshop//HE",
    "BEGIN:VEVENT",
    `UID:${ev.startAt.getTime()}@career-in-focus.co.il`,
    `DTSTAMP:${fmtUtc(new Date())}`,
    `DTSTART:${fmtUtc(ev.startAt)}`,
    `DTEND:${fmtUtc(endOrPlusHour(ev))}`,
    `SUMMARY:${escapeIcs(ev.title)}`,
    `DESCRIPTION:${escapeIcs(ev.description)}`,
    `LOCATION:${escapeIcs(ev.location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

function escapeIcs(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}
