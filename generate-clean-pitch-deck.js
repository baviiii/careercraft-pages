import pptxgen from 'pptxgenjs';

const pres = new pptxgen();

pres.author = 'Horus Intelligence Team';
pres.company = 'Horus Intelligence';
pres.subject = 'Government Pitch Deck';
pres.title = 'Horus Intelligence - SA Government Proposal';
pres.layout = 'LAYOUT_WIDE';

// Color palette matching the Horus logo
const colors = {
  navy: '1a4d7a',        // Deep navy from logo
  cyan: '00a8cc',        // Bright cyan/turquoise from logo
  darkblue: '0d3b66',    // Darker blue
  lightblue: 'e8f4f8',   // Very light blue
  slate: '334155',       // Text color
  gray: '64748b',        // Secondary text
  lightgray: 'e2e8f0',   // Backgrounds
  white: 'ffffff'
};

// ============================================================================
// SLIDE 1: TITLE
// ============================================================================
let slide = pres.addSlide();
slide.background = { color: colors.navy };

// Add logo
slide.addImage({
  path: 'public/logo.png',
  x: 11, y: 0.3, w: 2, h: 2
});

slide.addText('Horus Intelligence', {
  x: 1, y: 2.5, w: '75%', h: 1,
  fontSize: 56, bold: true, color: colors.white
});

slide.addText('Bringing Government Documents to Life with AI', {
  x: 1, y: 3.6, w: '75%', h: 0.5,
  fontSize: 24, color: colors.lightblue
});

slide.addText('Proposal for South Australian Government', {
  x: 1, y: 5.5, w: '75%', h: 0.3,
  fontSize: 16, color: colors.lightblue
});

slide.addText('February 2026', {
  x: 1, y: 6, w: '75%', h: 0.3,
  fontSize: 14, color: colors.gray
});

// ============================================================================
// SLIDE 2: THE PROBLEM
// ============================================================================
slide = pres.addSlide();
slide.background = { color: colors.white };

// Small logo in corner
slide.addImage({
  path: 'public/logo.png',
  x: 12.2, y: 0.3, w: 1, h: 1
});

slide.addText('The Problem', {
  x: 0.5, y: 0.5, w: '90%', h: 0.6,
  fontSize: 40, bold: true, color: colors.navy
});

const problems = [
  'Frontline staff spend 5-10 hours per week searching through policy documents',
  'Information is trapped in static PDFs across 50+ departments',
  '2026 Regulatory Reform requires automated contradiction detection',
  'No way to discover connections between programs, funding, and outcomes',
  'Staff need answers in seconds, not hours'
];

problems.forEach((problem, idx) => {
  slide.addText('•', {
    x: 1.5, y: 1.8 + (idx * 0.8), w: 0.3, h: 0.3,
    fontSize: 24, color: colors.cyan, bold: true
  });

  slide.addText(problem, {
    x: 2, y: 1.8 + (idx * 0.8), w: 10, h: 0.6,
    fontSize: 20, color: colors.slate
  });
});

slide.addShape(pres.ShapeType.rect, {
  x: 1, y: 6.2, w: 11.6, h: 1,
  fill: { color: colors.lightblue }
});

slide.addText('Office for AI has $28M available for "freeing up frontline staff"', {
  x: 1.5, y: 6.5, w: 10.6, h: 0.4,
  fontSize: 18, bold: true, color: colors.navy
});

// ============================================================================
// SLIDE 3: OUR SOLUTION
// ============================================================================
slide = pres.addSlide();
slide.background = { color: colors.white };

slide.addImage({
  path: 'public/logo.png',
  x: 12.2, y: 0.3, w: 1, h: 1
});

slide.addText('Our Solution', {
  x: 0.5, y: 0.5, w: '90%', h: 0.6,
  fontSize: 40, bold: true, color: colors.navy
});

slide.addText('AI that transforms static documents into living intelligence', {
  x: 0.5, y: 1.2, w: '90%', h: 0.4,
  fontSize: 20, color: colors.slate
});

