# notify-no-reviewer-action

Notify a GitHub user or team when a non-draft pull request has no requested
reviewer (user or team) and no existing reviews.

## How it works

1. Draft pull requests are treated as already handled.
2. The action first checks the webhook payload for requested reviewers.
3. Reviewers in `requested_reviewers` count only when their `type` is `User`.
4. Any team present in `requested_teams` also counts as a requested reviewer.
5. Since webhook payloads may be stale by the time the action runs, the action
   refreshes the pull request data when no requested reviewer is found.
6. The action fetches existing pull request reviews.
7. A comment is created only when there is no requested human reviewer, no
   requested team reviewer, and no existing review from a human (bot reviews
   are ignored).

## Basic usage

```yaml
name: Notify if no reviewer assigned

on:
  pull_request:
    types: [opened, ready_for_review]

permissions:
  pull-requests: write

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - uses: OWNER/REPO@v1
        with:
          notify-target: my-org/backend-team
```

## Customizing the comment

```yaml
with:
  notify-target: my-org/backend-team
  comment-template: |
    {notifyTarget}, this PR is ready for review but currently has no reviewer. Please assign one.
```

`{notifyTarget}` is replaced with the normalized mention. If a custom
template omits it, the mention is prepended automatically.

## Inputs

| Name | Required | Default | Description |
| --- | --- | --- | --- |
| `token` | No | `${{ github.token }}` | Token used to read reviews and create comments. |
| `notify-target` | Yes | — | GitHub username or `organization/team`, without `@`. |
| `comment-template` | No | `{notifyTarget}, Please request a reviewer for this PR.` | Comment text; supports `{notifyTarget}`. |

Both `tjnurmin` and `@tjnurmin` produce `@tjnurmin`. Team targets such as
`my-org/backend-team` produce `@my-org/backend-team`.

## Outputs

| Name | Description |
| --- | --- |
| `has-reviewers` | `true` when a requested human reviewer, requested team reviewer, or existing review from a human was found. |
| `notified` | `true` when a notification comment was posted. |

## Required permissions

The workflow token needs:

```yaml
permissions:
  pull-requests: write
```

This permission allows reading reviews and creating the pull request comment.
