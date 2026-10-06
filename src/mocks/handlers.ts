import { http, HttpResponse } from "msw/http";
import type { Pet } from "@/shared/domain/pet";
import { env } from "@/shared/config/env";

const url = (path: string) => new URL(path, env.apiBaseUrl).toString();

const pets: Pet[] = [
  { id: "p1", name: "망고", species: "crested_gecko", morph: "할리퀸", sex: "female" },
  { id: "p2", name: "레오", species: "leopard_gecko", sex: "male" },
];

export const handlers = [http.get(url("/pets"), () => HttpResponse.json(pets))];
