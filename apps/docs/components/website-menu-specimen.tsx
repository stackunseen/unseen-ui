'use client';
import { useState } from 'react';
import { ContextMenu, DropdownMenu, NavigationMenu } from '@ai-interaction/react';
import type { WebsiteSpecimenProps } from './website-specimen';

export function WebsiteMenuSpecimen({ name, state }: WebsiteSpecimenProps) {
  const [notice, setNotice] = useState('No action selected.');
  const [showDetails, setShowDetails] = useState(true);
  if (name === 'NavigationMenu')
    return (
      <NavigationMenu.Root aria-label="Example component navigation">
        <NavigationMenu.List>
          <NavigationMenu.Item>
            <NavigationMenu.Link href="/?component=Button">Foundations</NavigationMenu.Link>
          </NavigationMenu.Item>
          <NavigationMenu.Item>
            <NavigationMenu.Trigger disabled={state === 'Disabled trigger'}>
              Forms
            </NavigationMenu.Trigger>
            <NavigationMenu.Content>
              <NavigationMenu.Link href="/?component=Input">Input</NavigationMenu.Link>
              <NavigationMenu.Link href="/?component=Checkbox">Checkbox</NavigationMenu.Link>
              <NavigationMenu.Link href="/?component=Slider">Slider</NavigationMenu.Link>
            </NavigationMenu.Content>
          </NavigationMenu.Item>
          <NavigationMenu.Item>
            <NavigationMenu.Link href="/?component=NavigationMenu" active>
              Navigation
            </NavigationMenu.Link>
          </NavigationMenu.Item>
        </NavigationMenu.List>
      </NavigationMenu.Root>
    );
  if (name === 'ContextMenu')
    return (
      <>
        <ContextMenu.Root>
          <ContextMenu.Trigger className="generic-context-target">
            Project preview — right-click or focus and press Shift+F10.
          </ContextMenu.Trigger>
          <ContextMenu.Content>
            <ContextMenu.Item onSelect={() => setNotice('Rename requested for the local sample.')}>
              Rename project
            </ContextMenu.Item>
            <ContextMenu.Item
              disabled={state === 'Disabled item'}
              onSelect={() => setNotice('Duplicate requested for the local sample.')}
            >
              Duplicate project
            </ContextMenu.Item>
            <ContextMenu.Separator />
            <ContextMenu.Item
              tone="danger"
              onSelect={() => setNotice('Archive requested for the local sample.')}
            >
              Archive project
            </ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Root>
        <p role="status" className="generic-demo-status">
          {notice}
        </p>
      </>
    );
  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>Project actions</DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Label>Local sample</DropdownMenu.Label>
          <DropdownMenu.Item onSelect={() => setNotice('Rename requested for the local sample.')}>
            Rename project
          </DropdownMenu.Item>
          <DropdownMenu.Item
            disabled={state === 'Disabled item'}
            onSelect={() => setNotice('Duplicate requested for the local sample.')}
          >
            Duplicate project
          </DropdownMenu.Item>
          {state === 'Selection' && (
            <>
              <DropdownMenu.Separator />
              <DropdownMenu.CheckboxItem
                checked={showDetails}
                onCheckedChange={(next) => {
                  setShowDetails(next === true);
                  setNotice(next ? 'Details shown.' : 'Details hidden.');
                }}
              >
                Show details
              </DropdownMenu.CheckboxItem>
            </>
          )}
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            tone="danger"
            onSelect={() => setNotice('Archive requested for the local sample.')}
          >
            Archive project
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
      <p role="status" className="generic-demo-status">
        {notice}
      </p>
    </>
  );
}
