import createMDX from '@next/mdx';
import remarkGfm from 'remark-gfm';
// GitHub-flavoured Markdown gives the MDX guides tables, task lists and autolinks.
export default createMDX({ options: { remarkPlugins: [remarkGfm] } })({
  output: 'export',
  trailingSlash: true,
  pageExtensions: ['ts', 'tsx', 'mdx'],
  devIndicators: false,
});
