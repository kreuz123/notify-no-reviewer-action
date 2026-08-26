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
};
const listReviews = jest.fn();
const getPull = jest.fn();
const createComment = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  core.getInput.mockImplementation((name) => inputs[name] || '');
  core.setOutput.mockImplementation(() => {});
  github.context = {
    repo: { owner: 'owner', repo: 'repo' },
    payload: {
      pull_request: { number: 42, draft: false, requested_reviewers: [], requested_teams: [] },
    },
  };
  listReviews.mockResolvedValue({ data: [] });
  getPull.mockResolvedValue({ data: { number: 42, draft: false, requested_reviewers: [], requested_teams: [] } });
  createComment.mockResolvedValue({});
  github.getOctokit.mockReturnValue({
    rest: { pulls: { listReviews, get: getPull }, issues: { createComment } },
  });
});

test('draft PR (webhook payload) with no requested reviewers refreshes and skips if still draft', async () => {
  github.context.payload.pull_request.draft = true;
  getPull.mockResolvedValue({ data: { number: 42, draft: true, requested_reviewers: [], requested_teams: [] } });
  await run();
  expect(createComment).not.toHaveBeenCalled();
  expect(core.setOutput).toHaveBeenCalledWith('has-reviewers', 'true');
});

test('draft PR with requested reviewer does not notify', async () => {
  github.context.payload.pull_request.draft = true;
  github.context.payload.pull_request.requested_reviewers = [{ type: 'User' }];
  await run();
  expect(createComment).not.toHaveBeenCalled();
  expect(getPull).not.toHaveBeenCalled();
});

test('requested human reviewer does not notify', async () => {
  github.context.payload.pull_request.requested_reviewers = [{ type: 'User' }];
  await run();
  expect(createComment).not.toHaveBeenCalled();
  expect(getPull).not.toHaveBeenCalled();
});

test('requested team reviewer does not notify', async () => {
  github.context.payload.pull_request.requested_teams = [{ slug: 'backend-team' }];
  await run();
  expect(createComment).not.toHaveBeenCalled();
  expect(getPull).not.toHaveBeenCalled();
  expect(core.setOutput).toHaveBeenCalledWith('has-reviewers', 'true');
});

test('stale webhook with no reviewer refreshes and uses fresh PR data', async () => {
  getPull.mockResolvedValue({ data: { number: 42, draft: false, requested_reviewers: [{ type: 'User' }], requested_teams: [] } });
  await run();
  expect(getPull).toHaveBeenCalledWith({ owner: 'owner', repo: 'repo', pull_number: 42 });
  expect(createComment).not.toHaveBeenCalled();
  expect(core.setOutput).toHaveBeenCalledWith('has-reviewers', 'true');
});

test('stale webhook resolves to draft PR does not notify', async () => {
  getPull.mockResolvedValue({ data: { number: 42, draft: true, requested_reviewers: [], requested_teams: [] } });
  await run();
  expect(createComment).not.toHaveBeenCalled();
});

test('existing human review does not notify', async () => {
  listReviews.mockResolvedValue({
    data: [{ id: 1, user: { login: 'octocat', type: 'User' } }],
  });
  await run();
  expect(createComment).not.toHaveBeenCalled();
});

test('bot-only review notifies as if no reviewer', async () => {
  listReviews.mockResolvedValue({
    data: [{ id: 2, user: { login: 'dependabot[bot]', type: 'Bot' } }],
  });
  await run();
  expect(createComment).toHaveBeenCalled();
  expect(core.setOutput).toHaveBeenCalledWith('notified', 'true');
});

test('no reviewer or review posts a notification using event payload PR number', async () => {
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
  getPull.mockRejectedValue(new Error('GitHub unavailable'));
  await expect(run()).rejects.toThrow('GitHub unavailable');
});

test('listReviews API failure rejects', async () => {
  listReviews.mockRejectedValue(new Error('listReviews failed'));
  getPull.mockResolvedValue({ data: { number: 42, draft: false, requested_reviewers: [], requested_teams: [] } });
  await expect(run()).rejects.toThrow('listReviews failed');
});