const solutions = [
  {
    title: 'Natural Language Search',
    desc: 'Ask questions in plain English, get answers in seconds'
  },
  {
    title: 'Automatic Connection Discovery',
    desc: 'See how programs, funding, and outcomes relate to each other'
  },
  {
    title: 'Contradiction Detection',
    desc: 'Automatically find conflicting information across all documents'
  },
  {
    title: 'Full Audit Trails',
    desc: 'Every answer includes source citations and confidence scores'
  },
  {
    title: 'Australian Infrastructure',
    desc: 'All data stays in Australia, compliant with government requirements'
  }
];

solutions.forEach((solution, idx) => {
  const yPos = 2.2 + (idx * 0.95);

  slide.addShape(pres.ShapeType.rect, {
    x: 1, y: yPos, w: 11.6, h: 0.8,
    fill: { color: colors.lightblue }
  });

  slide.addText(solution.title, {
    x: 1.5, y: yPos + 0.1, w: 10.6, h: 0.3,
    fontSize: 18, bold: true, color: colors.navy
  });

  slide.addText(solution.desc, {
    x: 1.5, y: yPos + 0.45, w: 10.6, h: 0.25,
    fontSize: 14, color: colors.slate
  });
});

// ============================================================================
// SLIDE 4: HOW IT WORKS
// ============================================================================
slide = pres.addSlide();
slide.background = { color: colors.white };

slide.addImage({
  path: 'public/logo.png',
  x: 12.2, y: 0.3, w: 1, h: 1
});

slide.addText('How It Works', {
  x: 0.5, y: 0.5, w: '90%', h: 0.6,
  fontSize: 40, bold: true, color: colors.navy
});

// Flow
const steps = [
  { num: '1', title: 'Upload Documents', desc: 'PDFs, policies, budgets' },
  { num: '2', title: 'AI Processing', desc: 'Extract text, tables, charts' },
  { num: '3', title: 'Build Knowledge Graph', desc: 'Map entities and relationships' },
  { num: '4', title: 'Enable Search', desc: 'Natural language queries' }
];

steps.forEach((step, idx) => {
  const xPos = 1.2 + (idx * 3);

  slide.addShape(pres.ShapeType.ellipse, {
    x: xPos, y: 1.8, w: 0.8, h: 0.8,
    fill: { color: colors.cyan }
  });

  slide.addText(step.num, {
    x: xPos, y: 2, w: 0.8, h: 0.4,
    fontSize: 28, bold: true, color: colors.white, align: 'center'
  });

  slide.addText(step.title, {
    x: xPos - 0.5, y: 2.8, w: 1.8, h: 0.4,
    fontSize: 16, bold: true, color: colors.navy, align: 'center'
  });

  slide.addText(step.desc, {
    x: xPos - 0.5, y: 3.2, w: 1.8, h: 0.5,
    fontSize: 12, color: colors.slate, align: 'center'
  });

  if (idx < steps.length - 1) {
    slide.addShape(pres.ShapeType.rightArrow, {
      x: xPos + 1, y: 2.1, w: 0.8, h: 0.4,
      fill: { color: colors.gray, transparency: 50 }
    });
  }
});

// Technology section
slide.addText('Technology Stack', {
  x: 0.5, y: 4.2, w: '90%', h: 0.4,
  fontSize: 24, bold: true, color: colors.navy
});

const tech = [
  'Azure AI Search for vector and keyword search',
  'GPT-4 Vision for extracting tables and charts from PDFs',
  'Neo4j for knowledge graph and relationship mapping',
  'Agentic AI for multi-step reasoning and validation'
];

tech.forEach((item, idx) => {
  slide.addText('•', {
    x: 1.5, y: 4.9 + (idx * 0.5), w: 0.3, h: 0.3,
    fontSize: 18, color: colors.cyan
  });

  slide.addText(item, {
    x: 2, y: 4.9 + (idx * 0.5), w: 10, h: 0.4,
    fontSize: 16, color: colors.slate
  });
});

// ============================================================================
// SLIDE 5: VALIDATION & TRUST
// ============================================================================
slide = pres.addSlide();
slide.background = { color: colors.white };

slide.addImage({
  path: 'public/logo.png',
  x: 12.2, y: 0.3, w: 1, h: 1
});

slide.addText('Government-Grade Validation', {
  x: 0.5, y: 0.5, w: '90%', h: 0.6,
  fontSize: 40, bold: true, color: colors.navy
});

slide.addText('Every answer is validated, cited, and auditable', {
  x: 0.5, y: 1.2, w: '90%', h: 0.4,
  fontSize: 18, color: colors.slate
});

