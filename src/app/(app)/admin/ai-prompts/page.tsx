import { Card } from "@/components/ui/Card";
import { loadAIPromptTemplates } from "@/lib/admin/ai-prompts-loaders";

export default async function AIPromptManagerPage() {
  const prompts = await loadAIPromptTemplates();

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
        AI Prompt Manager
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Configure AI prompts for tutoring, mnemonics, and flashcard generation. Manage chunk eligibility.
      </p>

      <div className="space-y-4">
        {prompts.length === 0 ? (
          <Card>
            <p className="text-slate-500 text-sm">No AI prompt templates yet. Seed ai_prompt_templates or add via admin.</p>
          </Card>
        ) : (
          prompts.map((prompt) => (
            <Card key={prompt.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-heading font-semibold text-slate-900 dark:text-white">
                    {prompt.name}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">{prompt.purpose ?? prompt.slug}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">
                    {prompt.systemPrompt}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" defaultChecked={prompt.enabled} />
                    Enabled
                  </label>
                  <button type="button" className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-sm">Edit</button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <Card>
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">
          Chunk Eligibility
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Control which content chunks are eligible for AI context. Configure by entity type, status, and system.
        </p>
        <button type="button" className="mt-4 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-sm">
          Configure eligibility rules
        </button>
      </Card>
    </div>
  );
}
