// Pattern scans repeatedly match keyword pairs inside comments ("Ajv compiles
// schemas via `new Function(...)`", JSX comments mentioning redirects). This
// blanks comment text with spaces so every match index, line, and column in
// the stripped content still maps 1:1 onto the original file.
export const stripCommentsPreservingPositions = (content: string): string => {
  const characters = content.split("");
  let stringDelimiter: string | null = null;
  let index = 0;

  while (index < content.length) {
    const character = content[index];
    const nextCharacter = content[index + 1];

    if (stringDelimiter !== null) {
      if (character === "\\") {
        index += 2;
        continue;
      }
      if (character === stringDelimiter) stringDelimiter = null;
      index += 1;
      continue;
    }

    if (character === '"' || character === "'" || character === "`") {
      stringDelimiter = character;
      index += 1;
      continue;
    }

    if (character === "/" && nextCharacter === "/") {
      while (index < content.length && content[index] !== "\n") {
        characters[index] = " ";
        index += 1;
      }
      continue;
    }

    if (character === "/" && nextCharacter === "*") {
      while (index < content.length) {
        if (content[index] === "*" && content[index + 1] === "/") {
          characters[index] = " ";
          characters[index + 1] = " ";
          index += 2;
          break;
        }
        if (content[index] !== "\n") characters[index] = " ";
        index += 1;
      }
      continue;
    }

    index += 1;
  }

  return characters.join("");
};
