import React from 'react';
import { FileNode, FileType } from '../types';
import { Folder, FileText, Lock, EyeOff } from 'lucide-react';

interface FileTreeProps {
  root: FileNode;
  currentPath: string[]; // Absolute path parts
  discoveredPaths: Set<string>; // Set of paths (stringified) that have been visited/ls'd
  onNavigate?: (path: string) => void;
}

const FileTreeNode: React.FC<{
  node: FileNode;
  path: string;
  level: number;
  currentPathStr: string;
  discoveredPaths: Set<string>;
  onNavigate?: (path: string) => void;
}> = ({ node, path, level, currentPathStr, discoveredPaths, onNavigate }) => {
  const isCurrent = path === currentPathStr;

  // If we haven't discovered this folder via 'ls' or 'cd', don't show children unless it's root
  const isDiscovered = discoveredPaths.has(path) || path === '/';

  // Handler for double-click: only for directories and when discovered
  const handleDoubleClick = () => {
    if (node.type === FileType.DIRECTORY && isDiscovered && onNavigate) {
      onNavigate(path);
    }
  };

  return (
    <div className="select-text">
      <div
        onDoubleClick={handleDoubleClick}
        className={`flex items-center space-x-2 py-1 px-2 rounded ${
          isCurrent ? 'bg-zinc-800 text-green-400' : 'text-zinc-500'
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {node.type === FileType.DIRECTORY ? (
          <Folder size={14} className={isCurrent ? 'fill-green-900' : ''} />
        ) : (
          <FileText size={14} />
        )}
        <span className="text-xs truncate">{node.name}</span>
        {node.isLocked && <Lock size={10} className="ml-auto opacity-50" />}
        {node.isHidden && <EyeOff size={10} className="ml-auto opacity-50" />}
      </div>

      {node.type === FileType.DIRECTORY && node.children && (
        <div className="flex flex-col">
          {/* Only show children if this directory is discovered (listed) */}
          {isDiscovered && node.children.map((child) => {
            // Do not render hidden children unless they are unhidden in state
            if (child.isHidden) return null;

            const childPath = path === '/' ? `/${child.name}` : `${path}/${child.name}`;
            return (
              <FileTreeNode
                key={childPath}
                node={child}
                path={childPath}
                level={level + 1}
                currentPathStr={currentPathStr}
                discoveredPaths={discoveredPaths}
                onNavigate={onNavigate}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

const FileTree: React.FC<FileTreeProps> = ({ root, currentPath, discoveredPaths, onNavigate }) => {
  const currentPathStr = currentPath.length === 1 ? '/' : '/' + currentPath.slice(1).join('/');

  return (
    <div className="h-full w-full bg-zinc-950 border-r border-zinc-800 flex flex-col">
      <div className="p-3 border-b border-zinc-800 bg-zinc-900/50">
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">File System</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
        <FileTreeNode
          node={root}
          path="/"
          level={0}
          currentPathStr={currentPathStr}
          discoveredPaths={discoveredPaths}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
};

export default FileTree;