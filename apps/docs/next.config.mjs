import createMDX from '@next/mdx';
export default createMDX()({
  output: 'export',
  trailingSlash: true,
  pageExtensions: ['ts', 'tsx', 'mdx'],
  devIndicators: false,
});
