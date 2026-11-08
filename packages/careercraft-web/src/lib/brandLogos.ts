/**
 * Which company or tool a piece of text names, as a website whose small icon
 * we can show: "AZ-104" → microsoft.com, "Terraform" → hashicorp.com,
 * "PostgreSQL" → postgresql.org.
 *
 * The icon itself comes from DuckDuckGo's icon service, which is sent only
 * the website's address (the privacy page says so). Nothing recognised means
 * no logo: initials where a tile must show something, nothing in a line of
 * text. Patterns match whole words, so "Java" never matches "JavaScript".
 */

const BRANDS: Array<[RegExp, string]> = [
  // Awarding bodies and the platforms their exams cover.
  [/amazon web services|\baws\b/i, "aws.amazon.com"],
  [/microsoft|azure|\b(?:az|dp|ai|pl|sc|ms|md|mb)-\d{3}\b|power bi|\bfabric\b|\bexcel\b|sharepoint|\bc#|\.net\b|sql server/i, "microsoft.com"],
  [/google|\bgcp\b/i, "cloud.google.com"],
  [/comptia/i, "comptia.org"],
  [/cisco|\bccna\b/i, "cisco.com"],
  [/project management institute|\bpmi\b|\bpmp\b/i, "pmi.org"],
  [/isc2|\(isc\)|\bcissp\b/i, "isc2.org"],
  [/isaca|\bcism\b|\bcisa\b/i, "isaca.org"],
  [/kubernetes/i, "kubernetes.io"],
  [/linux foundation|\bcncf\b|\bckad\b|\bcka\b/i, "linuxfoundation.org"],
  [/hashicorp|terraform/i, "hashicorp.com"],
  [/oracle/i, "oracle.com"],
  [/salesforce/i, "salesforce.com"],
  [/red hat/i, "redhat.com"],
  [/scrum\.org|professional scrum/i, "scrum.org"],
  [/scrum alliance/i, "scrumalliance.org"],
  [/peoplecert|axelos|prince2|\bitil\b/i, "peoplecert.org"],
  [/databricks/i, "databricks.com"],
  [/snowflake/i, "snowflake.com"],
  [/ahpra|nursing and midwifery board/i, "ahpra.gov.au"],
  [/cpa australia/i, "cpaaustralia.com.au"],
  [/chartered accountants/i, "charteredaccountantsanz.com"],
  [/coursera/i, "coursera.org"],
  [/\bedx\b/i, "edx.org"],
  [/nvidia/i, "nvidia.com"],
  [/\bibm\b/i, "ibm.com"],
  [/\bsap\b/i, "sap.com"],
  [/servicenow/i, "servicenow.com"],
  // Tools and languages, for skills.
  [/\bpython\b/i, "python.org"],
  [/mlflow/i, "mlflow.org"],
  [/supabase/i, "supabase.com"],
  [/splunk/i, "splunk.com"],
  [/openai|chatgpt/i, "openai.com"],
  [/\breact\b/i, "react.dev"],
  [/next\.?js/i, "nextjs.org"],
  [/typescript/i, "typescriptlang.org"],
  [/node\.?js/i, "nodejs.org"],
  [/\bvue\b/i, "vuejs.org"],
  [/angular/i, "angular.dev"],
  [/tailwind/i, "tailwindcss.com"],
  [/graphql/i, "graphql.org"],
  [/docker/i, "docker.com"],
  [/postgres/i, "postgresql.org"],
  [/mysql/i, "mysql.com"],
  [/mongodb/i, "mongodb.com"],
  [/\bredis\b/i, "redis.io"],
  [/kafka/i, "kafka.apache.org"],
  [/\bspark\b/i, "spark.apache.org"],
  [/airflow/i, "airflow.apache.org"],
  [/\bdbt\b/i, "getdbt.com"],
  [/github/i, "github.com"],
  [/gitlab/i, "gitlab.com"],
  [/\bgit\b/i, "git-scm.com"],
  [/\bjira\b|confluence|atlassian/i, "atlassian.com"],
  [/figma/i, "figma.com"],
  [/tableau/i, "tableau.com"],
  [/pytorch/i, "pytorch.org"],
  [/tensorflow/i, "tensorflow.org"],
  [/pandas/i, "pandas.pydata.org"],
  [/scikit-learn|sklearn/i, "scikit-learn.org"],
  [/langchain/i, "langchain.com"],
  [/hugging ?face/i, "huggingface.co"],
  [/\bjava\b/i, "java.com"],
  [/\bphp\b/i, "php.net"],
  [/ruby on rails|\brails\b/i, "rubyonrails.org"],
  [/\bruby\b/i, "ruby-lang.org"],
  [/\brust\b/i, "rust-lang.org"],
  [/\bgolang\b|\bgo \(lang/i, "go.dev"],
  [/\bswift\b/i, "swift.org"],
  [/kotlin/i, "kotlinlang.org"],
  [/flutter/i, "flutter.dev"],
  [/vercel/i, "vercel.com"],
  [/datadog/i, "datadoghq.com"],
  [/grafana/i, "grafana.com"],
  [/jenkins/i, "jenkins.io"],
  [/ansible/i, "ansible.com"],
];

const DOMAIN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

/** The company or tool a piece of text names first ("AZ-104 … or Google Cloud …" → Microsoft). */
export function brandSite(text: string | null | undefined): string | null {
  if (!text) return null;
  let best: { at: number; site: string } | null = null;
  for (const [re, site] of BRANDS) {
    const m = re.exec(text);
    if (m && (!best || m.index < best.at)) best = { at: m.index, site };
  }
  return best?.site ?? null;
}

/** An awarding body's website: the one the coach named if it's a plain domain, else from the name. */
export function issuerSite(issuer: string, name: string, given?: string | null): string | null {
  const d = (given ?? "").trim().toLowerCase();
  if (DOMAIN.test(d) && d.length <= 100) return d;
  return brandSite(issuer) ?? brandSite(name);
}

export const logoUrl = (domain: string) => `https://icons.duckduckgo.com/ip3/${domain}.ico`;

/** "Amazon Web Services" → "AW"; "CompTIA" → "CO". */
export function initials(text: string): string {
  const words = text.replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter(Boolean);
  const two = words.length > 1 ? words[0]![0]! + words[1]![0]! : (words[0] ?? "?").slice(0, 2);
  return two.toUpperCase();
}
