import { addDays, differenceInCalendarDays, format, max as maxDate, parseISO } from "date-fns";
import { careTitle, ROUTINE_CARE_ITEMS } from "@/shared/domain/care";
import type { Pet } from "@/shared/domain/pet";
import type { CareRecord } from "@/shared/domain/record";
import { getOccurrences, type Routine } from "@/shared/domain/routine";
import { lifeStageFromHatch, SPECIES_LABEL } from "@/shared/domain/species";
import { SPECIES_PROFILE } from "@/shared/domain/species-catalog";
import type { Task, Today } from "@/shared/domain/today";
import { CARE_STANDARD_VERSION } from "./data";
import { db, ymd, type DbPet, type DbRecord, type DbRoutine } from "./db";

/**
 * 백엔드가 할 계산을 흉내 낸다 (IA 14_업무규칙).
 * 일정은 '마지막 완료일 + 주기'(롤링)이고, 할 일 행을 미리 만들지 않고 조회할 때 계산한다.
 */

const dateOf = (iso: string) => format(parseISO(iso), "yyyy-MM-dd");
const day = (ymdString: string) => parseISO(`${ymdString}T00:00:00`);

export function speciesOf(pet: Pick<DbPet, "speciesId">) {
  return SPECIES_PROFILE[pet.speciesId];
}

export function stageCodeOf(pet: DbPet, today = new Date()) {
  if (pet.manualStageCode) return pet.manualStageCode;
  return lifeStageFromHatch(speciesOf(pet), pet.hatchedOn, today)?.code ?? "adult";
}

export function stageNameOf(pet: DbPet) {
  const code = stageCodeOf(pet);
  return speciesOf(pet).lifeStages.find((s) => s.code === code)?.name ?? code;
}

export const liveRecords = () => db.records.filter((r) => !r.deletedAt);

/** 백엔드 revisionNo처럼 1부터, 정정할 때마다 1씩 */
export const revisionNoOf = (record: DbRecord) => record.revisions.length + 1;

export const fileUrlOf = (fileId: string | null) =>
  db.files.find((f) => f.id === fileId)?.url ?? null;

function lastRecordDate(routineId: string) {
  const dates = liveRecords()
    .filter((r) => r.routineId === routineId)
    .map((r) => parseISO(r.occurredAt));
  return dates.length ? maxDate(dates) : null;
}

/** 다음 예정일. 미룬 날짜가 있으면 그 날, 없으면 마지막 기록 + 주기 */
export function dueOf(routine: DbRoutine) {
  const last = lastRecordDate(routine.id);
  const base = last
    ? ymd(addDays(day(dateOf(last.toISOString())), routine.intervalDays))
    : routine.startDate;
  return {
    dueOn: routine.postponedTo ?? base,
    originalDueOn: routine.postponedTo ? base : null,
  };
}

export function serializeRoutine(routine: DbRoutine): Routine {
  const pet = db.pets.find((p) => p.id === routine.petId)!;
  const { dueOn, originalDueOn } = dueOf(routine);
  return {
    id: routine.id,
    petId: routine.petId,
    careItem: routine.careItem,
    intervalDays: routine.intervalDays,
    standardIntervalDays: routine.standardIntervalDays,
    customized: routine.intervalDays !== routine.standardIntervalDays,
    enabled: routine.enabled,
    startDate: routine.startDate,
    foodName: routine.foodName,
    nextDueOn: dueOn,
    postponedTo: routine.postponedTo,
    originalDueOn,
    basis: {
      label: "reference",
      condition: `${SPECIES_LABEL[pet.speciesId]} · ${stageNameOf(pet)}`,
      sourceText: null,
      version: CARE_STANDARD_VERSION,
    },
  };
}

