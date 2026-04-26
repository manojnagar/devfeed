/**
 * @file Company publisher seed data.
 *
 * The original starter list of 40 engineering blogs from `PLAN.md §7`.
 * Each entry seeds one row in `publishers` (type='company') plus one
 * row in `blog_sources` pointing at the RSS / Atom feed.
 *
 * Pure data — no logic. The store reads from this and the in-memory
 * repository hydrates it on first use.
 */

export interface CompanySeed {
  slug: string;
  name: string;
  websiteUrl: string;
  feedUrl: string;
  description: string;
}

export const COMPANY_SEEDS: CompanySeed[] = [
  { slug: "airbnb", name: "Airbnb Engineering", websiteUrl: "https://medium.com/airbnb-engineering", feedUrl: "https://medium.com/feed/airbnb-engineering", description: "How Airbnb builds and scales its global platform." },
  { slug: "atlassian", name: "Atlassian Developers", websiteUrl: "https://developer.atlassian.com/blog/", feedUrl: "https://developer.atlassian.com/blog/feed.xml", description: "Engineering posts from the team behind Jira and Confluence." },
  { slug: "aws", name: "AWS Blog", websiteUrl: "https://aws.amazon.com/blogs/aws/", feedUrl: "https://aws.amazon.com/blogs/aws/feed/", description: "Announcements and deep dives from AWS." },
  { slug: "bitly", name: "Bitly Engineering", websiteUrl: "https://word.bitly.com/", feedUrl: "https://word.bitly.com/feed", description: "Stories from the team building the URL shortener at scale." },
  { slug: "box", name: "Box Engineering", websiteUrl: "https://blog.box.com/blog/category/engineering", feedUrl: "https://blog.box.com/blog/category/engineering/feed", description: "Cloud content management infrastructure stories." },
  { slug: "dropbox", name: "Dropbox Tech", websiteUrl: "https://dropbox.tech/", feedUrl: "https://dropbox.tech/feed", description: "Engineering and infrastructure posts from Dropbox." },
  { slug: "quora", name: "Quora Engineering", websiteUrl: "https://www.quora.com/q/quoraengineering", feedUrl: "https://www.quora.com/q/quoraengineering/rss", description: "Engineering posts from Quora." },
  { slug: "ebay", name: "eBay Tech", websiteUrl: "https://innovation.ebayinc.com/tech/", feedUrl: "https://innovation.ebayinc.com/tech/feed/", description: "Technology, engineering, and infrastructure posts from eBay." },
  { slug: "evernote", name: "Evernote Tech", websiteUrl: "https://evernote.com/blog/category/tech/", feedUrl: "https://evernote.com/blog/category/tech/feed/", description: "Engineering posts from Evernote." },
  { slug: "etsy", name: "Etsy Code as Craft", websiteUrl: "https://www.etsy.com/codeascraft", feedUrl: "https://www.etsy.com/codeascraft/feed", description: "Engineering culture and craftsmanship at Etsy." },
  { slug: "facebook", name: "Meta Engineering", websiteUrl: "https://engineering.fb.com/", feedUrl: "https://engineering.fb.com/feed/", description: "Posts from the Meta engineering blog." },
  { slug: "figma", name: "Figma Engineering", websiteUrl: "https://www.figma.com/blog/engineering/", feedUrl: "https://www.figma.com/blog/engineering/rss/", description: "Building Figma — design tools, infra, and culture." },
  { slug: "flickr", name: "Flickr Code", websiteUrl: "https://code.flickr.net/", feedUrl: "https://code.flickr.net/feed/", description: "Engineering at Flickr." },
  { slug: "github", name: "GitHub Engineering", websiteUrl: "https://github.blog/engineering/", feedUrl: "https://github.blog/engineering/feed/", description: "How we build GitHub, by the team that builds GitHub." },
  { slug: "google-research", name: "Google Research", websiteUrl: "https://research.google/blog/", feedUrl: "https://research.google/blog/rss/", description: "Research at Google — papers, products, and projects." },
  { slug: "groupon", name: "Groupon Engineering", websiteUrl: "https://groupon.engineering/", feedUrl: "https://groupon.engineering/feed/", description: "Building Groupon at scale." },
  { slug: "heroku", name: "Heroku Engineering", websiteUrl: "https://blog.heroku.com/engineering", feedUrl: "https://blog.heroku.com/engineering.atom", description: "Engineering posts from Heroku." },
  { slug: "hubspot", name: "HubSpot Product & Engineering", websiteUrl: "https://product.hubspot.com/blog/topic/engineering", feedUrl: "https://product.hubspot.com/blog/rss.xml", description: "Engineering posts from the HubSpot product team." },
  { slug: "instagram", name: "Instagram Engineering", websiteUrl: "https://instagram-engineering.com/", feedUrl: "https://instagram-engineering.com/feed", description: "Engineering posts from Instagram." },
  { slug: "intel", name: "Intel Software", websiteUrl: "https://www.intel.com/content/www/us/en/developer/articles/", feedUrl: "https://www.intel.com/content/www/us/en/developer/topic-technology/feed.xml", description: "Software development articles from Intel." },
  { slug: "linkedin", name: "LinkedIn Engineering", websiteUrl: "https://engineering.linkedin.com/", feedUrl: "https://engineering.linkedin.com/blog.rss.html", description: "Engineering posts from the LinkedIn team." },
  { slug: "lyft", name: "Lyft Engineering", websiteUrl: "https://eng.lyft.com/", feedUrl: "https://eng.lyft.com/feed", description: "Engineering posts from Lyft." },
  { slug: "microsoft", name: "Microsoft Engineering", websiteUrl: "https://devblogs.microsoft.com/engineering-at-microsoft/", feedUrl: "https://devblogs.microsoft.com/engineering-at-microsoft/feed/", description: "Engineering culture posts from Microsoft." },
  { slug: "microsoft-python", name: "Microsoft Python", websiteUrl: "https://devblogs.microsoft.com/python/", feedUrl: "https://devblogs.microsoft.com/python/feed/", description: "Python at Microsoft — language and tooling." },
  { slug: "netflix", name: "Netflix Tech", websiteUrl: "https://netflixtechblog.com/", feedUrl: "https://netflixtechblog.com/feed", description: "Building and scaling the Netflix streaming platform." },
  { slug: "paypal", name: "PayPal Engineering", websiteUrl: "https://medium.com/paypal-tech", feedUrl: "https://medium.com/feed/paypal-tech", description: "Engineering and product posts from PayPal." },
  { slug: "pinterest", name: "Pinterest Engineering", websiteUrl: "https://medium.com/pinterest-engineering", feedUrl: "https://medium.com/feed/pinterest-engineering", description: "Engineering posts from Pinterest." },
  { slug: "reddit", name: "Reddit Blog", websiteUrl: "https://www.redditinc.com/blog", feedUrl: "https://www.redditinc.com/blog/rss.xml", description: "Engineering and product posts from Reddit." },
  { slug: "robinhood", name: "Robinhood Engineering", websiteUrl: "https://newsroom.aboutrobinhood.com/category/engineering/", feedUrl: "https://newsroom.aboutrobinhood.com/category/engineering/feed/", description: "Building Robinhood — trading systems and infrastructure." },
  { slug: "salesforce", name: "Salesforce Engineering", websiteUrl: "https://engineering.salesforce.com/", feedUrl: "https://engineering.salesforce.com/feed/", description: "Engineering posts from Salesforce." },
  { slug: "shopify", name: "Shopify Engineering", websiteUrl: "https://shopify.engineering/", feedUrl: "https://shopify.engineering/blog.atom", description: "Building commerce at scale, by Shopify engineers." },
  { slug: "slack", name: "Slack Engineering", websiteUrl: "https://slack.engineering/", feedUrl: "https://slack.engineering/feed", description: "Engineering posts from Slack." },
  { slug: "snap", name: "Snap Engineering", websiteUrl: "https://eng.snap.com/blog/", feedUrl: "https://eng.snap.com/blog/rss.xml", description: "Building the Snapchat platform." },
  { slug: "spotify", name: "Spotify Engineering", websiteUrl: "https://engineering.atspotify.com/", feedUrl: "https://engineering.atspotify.com/feed/", description: "Engineering culture and infra at Spotify." },
  { slug: "stripe", name: "Stripe Engineering", websiteUrl: "https://stripe.com/blog/engineering", feedUrl: "https://stripe.com/blog/feed.rss", description: "Engineering posts from Stripe." },
  { slug: "twilio", name: "Twilio Engineering", websiteUrl: "https://www.twilio.com/blog/category/engineering", feedUrl: "https://www.twilio.com/en-us/blog/category/engineering/feed", description: "Engineering posts from Twilio." },
  { slug: "twitter", name: "X (Twitter) Engineering", websiteUrl: "https://blog.twitter.com/engineering/en_us", feedUrl: "https://blog.twitter.com/engineering/en_us/blog.rss", description: "Engineering posts from the X / Twitter platform team." },
  { slug: "uber", name: "Uber Engineering", websiteUrl: "https://www.uber.com/en-IN/blog/engineering/", feedUrl: "https://www.uber.com/en-IN/blog/engineering/rss/", description: "Engineering posts from Uber." },
  { slug: "yahoo", name: "Yahoo Engineering", websiteUrl: "https://yahooeng.tumblr.com/", feedUrl: "https://yahooeng.tumblr.com/rss", description: "Engineering posts from Yahoo." },
  { slug: "yelp", name: "Yelp Engineering", websiteUrl: "https://engineeringblog.yelp.com/", feedUrl: "https://engineeringblog.yelp.com/feed.xml", description: "Engineering posts from Yelp." },
];
