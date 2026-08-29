// rehype-raw ships pure ESM (transitively via hast-util-raw), which Jest's
// CJS module loader can't parse. The mocked ReactMarkdown component (see
// reactMarkdownMock.tsx) never actually invokes rehypePlugins, so a no-op
// stand-in is enough to let anything importing this module load under Jest.
export default function rehypeRaw() {
  return (tree: unknown) => tree;
}
