/**
 * This defines functions that make it easy to
 * generate strings of HTML from JavaScript.
 */

/** @typedef {import('./types.js').Attributes} Attributes } */
/** @typedef {import('./types.js').Child} Child } */
/** @typedef {import('./types.js').ContentFn} ContentFn } */
/** @typedef {import('./types.js').SelfClosingFn} SelfClosingFn } */

/**
 * Generates an HTML string for an element with a close tag.
 * @param {string} name
 * @param {Attributes | Child[]} [attrs]
 * @param {Child[]} children
 * @returns string - the HTML
 */
export function el(name, attrs, ...children) {
  // Begin the opening tag.
  /** @type {string} */
  let html = '<' + name;

  if (typeof attrs === 'object' && !Array.isArray(attrs)) {
    // Add attributes to the opening tag.
    for (const key of Object.keys(attrs).sort()) {
      html += ` ${key}="${attrs[key]}"`;
    }
  } else {
    // Assume attrs holds the first child.
    const child = /** @type {Child} */ (/** @type {unknown} */ (attrs));
    children.unshift(child);
  }

  // Close the opening tag.
  html += '>';

  // Add child elements.
  for (const child of children) {
    html += child;
  }

  // Add the closing tag.
  html += `</${name}>`;

  return html;
}

/**
 * Generates an HTML string for a self-closing element.
 * @param {string} name
 * @param {Attributes} [attrs]
 * @returns string - the HTML
 */
export function elc(name, attrs) {
  // Begin the tag.
  /** @type {string} */
  let html = '<' + name;

  if (typeof attrs === 'object' && !Array.isArray(attrs)) {
    // Add attributes to the opening tag.
    for (const key of Object.keys(attrs).sort()) {
      html += ` ${key}="${attrs[key]}"`;
    }
  }

  // Close the tag.
  html += ' />';

  return html;
}

const contentElements = [
  'a',
  'body',
  'button',
  'div',
  'form',
  'head',
  'html',
  'label',
  'li',
  'ol',
  'option',
  'p',
  'script',
  'section',
  'select',
  'span',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'ul'
];
const selfClosingElements = ['br', 'hr', 'img', 'input', 'link', 'meta'];

/** @type {{[name: string]: (ContentFn | SelfClosingFn)}} */
const elements = {};

for (const name of contentElements) {
  elements[name] = /** @type {ContentFn} */ (
    (attrs, ...children) => el(name, attrs, ...children)
  );
}

for (const name of selfClosingElements) {
  elements[name] = /** @type {SelfClosingFn} */ (attrs => elc(name, attrs));
}

export default elements;
