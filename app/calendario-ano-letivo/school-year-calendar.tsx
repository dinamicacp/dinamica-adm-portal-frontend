"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PortalPage from "../components/portal-page";
import { fetchWithAuth, SessionExpiredError } from "../dashboard/fetch-with-auth";

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
  SCHOOL_DAY: { label: "Dia de aula", className: "class-day" },
  HOLIDAY: { label: "Feriado", className: "holiday" },
  HOLIDAY_BRIDGE: { label: "Emenda de feriado", className: "holiday-bridge" },
  RECESS: { label: "Recesso", className: "recess" },
} as const;

type DayType = keyof typeof DAY_TYPES;
type CalendarEventType = Exclude<DayType, "SCHOOL_DAY">;
type EditingMode = "paint" | "select";

type AcademicCalendarDay = {
  date: string;
  type: DayType;
  description: string | null;
};

type AcademicCalendarSummary = {
  totalDays: number;
  schoolDays: number;
  holidays: number;
  holidayBridges: number;
  recesses: number;
};

type AcademicCalendarYear = {
  year: number;
  days: AcademicCalendarDay[];
  summary: AcademicCalendarSummary;
};

type CalendarApiResponse = {
  success: boolean;
  data?: AcademicCalendarYear;
  error?: string;
  message?: string;
};

type Feedback = {
  type: "success" | "error";
  message: string;
};

type CalendarCacheEntry = {
  calendar: AcademicCalendarYear;
  updatedAt: string;
};

const EMPTY_SUMMARY: AcademicCalendarSummary = {
  totalDays: 0,
  schoolDays: 0,
  holidays: 0,
  holidayBridges: 0,
  recesses: 0,
};

function getDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getCacheKey(year: number) {
  return `academic-calendar-cache:${year}`;
}

function isDayType(value: unknown): value is DayType {
  return typeof value === "string" && value in DAY_TYPES;
}

function isCalendarYear(value: unknown, expectedYear: number): value is AcademicCalendarYear {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const calendar = value as Partial<AcademicCalendarYear>;
  return (
    calendar.year === expectedYear &&
    Array.isArray(calendar.days) &&
    calendar.days.every(
      (day) =>
        typeof day === "object" &&
        day !== null &&
        typeof day.date === "string" &&
        isDayType(day.type),
    ) &&
    typeof calendar.summary === "object" &&
    calendar.summary !== null
  );
}

function readCalendarCache(year: number): CalendarCacheEntry | null {
  const storedValue = window.localStorage.getItem(getCacheKey(year));

  if (!storedValue) {
    return null;
  }

  const parsed: unknown = JSON.parse(storedValue);
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("O cache do calendário possui formato inválido.");
  }

  const cacheEntry = parsed as Partial<CalendarCacheEntry>;
  if (
    !isCalendarYear(cacheEntry.calendar, year) ||
    typeof cacheEntry.updatedAt !== "string" ||
    Number.isNaN(Date.parse(cacheEntry.updatedAt))
  ) {
    throw new Error("O cache do calendário possui dados inválidos.");
  }

  return {
    calendar: cacheEntry.calendar,
    updatedAt: cacheEntry.updatedAt,
  };
}

function writeCalendarCache(entry: CalendarCacheEntry) {
  window.localStorage.setItem(getCacheKey(entry.calendar.year), JSON.stringify(entry));
}

function formatUpdatedAt(value: string | null) {
  if (!value) {
    return "Ainda não atualizado";
  }

  return `Atualizado em ${new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))}`;
}

async function readApiError(response: Response): Promise<string> {
  const payload: unknown = await response.json().catch(() => null);

  if (typeof payload === "object" && payload !== null) {
    const body = payload as Record<string, unknown>;
    if (typeof body.error === "string" && body.error.trim()) {
      return body.error;
    }
    if (typeof body.message === "string" && body.message.trim()) {
      return body.message;
    }
  }

  return `A API do calendário retornou o status ${response.status}.`;
}

