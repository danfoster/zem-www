// Adds a permalink to every h2-h4 in prose: an empty <a class="anchor" href="#id">.
// The visible "#" / "##" / "###" marker is drawn by CSS from data-marker, not put in
// the DOM as text, so it never leaks into Astro's heading list (the on-page index)
// or the search index. Needs heading ids, so run it after rehypeHeadingIds.
import { visit } from 'unist-util-visit';

const MARKERS = { h2: '#', h3: '##', h4: '###' };

const textOf = (node) =>
  node.type === 'text' ? node.value : (node.children ?? []).map(textOf).join('');

export default function rehypeHeadingAnchors() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      const marker = MARKERS[node.tagName];
      const id = node.properties?.id;
      if (!marker || typeof id !== 'string') return;
      node.children.unshift({
        type: 'element',
        tagName: 'a',
        properties: {
          className: ['anchor'],
          href: `#${id}`,
          dataMarker: marker,
          dataPagefindIgnore: true,
          ariaLabel: `Link to section: ${textOf(node).trim()}`,
        },
        children: [],
      });
    });
  };
}
