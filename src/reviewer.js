function hasRequestedReviewers(pullRequest) {
  const requestedReviewers = pullRequest.requested_reviewers || [];
  const hasHumanReviewers = requestedReviewers.some(
    (reviewer) => reviewer.type === 'User',
  );
  const requestedTeams = pullRequest.requested_teams || [];
  const hasTeamReviewers = requestedTeams.length > 0;

  return hasHumanReviewers || hasTeamReviewers;
}

async function hasReviewers(client, owner, repo, pullNumber, pullRequest) {
  const hasRequested = hasRequestedReviewers(pullRequest);
  if (hasRequested) {
    return true;
  }

  const { data: reviews } = await client.rest.pulls.listReviews({
    owner,
    repo,
    pull_number: pullNumber,
  });

  return reviews.some((review) => review.user?.type !== 'Bot');
}

module.exports = { hasReviewers, hasRequestedReviewers };
