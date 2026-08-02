import { Link } from 'react-router-dom';
import type { HeroSummary } from '@dota-pick-helper/shared-types';

export default function HeroCard({ hero }: { hero: HeroSummary }) {
  return (
    <Link
      to={`/heroes/${hero.id}`}
      className="group relative block aspect-video overflow-hidden rounded-md border border-dota-border bg-dota-panel transition-transform duration-150 hover:z-10 hover:scale-105 hover:border-gold/60"
    >
      <img
        src={hero.imageUrl}
        alt={hero.localizedName}
        loading="lazy"
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-2 py-1.5">
        <span className="text-xs font-medium text-white drop-shadow-sm sm:text-sm">
          {hero.localizedName}
        </span>
      </div>
    </Link>
  );
}
