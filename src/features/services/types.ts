export interface ServiceMetric {
  value: string;
  label: string;
  description: string;
}

export interface ServiceCapability {
  title: string;
  description: string;
  tag?: string;
}

export interface ServiceWorkflowStep {
  step: string;
  title: string;
  description: string;
}

export interface ServiceFaqItem {
  question: string;
  answer: string;
}

export interface ServiceStatementConfig {
  badge: string;
  headline: string;
  description: string;
  secondaryDescription?: string;
  ctaText: string;
  ctaHref: string;
}

export interface ServiceCapabilitiesConfig {
  badge: string;
  headline: string;
  description: string;
  items: ServiceCapability[];
}

export interface ServiceWorkflowConfig {
  badge: string;
  headline: string;
  description: string;
  steps: ServiceWorkflowStep[];
}

export interface ServiceLandscapeConfig {
  image: string;
  imageAlt: string;
  headline: string;
  subheadline?: string;
  ctaText?: string;
  ctaHref?: string;
}

export interface ServiceFaqConfig {
  badge: string;
  headline: string;
  description: string;
  items: ServiceFaqItem[];
}

export interface ServiceCtaConfig {
  badge: string;
  headline: string;
  description: string;
  primaryCta: {
    text: string;
    href: string;
  };
  secondaryCta?: {
    text: string;
    href: string;
  };
}

export interface ServicePageConfig {
  slug: string;
  title: string;
  heroTitle: string;
  heroImage: string;
  heroImageAlt: string;
  breadcrumbTitle: string;
  statement: ServiceStatementConfig;
  metrics: ServiceMetric[];
  capabilities: ServiceCapabilitiesConfig;
  workflow: ServiceWorkflowConfig;
  landscapeBanner: ServiceLandscapeConfig;
  faqs: ServiceFaqConfig;
  ctaBanner: ServiceCtaConfig;
}
