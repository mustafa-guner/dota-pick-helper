export default function PatchTag({ version }: { version: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-xs font-medium text-gold">
      Patch {version}
    </span>
  );
}
