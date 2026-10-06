'use client';
import { useEffect } from 'react';
import { legacyDestination } from '../lib/site-paths';
export function LegacyGalleryRedirect() {
  useEffect(() => {
    const destination = legacyDestination(window.location.search);
    if (destination) window.location.replace(destination + window.location.hash);
  }, []);
  return null;
}
