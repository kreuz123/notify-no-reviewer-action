const core = require('@actions/core');
const github = require('@actions/github');
const { hasReviewers, hasRequestedReviewers } = require('./src/reviewer');
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

  const pullNumber = pullRequest.number;
  const client = github.getOctokit(core.getInput('token'));
  let prData = pullRequest;

  if (!hasRequestedReviewers(pullRequest)) {
    const { data: fetchedPr } = await client.rest.pulls.get({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      pull_number: pullNumber,
    });
    if (fetchedPr.draft) {
      return;
    }
    prData = fetchedPr;
  } else if (pullRequest.draft) {
    return;
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