// Confidence levels
const confidence = [
  { level: '75%+', action: 'Assert as Fact', desc: 'High confidence from multiple sources' },
  { level: '50-75%', action: 'Mention as Possible', desc: 'Medium confidence, partial evidence' },
  { level: '<50%', action: 'Flag for Human Review', desc: 'Low confidence, needs validation' }
];

confidence.forEach((item, idx) => {
  const yPos = 2.2 + (idx * 1.3);

  slide.addShape(pres.ShapeType.rect, {
    x: 1, y: yPos, w: 2.5, h: 0.8,
    fill: { color: colors.cyan }
  });

  slide.addText(item.level, {
    x: 1.2, y: yPos + 0.15, w: 2.1, h: 0.5,
    fontSize: 32, bold: true, color: colors.white, align: 'center'
  });

  slide.addText(item.action, {
    x: 4, y: yPos + 0.05, w: 8, h: 0.35,
    fontSize: 20, bold: true, color: colors.navy
  });

  slide.addText(item.desc, {
    x: 4, y: yPos + 0.45, w: 8, h: 0.3,
    fontSize: 14, color: colors.slate
  });
});

// Audit trail
slide.addText('Complete Audit Trail', {
  x: 0.5, y: 6, w: '90%', h: 0.4,
  fontSize: 20, bold: true, color: colors.navy
});

const auditItems = [
  'Source document and page number',
  'Confidence score and validation status',
  'Timestamp and user tracking'
];

auditItems.forEach((item, idx) => {
  slide.addText('•', {
    x: 1.5, y: 6.5 + (idx * 0.35), w: 0.3, h: 0.3,
    fontSize: 14, color: colors.cyan
  });

  slide.addText(item, {
    x: 2, y: 6.5 + (idx * 0.35), w: 10, h: 0.3,
    fontSize: 14, color: colors.slate
  });
});

// ============================================================================
// SLIDE 6: OUR STORY
// ============================================================================
slide = pres.addSlide();
slide.background = { color: colors.white };

slide.addImage({
  path: 'public/logo.png',
  x: 12.2, y: 0.3, w: 1, h: 1
});

slide.addText('Our Story', {
  x: 0.5, y: 0.5, w: '90%', h: 0.6,
  fontSize: 40, bold: true, color: colors.navy
});

// Timeline
slide.addShape(pres.ShapeType.rect, {
  x: 1, y: 1.8, w: 11.6, h: 0.05,
  fill: { color: colors.cyan }
});

const timeline = [
  {
    year: 'Phase 1',
    title: 'CareerCraft B2C',
    desc: 'Built resume builder and ATS analysis tools for job seekers. Gained traction with consumers.'
  },
  {
    year: 'Phase 2',
    title: 'AI Engine',
    desc: 'Developed the core intelligence platform - document processing, RAG, knowledge graphs.'
  },
  {
    year: 'Phase 3',
    title: 'B2B & B2G Focus',
    desc: 'Now taking the engine to government and enterprise. CareerCraft continues for consumers.'
  }
];

timeline.forEach((item, idx) => {
  const yPos = 2.5 + (idx * 1.6);

  slide.addShape(pres.ShapeType.ellipse, {
    x: 0.8, y: 1.7, w: 0.3, h: 0.3,
    fill: { color: colors.cyan }
  });

  slide.addText(item.year, {
    x: 1.5, y: yPos, w: 2, h: 0.4,
    fontSize: 16, bold: true, color: colors.cyan
  });

  slide.addText(item.title, {
    x: 1.5, y: yPos + 0.4, w: 10.5, h: 0.4,
    fontSize: 20, bold: true, color: colors.navy
  });

  slide.addText(item.desc, {
    x: 1.5, y: yPos + 0.8, w: 10.5, h: 0.6,
    fontSize: 14, color: colors.slate
  });
});

// ============================================================================
// SLIDE 7: WHY US
// ============================================================================
slide = pres.addSlide();
slide.background = { color: colors.white };

slide.addImage({
  path: 'public/logo.png',
  x: 12.2, y: 0.3, w: 1, h: 1
});

slide.addText('Why Horus', {
  x: 0.5, y: 0.5, w: '90%', h: 0.6,
  fontSize: 40, bold: true, color: colors.navy
});

