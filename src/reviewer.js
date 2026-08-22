async function hasReviewers(client, owner, repo, pullNumber, pullRequest) {
  const requestedReviewers = pullRequest.requested_reviewers || [];
  const hasHumanReviewers = requestedReviewers.some(
    (reviewer) => reviewer.type === 'User',
  );
  const { data: reviews } = await client.rest.pulls.listReviews({
    owner,
    repo,
    pull_number: pullNumber,
  });

  return hasHumanReviewers || reviews.length > 0;
}

module.exports = { hasReviewers };
