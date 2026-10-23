import { Accordion, Button } from '@stackunseen/ui';
import { type ActionEvent, type ActionHost } from './action-host';
import s from './actions.module.css';

export function ActionControls({
  host,
  send,
}: {
  host: ActionHost;
  send: (event: ActionEvent) => void;
}) {
  const submitted = host.decision.state === 'submitting';
  const retained = host.decision.state !== 'idle' && host.decision.state !== 'submitting';
  return (
    <Accordion
      type="single"
      collapsible
      headingLevel={2}
      items={[
        {
          value: 'host',
          title: 'Simulated server controls',
          keepMounted: true,
          content: (
            <div className={s.controls}>
              <p>
                Try a lost acknowledgement, a partial failure or a changed action. Each control
                delivers one local event.
              </p>
              <div className={s.buttons} role="group" aria-label="Server decision acknowledgement">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!submitted}
                  onClick={() => send({ type: 'decision-accept', loseAcknowledgement: true })}
                >
                  Lose decision acknowledgement
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!retained}
                  onClick={() => send({ type: 'lookup-decision', notFound: true })}
                >
                  Simulate receipt not found
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!retained}
                  onClick={() => send({ type: 'lookup-decision' })}
                >
                  Look up original decision
                </Button>
              </div>
              <div className={s.buttons} role="group" aria-label="Server execution events">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={host.tool.state !== 'running'}
                  onClick={() => send({ type: 'finish', partial: true })}
                >
                  Report partial failure
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={host.tool.state !== 'running'}
                  onClick={() => send({ type: 'finish', loseAcknowledgement: true })}
                >
                  Lose result acknowledgement
                </Button>
              </div>
              <fieldset className={s.faults}>
                <legend>Change the server action before execution</legend>
                <div className={s.buttons}>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={host.executions !== 0}
                    onClick={() => send({ type: 'change', field: 'version' })}
                  >
                    Change action version
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={host.executions !== 0}
                    onClick={() => send({ type: 'change', field: 'scope' })}
                  >
                    Change requested scope
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={host.executions !== 0}
                    onClick={() => send({ type: 'change', field: 'expiry' })}
                  >
                    Expire approval
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={host.executions !== 0}
                    onClick={() => send({ type: 'change', field: 'resource' })}
                  >
                    Change resource revision
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={host.executions !== 0}
                    onClick={() => send({ type: 'change', field: 'access' })}
                  >
                    Revoke access revision
                  </Button>
                </div>
              </fieldset>
              <p className={s.boundary}>
                Receipt lookup keeps the original command. A failed account needs a new proposal and
                review.
              </p>
            </div>
          ),
        },
      ]}
    />
  );
}
