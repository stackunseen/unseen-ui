import createMDX from '@next/mdx';
export default createMDX()({
  output: 'export',
  pageExtensions: ['ts', 'tsx', 'mdx'],
  devIndicators: false,
});
