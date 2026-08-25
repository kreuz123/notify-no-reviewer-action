async function hasReviewers(client, owner, repo, pullNumber, pullRequest) {
  const requestedReviewers = pullRequest.requested_reviewers || [];
  const hasHumanReviewers = requestedReviewers.some(
    (reviewer) => reviewer.type === 'User',
  );
  const requestedTeams = pullRequest.requested_teams || [];
  const hasTeamReviewers = requestedTeams.length > 0;
  if (hasHumanReviewers || hasTeamReviewers) {
    return true;
  }

  const { data: reviews } = await client.rest.pulls.listReviews({
    owner,
    repo,
    pull_number: pullNumber,
  });

  return reviews.some((review) => review.user?.type !== 'Bot');
}

module.exports = { hasReviewers };
