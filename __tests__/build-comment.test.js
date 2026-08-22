const {
  normalizeNotifyTarget,
  buildCommentBody,
} = require('../src/build-comment');

describe('comment building', () => {
  test.each([
    ['tjnurmin', '@tjnurmin'],
    ['my-org/backend-team', '@my-org/backend-team'],
    ['@tjnurmin', '@tjnurmin'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeNotifyTarget(input)).toBe(expected);
  });

  test('replaces the target placeholder', () => {
    expect(buildCommentBody('{notifyTarget}, please review.', '@user')).toBe(
      '@user, please review.',
    );
  });

  test('adds the target when omitted from a custom template', () => {
    expect(buildCommentBody('Please review this PR.', '@team/name')).toBe(
      '@team/name Please review this PR.',
    );
  });
});
