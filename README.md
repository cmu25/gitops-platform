# gitops-platform
![Vercel](https://img.shields.io/badge/deployed%20on-Vercel-black?logo=vercel)
![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/runtime-Node.js-green?logo=node.js)
This project lets you create two repos for a GitOps Workflow (app + config) automatically. Deployed on [Vercel](https://gitops-platform.vercel.app/).

## Overview
This template can be used to automate setting up a GitOps environment. This way, developers can focus on creating their application, while separating it from the configuration files. It can be used by teams or solo devs who want to save time on their projects by automating infrastructure.

## Architecture
### OAuth App
Orginally, I wanted to use a GitHub App for authentification and create and seed repos with GitHub Actions. Unfortunately, I had to find out that a GH App can only create repositories in organizations, but not in personal accounts. Since Accessibility was paramount for this project, restricting it to organizations only was not an option to me. Neither was having personal account users manually create a token, add it to the secrets of a template, and manually delete it after the repository setup. Ease of use was also central to me, and this approach seemed awkward with too much friction. In the end, I settled on using an OAuth App. It allows Users to quickly set up a dual repository system in a few clicks, without having to generate a secret.

### Vercel Serverless Functions
I used Vercel to implement my OAuth App, because it automatically deploys from GitHub with little setup, which was important to me because I wanted my OAuth App to be stable and reliable, and to focus on other parts of the project besides server-handling. I also considered Cloudflare workers, but the free tier only gives 10 milliseconds of CPU per request. With my setup (several sequential calls to GitHub API), I was worried that would not be enough.

## How it Works
1. The User visits the Vercel App and enters their App's name
2. They click "Setup" and are prompted to sign in with their GitHub Account
3. The User chooses if the repositories should be created in their personal account or any organization they are part of via a clickable dropdown-menu
4. The User clicks "Confirm" and the Vercel App creates the repositories in the background
5. The User is redirected to the app repository of their freshly created dual-repo setup

## Setup

## Usage

## Known Limitations
### OAuth App instead of GitHub App for Repository Setup
As explained in the Architecture Section, i traded off the modernity and added security of a GitHub App for a more old-fashioned OAuth App, which allowed for a smoother, more accessible User Experience. Because OAuth App Tokens are much longer lived compared to GitHub App tokens, automatically revoking the former's permissions after they have served their purpose is essential.

## Tech Stack
- GitHub OAuth App to conveniently create repositories
- Vercel Serverless Functions to implement the OAuth App on the server side

## Road Map (What's next?)
1. Automatically revoke OAuth App token permissions after successful repository creation
2. Seeding repositories with templates
3. Adding a rollback mechanism in case the repo creation fails
4. Automatically Link repositories together after creation
5. Implement automatic ArgoCD setup