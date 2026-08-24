function normalizeNotifyTarget(target) {
  const normalized = target.trim().replace(/^@+/, '');
  if (!normalized) {
    throw new Error('Input "notify-target" must not be empty.');
  }
  return `@${normalized}`;
}

function buildCommentBody(template, notifyTarget) {
  const body = template.includes('{notifyTarget}')
    ? template.replaceAll('{notifyTarget}', notifyTarget)
    : `${notifyTarget} ${template}`;
  return body;
}

module.exports = { normalizeNotifyTarget, buildCommentBody };
