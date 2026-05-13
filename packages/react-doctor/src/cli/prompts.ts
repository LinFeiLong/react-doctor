import { createRequire } from "node:module";
import basePrompts, { type PromptObject, type Answers } from "prompts";
import { SIGINT_EXIT_CODE } from "../constants.js";

interface PromptMultiselectChoiceState {
  selected?: boolean;
  disabled?: boolean;
}

interface PromptMultiselectContext {
  maxChoices?: number;
  cursor: number;
  value: PromptMultiselectChoiceState[];
  bell: () => void;
  render: () => void;
}

const esmRequire = createRequire(import.meta.url);
const PROMPTS_MULTISELECT_MODULE_PATH = "prompts/lib/elements/multiselect";
let didPatchToggleAll = false;
let didPatchSubmit = false;

const onCancel = () => {
  console.log("");
  console.log("Cancelled.");
  console.log("");
  process.exit(SIGINT_EXIT_CODE);
};

const shouldSelectAll = (choiceStates: PromptMultiselectChoiceState[]): boolean =>
  choiceStates
    .filter((choiceState) => !choiceState.disabled)
    .some((choiceState) => choiceState.selected !== true);

const shouldAutoSelectCurrent = (
  choiceStates: PromptMultiselectChoiceState[],
  cursor: number,
): boolean => {
  if (choiceStates.some((choiceState) => choiceState.selected)) return false;
  const currentChoice = choiceStates[cursor];
  return Boolean(currentChoice) && !currentChoice.disabled;
};

const patchMultiselectToggleAll = (): void => {
  if (didPatchToggleAll) return;
  didPatchToggleAll = true;

  const multiselectConstructor = esmRequire(PROMPTS_MULTISELECT_MODULE_PATH);
  multiselectConstructor.prototype.toggleAll = function (this: PromptMultiselectContext): void {
    if (this.maxChoices !== undefined || Boolean(this.value[this.cursor]?.disabled)) {
      this.bell();
      return;
    }
    const shouldSelectAllEnabled = shouldSelectAll(this.value);
    for (const choiceState of this.value) {
      if (choiceState.disabled) continue;
      choiceState.selected = shouldSelectAllEnabled;
    }
    this.render();
  };
};

const patchMultiselectSubmit = (): void => {
  if (didPatchSubmit) return;
  didPatchSubmit = true;

  const multiselectConstructor = esmRequire(PROMPTS_MULTISELECT_MODULE_PATH);
  const originalSubmit = multiselectConstructor.prototype.submit;
  multiselectConstructor.prototype.submit = function (this: PromptMultiselectContext): void {
    if (shouldAutoSelectCurrent(this.value, this.cursor)) {
      this.value[this.cursor].selected = true;
    }
    originalSubmit.call(this);
  };
};

export const prompts = <T extends string = string>(
  questions: PromptObject<T> | PromptObject<T>[],
): Promise<Answers<T>> => {
  patchMultiselectToggleAll();
  patchMultiselectSubmit();
  return basePrompts(questions, { onCancel });
};
