'use client';
import { useState } from 'react';
import { Button } from '@stackunseen/ui';
import { MarketingPricing } from '@stackunseen/ui/marketing';
import s from './marketing-template.module.css';

const plans = [
  {
    id: 'personal',
    title: 'Personal',
    description: 'A home for your own ideas.',
    price: '$0',
    priceNote: 'Sample price · one person',
    features: ['Personal project space', 'Notes and decision records', 'A simple weekly overview'],
  },
  {
    id: 'studio',
    title: 'Studio',
    description: 'Bring your small team together.',
    price: '$12',
    priceNote: 'Sample price · per person / month',
    badge: 'For small teams',
    features: [
      'Shared project spaces',
      'Collaborative working notes',
      'Project roles and handovers',
    ],
  },
  {
    id: 'organization',
    title: 'Organization',
    description: 'Space for connected teams.',
    price: 'Let’s talk',
    priceNote: 'Illustrative custom plan',
    features: ['Multiple team spaces', 'Workspace access policies', 'A guided setup conversation'],
  },
];

export function PricingDemo() {
  const [selectedPlan, setSelectedPlan] = useState('');
  return (
    <MarketingPricing
      id="folio-pricing"
      eyebrow="A PLAN FOR YOUR PACE"
      title="Start small. Make room as you grow."
      description="Illustrative plans for this fictional product. Compare the layouts, then select a plan to see the local interaction."
      plans={plans.map((plan) => ({
        ...plan,
        action: (
          <Button
            variant={plan.badge ? 'primary' : 'outline'}
            className={plan.badge ? s.actionButton : s.planButton}
            aria-pressed={selectedPlan === plan.title}
            onClick={() => setSelectedPlan(plan.title)}
          >
            Explore {plan.title}
          </Button>
        ),
      }))}
      note="These prices and features are sample content. Plan selection does not create an account, start a trial or take payment."
    >
      <p className={s.planFeedback} role="status">
        {selectedPlan
          ? `${selectedPlan} selected in this preview. No subscription was created.`
          : 'Select any plan to try the preview.'}
      </p>
    </MarketingPricing>
  );
}
