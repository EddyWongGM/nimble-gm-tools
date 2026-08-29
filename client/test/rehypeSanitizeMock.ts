// rehype-sanitize ships pure ESM (transitively via hast-util-sanitize),
// which Jest's CJS module loader can't parse. The mocked ReactMarkdown
// component (see reactMarkdownMock.tsx) never actually invokes
// rehypePlugins, so a no-op stand-in is enough to let anything importing
// this module load under Jest.
export default function rehypeSanitize() {
  return (tree: unknown) => tree;
}
