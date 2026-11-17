  "use client";

  import type { Dispatch, SetStateAction } from "react";
import { Info } from "lucide-react";
  import type { AgentDraft } from "@/lib/agentDraft";
  import { AGENT_LANGUAGES, type AgentModelOptions } from "@/lib/callingAgentApi";
  import { ErrorBanner, Field, Select, TextArea, TextInput, errorMessage } from "@/components/ui";
  import { languageList } from "./agentEditorConstants";

  export default function AgentDetailsTab({
    draft,
    setDraft,
    isNew,
    modelOptions,
  }: {
    draft: AgentDraft;
    setDraft: Dispatch<SetStateAction<AgentDraft>>;
    isNew: boolean;
    modelOptions: { data: AgentModelOptions | undefined; isError: boolean; error: unknown };
  }) {
    return (
    <div className="blue-fields w-full max-w-none space-y-6">

<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

  {/* Name */}
  <Field label="Name">
    <TextInput
      value={draft.name}
      maxLength={255}
      autoFocus={isNew}
      onChange={(e) =>
        setDraft((d) => ({ ...d, name: e.target.value }))
      }
      placeholder="e.g. Poonam"
    />
  </Field>

  {/* Greeting */}
  <Field
    label="Greeting"
    hint={
      <>
        Optional. The first sentence spoken on the call.
        Type <code>{"{{name}}"}</code> to say the lead&apos;s name.
      </>
    }
  >
    <TextInput
      value={draft.greeting}
      onChange={(e) =>
        setDraft((d) => ({ ...d, greeting: e.target.value }))
      }
      placeholder="Hello, this is Poonam..."
    />
  </Field>

  {/* Main Language */}
  <Field
    label="Main language"
    hint="The agent starts every call in this language."
  >
    <Select
      value={draft.primaryLanguage}
      onChange={(e) => {
        const primaryLanguage = e.target.value;
        setDraft((d) => ({
          ...d,
          primaryLanguage,
          secondaryLanguage:
            !primaryLanguage ||
            d.secondaryLanguage === primaryLanguage
              ? ""
              : d.secondaryLanguage,
        }));
      }}
    >
      <option value="">System default</option>
      {Object.entries(AGENT_LANGUAGES).map(([code, label]) => (
        <option key={code} value={code}>
          {label}
        </option>
      ))}
    </Select>
  </Field>

  {/* Second Language */}
  <Field
    label="Second language"
    hint={
      draft.primaryLanguage
        ? "Optional. Used only if the caller speaks it."
        : "Pick a main language first."
    }
  >
    <Select
      value={draft.secondaryLanguage}
      disabled={!draft.primaryLanguage}
      onChange={(e) =>
        setDraft((d) => ({
          ...d,
          secondaryLanguage: e.target.value,
        }))
      }
    >
      <option value="">None</option>
      {Object.entries(AGENT_LANGUAGES)
        .filter(([code]) => code !== draft.primaryLanguage)
        .map(([code, label]) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
    </Select>
  </Field>

</div>

{draft.primaryLanguage && (
  <div className="mt-1 flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2.5 dark:border-[var(--info-border)] dark:bg-[var(--info-surface)]">
    <Info
      size={15}
      className="mt-0.5 shrink-0 text-blue-600 dark:text-[var(--info)]"
    />
    <p className="text-xs leading-5 text-slate-600 dark:text-[var(--muted-foreground)]">
      Supported languages: {languageList(draft)}.
      The agent continues in these languages during calls.
    </p>
  </div>
)}


    <div className="space-y-4 border-t border-hairline pt-5">
      <div>
        <h3 className="text-md font-semibold text-heading">AI Model Settings</h3>
        <p className="mt-0.5 text-xs text-muted">
          Choose the language model and speech-to-text provider and model. Sarvam is selected by default.
        </p>
      </div>
      {modelOptions.isError ? (
        <ErrorBanner message={errorMessage(modelOptions.error)} />
      ) : (

  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 ">

    {/* LLM Settings */}
    <div className=" space-y-4">
  <Field label="LLM model provider">
    <Select
      value={draft.llmProvider}
      onChange={(e) => {
        const provider = e.target.value;
        setDraft((d) => ({
          ...d,
          llmProvider: provider,
          llmModel: modelOptions.data?.llm_model[provider]?.[0] ?? "",
        }));
      }}
      disabled={!modelOptions.data}
    >
      {(modelOptions.data?.llm_provider ?? []).map((provider) => (
        <option key={provider} value={provider}>{provider}</option>
      ))}
    </Select>
  </Field>


      <Field label="LLM model" hint="Select an available model.">
        <Select
          value={draft.llmModel}
          onChange={(e) => setDraft((d) => ({ ...d, llmModel: e.target.value }))}
          disabled={!draft.llmProvider || !modelOptions.data}
        >
          {(modelOptions.data?.llm_model[draft.llmProvider] ?? []).map((model) => (
            <option key={model} value={model}>{model}</option>
          ))}
        </Select>
      </Field>
    </div>

    {/* Speech-to-text Settings */}
    <div className="space-y-4">
  <Field label="Speech-to-text provider">
    <Select
      value={draft.sttProvider}
      onChange={(e) => {
        const provider = e.target.value;
        setDraft((d) => ({
          ...d,
          sttProvider: provider,
          sttModel: modelOptions.data?.stt_model[provider]?.[0] ?? "",
        }));
      }}
      disabled={!modelOptions.data}
    >
      {(modelOptions.data?.stt_provider ?? []).map((provider) => (
        <option key={provider} value={provider}>{provider}</option>
      ))}
    </Select>
  </Field>

      <Field label="Speech-to-text model" hint="Select an available model.">
        <Select
          value={draft.sttModel}
          onChange={(e) => setDraft((d) => ({ ...d, sttModel: e.target.value }))}
          disabled={!draft.sttProvider || !modelOptions.data}
        >
          {(modelOptions.data?.stt_model[draft.sttProvider] ?? []).map((model) => (
            <option key={model} value={model}>{model}</option>
          ))}
        </Select>
      </Field>
    </div>

  </div>

      )}
    </div>

    {/* Silence Settings Section */}
    <div className="border-t border-hairline pt-5 space-y-4">
      <div>
        <h3 className="text-md font-semibold text-heading">
          Silence Settings
        </h3>
        <p className="mt-0.5 text-xs text-muted">
          Control how the agent responds and when calls hang up when the
          caller is quiet.
        </p>
      </div>

<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field
          label="Interruption Minimum Words"
        hint="Whole numbers only. 0 prevents interruptions; empty uses the system default."
        >
          <TextInput
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={
              draft.interruptionMinWords !== null
                ? String(draft.interruptionMinWords)
                : ""
            }
            onKeyDown={(e) => {
              // type="number" allows these by default; block them
              if (["e", "E", "+", "-", "."].includes(e.key))
                e.preventDefault();
            }}
            onChange={(e) => {
              const val = e.target.value;
              // only allow empty or digits
              if (val !== "" && !/^\d+$/.test(val)) return;
              setDraft((d) => ({
                ...d,
                interruptionMinWords:
                  val === "" ? null : parseInt(val, 10),
              }));
            }}
            placeholder="System default"
          />
        </Field>
        <Field
          label="Silence Check Seconds"
          hint="Seconds of silence before agent prompts caller."
        >
          <TextInput
            type="number"
            min={1}
            max={300}
            value={
              draft.silenceCheckSeconds !== null
                ? String(draft.silenceCheckSeconds)
                : ""
            }
            onChange={(e) => {
              const val = e.target.value;
              setDraft((d) => ({
                ...d,
                silenceCheckSeconds: val === "" ? null : Number(val),
              }));
            }}
            placeholder="e.g. 5"
          />
        </Field>

        <Field
          label="Silence Hangup Seconds"
          hint="Seconds of silence before hanging up the call."
        >
          <TextInput
            type="number"
            min={1}
            max={600}
            value={
              draft.silenceHangupSeconds !== null
                ? String(draft.silenceHangupSeconds)
                : ""
            }
            onChange={(e) => {
              const val = e.target.value;
              setDraft((d) => ({
                ...d,
                silenceHangupSeconds: val === "" ? null : Number(val),
              }));
            }}
            placeholder="e.g. 15"
          />
        </Field>
      </div>

      <Field
        label="Silence Prompt"
        hint="Spoken by agent when caller is silent for the check duration."
      >
        <TextArea
          rows={2}
          value={draft.silencePrompt}
          onChange={(e) =>
            setDraft((d) => ({ ...d, silencePrompt: e.target.value }))
          }
          placeholder="e.g. Hello, are you still there? Please let me know how I can help."
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Second Line — Yes"
          hint="Optional follow-up line when the caller answers yes."
        >
          <TextArea
            rows={2}
            value={draft.secondLineYes}
            onChange={(e) => setDraft((d) => ({ ...d, secondLineYes: e.target.value }))}
            placeholder="Enter the agent's second line for a yes response"
          />
        </Field>
        <Field
          label="Second Line — No"
          hint="Optional follow-up line when the caller answers no."
        >
          <TextArea
            rows={2}
            value={draft.secondLineNo}
            onChange={(e) => setDraft((d) => ({ ...d, secondLineNo: e.target.value }))}
            placeholder="Enter the agent's second line for a no response"
          />
        </Field>
      </div>
    </div>
  </div>
    );
  }
