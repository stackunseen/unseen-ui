'use client';
import { useEffect, useState } from 'react';

export const repositoryUrl = 'https://github.com/stackunseen/unseen-ui';
const api = 'https://api.github.com/repos/stackunseen/unseen-ui';
const key = 'unseen-ui-stars';

/**
 * The repository link in the header. The star count comes from GitHub's public API, is cached
 * for the session, and is left out entirely when the request fails or the number is unknown.
 */
export function GitHubLink() {
  const [stars, setStars] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    try {
      const cached = sessionStorage.getItem(key);
      if (cached !== null) {
        setStars(Number(cached));
        return;
      }
    } catch {
      // Storage may be unavailable; the count is simply fetched again.
    }
    fetch(api, { headers: { accept: 'application/vnd.github+json' } })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { stargazers_count?: unknown } | null) => {
        if (cancelled || typeof data?.stargazers_count !== 'number') return;
        setStars(data.stargazers_count);
        try {
          sessionStorage.setItem(key, String(data.stargazers_count));
        } catch {
          // Ignore storage failures.
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <a
      className="web-github"
      href={repositoryUrl}
      target="_blank"
      rel="noreferrer"
      aria-label={stars === null ? 'Unseen UI on GitHub' : `Unseen UI on GitHub, ${stars} stars`}
    >
      <GitHubMark />
      {stars !== null && <span aria-hidden="true">{formatStars(stars)}</span>}
    </a>
  );
}

/** The GitHub mark (Simple Icons, CC0); lucide-react no longer ships brand icons. */
function GitHubMark() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3" />
    </svg>
  );
}

function formatStars(count: number) {
  return count >= 1000 ? `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k` : String(count);
}
