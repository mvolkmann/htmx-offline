import {expect, test} from 'bun:test';
// import {div, img, p} from './js2html.js';
import elements from './js2html.js';
const {div, img, p} = elements;

test('element with text', () => {
  const html = p('Hello, World!');
  expect(html).toBe('<p>Hello, World!</p>');
});

test('element with attributes and text', () => {
  const html = p({id: 'p1', class: 'greet'}, 'Hello, World!');
  expect(html).toBe('<p class="greet" id="p1">Hello, World!</p>');
});

test('element with child elements', () => {
  const html = div([p('Hello'), p('World')]);
  expect(html).toBe('<div><p>Hello</p><p>World</p></div>');
});

test('self closing element', () => {
  const html = img({alt: 'giraffe', src: 'giraffe.jpg'});
  expect(html).toBe('<img alt="giraffe" src="giraffe.jpg" />');
});