const differentiators = [
  {
    title: 'Only solution with automatic contradiction detection',
    desc: 'Find conflicting policies across departments'
  },
  {
    title: 'Australian data sovereignty',
    desc: 'All infrastructure in Sydney and Melbourne'
  },
  {
    title: 'Government-grade validation',
    desc: 'Confidence scores and full audit trails'
  },
  {
    title: 'Works with any document type',
    desc: 'Flexible enough for healthcare, policy, finance, or workforce data'
  },
  {
    title: 'Ready to deploy',
    desc: 'Proven technology, pilot-ready infrastructure'
  }
];

differentiators.forEach((item, idx) => {
  const yPos = 1.8 + (idx * 1);

  slide.addText(item.title, {
    x: 1.5, y: yPos, w: 10.5, h: 0.4,
    fontSize: 18, bold: true, color: colors.navy
  });

  slide.addText(item.desc, {
    x: 1.5, y: yPos + 0.45, w: 10.5, h: 0.3,
    fontSize: 14, color: colors.slate
  });
});

// ============================================================================
// SLIDE 8: COMPLIANCE
// ============================================================================
slide = pres.addSlide();
slide.background = { color: colors.white };

slide.addImage({
  path: 'public/logo.png',
  x: 12.2, y: 0.3, w: 1, h: 1
});

slide.addText('Australian Compliance', {
  x: 0.5, y: 0.5, w: '90%', h: 0.6,
  fontSize: 40, bold: true, color: colors.navy
});

slide.addShape(pres.ShapeType.rect, {
  x: 3, y: 2, w: 7.6, h: 2.5,
  fill: { color: colors.lightblue }
});

slide.addText('100% Australian Data Sovereignty', {
  x: 3.5, y: 2.5, w: 6.6, h: 0.6,
  fontSize: 32, bold: true, color: colors.navy, align: 'center'
});

slide.addText('All data and compute in Australia', {
  x: 3.5, y: 3.2, w: 6.6, h: 0.4,
  fontSize: 18, color: colors.slate, align: 'center'
});

slide.addText('Australian Government AI Ethics Principles', {
  x: 0.5, y: 5, w: '90%', h: 0.4,
  fontSize: 24, bold: true, color: colors.navy
});

const principles = [
  'Transparency: Clear disclosure when AI is being used',
  'Accountability: Full audit trails and governance',
  'Security: Complete provenance tracking',
  'Fairness: Confidence scores and source citations'
];

principles.forEach((principle, idx) => {
  slide.addText('•', {
    x: 1.5, y: 5.6 + (idx * 0.4), w: 0.3, h: 0.3,
    fontSize: 16, color: colors.cyan
  });

  slide.addText(principle, {
    x: 2, y: 5.6 + (idx * 0.4), w: 10, h: 0.35,
    fontSize: 15, color: colors.slate
  });
});

// ============================================================================
// SLIDE 9: SA ALIGNMENT
// ============================================================================
slide = pres.addSlide();
slide.background = { color: colors.white };

slide.addImage({
  path: 'public/logo.png',
  x: 12.2, y: 0.3, w: 1, h: 1
});

slide.addText('Perfect Fit for South Australia', {
  x: 0.5, y: 0.5, w: '90%', h: 0.6,
  fontSize: 40, bold: true, color: colors.navy
});

const alignment = [
  {
    initiative: 'Office for AI - $28M Budget',
    points: [
      'Freeing up frontline staff from manual document search',
      'Healthcare, policing, and social services applications',
      'Immediate proof of value opportunity'
    ]
  },
  {
    initiative: '2026 Regulatory Reform',
    points: [
      'Automated contradiction detection required',
      'Policy modernization and consistency',
      'Cross-department coordination'
    ]
  },
  {
    initiative: 'Lot 14 Innovation Precinct',
    points: [
      'Stakeholder relationships already established',
      'South Australia first approach',
      'Showcase opportunity for local innovation'
    ]
  }
];

alignment.forEach((item, idx) => {
  const yPos = 1.8 + (idx * 1.8);

  slide.addText(item.initiative, {
    x: 1, y: yPos, w: 11.6, h: 0.4,
    fontSize: 20, bold: true, color: colors.cyan
  });

  item.points.forEach((point, pIdx) => {
    slide.addText('•', {
      x: 1.5, y: yPos + 0.5 + (pIdx * 0.35), w: 0.3, h: 0.3,
      fontSize: 14, color: colors.slate
    });

    slide.addText(point, {
      x: 2, y: yPos + 0.5 + (pIdx * 0.35), w: 10, h: 0.3,
      fontSize: 14, color: colors.slate
    });
  });
});

