'use client';
import { useState } from 'react';
import {
  ArchiveIcon,
  ArrowTopRightIcon,
  CircleIcon,
  FileTextIcon,
  GridIcon,
  ViewVerticalIcon,
} from '@radix-ui/react-icons';
import { Tabs } from '@stackunseen/ui';
import s from './marketing-template.module.css';

/** Fixed fictional records. This is a reading preview, with real tab controls. */
export function ProjectPreview() {
  const [tab, setTab] = useState('overview');
  return (
    <div className={s.preview} role="group" aria-label="Folio sample project">
      <div className={s.previewTop}>
        <span>
          <ArchiveIcon width={15} height={15} aria-hidden="true" /> Studio workspace
        </span>
        <span className={s.previewSample}>SAMPLE</span>
      </div>
      <div className={s.previewBody}>
        <div className={s.previewRail} aria-hidden="true">
          <ViewVerticalIcon width={15} height={15} />
          <GridIcon width={15} height={15} />
          <FileTextIcon width={15} height={15} />
        </div>
        <div className={s.previewMain}>
          <div className={s.previewBreadcrumb}>Projects / Fieldwork</div>
          <h2>Good work starts here.</h2>
          <p className={s.previewDescription}>
            One place for the brief, the plan and the next decision.
          </p>
          <Tabs
            label="Sample project view"
            value={tab}
            onValueChange={setTab}
            items={[
              {
                value: 'overview',
                label: 'Overview',
                content: (
                  <div className={s.projectContent}>
                    <div className={s.projectNote}>
                      <span className={s.smallLabel}>PROJECT BRIEF</span>
                      <h3>A quieter way to plan</h3>
                      <p>Bring the research into one clear brief before the next design review.</p>
                      <div className={s.noteTags}>
                        <span>Discovery</span>
                        <span>In progress</span>
                      </div>
                    </div>
                    <div className={s.previewTasks}>
                      <span className={s.smallLabel}>UP NEXT</span>
                      <p>
                        <CircleIcon width={15} height={15} aria-hidden="true" /> Gather interview
                        notes
                      </p>
                      <p>
                        <CircleIcon width={15} height={15} aria-hidden="true" /> Review the first
                        concept
                      </p>
                    </div>
                  </div>
                ),
              },
              {
                value: 'notes',
                label: 'Notes',
                content: (
                  <div className={s.projectContent}>
                    <div className={s.projectNote}>
                      <span className={s.smallLabel}>DECISION NOTE</span>
                      <h3>Keep the brief short</h3>
                      <p>
                        Start with the problem, add the useful evidence, then name the next
                        decision.
                      </p>
                      <div className={s.noteTags}>
                        <span>Working draft</span>
                      </div>
                    </div>
                    <div className={s.previewTasks}>
                      <span className={s.smallLabel}>LINKED DOCUMENT</span>
                      <p>
                        <FileTextIcon width={15} height={15} aria-hidden="true" /> Interview
                        observations
                      </p>
                      <p>
                        <ArrowTopRightIcon width={15} height={15} aria-hidden="true" /> Sample
                        content, no external files
                      </p>
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>
      <div className={s.previewBottom}>A fictional project. Try the tabs to explore it.</div>
    </div>
  );
}
