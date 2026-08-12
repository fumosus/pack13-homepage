(() => {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector("#site-nav");
  const form = document.querySelector(".contact-form");
  const eventsList = document.querySelector("#events-list");
  const PACK_EMAIL = "info@cubscoutpack13.com";

  if (toggle && nav) {
    const setOpen = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      nav.classList.toggle("is-open", open);
    };

    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      setOpen(open);
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setOpen(false));
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setOpen(false);
    });
  }

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = form.querySelector("#name")?.value.trim() || "";
      const email = form.querySelector("#email")?.value.trim() || "";
      const grade = form.querySelector("#child-grade")?.value.trim() || "";
      const message = form.querySelector("#message")?.value.trim() || "";

      const subject = name
        ? `Pack 13 question from ${name}`
        : "Pack 13 website question";
      const lines = [
        message,
        "",
        name ? `Name: ${name}` : "",
        email ? `Email: ${email}` : "",
        grade ? `Child’s grade: ${grade}` : "",
      ].filter(Boolean);

      const mailto = `mailto:${PACK_EMAIL}?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(lines.join("\n"))}`;
      window.location.href = mailto;
    });
  }

  if (eventsList) {
    loadEvents(eventsList);
  }
})();

/**
 * Loads public event fields only (title, date/time, location, Scoutbook URL).
 * Data comes from events.json (refreshed via scripts/fetch-calendar.py).
 */
async function loadEvents(container) {
  const limit = Number(container.dataset.limit || 8);

  try {
    const response = await fetch("events.json", { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`Could not load events (${response.status})`);
    }

    const data = await response.json();
    const timezone = data.timezone || "America/Chicago";
    const now = Date.now() - 2 * 60 * 60 * 1000; // keep in-progress events briefly

    const upcoming = (data.events || [])
      .filter((event) => {
        const start = Date.parse(event.start);
        return Number.isFinite(start) && start >= now;
      })
      .slice(0, limit);

    if (upcoming.length === 0) {
      container.innerHTML =
        '<p class="events-status">No upcoming events listed right now. Check back soon, or open Scoutbook Plus for the full calendar.</p>';
      return;
    }

    container.replaceChildren(
      ...upcoming.map((event) => renderEventCard(event, timezone))
    );
  } catch (error) {
    console.error(error);
    container.innerHTML =
      '<p class="events-status is-error">Events could not be loaded. Please try again later, or visit Scoutbook Plus for the calendar.</p>';
  }
}

function renderEventCard(event, timezone) {
  const start = new Date(event.start);
  const end = event.end ? new Date(event.end) : null;

  const month = formatInZone(start, timezone, { month: "short" });
  const day = formatInZone(start, timezone, { day: "numeric" });
  const weekday = formatInZone(start, timezone, { weekday: "short" });
  const timeLabel = formatTimeRange(start, end, timezone);
  const location = event.location || "Location in Scoutbook Plus";
  const url =
    event.url ||
    (event.id
      ? `https://advancements.scouting.org/calendar/event/${event.id}`
      : "https://advancements.scouting.org/calendar");

  const card = document.createElement("a");
  card.className = "event-card";
  card.href = url;
  card.target = "_blank";
  card.rel = "noopener noreferrer";
  card.setAttribute(
    "aria-label",
    `${event.title}. ${weekday} ${month} ${day}, ${timeLabel}. ${location}. Opens Scoutbook Plus.`
  );

  card.innerHTML = `
    <div class="event-date" aria-hidden="true">
      <span class="month">${escapeHtml(month)}</span>
      <span class="day">${escapeHtml(day)}</span>
      <span class="weekday">${escapeHtml(weekday)}</span>
    </div>
    <div class="event-body">
      <h3>${escapeHtml(event.title || "Pack event")}</h3>
      <p class="event-meta">
        <span class="time">${escapeHtml(timeLabel)}</span>
        <span class="location">${escapeHtml(location)}</span>
      </p>
    </div>
    <span class="event-cta">Details →</span>
  `;

  return card;
}

function formatInZone(date, timeZone, options) {
  return new Intl.DateTimeFormat("en-US", { timeZone, ...options }).format(date);
}

function formatTimeRange(start, end, timeZone) {
  const timeOpts = {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  };

  const startLabel = new Intl.DateTimeFormat("en-US", timeOpts).format(start);
  if (!end) {
    return startLabel;
  }

  // Multi-day / overnight: show date on end if calendar day differs in CT
  const startDay = formatInZone(start, timeZone, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const endDay = formatInZone(end, timeZone, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });

  const endLabel = new Intl.DateTimeFormat("en-US", timeOpts).format(end);
  if (startDay === endDay) {
    return `${startLabel} – ${endLabel} CT`;
  }

  const endDateLabel = formatInZone(end, timeZone, {
    month: "short",
    day: "numeric",
  });
  return `${startLabel} – ${endDateLabel} ${endLabel} CT`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
