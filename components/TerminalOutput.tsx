import React from 'react';
import { TerminalLine } from '../types';

interface TerminalOutputProps {
  lines: TerminalLine[];
}

const TerminalOutput: React.FC<TerminalOutputProps> = ({ lines }) => {
  // Function to parse text and wrap content inside parentheses, special markers, or hidden markers
  const renderContent = (text: string) => {
    const parts = text.split(/(\n|\[\[HIDDEN:.*?\]\]|（[^）]*）|\([^)]*\))/g);
    return parts.map((part, index) => {
      if (!part) return null;
      if (part === '\n') return <br key={index} />;

      // Hidden marker: [[HIDDEN:...]] -> render inner text with same color as background
      const hiddenMatch = part.match(/^\[\[HIDDEN:(.*)\]\]$/s);
      if (hiddenMatch) {
        return (
          <span key={index} className="text-black">
            {hiddenMatch[1]}
          </span>
        );
      }

      // Check for full-width or half-width parentheses for monologue
      if ((part.startsWith('（') && part.endsWith('）')) || (part.startsWith('(') && part.endsWith(')'))) {
        return (
          <span key={index} className="text-blue-400 font-semibold">
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="flex flex-col space-y-1 mb-4 select-text">
      {lines.map((line) => (
        <div key={line.id} className="break-words leading-relaxed">
          {line.type === 'input' && (
            <div className="flex text-zinc-400">
              <span className="mr-2 shrink-0">[{line.path}] $</span>
              <span className="text-white">{line.content}</span>
            </div>
          )}
          {line.type === 'output' && (
            <div className="text-zinc-300 whitespace-pre-wrap ml-2">
              {renderContent(line.content)}
            </div>
          )}
          {line.type === 'system' && (
            <div className="text-yellow-500 italic ml-2">
              {line.content}
            </div>
          )}
           {line.type === 'monologue' && (
            <div className="text-blue-400 ml-2 font-semibold">
              {line.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default TerminalOutput;