function MonthCalendar({
  year,
  month,
  entries,
  selectedDates,
  disabled,
  onDayClick,
}: {
  year: number;
  month: number;
  entries: Map<string, AcademicCalendarDay>;
  selectedDates: Set<string>;
  disabled: boolean;
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
          const entry = entries.get(date);
          const dayType = entry?.type ?? "SCHOOL_DAY";
          const isSelected = selectedDates.has(date);
          const isToday =
            today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === day;
          const description = entry?.description ? `, ${entry.description}` : "";

          return (
            <button
              className={[
                "calendar-day",
                DAY_TYPES[dayType].className,
                isSelected ? "calendar-day--selected" : "",
                isToday ? "calendar-day--today" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              type="button"
              key={date}
              onClick={() => onDayClick(date)}
              aria-label={`${day} de ${MONTHS[month]} de ${year}, ${DAY_TYPES[dayType].label}${description}`}
              aria-pressed={isSelected}
              title={`${DAY_TYPES[dayType].label}${description}`}
              disabled={disabled}
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
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [calendar, setCalendar] = useState<AcademicCalendarYear | null>(null);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [selectedType, setSelectedType] = useState<DayType>("HOLIDAY");
  const [editingMode, setEditingMode] = useState<EditingMode>("paint");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const handleRequestError = useCallback(
    (error: unknown, fallbackMessage: string) => {
      if (error instanceof SessionExpiredError) {
        router.push("/login");
        return;
      }

      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : fallbackMessage,
      });
    },
    [router],
  );

  const loadCalendar = useCallback(
    async (targetYear: number, signal?: AbortSignal, preserveCurrentCalendar = false) => {
      setIsLoading(!preserveCurrentCalendar);
      setIsRefreshing(preserveCurrentCalendar);
      setFeedback(null);

      try {
        const response = await fetchWithAuth(`/api/academic-calendar?year=${targetYear}`, {
          cache: "no-store",
          signal,
        });

        if (!response.ok) {
          throw new Error(await readApiError(response));
        }

        const payload: CalendarApiResponse = await response.json();
        if (!payload.success || !isCalendarYear(payload.data, targetYear)) {
          throw new Error("A API retornou um calendário em formato inesperado.");
        }

        const refreshedAt = new Date().toISOString();
        setCalendar(payload.data);
        setUpdatedAt(refreshedAt);

        try {
          writeCalendarCache({ calendar: payload.data, updatedAt: refreshedAt });
        } catch {
          setFeedback({
            type: "error",
            message: "Calendário atualizado, mas não foi possível salvar o cache neste navegador.",
          });
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        if (!preserveCurrentCalendar) {
          setCalendar(null);
          setUpdatedAt(null);
        }
        handleRequestError(error, "Não foi possível carregar o calendário.");
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [handleRequestError],
  );

  useEffect(() => {
    const controller = new AbortController();
    setSelectedDates(new Set());
    let cachedCalendar: CalendarCacheEntry | null = null;

    try {
      cachedCalendar = readCalendarCache(year);
      setCalendar(cachedCalendar?.calendar ?? null);
      setUpdatedAt(cachedCalendar?.updatedAt ?? null);
    } catch {
      setCalendar(null);
      setUpdatedAt(null);
      setFeedback({
        type: "error",
        message: "O cache deste ano estava inválido e será atualizado pela API.",
      });
      window.localStorage.removeItem(getCacheKey(year));
    }

    void loadCalendar(year, controller.signal, cachedCalendar !== null);
    return () => controller.abort();
  }, [loadCalendar, year]);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timeout = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const entries = useMemo(
    () => new Map((calendar?.days ?? []).map((day) => [day.date, day])),
    [calendar],
  );
  const summary = calendar?.summary ?? EMPTY_SUMMARY;
  const totals: Record<DayType, number> = {
    SCHOOL_DAY: summary.schoolDays,
    HOLIDAY: summary.holidays,
    HOLIDAY_BRIDGE: summary.holidayBridges,
    RECESS: summary.recesses,
  };

  const updateDates = async (dates: string[], type: DayType, successMessage: string) => {
    if (dates.length === 0) {
      return false;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      const response = await fetchWithAuth("/api/academic-calendar", {
        method: type === "SCHOOL_DAY" ? "DELETE" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          type === "SCHOOL_DAY"
            ? { dates }
            : { dates, type: type satisfies CalendarEventType },
        ),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      await loadCalendar(year, undefined, true);
      setFeedback({ type: "success", message: successMessage });
      return true;
    } catch (error) {
      handleRequestError(error, "Não foi possível salvar as alterações.");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDayClick = (date: string) => {
    if (!isEditing) {
      return;
    }

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

    const currentType = entries.get(date)?.type ?? "SCHOOL_DAY";
    const nextType = currentType === selectedType ? "SCHOOL_DAY" : selectedType;
    void updateDates([date], nextType, "Calendário atualizado com sucesso.");
  };

  const applyTypeToSelection = async () => {
    const updated = await updateDates(
      [...selectedDates],
      selectedType,
      `${selectedDates.size} dia(s) atualizado(s) com sucesso.`,
    );
    if (updated) {
      setSelectedDates(new Set());
    }
  };

  const restoreSelectedDates = async () => {
    const updated = await updateDates(
      [...selectedDates],
      "SCHOOL_DAY",
      `${selectedDates.size} dia(s) restaurado(s) como dia de aula.`,
    );
    if (updated) {
      setSelectedDates(new Set());
    }
  };

  const clearYear = async () => {
    const exceptionDates = (calendar?.days ?? [])
      .filter((day) => day.type !== "SCHOOL_DAY")
      .map((day) => day.date);

    if (
      exceptionDates.length === 0 ||
      !window.confirm(`Restaurar todas as exceções de ${year} como dias de aula?`)
    ) {
      return;
    }

    const updated = await updateDates(
      exceptionDates,
      "SCHOOL_DAY",
      `Calendário de ${year} restaurado com sucesso.`,
    );
    if (updated) {
      setSelectedDates(new Set());
    }
  };

  return (
    <PortalPage
      className="calendar-card"
      eyebrow="Gestão acadêmica"
      title="Calendário do ano letivo"
      description="Visualize e classifique todos os dias do ano em uma única tela."
      actions={
        <div className="calendar-header-actions">
          <div className="calendar-sync-control">
            <span>{formatUpdatedAt(updatedAt)}</span>
            <button
              className={isRefreshing ? "refreshing" : ""}
              type="button"
              onClick={() => void loadCalendar(year, undefined, calendar !== null)}
              disabled={isLoading || isRefreshing || isSaving}
              aria-label={isRefreshing ? "Atualizando calendário" : "Atualizar calendário"}
              title={isRefreshing ? "Atualizando calendário..." : "Atualizar calendário"}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20 6v5h-5M4 18v-5h5M6.1 9a7 7 0 0 1 11.3-2.6L20 9M4 15l2.6 2.6A7 7 0 0 0 17.9 15" />
              </svg>
            </button>
          </div>
          <div className="calendar-year-control" aria-label="Selecionar ano">
            <button
              type="button"
              onClick={() => setYear((value) => Math.max(2000, value - 1))}
              aria-label="Ano anterior"
              disabled={isLoading || isRefreshing || isSaving || year === 2000}
            >
              −
            </button>
            <label>
              <span>Ano</span>
              <select
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                disabled={isLoading || isRefreshing || isSaving}
              >
                {YEAR_OPTIONS.map((yearOption) => (
                  <option value={yearOption} key={yearOption}>
                    {yearOption}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => setYear((value) => Math.min(2100, value + 1))}
              aria-label="Próximo ano"
              disabled={isLoading || isRefreshing || isSaving || year === 2100}
            >
              +
            </button>
          </div>
          <button
            className={`calendar-edit-button${isEditing ? " active" : ""}`}
            type="button"
            onClick={() => {
              setIsEditing((currentValue) => !currentValue);
              setEditingMode("paint");
              setSelectedDates(new Set());
            }}
            disabled={isLoading || isRefreshing || isSaving || !calendar}
            aria-pressed={isEditing}
          >
            {isEditing ? "Concluir edição" : "Editar calendário"}
          </button>
        </div>
      }
      footer={
        <>
          <p>
            {isEditing
              ? "As alterações são salvas na API e compartilhadas com os demais usuários."
              : "Calendário em modo de visualização. Use “Editar calendário” para fazer alterações."}
          </p>
          {isEditing ? (
            <button
              type="button"
              onClick={() => void clearYear()}
              disabled={isLoading || isSaving || summary.totalDays === summary.schoolDays}
            >
              Restaurar calendário de {year}
            </button>
          ) : null}
        </>
      }
    >
      <div className={`calendar-toolbar${isEditing ? " calendar-toolbar--editing" : ""}`}>
        {isEditing ? (
          <div className="calendar-mode-switch" aria-label="Modo de edição">
            <button
              className={editingMode === "paint" ? "active" : ""}
              type="button"
              onClick={() => {
                setEditingMode("paint");
                setSelectedDates(new Set());
              }}
              aria-pressed={editingMode === "paint"}
              disabled={isLoading || isSaving}
            >
              Marcação individual
            </button>
            <button
              className={editingMode === "select" ? "active" : ""}
              type="button"
              onClick={() => setEditingMode("select")}
              aria-pressed={editingMode === "select"}
              disabled={isLoading || isSaving}
            >
              Seleção múltipla
            </button>
          </div>
        ) : null}

        <div className="calendar-categories" aria-label={isEditing ? "Tipo de dia" : "Legenda do calendário"}>
          {(Object.entries(DAY_TYPES) as [DayType, (typeof DAY_TYPES)[DayType]][]).map(
            ([type, details]) => isEditing ? (
              <button
                className={`${details.className}${selectedType === type ? " active" : ""}`}
                type="button"
                key={type}
                onClick={() => setSelectedType(type)}
                aria-pressed={selectedType === type}
                disabled={isLoading || isSaving}
              >
                <span className="calendar-category-dot" />
                {details.label}
                <strong>{totals[type]}</strong>
              </button>
            ) : (
              <span className={`calendar-category-legend ${details.className}`} key={type}>
                <span className="calendar-category-dot" />
                {details.label}
                <strong>{totals[type]}</strong>
              </span>
            ),
          )}
        </div>

        {isEditing ? (
          <p className="calendar-instructions">
            {editingMode === "paint"
              ? `Clique em um dia para marcar como “${DAY_TYPES[selectedType].label}”.`
              : "Selecione vários dias e use as ações abaixo para classificá-los de uma só vez."}
          </p>
        ) : null}

        {isEditing && editingMode === "select" ? (
          <div className="calendar-selection-actions">
            <span>{selectedDates.size} dia(s) selecionado(s)</span>
            <button
              type="button"
              onClick={() => void applyTypeToSelection()}
              disabled={selectedDates.size === 0 || isSaving}
            >
              Aplicar {DAY_TYPES[selectedType].label}
            </button>
            <button
              className="secondary"
              type="button"
              onClick={() => void restoreSelectedDates()}
              disabled={selectedDates.size === 0 || isSaving}
            >
              Restaurar como dias de aula
            </button>
            <button
              className="secondary"
              type="button"
              onClick={() => setSelectedDates(new Set())}
              disabled={selectedDates.size === 0 || isSaving}
            >
              Cancelar seleção
            </button>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div className="calendar-loading" role="status">
          <span className="dashboard-blocking-spinner" />
          Carregando calendário de {year}...
        </div>
      ) : calendar ? (
        <div className="calendar-year-grid" aria-busy={isSaving}>
          {MONTHS.map((month, monthIndex) => (
            <MonthCalendar
              key={month}
              year={year}
              month={monthIndex}
              entries={entries}
              selectedDates={selectedDates}
              disabled={!isEditing || isSaving}
              onDayClick={handleDayClick}
            />
          ))}
        </div>
      ) : (
        <div className="calendar-load-error">
          <p>Não foi possível exibir o calendário de {year}.</p>
          <button type="button" onClick={() => void loadCalendar(year)}>
            Tentar novamente
          </button>
        </div>
      )}

      {isSaving ? (
        <div className="dashboard-blocking-overlay" role="status" aria-live="polite">
          <div className="dashboard-blocking-card">
            <span className="dashboard-blocking-spinner" />
            Salvando calendário...
          </div>
        </div>
      ) : null}

      {feedback ? (
        <div
          className={`dashboard-feedback dashboard-feedback--${feedback.type}`}
          role="status"
          aria-live="polite"
        >
          {feedback.message}
        </div>
      ) : null}
    </PortalPage>
  );
}
