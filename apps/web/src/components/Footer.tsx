import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="mx-auto max-w-7xl px-4 py-6 text-center text-xs text-gray-500 sm:px-6 lg:px-10">
      <p>
        Dota 2 Pick Helper is an unofficial, fan-made tool and is not affiliated with, endorsed
        by, or sponsored by Valve Corporation. Dota 2 is a trademark and/or registered trademark
        of Valve Corporation, and all hero names, artwork, and other assets displayed here are
        the property of Valve Corporation.
      </p>
      <p className="mt-2 flex justify-center gap-4">
        <Link to="/privacy" className="hover:text-gold hover:underline">
          Privacy Policy
        </Link>
        <Link to="/terms" className="hover:text-gold hover:underline">
          Terms of Service
        </Link>
      </p>
    </footer>
  );
}
