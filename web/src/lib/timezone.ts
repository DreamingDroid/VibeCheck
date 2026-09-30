export interface TimezoneOption {
  value: string;
  label: string;
  city: string;
}

export const COMMON_TIMEZONES: TimezoneOption[] = [
  { value: "Asia/Kolkata", label: "IST — India (UTC+5:30)", city: "India" },
  { value: "UTC", label: "UTC — Coordinated Universal Time (UTC+0:00)", city: "UTC" },
  { value: "Europe/London", label: "GMT / BST — London (UTC+0 / +1)", city: "London" },
  { value: "Europe/Amsterdam", label: "CET / CEST — Amsterdam, Berlin, Paris (UTC+1 / +2)", city: "Amsterdam" },
  { value: "America/New_York", label: "EST / EDT — New York, Toronto (UTC-5 / -4)", city: "New York" },
  { value: "America/Chicago", label: "CST / CDT — Chicago, Dallas (UTC-6 / -5)", city: "Chicago" },
  { value: "America/Denver", label: "MST / MDT — Denver, Phoenix (UTC-7 / -6)", city: "Denver" },
  { value: "America/Los_Angeles", label: "PST / PDT — San Francisco, LA (UTC-8 / -7)", city: "Los Angeles" },
  { value: "Asia/Dubai", label: "GST — Dubai, Abu Dhabi (UTC+4:00)", city: "Dubai" },
  { value: "Asia/Singapore", label: "SGT — Singapore, KL (UTC+8:00)", city: "Singapore" },
  { value: "Asia/Tokyo", label: "JST — Tokyo (UTC+9:00)", city: "Tokyo" },
  { value: "Australia/Sydney", label: "AEST / AEDT — Sydney, Melbourne (UTC+10 / +11)", city: "Sydney" },
];

/**
 * Detects the user's local browser/device timezone
 */
export function getUserTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) return tz;
  } catch {
    // Fallback if Intl is unavailable
  }
  return "Asia/Kolkata";
}

export interface WorldTimezone {
  value: string;
  label: string;
  region: string;
  city: string;
  offset: string;
  abbr: string;
}

let cachedWorldTimezones: WorldTimezone[] | null = null;

/**
 * Returns all 400+ standard IANA timezones in the world with offsets, cities, and abbreviations
 */
export function getAllWorldTimezones(): WorldTimezone[] {
  if (cachedWorldTimezones) return cachedWorldTimezones;

  const d = new Date();
  let rawList: string[] = [];
  try {
    if (typeof Intl !== "undefined" && typeof (Intl as any).supportedValuesOf === "function") {
      rawList = (Intl as any).supportedValuesOf("timeZone");
    }
  } catch {
    rawList = [];
  }

  if (!rawList || rawList.length === 0) {
    rawList = COMMON_TIMEZONES.map(t => t.value);
  }

  if (!rawList.includes("UTC")) {
    rawList.unshift("UTC");
  }

  cachedWorldTimezones = rawList.map(tz => {
    let offset = "";
    let abbr = "";
    try {
      const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" }).formatToParts(d);
      offset = parts.find(p => p.type === "timeZoneName")?.value || "";

      const abbrParts = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" }).formatToParts(d);
      abbr = abbrParts.find(p => p.type === "timeZoneName")?.value || "";
    } catch {
      offset = "GMT";
    }

    const formattedCity = tz.includes("/") ? tz.split("/").slice(1).join(" - ").replace(/_/g, " ") : tz;
    const region = tz.includes("/") ? tz.split("/")[0] : "Global";

    return {
      value: tz,
      label: `(${offset}) ${formattedCity}${abbr && abbr !== offset ? ` · ${abbr}` : ""}`,
      region,
      city: formattedCity,
      offset,
      abbr
    };
  });

  return cachedWorldTimezones;
}

/**
 * Returns timezone options enriched with the user's detected local timezone if not present
 */
export function getTimezoneOptions(): TimezoneOption[] {
  const userTz = getUserTimezone();
  const exists = COMMON_TIMEZONES.some(tz => tz.value === userTz);
  if (exists) return COMMON_TIMEZONES;

  const tzAbbr = getTimezoneAbbr(userTz);
  return [
    { value: userTz, label: `📍 Local Device Zone — ${userTz} (${tzAbbr})`, city: userTz.split("/")[1] || userTz },
    ...COMMON_TIMEZONES
  ];
}

/**
 * Returns a human-friendly short timezone abbreviation (e.g. "IST", "CEST", "EDT", "GMT+5:30")
 */
export function getTimezoneAbbr(timeZone: string = "Asia/Kolkata", dateInput?: Date | string): string {
  try {
    const date = dateInput ? new Date(dateInput) : new Date();
    if (isNaN(date.getTime())) return timeZone === "Asia/Kolkata" ? "IST" : timeZone;

    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone || "Asia/Kolkata",
      timeZoneName: "short",
    }).formatToParts(date);
    const part = parts.find((p) => p.type === "timeZoneName");
    if (part?.value) {
      // Clean up common long strings or keep standard abbreviation
      return part.value;
    }
  } catch {
    // Fallback if timezone string is invalid
  }
  return timeZone === "Asia/Kolkata" ? "IST" : timeZone;
}

/**
 * Formats start and end times in the specified event timezone
 */
export function formatEventTimeWithTimezone(
  dateTimeStr: string,
  endTimeStr?: string | null,
  timeZone: string = "Asia/Kolkata"
): {
  startTimeFormatted: string;
  endTimeFormatted: string | null;
  tzAbbr: string;
  timeRangeDisplay: string;
  localTimeNote: string | null;
} {
  const tz = timeZone || "Asia/Kolkata";
  const startDate = new Date(dateTimeStr);
  const isValidStart = !isNaN(startDate.getTime());

  if (!isValidStart) {
    return {
      startTimeFormatted: "",
      endTimeFormatted: null,
      tzAbbr: "IST",
      timeRangeDisplay: "",
      localTimeNote: null,
    };
  }

  const tzAbbr = getTimezoneAbbr(tz, startDate);

  const startFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const startTimeFormatted = startFormatter.format(startDate);

  let endTimeFormatted: string | null = null;
  if (endTimeStr) {
    const endDate = new Date(endTimeStr);
    if (!isNaN(endDate.getTime())) {
      const endFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      endTimeFormatted = endFormatter.format(endDate);
    }
  }

  const timeRangeDisplay = endTimeFormatted
    ? `${startTimeFormatted} → ${endTimeFormatted}`
    : startTimeFormatted;

  // Check if viewer's browser timezone differs from event timezone
  let localTimeNote: string | null = null;
  try {
    const userLocalTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (userLocalTz && userLocalTz !== tz) {
      const localStart = new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(startDate);

      const localTzAbbr = getTimezoneAbbr(userLocalTz, startDate);

      if (endTimeStr) {
        const endDate = new Date(endTimeStr);
        if (!isNaN(endDate.getTime())) {
          const localEnd = new Intl.DateTimeFormat("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }).format(endDate);
          localTimeNote = `${localStart} → ${localEnd} ${localTzAbbr} (Your Local Time)`;
        } else {
          localTimeNote = `${localStart} ${localTzAbbr} (Your Local Time)`;
        }
      } else {
        localTimeNote = `${localStart} ${localTzAbbr} (Your Local Time)`;
      }
    }
  } catch {
    // ignore
  }

  return {
    startTimeFormatted,
    endTimeFormatted,
    tzAbbr,
    timeRangeDisplay,
    localTimeNote,
  };
}
