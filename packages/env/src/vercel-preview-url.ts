import process from 'node:process'

/**
 * Vercel gives each project a stable per-branch preview domain
 * (`<project>-git-<branch-slug>-<scope>.vercel.app`), but there is no
 * built-in var for a *sibling* project's preview URL. All four projects
 * in this repo deploy from the same branch and scope, so swap the
 * project-name prefix on our own `VERCEL_BRANCH_URL` to get the sibling's.
 */
export function resolveVercelPreviewUrl(targetProjectName: string): string | undefined {
  if (process.env.VERCEL_ENV !== 'preview')
    return undefined

  const branchUrl = process.env.VERCEL_BRANCH_URL
  const gitIndex = branchUrl?.indexOf('-git-')
  if (!branchUrl || gitIndex === undefined || gitIndex < 0)
    return undefined

  return `https://${targetProjectName}${branchUrl.slice(gitIndex)}`
}
