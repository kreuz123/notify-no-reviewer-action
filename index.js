const core = require('@actions/core');
const github = require('@actions/github');
const { hasReviewers } = require('./src/reviewer');
const {
  normalizeNotifyTarget,
  buildCommentBody,
} = require('./src/build-comment');

async function run() {
  const notifyTarget = normalizeNotifyTarget(core.getInput('notify-target'));
  const pullRequest = github.context.payload.pull_request;
  if (!pullRequest) {
    throw new Error('This action must run for a pull_request event.');
  }

  core.setOutput('has-reviewers', 'true');
  core.setOutput('notified', 'false');
  if (pullRequest.draft) {
    return;
  }

  const configuredNumber = core.getInput('pr-number');
  const pullNumber = Number(configuredNumber || pullRequest.number);
  if (!Number.isSafeInteger(pullNumber) || pullNumber <= 0) {
    throw new Error('Input "pr-number" must be a positive integer.');
  }

  const client = github.getOctokit(core.getInput('token'));
  let prData = pullRequest;
  if (configuredNumber && Number(configuredNumber) !== pullRequest.number) {
    const { data: fetchedPr } = await client.rest.pulls.get({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      pull_number: pullNumber,
    });
    if (fetchedPr.draft) {
      return;
    }
    prData = fetchedPr;
  }

  const foundReviewers = await hasReviewers(
    client,
    github.context.repo.owner,
    github.context.repo.repo,
    pullNumber,
    prData,
  );
  core.setOutput('has-reviewers', String(foundReviewers));
  if (foundReviewers) {
    return;
  }

  const template = core.getInput('comment-template', { trimWhitespace: false });
  const body = buildCommentBody(template, notifyTarget);
  await client.rest.issues.createComment({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: pullNumber,
    body,
  });
  core.setOutput('notified', 'true');
}

if (require.main === module) {
  run().catch((error) => core.setFailed(error.message));
}

module.exports = { run };