// ============================================================================
// SLIDE 10: BUSINESS MODEL
// ============================================================================
slide = pres.addSlide();
slide.background = { color: colors.white };

slide.addImage({
  path: 'public/logo.png',
  x: 12.2, y: 0.3, w: 1, h: 1
});

slide.addText('Business Model', {
  x: 0.5, y: 0.5, w: '90%', h: 0.6,
  fontSize: 40, bold: true, color: colors.navy
});

const revenue = [
  {
    segment: 'Government (Primary Focus)',
    year1: '$500K - $1M',
    year2: '$2M - $5M',
    market: '$28M available from Office for AI'
  },
  {
    segment: 'Enterprise B2B',
    year1: '$200K - $500K',
    year2: '$1M - $2M',
    market: '$500M+ TAM in Australia'
  },
  {
    segment: 'Consumer B2C (CareerCraft)',
    year1: '$50K - $100K',
    year2: '$200K - $500K',
    market: 'Subscription model, brand recognition'
  }
];

slide.addShape(pres.ShapeType.rect, {
  x: 1, y: 1.5, w: 3, h: 0.6,
  fill: { color: colors.navy }
});

slide.addText('Segment', {
  x: 1.2, y: 1.65, w: 2.6, h: 0.3,
  fontSize: 14, bold: true, color: colors.white
});

slide.addShape(pres.ShapeType.rect, {
  x: 4.2, y: 1.5, w: 2.5, h: 0.6,
  fill: { color: colors.navy }
});

slide.addText('Year 1', {
  x: 4.4, y: 1.65, w: 2.1, h: 0.3,
  fontSize: 14, bold: true, color: colors.white
});

slide.addShape(pres.ShapeType.rect, {
  x: 6.9, y: 1.5, w: 2.5, h: 0.6,
  fill: { color: colors.navy }
});

slide.addText('Year 2+', {
  x: 7.1, y: 1.65, w: 2.1, h: 0.3,
  fontSize: 14, bold: true, color: colors.white
});

slide.addShape(pres.ShapeType.rect, {
  x: 9.6, y: 1.5, w: 3, h: 0.6,
  fill: { color: colors.navy }
});

slide.addText('Market', {
  x: 9.8, y: 1.65, w: 2.6, h: 0.3,
  fontSize: 14, bold: true, color: colors.white
});

revenue.forEach((item, idx) => {
  const yPos = 2.3 + (idx * 1);

  slide.addShape(pres.ShapeType.rect, {
    x: 1, y: yPos, w: 11.6, h: 0.8,
    fill: { color: idx === 0 ? colors.lightblue : colors.white },
    line: { color: colors.lightgray, width: 1 }
  });

  slide.addText(item.segment, {
    x: 1.2, y: yPos + 0.15, w: 2.6, h: 0.5,
    fontSize: 13, color: colors.slate, bold: idx === 0
  });

  slide.addText(item.year1, {
    x: 4.4, y: yPos + 0.15, w: 2.1, h: 0.5,
    fontSize: 13, color: colors.slate
  });

  slide.addText(item.year2, {
    x: 7.1, y: yPos + 0.15, w: 2.1, h: 0.5,
    fontSize: 13, color: colors.slate
  });

  slide.addText(item.market, {
    x: 9.8, y: yPos + 0.15, w: 2.6, h: 0.5,
    fontSize: 13, color: colors.slate
  });
});

// ============================================================================
// SLIDE 11: THE ASK
// ============================================================================
slide = pres.addSlide();
slide.background = { color: colors.white };

slide.addImage({
  path: 'public/logo.png',
  x: 12.2, y: 0.3, w: 1, h: 1
});

slide.addText('Partnership Proposal', {
  x: 0.5, y: 0.5, w: '90%', h: 0.6,
  fontSize: 40, bold: true, color: colors.navy
});

// What we need
slide.addText('What We Need', {
  x: 1, y: 1.5, w: 5.5, h: 0.4,
  fontSize: 24, bold: true, color: colors.navy
});

