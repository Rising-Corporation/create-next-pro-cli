import en from "../../../messages/en";
import fr from "../../../messages/fr";

const messages = { en, fr } as const;

export function getMessages(locale: keyof typeof messages) {
  return messages[locale];
}
