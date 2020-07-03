import * as path from 'path';
import { options as colorOptions, gray, blue, bgRed, bgYellow, yellow, red } from 'colorette';

import {
  NormalizedReportMessage,
  MessageSeverity,
  LineColLocationObject,
  LocationObject,
} from '../walk';
import { getCodeframe, getLineColLocation } from './codeframes';

const BG_COLORS = {
  warn: bgYellow,
  error: bgRed,
};

const COLORS = {
  warn: yellow,
  error: red,
};

const SEVERITY_NAMES = {
  warn: 'Warning',
  error: 'Error',
};

const MAX_SUGGEST = 5;

function severityToNumber(severity: MessageSeverity) {
  return severity === 'error' ? 1 : 2;
}

export type OutputFormat = 'codeframe' | 'stylish';

export function formatMessages(
  messages: (NormalizedReportMessage & { ignored?: boolean })[],
  opts: {
    maxMessages?: number;
    cwd?: string;
    format?: OutputFormat;
    color?: boolean;
  },
) {
  const {
    maxMessages = 100,
    cwd = process.cwd(),
    format = 'codeframe',
    color = colorOptions.enabled,
  } = opts;

  colorOptions.enabled = color; // force colors if specified

  const totalMessages = messages.length;
  messages = messages.filter((m) => !m.ignored);
  const ignoredMessages = totalMessages - messages.length;

  messages = messages
    .sort((a, b) => severityToNumber(a.severity) - severityToNumber(b.severity))
    .slice(0, maxMessages);

  if (!totalMessages) return;

  if (format === 'codeframe') {
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      process.stderr.write(`${fullFormatMessage(message, i)}\n`);
    }
  } else {
    const groupedByFile = groupByFiles(messages);
    for (const [file, { ruleIdPad, locationPad: positionPad, fileMessages }] of Object.entries(
      groupedByFile,
    )) {
      process.stderr.write(`${blue(path.relative(cwd, file))}:\n`);

      for (let i = 0; i < fileMessages.length; i++) {
        const message = fileMessages[i];
        process.stderr.write(`${shortFormatMessage(message, positionPad, ruleIdPad)}\n`);
      }

      process.stderr.write('\n');
    }
  }

  if (totalMessages - ignoredMessages > maxMessages) {
    process.stderr.write(
      `< ... ${totalMessages - maxMessages} more messages hidden > ${gray(
        'increase with `--max-messages N`',
      )}\n`,
    );
  }

  function fullFormatMessage(message: NormalizedReportMessage, idx: number) {
    const bgColor = BG_COLORS[message.severity];

    const location = message.location[0]; // TODO: support multiple locations
    const relativePath = path.relative(cwd, location.source.absoluteRef);
    const loc = getLineColLocation(location);
    const atPointer = location.pointer ? gray(`at ${location.pointer}`) : '';
    const fileWithLoc = `${relativePath}:${loc.start.line}:${loc.start.col}`;
    return (
      `[${idx + 1}] ${bgColor(fileWithLoc)} ${atPointer}\n\n` +
      `${message.message}\n\n` +
      formatDidYouMean(message) +
      getCodeframe(loc, color) +
      '\n\n' +
      formatFrom(cwd, message.from) +
      `${SEVERITY_NAMES[message.severity]} was generated by the ${blue(message.ruleId)} rule.\n\n`
    );
  }

  function shortFormatMessage(message: OnlyLineColMessage, locationPad: number, ruleIdPad: number) {
    const color = COLORS[message.severity];
    const { start } = message.location[0];
    return `  ${`${start.line}:${start.col}`.padEnd(locationPad + 2)} ${color(
      message.ruleId.padEnd(ruleIdPad),
    )} ${message.message}`;
  }
}

function formatFrom(cwd: string, location?: LocationObject) {
  if (!location) return '';
  const relativePath = path.relative(cwd, location.source.absoluteRef);
  const loc = getLineColLocation(location);
  const fileWithLoc = `${relativePath}:${loc.start.line}:${loc.start.col}`;

  return `referenced from ${blue(fileWithLoc)}\n\n`;
}

function formatDidYouMean(message: NormalizedReportMessage) {
  if (message.suggest.length === 0) return '';

  if (message.suggest.length === 1) {
    return `Did you mean: ${message.suggest[0]} ?\n\n`;
  } else {
    return `Did you mean:\n  - ${message.suggest.slice(0, MAX_SUGGEST).join('\n  - ')}\n\n`;
  }
}

type OnlyLineColMessage = Omit<NormalizedReportMessage, 'location'> & {
  location: LineColLocationObject[];
};

const groupByFiles = (messages: NormalizedReportMessage[]) => {
  const fileGroups: Record<
    string,
    {
      locationPad: number;
      ruleIdPad: number;
      fileMessages: OnlyLineColMessage[];
    }
  > = {};
  for (const message of messages) {
    const absoluteRef = message.location[0].source.absoluteRef; // TODO: multiple errors
    fileGroups[absoluteRef] = fileGroups[absoluteRef] || {
      fileMessages: [],
      ruleIdPad: 0,
      locationPad: 0,
    };

    const mappedMessage = { ...message, location: message.location.map(getLineColLocation) };
    fileGroups[absoluteRef].fileMessages.push(mappedMessage);
    fileGroups[absoluteRef].ruleIdPad = Math.max(
      message.ruleId.length,
      fileGroups[absoluteRef].ruleIdPad,
    );

    fileGroups[absoluteRef].locationPad = Math.max(
      Math.max(...mappedMessage.location.map((loc) => `${loc.start.line}:${loc.start.col}`.length)),
      fileGroups[absoluteRef].locationPad,
    );
  }

  return fileGroups;
};
