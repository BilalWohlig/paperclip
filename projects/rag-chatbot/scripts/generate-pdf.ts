/**
 * generate-pdf.ts
 * Generates "AI Engineering Handbook" — a 10-page technical PDF
 * using the pdfkit library.
 *
 * Run: npx tsx generate-pdf.ts
 * Output: ../docs/ai-engineering-handbook.pdf
 */

import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_PATH = path.resolve(__dirname, '../docs/ai-engineering-handbook.pdf');

interface Chapter {
  title: string;
  content: string[];
}

const CHAPTERS: Chapter[] = [
  {
    title: 'Chapter 1: Prompt Engineering Fundamentals',
    content: [
      `Prompt engineering is the practice of crafting inputs to language models to elicit accurate, useful, and reliable outputs. Unlike traditional software, where the developer specifies every computational step, prompt-based systems rely on natural language instructions to guide model behavior. A well-engineered prompt combines a clear task description, contextual grounding, output format constraints, and representative examples — all within the model's context window.`,
      `The fundamental challenge in prompt engineering is specificity without over-specification. Overly rigid prompts break on edge cases; overly vague prompts produce inconsistent results. The best prompts define the task, the audience, the constraints, and the expected format — then leave the model room to apply its internal knowledge. Role-based prompting ("You are a senior software engineer reviewing a pull request") consistently improves output quality by anchoring the model's response distribution.`,
      `Few-shot prompting remains one of the highest-leverage techniques available. Providing three to five input/output examples directly in the prompt dramatically shifts model behavior toward the desired pattern. The examples serve as implicit format and style specifications. Chain-of-thought prompting — where the model is instructed to "think step by step" — further improves accuracy on reasoning-heavy tasks by forcing intermediate work rather than jumping to a conclusion.`,
    ],
  },
  {
    title: 'Chapter 2: Retrieval-Augmented Generation (RAG) Systems',
    content: [
      `Retrieval-Augmented Generation (RAG) addresses one of the core limitations of language models: static knowledge bounded by a training cutoff date. Rather than relying solely on parametric knowledge stored in model weights, RAG pipelines retrieve relevant documents at inference time and inject them into the prompt as grounding context. This allows the model to answer questions about proprietary data, recent events, or domain-specific content without any fine-tuning.`,
      `A canonical RAG pipeline has four stages: indexing, retrieval, augmentation, and generation. During indexing, documents are split into chunks, embedded using an embedding model, and stored in a vector database. At query time, the user's question is embedded using the same model, and the top-k most similar chunks are retrieved via approximate nearest-neighbor search. These chunks are then inserted into the LLM prompt as context, and the model generates an answer grounded in those passages.`,
      `The quality of a RAG system is more sensitive to retrieval precision than to the sophistication of the generative model. Investing in better chunking strategies (semantic chunking versus fixed-length chunking), higher-quality embedding models, and hybrid retrieval (combining dense vector search with sparse keyword search like BM25) typically yields larger quality improvements than swapping to a more capable generative model. Reranking retrieved chunks with a cross-encoder before passing them to the LLM is another high-impact technique.`,
    ],
  },
  {
    title: 'Chapter 3: Embedding Models and Vector Databases',
    content: [
      `Embedding models are neural networks that map variable-length text into fixed-size dense vectors such that semantically similar texts are geometrically close. The dominant paradigm uses transformer encoders trained with contrastive objectives on large corpora of text pairs. OpenAI's text-embedding-3-small (1536 dimensions) and text-embedding-3-large (3072 dimensions) offer excellent general-purpose performance. Domain-specific fine-tuned embeddings often outperform general models on specialized corpora but require labeled training pairs.`,
      `Vector databases are purpose-built storage systems optimized for similarity search over dense vectors. They support approximate nearest-neighbor (ANN) algorithms such as HNSW (Hierarchical Navigable Small World) and IVFFlat (Inverted File Index with flat quantization), which trade a small amount of recall for orders-of-magnitude speed improvements over exact nearest-neighbor search. Popular options include pgvector (a PostgreSQL extension), Pinecone, Weaviate, Qdrant, and Chroma. For most applications starting out, pgvector offers the right balance of simplicity, SQL compatibility, and performance.`,
      `Embedding drift is a practical concern in production RAG systems. As documents in the corpus evolve and embedding models are retrained, previously stored embeddings become stale. Hybrid search systems that combine vector similarity with keyword search (BM25) are more robust to this drift because keyword matches don't depend on embedding consistency. Monitoring retrieval quality over time with periodic eval runs against a held-out question set is the recommended mitigation strategy.`,
    ],
  },
  {
    title: 'Chapter 4: Fine-Tuning Language Models',
    content: [
      `Fine-tuning adapts a pre-trained language model's weights to a specific task or domain using a curated training dataset. Supervised fine-tuning (SFT) on (instruction, completion) pairs is the most common approach and consistently improves instruction-following quality for narrow task distributions. Reinforcement Learning from Human Feedback (RLHF) and Direct Preference Optimization (DPO) go further by optimizing for human preference ratings rather than next-token prediction loss, producing models that are more helpful, harmless, and honest.`,
      `The practical case for fine-tuning is narrower than many practitioners expect. Before fine-tuning, exhaust prompt engineering and RAG. Fine-tuning is best justified when: (1) the task requires a style or format that cannot be reliably elicited through prompting, (2) inference cost at scale demands a smaller, specialized model, (3) latency requirements rule out large models, or (4) proprietary domain knowledge must be baked into weights rather than retrieved at runtime. Fine-tuning on behavioral style (tone, conciseness, format) is often more effective than trying to inject new factual knowledge, which is better handled by RAG.`,
      `Dataset quality dominates fine-tuning outcomes. A model fine-tuned on 1,000 high-quality, diverse examples consistently outperforms one trained on 100,000 noisy examples. The standard workflow: (1) define a clear task specification and output format, (2) generate candidate examples using a capable model, (3) filter and curate examples with human review, (4) split into train/val/test sets, (5) run fine-tuning with learning rate warmup and cosine decay, (6) evaluate against a held-out benchmark before comparing to the base model.`,
    ],
  },
  {
    title: 'Chapter 5: AI Evaluation and Benchmarking',
    content: [
      `Evaluation is the highest-leverage investment in any AI system — without repeatable evals, you cannot know whether a change made things better or worse. The eval triad covers three dimensions: correctness (does the output match the ground truth?), quality (is the output useful, clear, and well-formatted?), and safety (does the output avoid harmful, biased, or hallucinated content?). Every AI feature shipped without an accompanying eval harness is technical debt.`,
      `LLM-as-judge evaluation has emerged as a scalable alternative to human annotation. A capable model (e.g., Claude claude-opus-4-6 or GPT-4) evaluates outputs against a rubric, assigning scores or selecting between candidate responses. This approach achieves 70–85% agreement with human raters on most tasks, sufficient for rapid iteration during development. The key risk is positional bias (judges favor outputs in certain positions) and self-serving bias (models favor outputs that resemble their own style). Mitigate both by randomizing output order and cross-evaluating with a model different from the one being evaluated.`,
      `Regression tracking is essential at scale. Store eval results in a database keyed by model version, prompt version, and dataset version. Run evals on every prompt change, not just major releases. Establish an acceptable regression threshold (e.g., less than 2% drop in accuracy) before any change ships to production. A/B testing in production with real traffic provides the highest-fidelity signal but must be paired with robust logging of inputs, outputs, latency, and user feedback signals.`,
    ],
  },
  {
    title: 'Chapter 6: AI Safety and Alignment',
    content: [
      `AI safety in production systems encompasses both model-level alignment and system-level defense. Model alignment — ensuring the model behaves in accordance with human intent and values — is primarily the responsibility of the model developer (Anthropic, OpenAI, etc.) through RLHF and constitutional AI techniques. Application-level safety is the responsibility of the engineer integrating the model: validating inputs, sanitizing outputs, enforcing scope constraints through system prompts, and implementing monitoring for policy violations.`,
      `Prompt injection is the most operationally relevant AI security threat for RAG systems. An adversarial document in the corpus can embed instructions that override the system prompt when retrieved as context. Defenses include: (1) clearly delimiting retrieved content from instructions using XML tags or similar markers, (2) instructing the model to treat retrieved content as untrusted, (3) post-processing outputs to detect and filter injected instructions, and (4) running outputs through a separate classification model before returning them to the user.`,
      `Output moderation is a complementary layer that every production AI system should implement. Content classifiers, either rule-based or model-based, screen final outputs for harmful categories (violence, self-harm, PII leakage, off-topic content) before they reach the user. Build these as configurable middleware, not hard-coded checks, so that thresholds can be tuned without a code change. Log every moderation decision for audit, compliance, and ongoing policy refinement.`,
    ],
  },
  {
    title: 'Chapter 7: Latency Optimization for LLM Applications',
    content: [
      `Latency in LLM applications has two dominant components: time-to-first-token (TTFT) and the token generation rate (tokens/second). TTFT is determined by prompt length, network overhead, and any prefill computation on the model's side. Token generation rate depends on model size, hardware, and batch size on the serving infrastructure. For interactive applications, perceived latency is dominated by TTFT — a fast first token makes streaming feel instantaneous even at moderate generation rates.`,
      `Prompt compression techniques reduce the number of input tokens without degrading output quality. LLMLingua and similar approaches use a small proxy model to identify and remove redundant tokens from long prompts. In RAG systems, aggressive re-ranking (retrieving 20 chunks, then reranking to the top 3) reduces context length more effectively than retrieving fewer chunks initially, because semantic search recall improves with k. Caching is another high-impact technique: cache embeddings for common queries, cache LLM responses for identical prompts, and use prompt caching APIs (Anthropic and OpenAI both offer this) for repeated system prompts.`,
      `Speculative decoding and model cascades are infrastructure-level optimizations worth understanding. Speculative decoding uses a small draft model to propose multiple tokens in parallel, verified by the larger model in a single forward pass, achieving 2–4x speedups without quality loss. Model cascades route easy queries to smaller, faster models and escalate only hard queries to larger models. Implementing a cascade requires a reliable difficulty classifier — often another LLM or a lightweight embedding-based classifier — to route accurately.`,
    ],
  },
  {
    title: 'Chapter 8: Cost Management and Token Optimization',
    content: [
      `Token cost is the primary operating expense in LLM-powered applications. At scale, the difference between a 500-token and a 2,000-token prompt compounds enormously. The first step in cost optimization is instrumentation: log input tokens, output tokens, and cost per request for every LLM call. Without this data, you are optimizing blind. Build a token budget dashboard that breaks down costs by feature, model, and user segment so you can target the highest-cost workflows first.`,
      `Model selection is the highest-leverage cost control. A 7B parameter model costs roughly 10–50x less per token than a frontier model and performs comparably on well-defined, narrow tasks. Build a model routing layer that selects the cheapest model capable of handling each request class. Evaluate candidate models against your task-specific benchmark, not just public leaderboards — benchmark performance rarely transfers directly to application performance.`,
      `Prompt caching dramatically reduces costs for applications with long, repeated system prompts or context documents. Anthropic's prompt caching API caches the KV state of the first N tokens in a prompt; subsequent requests that share the same prefix pay only for uncached tokens. For a RAG system where the same document is retrieved repeatedly, caching the document context can reduce per-request costs by 60–80%. The tradeoff is cache TTL management and slight additional complexity in prompt construction.`,
    ],
  },
  {
    title: 'Chapter 9: Future Trends in AI Engineering',
    content: [
      `Multimodal models are rapidly closing the gap between text-only and vision-capable LLMs. GPT-4V, Claude claude-opus-4-6, and Gemini 1.5 Pro all accept images, PDFs, and audio as first-class inputs alongside text. This unlocks RAG systems that can retrieve and reason over charts, diagrams, scanned documents, and screenshots — data types that were entirely opaque to text-only pipelines. The engineering implications are significant: embedding models, chunking strategies, and retrieval evaluation all need to be rethought for multimodal corpora.`,
      `Agent architectures — systems where LLMs autonomously plan, act, and reflect over multi-step tasks — are transitioning from research prototypes to production workloads. The core pattern is a ReAct loop: the model reasons about the next action, executes it via a tool call, observes the result, and repeats until the task is complete. Robust agent systems require careful tool design (clear schemas, deterministic behavior), reliable state management, hard resource limits (max steps, max tokens, max wall-clock time), and comprehensive logging for debugging. The failure modes of agents — infinite loops, compounding errors, resource exhaustion — require the same engineering discipline as any production distributed system.`,
      `Retrieval-augmented generation will evolve toward retrieval-augmented reasoning — systems that don't just surface relevant passages but synthesize across them, resolve contradictions, and maintain working memory over long document corpora. Extended context windows (Claude claude-opus-4-6 supports up to 200K tokens) make some retrieval unnecessary, but long-context models still benefit from retrieval at very large scales due to the "lost in the middle" phenomenon where model attention degrades on content in the middle of long contexts. The winning architecture in 2026 and beyond will likely combine selective retrieval, structured working memory, and extended context — a hybrid that leverages the strengths of all three approaches.`,
    ],
  },
];

