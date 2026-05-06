/**
 * Roster of Coral's active trainees — used by the bulk-create-trainees admin
 * action to provision/repair all of them at once with the credentials we
 * already emailed them.
 */

export interface Trainee {
  name:     string;
  email:    string;
  password: string;
  gender:   "f" | "m";
}

// Email + password match what we sent in the welcome emails.
// Emails are stored lowercased in the DB so we lowercase here too.
// Gender drives the welcome email tone (ברוכה / ברוך, מלאי / מלא, etc.).
export const TRAINEES: Trainee[] = [
  { name: "רחלי זארי",      email: "racheli280296@gmail.com",   password: "RachKoral2026!",   gender: "f" },
  { name: "יונתן אבירם",    email: "mr.aviram@gmail.com",        password: "YoniKoral2026!",   gender: "m" },
  { name: "דנית הרוש",      email: "danit2harush@gmail.com",     password: "DanitKoral2026!",  gender: "f" },
  { name: "אילת אברהם",     email: "ayeletavraham757@gmail.com", password: "AyeletKoral2026!", gender: "f" },
  { name: "ירון זוהר",      email: "yaron@zoharproperties.com",  password: "YaronKoral2026!",  gender: "m" },
  { name: "גילה סיגלוב",    email: "gilasigalov@gmail.com",      password: "GilaKoral2026!",   gender: "f" },
  { name: "מאיר כץ",        email: "katz1.meir1@gmail.com",      password: "MeirKoral2026!",   gender: "m" },
  { name: "תום יערי",       email: "tomyaari135@gmail.com",      password: "TomKoral2026!",    gender: "f" },
  { name: "דנה אברהם",      email: "danasuday@gmail.com",        password: "DanaKoral2026!",   gender: "f" },
  { name: "אלמוג שחר",      email: "almogsh10@gmail.com",        password: "AlmogKoral2026!",  gender: "f" },
  { name: "רוני רזייב",     email: "280rasrza1@gmail.com",       password: "RoniKoral2026!",   gender: "f" },
];
