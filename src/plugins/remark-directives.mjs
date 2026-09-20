// Replaces the Hugo shortcodes this site used, via remark-directive syntax:
//
//   :::info / :::warning / :::note / :::tip   ...content...   :::
//   ::youtube{id=VIDEO_ID}
//
// Any directive we don't handle is turned back into its original text, since
// remark-directive would otherwise silently drop things like ":80" in prose.
import { visit } from 'unist-util-visit';

const NOTICES = new Set(['info', 'warning', 'note', 'tip']);

export default function remarkDirectives() {
  return (tree, file) => {
    visit(tree, (node, index, parent) => {
      if (!['containerDirective', 'leafDirective', 'textDirective'].includes(node.type)) return;

      const data = (node.data ??= {});

      if (node.type === 'containerDirective' && NOTICES.has(node.name)) {
        data.hName = 'div';
        data.hProperties = { class: `notice notice-${node.name}`, role: 'note' };
        return;
      }

      if (node.type === 'leafDirective' && node.name === 'youtube') {
        const id = node.attributes?.id;
        if (!id || !/^[\w-]+$/.test(id)) throw new Error(`${file.path}: ::youtube needs a valid id`);
        data.hName = 'iframe';
        data.hProperties = {
          class: 'video',
          src: `https://www.youtube-nocookie.com/embed/${id}`,
          title: node.attributes?.title ?? 'YouTube video',
          loading: 'lazy',
          allowfullscreen: true,
          referrerpolicy: 'strict-origin-when-cross-origin',
        };
        return;
      }

      // Unhandled: restore the original source text.
      if (node.type === 'containerDirective') {
        throw new Error(
          `${file.path}:${node.position?.start.line}: unknown container directive ":::${node.name}"`,
        );
      }
      const { start, end } = node.position;
      parent.children[index] = {
        type: 'text',
        value: String(file.value).slice(start.offset, end.offset),
      };
    });
  };
}
