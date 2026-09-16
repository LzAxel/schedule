"use strict";

const data = window.SCHEDULE_DATA;
const DAY_NAMES = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];
const DAY_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const PERIODS = [null, ["08:00", "09:30"], ["09:40", "11:10"], ["11:20", "12:55"], ["13:05", "14:35"], ["14:45", "16:15"], ["16:30", "18:00"], ["18:10", "19:40"]];
const DAY_MS = 86400000;
const dateFormat = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", timeZone: "UTC" });
const monthFormat = new Intl.DateTimeFormat("ru-RU", { month: "long", timeZone: "UTC" });

function utcDate(value) {
  if (typeof value === "string") {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }
  return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
}

function mondayOf(date) {
  const weekday = date.getUTCDay() || 7;
  return new Date(date.getTime() - (weekday - 1) * DAY_MS);
}

function addDays(date, count) {
  return new Date(date.getTime() + count * DAY_MS);
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function weekParity(monday) {
  const firstMonday = mondayOf(utcDate(data.firstEvenWeek));
  const weeks = Math.round((monday - firstMonday) / (7 * DAY_MS));
  return Math.abs(weeks % 2) === 0 ? "even" : "odd";
}

function weekRange(monday) {
  const sunday = addDays(monday, 6);
  if (monday.getUTCMonth() === sunday.getUTCMonth()) {
    return `${monday.getUTCDate()}–${sunday.getUTCDate()} ${monthFormat.format(monday)}`;
  }
  return `${dateFormat.format(monday)} — ${dateFormat.format(sunday)}`;
}

function element(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content != null) node.textContent = content;
  return node;
}

function icon(name, className) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add(className);
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `icons.svg#${name}`);
  svg.append(use);
  return svg;
}

function appendLessonDetails(target, lesson) {
  target.append(element("strong", "lesson-subject", lesson.subject));
  const meta = element("div", "lesson-meta");
  meta.append(element("span", "lesson-type", lesson.type));
  meta.append(element("span", "lesson-teacher", lesson.teacher));
  target.append(meta);
  const location = element("div", "lesson-location");
  location.append(icon("location", "location-icon"));
  const place = `${lesson.room} · ${lesson.building}`;
  const fullAddress = data.buildings[lesson.building];
  location.append(element("span", "", fullAddress ? `${place} · ${fullAddress}` : place));
  target.append(location);
}

function renderVariant(week, lesson, active) {
  const variant = element("div", `lesson-variant ${active ? "is-active" : "is-inactive"}`);
  const label = week === "odd" ? "Нечётная · верхняя" : "Чётная · нижняя";
  variant.append(element("span", "variant-label", label));
  if (lesson) appendLessonDetails(variant, lesson);
  else variant.append(element("span", "empty-variant", "Пары нет"));
  return variant;
}

function renderLesson(slot, parity) {
  const [start, end] = PERIODS[slot.period];
  const split = Object.hasOwn(slot, "odd") || Object.hasOwn(slot, "even");
  const activeLesson = split ? slot[parity] : slot.every;
  const card = element("article", `lesson-card${split ? " is-split" : ""}${!activeLesson ? " no-lesson" : ""}`);
  const time = element("div", "lesson-time");
  time.append(element("span", "period-number", `${slot.period} пара`));
  time.append(element("strong", "start-time", start));
  time.append(element("span", "end-time", end));
  card.append(time);
  const content = element("div", "lesson-content");
  if (split) {
    content.append(renderVariant("odd", slot.odd, parity === "odd"));
    content.append(renderVariant("even", slot.even, parity === "even"));
  } else {
    appendLessonDetails(content, slot.every);
  }
  card.append(content);
  return card;
}

function renderDay(day, monday, parity, todayIso) {
  const date = addDays(monday, day - 1);
  const slots = data.lessons.filter(item => item.day === day).sort((a, b) => a.period - b.period);
  const isToday = isoDate(date) === todayIso;
  const section = element("section", `day-card${isToday ? " is-today" : ""}${slots.length === 0 ? " is-empty" : ""}`);
  section.id = `day-${day}`;
  section.setAttribute("aria-labelledby", `day-title-${day}`);
  const heading = element("div", "day-heading");
  const title = element("div", "day-title-wrap");
  title.append(element("span", "day-index", String(day).padStart(2, "0")));
  const titleText = element("div");
  const h3 = element("h3", "day-title", DAY_NAMES[day - 1]);
  h3.id = `day-title-${day}`;
  titleText.append(h3, element("span", "day-date", dateFormat.format(date)));
  title.append(titleText);
  heading.append(title);
  if (isToday) heading.append(element("span", "today-dot", "Сегодня"));
  section.append(heading);
  if (slots.length) {
    const list = element("div", "lesson-list");
    slots.forEach(slot => list.append(renderLesson(slot, parity)));
    section.append(list);
  } else {
    const empty = element("div", "day-off");
    empty.append(icon("day-off", "off-sun"));
    empty.append(element("strong", "", "День без пар"));
    empty.append(element("span", "", "Можно выдохнуть и строить планы."));
    section.append(empty);
  }
  return section;
}

const today = utcDate(new Date());
let selectedMonday = mondayOf(today);

function render() {
  const todayIso = isoDate(today);
  const parity = weekParity(selectedMonday);
  const isCurrentWeek = selectedMonday.getTime() === mondayOf(today).getTime();
  document.getElementById("week-range").textContent = weekRange(selectedMonday);
  document.getElementById("week-subtitle").textContent = `${selectedMonday.getUTCFullYear()} · ${isCurrentWeek ? "Текущая неделя" : "Выбранная неделя"}`;
  const badge = document.getElementById("week-badge");
  badge.textContent = parity === "even" ? "Чётная неделя" : "Нечётная неделя";
  badge.className = `week-badge ${parity}`;

  const grid = document.getElementById("days-grid");
  const nav = document.getElementById("day-nav");
  grid.replaceChildren();
  nav.replaceChildren();
  for (let day = 1; day <= 7; day++) {
    const date = addDays(selectedMonday, day - 1);
    const link = element("a", `day-link${isoDate(date) === todayIso ? " is-today" : ""}`, DAY_SHORT[day - 1]);
    link.href = `#day-${day}`;
    link.setAttribute("aria-label", `${DAY_NAMES[day - 1]}, ${dateFormat.format(date)}`);
    nav.append(link);
    grid.append(renderDay(day, selectedMonday, parity, todayIso));
  }
}

document.getElementById("previous-week").addEventListener("click", () => { selectedMonday = addDays(selectedMonday, -7); render(); });
document.getElementById("next-week").addEventListener("click", () => { selectedMonday = addDays(selectedMonday, 7); render(); });
document.getElementById("today-button").addEventListener("click", () => {
  selectedMonday = mondayOf(today);
  render();
  document.getElementById(`day-${today.getUTCDay() || 7}`).scrollIntoView({ behavior: "smooth", block: "start" });
});
render();