function createPdf(outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const doc = new PDFDocument({ margin: 72, size: 'LETTER' });
    const stream = fs.createWriteStream(outputPath);

    doc.pipe(stream);

    // ── Cover page ──────────────────────────────────────────────────────────
    doc
      .fontSize(36)
      .font('Helvetica-Bold')
      .text('AI Engineering Handbook', { align: 'center' })
      .moveDown(0.5);

    doc
      .fontSize(18)
      .font('Helvetica')
      .text('A Practical Guide for Production AI Systems', { align: 'center' })
      .moveDown(2);

    doc
      .fontSize(12)
      .fillColor('#555555')
      .text('Covering Prompt Engineering · RAG Systems · Embeddings', { align: 'center' })
      .text('Fine-Tuning · Evaluation · Safety · Optimization', { align: 'center' })
      .moveDown(4);

    doc
      .fontSize(10)
      .fillColor('#888888')
      .text('Version 1.0  ·  2026 Edition', { align: 'center' });

    // ── Chapters ─────────────────────────────────────────────────────────────
    for (const chapter of CHAPTERS) {
      doc.addPage();

      // Chapter title
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .fillColor('#1a1a1a')
        .text(chapter.title)
        .moveDown(0.75);

      // Body paragraphs
      for (const paragraph of chapter.content) {
        doc
          .fontSize(11)
          .font('Helvetica')
          .fillColor('#333333')
          .text(paragraph, { align: 'justify', lineGap: 4 })
          .moveDown(0.75);
      }
    }

    doc.end();

    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

async function main() {
  console.log(`Generating PDF: ${OUTPUT_PATH}`);
  await createPdf(OUTPUT_PATH);
  console.log(`Done! PDF written to: ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
