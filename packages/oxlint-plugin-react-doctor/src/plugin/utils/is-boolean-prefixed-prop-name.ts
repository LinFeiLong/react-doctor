// True for prop names that read as on/off flags (`isOpen`, `hasIcon`,
// `canEdit`). Shared by the boolean-prop architecture rules
// (`no-many-boolean-props`, `prefer-explicit-variants`).
const BOOLEAN_PROP_PREFIX_PATTERN = /^(?:is|has|should|can|show|hide|enable|disable|with)[A-Z]/;

export const isBooleanPrefixedPropName = (propName: string): boolean =>
  BOOLEAN_PROP_PREFIX_PATTERN.test(propName);
