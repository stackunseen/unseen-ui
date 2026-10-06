import { AIIcon, Button, Card } from '@stackunseen/ui';
import type { Account } from './data';
import { dateLabel, money } from './data';
import s from './relay.module.css';

export function Overview({
  accounts,
  onSelect,
}: {
  accounts: readonly Account[];
  onSelect: (id: string) => void;
}) {
  const atRisk = accounts.filter((account) => account.health === 'At risk');
  const october = accounts.filter((account) => account.renewal.startsWith('2026-10'));
  const next = [...accounts].sort((a, b) => a.renewal.localeCompare(b.renewal))[0]!;
  return (
    <>
      <dl className={s.metrics}>
        <div>
          <dt>Portfolio value</dt>
          <dd>{money(accounts.reduce((sum, account) => sum + account.arr, 0))}</dd>
          <dd className={s.metricNote}>Annual contracts · {accounts.length} accounts</dd>
        </div>
        <div>
          <dt>Renewing in October</dt>
          <dd>
            {october.length}
            <span>{october.length === 1 ? 'account' : 'accounts'}</span>
          </dd>
          <dd className={s.metricNote}>
            {money(october.reduce((sum, account) => sum + account.arr, 0))} in annual value
          </dd>
        </div>
        <div>
          <dt>Needs attention</dt>
          <dd>
            {atRisk.length}
            <span>{atRisk.length === 1 ? 'account' : 'accounts'}</span>
          </dd>
          <dd className={s.metricNote}>Marked at risk by the sample team</dd>
        </div>
      </dl>
      <Card className={s.focusCard}>
        <div>
          <p className={s.eyebrow}>Next renewal · {dateLabel(next.renewal)}</p>
          <Card.Title as="h2">Make time for {next.name}.</Card.Title>
          <Card.Description>{next.notes}</Card.Description>
        </div>
        <Button variant="outline" onClick={() => onSelect(next.id)}>
          Prepare a briefing <AIIcon name="external" size={12} />
        </Button>
      </Card>
    </>
  );
}
