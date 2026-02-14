const isGithubActions = process.env.GITHUB_ACTIONS === 'true';

let assetPrefix = '';
let basePath = '';

if (isGithubActions && process.env.GITHUB_REPOSITORY) {
  const [, repo] = process.env.GITHUB_REPOSITORY.split('/');
  basePath = `/${repo}`;
  assetPrefix = `/${repo}/`;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  assetPrefix,
  basePath,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
};

module.exports = nextConfig;
