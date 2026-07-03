import { getInitials } from "@/lib/utils";

export function Avatar({ name }: { name: string }) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
      {getInitials(name)}
    </div>
  );
}
