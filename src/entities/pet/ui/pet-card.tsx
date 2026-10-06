import { SPECIES_LABEL, type Pet } from "@/shared/domain/pet";

export function PetCard({ pet }: { pet: Pet }) {
  return (
    <article className="flex items-center gap-3 rounded-xl border p-4">
      <div className="size-12 shrink-0 rounded-full bg-muted" aria-hidden />
      <div className="min-w-0">
        <h3 className="truncate font-semibold">{pet.name}</h3>
        <p className="text-sm text-muted-foreground">
          {SPECIES_LABEL[pet.species]}
          {pet.morph ? ` · ${pet.morph}` : null}
        </p>
      </div>
    </article>
  );
}
