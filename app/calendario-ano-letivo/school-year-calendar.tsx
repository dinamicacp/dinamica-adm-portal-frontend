"use client";

import { useEffect, useMemo, useState } from "react";
import PortalPage from "../components/portal-page";

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
const YEAR_OPTIONS = Array.from({ length: 101 }, (_, index) => 2000 + index);

const DAY_TYPES = {
  class: { label: "Dia de aula", className: "class-day" },
  holiday: { label: "Feriado", className: "holiday" },
  bridge: { label: "Emenda de feriado", className: "holiday-bridge" },
  recess: { label: "Recesso", className: "recess" },
} as const;

type DayType = keyof typeof DAY_TYPES;
type CalendarEntries = Record<string, DayType>;
type EditingMode = "paint" | "select";

function getStorageKey(year: number) {
  return `school-calendar:${year}`;
}

function getDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isDayType(value: unknown): value is DayType {
  return typeof value === "string" && value in DAY_TYPES;
}

function readStoredEntries(year: number): CalendarEntries {
  const storedValue = window.localStorage.getItem(getStorageKey(year));

  if (!storedValue) {
    return {};
  }

  const parsed: unknown = JSON.parse(storedValue);

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Os dados salvos do calendário possuem formato inválido.");
  }

  return Object.fromEntries(
    Object.entries(parsed).filter(
      ([date, type]) => date.startsWith(`${year}-`) && isDayType(type),
    ),
  );
}

