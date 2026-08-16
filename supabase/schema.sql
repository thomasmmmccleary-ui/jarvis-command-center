-- J.A.R.V.I.S. Command Center — Supabase Schema
-- Run this in the Supabase SQL Editor

-- Create agents table
create table if not exists public.agents (
  id text primary key,
  name text not null,
  category text not null default '',
  status text not null default 'queued' check (status in ('queued', 'active', 'completed')),
  current_task text,
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.agents enable row level security;

-- Allow public read (dashboard is read-only)
create policy "Public read agents"
  on public.agents for select
  using (true);

-- Allow service role to update (for future OpenClaw webhook bridge)
create policy "Service role can update agents"
  on public.agents for all
  using (auth.role() = 'service_role');

-- Enable Realtime
alter publication supabase_realtime add table public.agents;

-- Seed all 111 agents
insert into public.agents (id, name, category, status) values
  ('academic-coach', 'Academic Coach', 'Education', 'queued'),
  ('ad-creative', 'Ad Creative', 'Advertising', 'queued'),
  ('ad-mockup-builder', 'Ad Mockup Builder', 'Advertising', 'queued'),
  ('ad-scriptwriter', 'Ad Scriptwriter', 'Advertising', 'queued'),
  ('affiliate-marketing-agent', 'Affiliate Marketing', 'Marketing', 'queued'),
  ('agent-builder', 'Agent Builder', 'Platform', 'queued'),
  ('agent-debugger', 'Agent Debugger', 'Platform', 'queued'),
  ('agent-editor', 'Agent Editor', 'Platform', 'queued'),
  ('agent-tester', 'Agent Tester', 'Platform', 'queued'),
  ('ai-prompt-engineer', 'AI Prompt Engineer', 'Platform', 'queued'),
  ('analytics-review', 'Analytics Review', 'Analytics', 'queued'),
  ('api-integrator', 'API Integrator', 'Engineering', 'queued'),
  ('audience-insights', 'Audience Insights', 'Research', 'queued'),
  ('audience-intelligence', 'Audience Intelligence', 'Research', 'queued'),
  ('automation-builder', 'Automation Builder', 'Engineering', 'queued'),
  ('brand-deals-agent', 'Brand Deals', 'Partnerships', 'queued'),
  ('brand-kit-builder', 'Brand Kit Builder', 'Creative', 'queued'),
  ('brand-safety-agent', 'Brand Safety', 'Compliance', 'queued'),
  ('brand-voice', 'Brand Voice', 'Creative', 'queued'),
  ('business-plan-writer', 'Business Plan Writer', 'Strategy', 'queued'),
  ('campaign-strategy', 'Campaign Strategy', 'Marketing', 'queued'),
  ('case-study-builder', 'Case Study Builder', 'Content', 'queued'),
  ('community-manager', 'Community Manager', 'Social', 'queued'),
  ('competitive-intel', 'Competitive Intel', 'Research', 'queued'),
  ('compliance-checker', 'Compliance Checker', 'Compliance', 'queued'),
  ('content-repurposer', 'Content Repurposer', 'Content', 'queued'),
  ('content-scheduler', 'Content Scheduler', 'Operations', 'queued'),
  ('context-switcher', 'Context Switcher', 'Platform', 'queued'),
  ('copywriter', 'Copywriter', 'Creative', 'queued'),
  ('course-builder', 'Course Builder', 'Education', 'queued'),
  ('creative-gallery-agent', 'Creative Gallery', 'Creative', 'queued'),
  ('creative-review', 'Creative Review', 'Creative', 'queued'),
  ('crisis-comms-agent', 'Crisis Comms', 'PR', 'queued'),
  ('daily-briefing-agent', 'Daily Briefing', 'Operations', 'queued'),
  ('data-analyst', 'Data Analyst', 'Analytics', 'queued'),
  ('database-architect', 'Database Architect', 'Engineering', 'queued'),
  ('debate-prep-agent', 'Debate Prep', 'Education', 'queued'),
  ('devops-agent', 'DevOps Agent', 'Engineering', 'queued'),
  ('documents-agent', 'Documents Agent', 'Operations', 'queued'),
  ('email-marketing', 'Email Marketing', 'Marketing', 'queued'),
  ('event-marketing-agent', 'Event Marketing', 'Marketing', 'queued'),
  ('exam-prep-agent', 'Exam Prep', 'Education', 'queued'),
  ('funding-researcher', 'Funding Researcher', 'Research', 'queued'),
  ('github-manager', 'GitHub Manager', 'Engineering', 'queued'),
  ('global-expansion-researcher', 'Global Expansion', 'Research', 'queued'),
  ('image-analyzer', 'Image Analyzer', 'Creative', 'queued'),
  ('instagram-analytics-agent', 'Instagram Analytics', 'Analytics', 'queued'),
  ('instagram-strategist', 'Instagram Strategist', 'Social', 'queued'),
  ('international-markets-agent', 'International Markets', 'Research', 'queued'),
  ('knowledge-base-curator', 'Knowledge Base Curator', 'Memory', 'queued'),
  ('knowledge-graph', 'Knowledge Graph', 'Memory', 'queued'),
  ('learning-engine', 'Learning Engine', 'Memory', 'queued'),
  ('legal-plain-english', 'Legal Plain English', 'Compliance', 'queued'),
  ('linkedin-strategist', 'LinkedIn Strategist', 'Social', 'queued'),
  ('local-marketing-agent', 'Local Marketing', 'Marketing', 'queued'),
  ('local-seo-agent', 'Local SEO', 'SEO', 'queued'),
  ('mac-agent', 'Mac Agent', 'Platform', 'queued'),
  ('market-entry-strategist', 'Market Entry Strategist', 'Strategy', 'queued'),
  ('market-research', 'Market Research', 'Research', 'queued'),
  ('memory-curator', 'Memory Curator', 'Memory', 'queued'),
  ('merch-strategist', 'Merch Strategist', 'Strategy', 'queued'),
  ('mission-memory', 'Mission Memory', 'Memory', 'queued'),
  ('mission-planner', 'Mission Planner', 'Operations', 'queued'),
  ('mission-reviewer', 'Mission Reviewer', 'Operations', 'queued'),
  ('mobile-app-planner', 'Mobile App Planner', 'Engineering', 'queued'),
  ('mockup-designer', 'Mockup Designer', 'Creative', 'queued'),
  ('monetization-strategist', 'Monetization Strategist', 'Strategy', 'queued'),
  ('news-monitor', 'News Monitor', 'Research', 'queued'),
  ('newsletter-builder', 'Newsletter Builder', 'Content', 'queued'),
  ('ops-manager', 'Ops Manager', 'Operations', 'queued'),
  ('paid-ads-manager', 'Paid Ads Manager', 'Advertising', 'queued'),
  ('paper-writer', 'Paper Writer', 'Education', 'queued'),
  ('partnerships-agent', 'Partnerships', 'Partnerships', 'queued'),
  ('personal-brand-strategist', 'Personal Brand Strategist', 'Strategy', 'queued'),
  ('pitch-deck-builder', 'Pitch Deck Builder', 'Strategy', 'queued'),
  ('podcast-monitor', 'Podcast Monitor', 'Research', 'queued'),
  ('podcast-producer', 'Podcast Producer', 'Content', 'queued'),
  ('podcast-scriptwriter', 'Podcast Scriptwriter', 'Content', 'queued'),
  ('pr-media-agent', 'PR & Media', 'PR', 'queued'),
  ('preference-memory', 'Preference Memory', 'Memory', 'queued'),
  ('presentation-builder', 'Presentation Builder', 'Content', 'queued'),
  ('pricing-strategist', 'Pricing Strategist', 'Strategy', 'queued'),
  ('professor-perspective-agent', 'Professor Perspective', 'Education', 'queued'),
  ('reddit-monitor', 'Reddit Monitor', 'Research', 'queued'),
  ('reels-scriptwriter', 'Reels Scriptwriter', 'Content', 'queued'),
  ('research-synthesizer', 'Research Synthesizer', 'Research', 'queued'),
  ('sales-scriptwriter', 'Sales Scriptwriter', 'Sales', 'queued'),
  ('screen-reader-agent', 'Screen Reader', 'Platform', 'queued'),
  ('seo-research', 'SEO Research', 'SEO', 'queued'),
  ('slack-summarizer', 'Slack Summarizer', 'Operations', 'queued'),
  ('storyboard-agent', 'Storyboard', 'Creative', 'queued'),
  ('system-auditor', 'System Auditor', 'Platform', 'queued'),
  ('tiktok-analytics-agent', 'TikTok Analytics', 'Analytics', 'queued'),
  ('tiktok-audio-researcher', 'TikTok Audio', 'Research', 'queued'),
  ('tiktok-frame-advisor', 'TikTok Frame Advisor', 'Creative', 'queued'),
  ('tiktok-growth-agent', 'TikTok Growth', 'Social', 'queued'),
  ('tiktok-scriptwriter', 'TikTok Scriptwriter', 'Content', 'queued'),
  ('tiktok-strategist', 'TikTok Strategist', 'Social', 'queued'),
  ('trend-forecasting', 'Trend Forecasting', 'Research', 'queued'),
  ('ui-ux-designer', 'UI/UX Designer', 'Creative', 'queued'),
  ('video-intelligence', 'Video Intelligence', 'Creative', 'queued'),
  ('video-script', 'Video Script', 'Content', 'queued'),
  ('viral-hook-tester', 'Viral Hook Tester', 'Content', 'queued'),
  ('web-developer', 'Web Developer', 'Engineering', 'queued'),
  ('web-researcher', 'Web Researcher', 'Research', 'queued'),
  ('webapp-builder', 'Webapp Builder', 'Engineering', 'queued'),
  ('youtube-monitor', 'YouTube Monitor', 'Research', 'queued'),
  ('youtube-scriptwriter', 'YouTube Scriptwriter', 'Content', 'queued'),
  ('youtube-seo-agent', 'YouTube SEO', 'SEO', 'queued'),
  ('youtube-strategist', 'YouTube Strategist', 'Social', 'queued')
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category;
