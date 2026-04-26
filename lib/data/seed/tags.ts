/**
 * @file Tag seed data + keyword dictionary.
 *
 * Each tag has a slug, display name, an optional `featured` flag, and a
 * list of case-insensitive keywords. The auto-tagger (`lib/ingest/autoTag.ts`)
 * scans post titles + summaries against this dictionary to attach tags.
 *
 * Keep keyword lists short and high-signal — over-broad terms produce
 * noisy tagging.
 */

export interface TagSeed {
  slug: string;
  name: string;
  description: string;
  featured: boolean;
  keywords: string[];
}

export const TAG_SEEDS: TagSeed[] = [
  { slug: "react", name: "React", description: "The React library and ecosystem.", featured: true, keywords: ["react", "react.js", "jsx", "react server components", "rsc"] },
  { slug: "typescript", name: "TypeScript", description: "TypeScript language posts.", featured: true, keywords: ["typescript", "ts type", "tsconfig"] },
  { slug: "javascript", name: "JavaScript", description: "JavaScript language and runtime.", featured: true, keywords: ["javascript", "es2024", "es2025", "ecmascript", "v8"] },
  { slug: "rust", name: "Rust", description: "The Rust programming language.", featured: true, keywords: ["rust", "cargo", "tokio", "axum"] },
  { slug: "go", name: "Go", description: "The Go programming language.", featured: true, keywords: ["golang", "go modules", "goroutine"] },
  { slug: "python", name: "Python", description: "Python language and tooling.", featured: true, keywords: ["python", "django", "fastapi", "pytest"] },
  { slug: "java", name: "Java", description: "JVM and Java language posts.", featured: false, keywords: ["java", "kotlin", "jvm", "spring boot"] },
  { slug: "swift", name: "Swift", description: "Swift and Apple platforms.", featured: false, keywords: ["swift", "swiftui", "ios development"] },
  { slug: "distributed-systems", name: "Distributed Systems", description: "Consensus, replication, scaling.", featured: true, keywords: ["distributed", "raft", "paxos", "consensus", "replication", "consistency"] },
  { slug: "databases", name: "Databases", description: "Storage engines, queries, and tuning.", featured: true, keywords: ["postgres", "postgresql", "mysql", "sqlite", "database", "rdbms", "olap", "oltp"] },
  { slug: "kafka", name: "Kafka", description: "Apache Kafka and event streaming.", featured: false, keywords: ["kafka", "event streaming", "kstreams"] },
  { slug: "kubernetes", name: "Kubernetes", description: "k8s clusters and operators.", featured: true, keywords: ["kubernetes", "k8s", "kubectl", "operator pattern"] },
  { slug: "docker", name: "Docker", description: "Containers and image building.", featured: false, keywords: ["docker", "containerd", "buildkit"] },
  { slug: "aws", name: "AWS", description: "Amazon Web Services.", featured: true, keywords: ["aws", "amazon web services", " s3 ", "lambda", "dynamodb", "ec2"] },
  { slug: "gcp", name: "Google Cloud", description: "Google Cloud Platform.", featured: false, keywords: ["gcp", "google cloud", "gke", "bigquery"] },
  { slug: "azure", name: "Azure", description: "Microsoft Azure.", featured: false, keywords: ["azure", "microsoft cloud"] },
  { slug: "observability", name: "Observability", description: "Tracing, metrics, logging.", featured: true, keywords: ["observability", "tracing", "opentelemetry", "metrics", "datadog", "honeycomb", "prometheus"] },
  { slug: "performance", name: "Performance", description: "Latency, throughput, profiling.", featured: true, keywords: ["performance", "latency", "throughput", "profiling", "benchmark"] },
  { slug: "security", name: "Security", description: "AppSec, infra security, cryptography.", featured: true, keywords: ["security", "vulnerability", "csrf", "xss", "cryptography", "tls", "oauth"] },
  { slug: "ml-ai", name: "ML / AI", description: "Machine learning and AI infrastructure.", featured: true, keywords: ["machine learning", "ml infra", "llm", "embedding", "vector", "transformer", "deep learning"] },
  { slug: "data-engineering", name: "Data Engineering", description: "Pipelines, warehouses, lakehouses.", featured: false, keywords: ["data engineering", "etl", "elt", "warehouse", "snowflake", "spark", "airflow"] },
  { slug: "frontend", name: "Frontend", description: "Browser, framework, and UI engineering.", featured: true, keywords: ["frontend", "browser", "css", "html", "web vitals"] },
  { slug: "backend", name: "Backend", description: "API design and server-side systems.", featured: false, keywords: ["backend", "api design", "rest api", "graphql"] },
  { slug: "graphql", name: "GraphQL", description: "GraphQL APIs and federation.", featured: false, keywords: ["graphql", "federation", "apollo"] },
  { slug: "mobile", name: "Mobile", description: "iOS, Android, cross-platform.", featured: false, keywords: ["ios", "android", "react native", "flutter", "mobile app"] },
  { slug: "design-systems", name: "Design Systems", description: "Component libraries and tokens.", featured: false, keywords: ["design system", "tokens", "figma", "component library"] },
  { slug: "devex", name: "Developer Experience", description: "Tooling, build systems, productivity.", featured: false, keywords: ["developer experience", "devex", "tooling", "build system", "monorepo"] },
  { slug: "infrastructure", name: "Infrastructure", description: "Cloud and on-prem infra.", featured: false, keywords: ["infrastructure", "infra", "terraform", "pulumi"] },
  { slug: "architecture", name: "Architecture", description: "System design and architecture.", featured: true, keywords: ["architecture", "system design", "microservices", "monolith", "service oriented"] },
  { slug: "engineering-culture", name: "Engineering Culture", description: "Teams, process, leadership.", featured: false, keywords: ["engineering culture", "leadership", "1:1", "remote work", "code review"] },
  { slug: "incident-response", name: "Incident Response", description: "On-call, postmortems, SRE.", featured: false, keywords: ["incident", "postmortem", "on-call", "sre", "blameless"] },
  { slug: "testing", name: "Testing", description: "Test strategy, frameworks, e2e.", featured: false, keywords: ["unit test", "e2e test", "integration test", "playwright", "cypress", "vitest", "jest"] },
  { slug: "redis", name: "Redis", description: "Redis caching and data structures.", featured: false, keywords: ["redis", "valkey"] },
  { slug: "elasticsearch", name: "Search", description: "Search infrastructure.", featured: false, keywords: ["elasticsearch", "opensearch", "lucene", "full text search"] },
  { slug: "edge", name: "Edge Computing", description: "CDN, edge functions, runtimes.", featured: false, keywords: ["edge", "cdn", "cloudflare workers", "vercel edge"] },
  { slug: "open-source", name: "Open Source", description: "OSS releases and maintenance.", featured: false, keywords: ["open source", "oss", "maintainer", "license"] },
  { slug: "compilers", name: "Compilers", description: "Languages, parsers, interpreters.", featured: false, keywords: ["compiler", "parser", "interpreter", "llvm"] },
  { slug: "networking", name: "Networking", description: "TCP, HTTP, protocols.", featured: false, keywords: ["networking", "tcp", "http/3", "quic", "protocol"] },
  { slug: "react-native", name: "React Native", description: "Mobile via React.", featured: false, keywords: ["react native", "expo"] },
  { slug: "platform-engineering", name: "Platform Engineering", description: "Internal developer platforms.", featured: false, keywords: ["platform engineering", "internal platform", "backstage"] },
];