function MonthCalendar({
  year,
  month,
  entries,
  selectedDates,
  onDayClick,
}: {
  year: number;
  month: number;
  entries: CalendarEntries;
  selectedDates: Set<string>;
  onDayClick: (date: string) => void;
}) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const numberOfDays = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: numberOfDays }, (_, index) => index + 1),
  ];

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return (
    <section className="calendar-month" aria-labelledby={`month-${month}`}>
      <h2 id={`month-${month}`}>{MONTHS[month]}</h2>
      <div className="calendar-weekdays" aria-hidden="true">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>
      <div className="calendar-days">
        {cells.map((day, index) => {
          if (day === null) {
            return <span className="calendar-day calendar-day--empty" key={`empty-${index}`} />;
          }

          const date = getDateKey(year, month, day);
          const dayType = entries[date];
          const isSelected = selectedDates.has(date);
          const isToday =
            today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === day;
          const label = `${day} de ${MONTHS[month]} de ${year}${
            dayType ? `, ${DAY_TYPES[dayType].label}` : ""
          }`;

          return (
            <button
              className={[
                "calendar-day",
                dayType ? DAY_TYPES[dayType].className : "",
                isSelected ? "calendar-day--selected" : "",
                isToday ? "calendar-day--today" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              type="button"
              key={date}
              onClick={() => onDayClick(date)}
              aria-label={label}
              aria-pressed={isSelected}
              title={dayType ? DAY_TYPES[dayType].label : "Sem marcação"}
            >
              {day}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function SchoolYearCalendar() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [entries, setEntries] = useState<CalendarEntries>({});
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [selectedType, setSelectedType] = useState<DayType>("class");
  const [editingMode, setEditingMode] = useState<EditingMode>("paint");
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setEntries(readStoredEntries(year));
      setStorageError(null);
    } catch (error) {
      setEntries({});
      setStorageError(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o calendário salvo neste navegador.",
      );
    }

    setSelectedDates(new Set());
  }, [year]);

  const totals = useMemo(
    () =>
      Object.keys(DAY_TYPES).reduce<Record<DayType, number>>(
        (result, type) => {
          result[type as DayType] = Object.values(entries).filter(
            (entryType) => entryType === type,
          ).length;
          return result;
        },
        { class: 0, holiday: 0, bridge: 0, recess: 0 },
      ),
    [entries],
  );

  const saveEntries = (nextEntries: CalendarEntries) => {
    setEntries(nextEntries);

    try {
      window.localStorage.setItem(getStorageKey(year), JSON.stringify(nextEntries));
      setStorageError(null);
    } catch {
      setStorageError("Não foi possível salvar o calendário neste navegador.");
    }
  };

  const handleDayClick = (date: string) => {
    if (editingMode === "select") {
      setSelectedDates((currentDates) => {
        const nextDates = new Set(currentDates);

        if (nextDates.has(date)) {
          nextDates.delete(date);
        } else {
          nextDates.add(date);
        }

        return nextDates;
      });
      return;
    }

    const nextEntries = { ...entries };

    if (nextEntries[date] === selectedType) {
      delete nextEntries[date];
    } else {
      nextEntries[date] = selectedType;
    }

    saveEntries(nextEntries);
  };

  const applyTypeToSelection = () => {
    if (selectedDates.size === 0) {
      return;
    }

    const nextEntries = { ...entries };
    selectedDates.forEach((date) => {
      nextEntries[date] = selectedType;
    });
    saveEntries(nextEntries);
    setSelectedDates(new Set());
  };

  const clearSelectedDates = () => {
    if (selectedDates.size === 0) {
      return;
    }

    const nextEntries = { ...entries };
    selectedDates.forEach((date) => {
      delete nextEntries[date];
    });
    saveEntries(nextEntries);
    setSelectedDates(new Set());
  };

  const clearYear = () => {
    if (
      Object.keys(entries).length === 0 ||
      !window.confirm(`Remover todas as marcações do calendário de ${year}?`)
    ) {
      return;
    }

    saveEntries({});
    setSelectedDates(new Set());
  };

  return (
    <PortalPage
      className="calendar-card"
      eyebrow="Gestão acadêmica"
      title="Calendário do ano letivo"
      description="Visualize e classifique todos os dias do ano em uma única tela."
      actions={
        <div className="calendar-year-control" aria-label="Selecionar ano">
          <button type="button" onClick={() => setYear((value) => value - 1)} aria-label="Ano anterior">
            −
          </button>
          <label>
            <span>Ano</span>
            <select
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            >
              {YEAR_OPTIONS.map((yearOption) => (
                <option value={yearOption} key={yearOption}>
                  {yearOption}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => setYear((value) => value + 1)} aria-label="Próximo ano">
            +
          </button>
        </div>
      }
      footer={
        <>
          <p>As marcações são salvas automaticamente neste navegador.</p>
          <button type="button" onClick={clearYear} disabled={Object.keys(entries).length === 0}>
            Limpar calendário de {year}
          </button>
        </>
      }
    >
      <div className="calendar-toolbar">
        <div className="calendar-mode-switch" aria-label="Modo de edição">
          <button
            className={editingMode === "paint" ? "active" : ""}
            type="button"
            onClick={() => {
              setEditingMode("paint");
              setSelectedDates(new Set());
            }}
            aria-pressed={editingMode === "paint"}
          >
            Marcação individual
          </button>
          <button
            className={editingMode === "select" ? "active" : ""}
            type="button"
            onClick={() => setEditingMode("select")}
            aria-pressed={editingMode === "select"}
          >
            Seleção múltipla
          </button>
        </div>

        <div className="calendar-categories" aria-label="Tipo de dia">
          {(Object.entries(DAY_TYPES) as [DayType, (typeof DAY_TYPES)[DayType]][]).map(
            ([type, details]) => (
              <button
                className={`${details.className}${selectedType === type ? " active" : ""}`}
                type="button"
                key={type}
                onClick={() => setSelectedType(type)}
                aria-pressed={selectedType === type}
              >
                <span className="calendar-category-dot" />
                {details.label}
                <strong>{totals[type]}</strong>
              </button>
            ),
          )}
        </div>

        <p className="calendar-instructions">
          {editingMode === "paint"
            ? `Clique em um dia para marcar como “${DAY_TYPES[selectedType].label}”. Clique novamente para remover.`
            : "Selecione vários dias e use as ações abaixo para marcá-los de uma só vez."}
        </p>

        {editingMode === "select" ? (
          <div className="calendar-selection-actions">
            <span>{selectedDates.size} dia(s) selecionado(s)</span>
            <button type="button" onClick={applyTypeToSelection} disabled={selectedDates.size === 0}>
              Aplicar {DAY_TYPES[selectedType].label}
            </button>
            <button
              className="secondary"
              type="button"
              onClick={clearSelectedDates}
              disabled={selectedDates.size === 0}
            >
              Remover marcações
            </button>
            <button
              className="secondary"
              type="button"
              onClick={() => setSelectedDates(new Set())}
              disabled={selectedDates.size === 0}
            >
              Cancelar seleção
            </button>
          </div>
        ) : null}

        {storageError ? <p className="calendar-storage-error" role="alert">{storageError}</p> : null}
      </div>

      <div className="calendar-year-grid">
        {MONTHS.map((month, monthIndex) => (
          <MonthCalendar
            key={month}
            year={year}
            month={monthIndex}
            entries={entries}
            selectedDates={selectedDates}
            onDayClick={handleDayClick}
          />
        ))}
      </div>
    </PortalPage>
  );
}