const needs = [
  '$150K-$300K pilot funding (6 months)',
  'Access to 2-3 department datasets',
  'Dedicated government liaison',
  'Feedback and requirements input'
];

needs.forEach((need, idx) => {
  slide.addText('•', {
    x: 1.5, y: 2.1 + (idx * 0.5), w: 0.3, h: 0.3,
    fontSize: 16, color: colors.cyan
  });

  slide.addText(need, {
    x: 2, y: 2.1 + (idx * 0.5), w: 4.5, h: 0.4,
    fontSize: 15, color: colors.slate
  });
});

// What we deliver
slide.addText('What We Deliver', {
  x: 7.2, y: 1.5, w: 5.5, h: 0.4,
  fontSize: 24, bold: true, color: colors.navy
});

const delivers = [
  'Months 1-2: Pilot deployment and training',
  'Months 3-6: 5-10 hours/week time savings',
  'Months 6-12: Full production rollout',
  'Measurable ROI and efficiency gains'
];

delivers.forEach((deliver, idx) => {
  slide.addText('•', {
    x: 7.7, y: 2.1 + (idx * 0.5), w: 0.3, h: 0.3,
    fontSize: 16, color: colors.cyan
  });

  slide.addText(deliver, {
    x: 8.2, y: 2.1 + (idx * 0.5), w: 4.5, h: 0.4,
    fontSize: 15, color: colors.slate
  });
});

// Success metrics
slide.addText('Success Metrics', {
  x: 0.5, y: 4.5, w: '90%', h: 0.4,
  fontSize: 24, bold: true, color: colors.navy
});

const metrics = [
  '5-10 hours per week saved per frontline staff member',
  '95% staff satisfaction and adoption rate',
  'All policy contradictions identified and tracked',
  '$500K+ annual cost savings from efficiency gains'
];

metrics.forEach((metric, idx) => {
  slide.addText('•', {
    x: 1.5, y: 5.1 + (idx * 0.5), w: 0.3, h: 0.3,
    fontSize: 16, color: colors.cyan
  });

  slide.addText(metric, {
    x: 2, y: 5.1 + (idx * 0.5), w: 10, h: 0.4,
    fontSize: 15, color: colors.slate
  });
});

// ============================================================================
// SLIDE 12: NEXT STEPS
// ============================================================================
slide = pres.addSlide();
slide.background = { color: colors.navy };

// Logo
slide.addImage({
  path: 'public/logo.png',
  x: 11, y: 0.3, w: 2, h: 2
});

slide.addText('Next Steps', {
  x: 1, y: 1.5, w: '75%', h: 0.6,
  fontSize: 44, bold: true, color: colors.white
});

const steps2 = [
  'Schedule proof of value demonstration',
  'Identify 2-3 pilot departments',
  'Define data sharing and security protocols',
  'Begin 6-month pilot program'
];

steps2.forEach((step, idx) => {
  const yPos = 2.8 + (idx * 0.8);

  slide.addShape(pres.ShapeType.ellipse, {
    x: 1.2, y: yPos, w: 0.5, h: 0.5,
    fill: { color: colors.cyan }
  });

  slide.addText((idx + 1).toString(), {
    x: 1.2, y: yPos + 0.05, w: 0.5, h: 0.4,
    fontSize: 20, bold: true, color: colors.white, align: 'center'
  });

  slide.addText(step, {
    x: 2, y: yPos + 0.05, w: 10, h: 0.4,
    fontSize: 20, color: colors.white
  });
});

slide.addText('Contact', {
  x: 1, y: 6, w: '75%', h: 0.3,
  fontSize: 18, color: colors.lightblue
});

slide.addText('Horus Intelligence Team\ninfo@horusintelligence.com', {
  x: 1, y: 6.4, w: '75%', h: 0.5,
  fontSize: 16, color: colors.white
});

// Save
pres.writeFile({ fileName: 'Horus_Intelligence_Pitch_Deck.pptx' })
  .then(() => {
    console.log('\n✓ Professional pitch deck with logo created!\n');
    console.log('File: Horus_Intelligence_Pitch_Deck.pptx');
    console.log('Slides: 12');
    console.log('Colors: Navy blue and cyan to match logo\n');
  })
  .catch(err => {
    console.error('Error:', err);
  });
