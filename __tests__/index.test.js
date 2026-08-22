jest.mock('@actions/core', () => ({
  getInput: jest.fn(),
  setOutput: jest.fn(),
  setFailed: jest.fn(),
}));
jest.mock('@actions/github', () => ({
  context: {},
  getOctokit: jest.fn(),
}));

const core = require('@actions/core');
const github = require('@actions/github');
const { run } = require('../index');

const inputs = {
  token: 'token',
  'notify-target': 'tjnurmin',
  'comment-template': '{notifyTarget}, Please request a reviewer for this PR.',
  'pr-number': '',
};
const listReviews = jest.fn();
const createComment = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  core.getInput.mockImplementation((name) => inputs[name] || '');
  core.setOutput.mockImplementation(() => {});
  github.context = {
    repo: { owner: 'owner', repo: 'repo' },
    payload: {
      pull_request: { number: 42, draft: false, requested_reviewers: [] },
    },
  };
  listReviews.mockResolvedValue({ data: [] });
  createComment.mockResolvedValue({});
  github.getOctokit.mockReturnValue({
    rest: { pulls: { listReviews }, issues: { createComment } },
  });
});

test('draft PR does not notify', async () => {
  github.context.payload.pull_request.draft = true;
  await run();
  expect(createComment).not.toHaveBeenCalled();
  expect(core.setOutput).toHaveBeenCalledWith('has-reviewers', 'true');
});

test('requested human reviewer does not notify', async () => {
  github.context.payload.pull_request.requested_reviewers = [{ type: 'User' }];
  await run();
  expect(createComment).not.toHaveBeenCalled();
});

test('existing review does not notify', async () => {
  listReviews.mockResolvedValue({ data: [{ id: 1 }] });
  await run();
  expect(createComment).not.toHaveBeenCalled();
});

test('no reviewer or review posts a notification', async () => {
  await run();
  expect(createComment).toHaveBeenCalledWith({
    owner: 'owner',
    repo: 'repo',
    issue_number: 42,
    body: '@tjnurmin, Please request a reviewer for this PR.',
  });
  expect(core.setOutput).toHaveBeenCalledWith('notified', 'true');
});

test('team target and custom template are rendered', async () => {
  inputs['notify-target'] = 'my-org/backend-team';
  inputs['comment-template'] = '{notifyTarget}, please assign one.';
  await run();
  expect(createComment.mock.calls[0][0].body).toBe(
    '@my-org/backend-team, please assign one.',
  );
});

test('API failures reject clearly', async () => {
  listReviews.mockRejectedValue(new Error('GitHub unavailable'));
  await expect(run()).rejects.toThrow('GitHub unavailable');
});
