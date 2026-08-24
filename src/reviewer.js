async function hasReviewers(client, owner, repo, pullNumber, pullRequest) {
  const requestedReviewers = pullRequest.requested_reviewers || [];
  const hasHumanReviewers = requestedReviewers.some(
    (reviewer) => reviewer.type === 'User',
  );
  const requestedTeams = pullRequest.requested_teams || [];
  const hasTeamReviewers = requestedTeams.length > 0;
  const { data: reviews } = await client.rest.pulls.listReviews({
    owner,
    repo,
    pull_number: pullNumber,
  });

  return hasHumanReviewers || hasTeamReviewers || reviews.length > 0;
}

module.exports = { hasReviewers };
