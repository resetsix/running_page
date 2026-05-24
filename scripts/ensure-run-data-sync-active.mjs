#!/usr/bin/env node

const owner = process.env.RUNNING_PAGE_OWNER || 'resetsix';
const repo = process.env.RUNNING_PAGE_REPO || 'running_page';
const workflow = process.env.RUNNING_PAGE_WORKFLOW || 'run_data_sync.yml';
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const trigger =
  process.env.TRIGGER_RUN === 'true' || process.argv.includes('--trigger');

if (!token) {
  console.error(
    'Missing GITHUB_TOKEN or GH_TOKEN. Token needs repo/actions write access.'
  );
  process.exit(2);
}

async function github(path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'running-page-workflow-watchdog',
      ...(options.headers || {}),
    },
  });

  if (response.status === 204) return null;

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const detail = body?.message ? `: ${body.message}` : '';
    throw new Error(
      `${options.method || 'GET'} ${path} failed (${response.status})${detail}`
    );
  }

  return body;
}

async function main() {
  const workflowPath = `/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(workflow)}`;
  const before = await github(workflowPath);

  console.log(`${owner}/${repo} ${workflow}: ${before.state}`);

  if (before.state !== 'active') {
    await github(`${workflowPath}/enable`, { method: 'PUT' });
    const after = await github(workflowPath);
    console.log(`enabled: ${after.state}`);
  }

  if (trigger) {
    await github(`${workflowPath}/dispatches`, {
      method: 'POST',
      body: JSON.stringify({ ref: 'master' }),
      headers: { 'Content-Type': 'application/json' },
    });
    console.log('workflow_dispatch requested');
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
