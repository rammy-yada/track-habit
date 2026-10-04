import { getPosts, postDescription } from "@/lib/blog";
import { APP_NAME } from "@/lib/constants";
import { FAQ } from "@/lib/faq";
import { SITE_DESCRIPTION, SITE_URL } from "@/lib/site";

export const revalidate = 3600;

/**
 * GET /llms.txt — a plain-text guide to the site for AI assistants (the
 * llmstxt.org convention): what the site is, and where its pages are.
 */
export async function GET() {
  const posts = await getPosts().catch(() => []);
  const text = `# ${APP_NAME}

> ${SITE_DESCRIPTION}

${APP_NAME} is a free web app (installable on phones and computers) for tracking daily, weekly and monthly habits. It has no ads and works offline. Its yearly challenge, the Winter Arc, runs from October 1 to January 31.

## Main pages

- [Home](${SITE_URL}/): what ${APP_NAME} does, with common questions
- [Winter Arc](${SITE_URL}/winter-arc): the 123-day challenge, how points and the leaderboard work
- [Blog](${SITE_URL}/blog): articles on habits and discipline
- [Create an account](${SITE_URL}/register): free sign-up, with email or Google
- [Collaborate](${SITE_URL}/collaborate): for creators, colleges, gyms and developers
- [Brand deals](${SITE_URL}/brand-deals): sponsorship and partnerships

## Blog posts

${posts.map((post) => `- [${post.title}](${SITE_URL}/blog/${post.slug}): ${postDescription(post)}`).join("\n") || "- (none yet)"}

## Common questions

${FAQ.map((item) => `### ${item.q}\n${item.a}`).join("\n\n")}

## Policies

- [Privacy Policy](${SITE_URL}/privacy)
- [Terms of Service](${SITE_URL}/terms)
`;
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
