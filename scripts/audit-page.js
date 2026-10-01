async function audit(page) {
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  return await page.evaluate(async () => {
    const result = await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] },
    });
    return {
      url: location.href,
      browser: navigator.userAgent,
      viewport: { width: innerWidth, height: innerHeight },
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      violations: result.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.map((n) => ({ html: n.html, target: n.target, summary: n.failureSummary })),
      })),
      incomplete: result.incomplete.map((v) => v.id),
      passedRules: result.passes.length,
    };
  });
}
