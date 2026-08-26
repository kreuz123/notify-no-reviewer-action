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
  'notify-target': 'kreuz123',
  'comment-template': '{notifyTarget}, Please request a reviewer for this PR.',
  'pr-number': '',
};
const listReviews = jest.fn();
const getPull = jest.fn();
const createComment = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  inputs.token = 'token';
  inputs['notify-target'] = 'kreuz123';
  inputs['comment-template'] =
    '{notifyTarget}, Please request a reviewer for this PR.';
  inputs['pr-number'] = '';
  core.getInput.mockImplementation((name) => inputs[name] || '');
  core.setOutput.mockImplementation(() => {});
  github.context = {
    repo: { owner: 'owner', repo: 'repo' },
    payload: {
      pull_request: { number: 42, draft: false, requested_reviewers: [] },
    },
  };
  getPull.mockResolvedValue({
    data: {
      number: 42,
      draft: false,
      requested_reviewers: [],
      requested_teams: [],
    },
  });
  listReviews.mockResolvedValue({ data: [] });
  createComment.mockResolvedValue({});
  github.getOctokit.mockReturnValue({
    rest: { pulls: { listReviews, get: getPull }, issues: { createComment } },
  });
});

test('draft PR does not notify', async () => {
  github.context.payload.pull_request.draft = true;
  await run();
  expect(createComment).not.toHaveBeenCalled();
  expect(getPull).not.toHaveBeenCalled();
  expect(core.setOutput).toHaveBeenCalledWith('has-reviewers', 'true');
});

test('requested human reviewer does not notify', async () => {
  github.context.payload.pull_request.requested_reviewers = [{ type: 'User' }];
  await run();
  expect(createComment).not.toHaveBeenCalled();
  expect(getPull).not.toHaveBeenCalled();
  expect(listReviews).not.toHaveBeenCalled();
});

test('requested team reviewer does not notify', async () => {
  github.context.payload.pull_request.requested_teams = [{ slug: 'backend-team' }];
  await run();
  expect(createComment).not.toHaveBeenCalled();
  expect(getPull).not.toHaveBeenCalled();
  expect(listReviews).not.toHaveBeenCalled();
  expect(core.setOutput).toHaveBeenCalledWith('has-reviewers', 'true');
});

test('stale webhook without reviewer refreshes PR and skips notification', async () => {
  getPull.mockResolvedValue({
    data: {
      number: 42,
      draft: false,
      requested_reviewers: [{ type: 'User' }],
      requested_teams: [],
    },
  });
  await run();
  expect(getPull).toHaveBeenCalledWith({
    owner: 'owner',
    repo: 'repo',
    pull_number: 42,
  });
  expect(listReviews).not.toHaveBeenCalled();
  expect(createComment).not.toHaveBeenCalled();
});

test('existing human review does not notify', async () => {
  listReviews.mockResolvedValue({
    data: [{ id: 1, user: { login: 'octocat', type: 'User' } }],
  });
  await run();
  expect(getPull).toHaveBeenCalled();
  expect(createComment).not.toHaveBeenCalled();
});

test('bot-only review notifies as if no reviewer', async () => {
  listReviews.mockResolvedValue({
    data: [{ id: 2, user: { login: 'dependabot[bot]', type: 'Bot' } }],
  });
  await run();
  expect(getPull).toHaveBeenCalled();
  expect(createComment).toHaveBeenCalled();
  expect(core.setOutput).toHaveBeenCalledWith('notified', 'true');
});

test('no reviewer or review posts a notification', async () => {
  await run();
  expect(getPull).toHaveBeenCalled();
  expect(createComment).toHaveBeenCalledWith({
    owner: 'owner',
    repo: 'repo',
    issue_number: 42,
    body: '@kreuz123, Please request a reviewer for this PR.',
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

test('uses configured pull number and fetches that PR', async () => {
  inputs['pr-number'] = '99';
  github.context.payload.pull_request.requested_reviewers = [{ type: 'User' }];
  await run();
  expect(getPull).toHaveBeenCalledWith({
    owner: 'owner',
    repo: 'repo',
    pull_number: 99,
  });
});

test('refreshed draft PR does not notify', async () => {
  getPull.mockResolvedValue({
    data: {
      number: 42,
      draft: true,
      requested_reviewers: [],
      requested_teams: [],
    },
  });
  await run();
  expect(createComment).not.toHaveBeenCalled();
  expect(listReviews).not.toHaveBeenCalled();
});

test('pulls.get failures reject clearly', async () => {
  getPull.mockRejectedValue(new Error('Failed to refresh PR'));
  await expect(run()).rejects.toThrow('Failed to refresh PR');
});

test('API failures reject clearly', async () => {
  listReviews.mockRejectedValue(new Error('GitHub unavailable'));
  await expect(run()).rejects.toThrow('GitHub unavailable');
});