export function serializeRecord(record: DbRecord): CareRecord {
  const pet = db.pets.find((p) => p.id === record.petId);
  return {
    id: record.id,
    petId: record.petId,
    petName: pet?.name ?? "",
    routineId: record.routineId,
    careItem: record.careItem,
    type: record.type,
    method: record.method,
    occurredAt: record.occurredAt,
    createdAt: record.createdAt,
    intake: record.intake,
    weightG: record.weightG,
    memo: record.memo,
    foodName: record.foodName,
    skipReason: record.skipReason,
    photos: record.photoIds
      .map((id) => db.files.find((f) => f.id === id))
      .filter((f) => f !== undefined)
      .map((f) => ({ id: f.id, url: f.url })),
    revisions: record.revisions.map((r) => ({ at: r.at, summary: r.changedFields.join(", ") })),
    revisionNo: revisionNoOf(record),
  };
}

export function serializePet(pet: DbPet): Pet {
  const records = liveRecords().filter((r) => r.petId === pet.id);
  const firstRecord = records.map((r) => r.occurredAt).sort()[0];
  return {
    id: pet.id,
    name: pet.name,
    speciesId: pet.speciesId,
    morph: pet.morph,
    sex: pet.sex,
    hatchedOn: pet.hatchedOn,
    lifeStageCode: stageCodeOf(pet),
    lifeStageSource: pet.manualStageCode ? "manual" : "hatch",
    stageUncertain: Boolean(pet.manualStageCode && pet.stageUncertain),
    acquiredOn: pet.acquiredOn,
    photoUrl: fileUrlOf(pet.photoFileId),
    status: pet.status,
    endReason: pet.endReason,
    endedOn: pet.endedOn,
    createdAt: pet.createdAt,
    todayRemaining:
      pet.status === "active"
        ? buildToday(pet.userId, ymd(new Date()), pet.id).items.filter((t) => t.state === "todo")
            .length
        : 0,
    recordCount: records.length,
    firstRecordOn: firstRecord ? dateOf(firstRecord) : null,
  };
}

/** 오늘 할 일(API-40). 오늘이면 할 일·완료·건너뜀, 앞 날짜면 예정된 할 일 */
export function buildToday(userId: string, date: string, petId?: string): Today {
  const today = ymd(new Date());
  const pets = db.pets.filter(
    (p) =>
      p.userId === userId && p.status === "active" && !p.deletedAt && (!petId || p.id === petId),
  );
  const items: Task[] = [];

  for (const pet of pets) {
    for (const routine of db.routines.filter((r) => r.petId === pet.id && r.enabled)) {
      const { dueOn, originalDueOn } = dueOf(routine);
      const base = {
        routineId: routine.id,
        petId: pet.id,
        petName: pet.name,
        careItem: routine.careItem,
        title: careTitle(routine.careItem, routine.foodName),
        intervalDays: routine.intervalDays,
        dueOn,
        originalDueOn,
        overdueDays: 0,
      };

      if (date === today) {
        const doneToday = liveRecords()
          .filter((r) => r.routineId === routine.id && dateOf(r.occurredAt) === today)
          .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];
        if (doneToday) {
          items.push({
            ...base,
            state: doneToday.type,
            record: {
              id: doneToday.id,
              occurredAt: doneToday.occurredAt,
              intake: doneToday.intake,
              weightG: doneToday.weightG,
              skipReason: doneToday.skipReason,
            },
          });
        } else if (dueOn <= today) {
          items.push({
            ...base,
            state: "todo",
            overdueDays: differenceInCalendarDays(day(today), day(dueOn)),
            record: null,
          });
        }
      } else if (date > today) {
        const start = dueOn < today ? today : dueOn;
        const hits = getOccurrences(
          { intervalDays: routine.intervalDays, startDate: start, enabled: true },
          day(date),
          day(date),
        );
        if (hits.length) items.push({ ...base, state: "planned", record: null });
      }
    }
  }

  const order = { todo: 0, planned: 0, done: 1, skipped: 2 } as const;
  items.sort(
    (a, b) =>
      order[a.state] - order[b.state] ||
      b.overdueDays - a.overdueDays ||
      a.petName.localeCompare(b.petName) ||
      ROUTINE_CARE_ITEMS.indexOf(a.careItem) - ROUTINE_CARE_ITEMS.indexOf(b.careItem),
  );
  return { date, items };
}
