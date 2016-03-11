import {expect} from 'chai';
import switchPath from './src';

it('should not gobble rest of path in case of param matching', () => {
  const {path, value} = switchPath('/books/33/moar', {
    '/books/:id': id => `id is ${id}`,
  });
  expect(path).to.be.equal('/books/33');
  expect(value).to.be.equal('id is 33');
});
