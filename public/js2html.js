/**
 * This defines functions that make it easy to
 * generate strings of HTML from JavaScript.
 */

/** @typedef {import('./types.d.ts').ContentFn} ContentFn } */
/** @typedef {import('./types.d.ts').SelfClosingFn} SelfClosingFn } */
/** @typedef {Object.<string, boolean | number | string>} Attributes */
/** @typedef {string[] | number | string} Children */

/**
 * Generates an HTML string for an element with a close tag.
 * @param {string} name
 * @param {Attributes | Children} [attrs]
 * @param {Children} [children]
 * @returns string - the HTML
 */
export function el(name, attrs, children) {
  // Begin the opening tag.
  /** @type {string} */
  let html = '<' + name;

  if (typeof attrs === 'object' && !Array.isArray(attrs)) {
    // Add attributes to the opening tag.
    for (const key of Object.keys(attrs).sort()) {
      html += ` ${key}="${attrs[key]}"`;
    }
  } else {
    // Assume the second argument describes the children, not attributes.
    children = attrs;
  }

  // Close the opening tag.
  html += '>';

  if (Array.isArray(children)) {
    // Add child elements.
    for (const child of children) {
      html += child;
    }
  } else {
    // Add text content.
    html += children;
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
    (attrs, children) => el(name, attrs, children)
  );
}

for (const name of selfClosingElements) {
  elements[name] = /** @type {SelfClosingFn} */ (attrs => elc(name, attrs));
}

export default elements;
