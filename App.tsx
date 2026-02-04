import React, { useState, useEffect, useRef } from 'react';
import { FileNode, FileType, TerminalLine, GameState } from './types';
import { INITIAL_FILE_SYSTEM } from './constants';
import TerminalOutput from './components/TerminalOutput';
import FileTree from './components/FileTree';
import { Monitor, Wifi, Battery, Clock, RotateCcw } from 'lucide-react';

const App: React.FC = () => {
  // Generate or retrieve player session ID for save isolation
  const getPlayerSessionId = () => {
    let sessionId = sessionStorage.getItem('soul_bridge_session_id');
    if (!sessionId) {
      // Generate a unique session ID for this browser tab/session
      sessionId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('soul_bridge_session_id', sessionId);
    }
    return sessionId;
  };

  const playerSessionId = getPlayerSessionId();
  const SAVE_KEY = `soul_bridge_save_${playerSessionId}`;
  const CHECKPOINT_KEY = `soul_bridge_checkpoint_${playerSessionId}`;

  // Initialize state from localStorage or defaults
  const initializeGameState = () => {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to load save data:', e);
    }
    return {
      fileSystem: INITIAL_FILE_SYSTEM,
      currentPath: [''],
      history: [],
      discoveredPaths: ['/'],
      evidenceCollected: [],
      gameState: GameState.BOOT,
      bootSequence: []
    };
  };

  const initialState = initializeGameState();

  const [fileSystem, setFileSystem] = useState<FileNode>(initialState.fileSystem);
  const [currentPath, setCurrentPath] = useState<string[]>(initialState.currentPath);
  const [history, setHistory] = useState<TerminalLine[]>(initialState.history);
  const [input, setInput] = useState('');
  const [discoveredPaths, setDiscoveredPaths] = useState<Set<string>>(new Set(initialState.discoveredPaths));
  const [passwordPrompt, setPasswordPrompt] = useState<{ active: boolean; targetNode?: FileNode; pathName?: string } | null>(null);
  const [evidenceCollected, setEvidenceCollected] = useState<Set<string>>(new Set(initialState.evidenceCollected));
  const [gameState, setGameState] = useState<GameState>(initialState.gameState);
  const [bootSequence, setBootSequence] = useState<string[]>(initialState.bootSequence);
  
  // Refs for auto-scrolling
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bootStartedRef = useRef(false);

  // Auto-save effect: save game state whenever key state changes
  useEffect(() => {
    const saveData = {
      fileSystem,
      currentPath,
      history,
      discoveredPaths: Array.from(discoveredPaths),
      evidenceCollected: Array.from(evidenceCollected),
      gameState,
      bootSequence
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    } catch (e) {
      console.warn('Failed to save game:', e);
    }
  }, [fileSystem, currentPath, history, discoveredPaths, evidenceCollected, gameState, bootSequence, SAVE_KEY]);

  // Boot Effect
  useEffect(() => {
    if (gameState === GameState.BOOT && !bootStartedRef.current) {
      bootStartedRef.current = true;
      const steps = [
        "Initializing Kernel...",
        "Loading Drivers...",
        "Mounting File System...",
        "Checking Memory...",
        "System OK.",
        "Welcome to Linux Terminal OS v0.9.2"
      ];
      let delay = 0;
      steps.forEach((step, index) => {
        delay += Math.random() * 500 + 300;
        setTimeout(() => {
          setBootSequence(prev => [...prev, step]);
          if (index === steps.length - 1) {
            setTimeout(() => setGameState(GameState.PLAYING), 800);
            addToHistory('system', "连接已建立。输入 'help' 查看命令。");
            setCurrentPath(['']);
          }
        }, delay);
      });
    }
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
    inputRef.current?.focus();
  }, [history, bootSequence, gameState]);

  // Helpers
  const addToHistory = (type: TerminalLine['type'], content: string) => {
    const currentPathString = currentPath.length === 1 ? '/' : currentPath.join('/').replace('//', '/');
    setHistory(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content,
      path: type === 'input' ? currentPathString : undefined
    }]);
  };

  const getPathString = (parts: string[]) => {
    return parts.length === 1 ? '/' : parts.join('/').replace('//', '/');
  };

  const findNode = (pathParts: string[], root: FileNode): FileNode | null => {
    if (pathParts.length === 1 && pathParts[0] === '') return root;
    let current = root;
    // Skip the first empty string if present (root)
    const parts = pathParts[0] === '' ? pathParts.slice(1) : pathParts;

    for (const part of parts) {
      if (current.type !== FileType.DIRECTORY || !current.children) return null;
      const found = current.children.find(c => c.name === part);
      if (!found) return null;
      current = found;
    }
    return current;
  };

  const updateFileSystemNode = (pathParts: string[], updates: Partial<FileNode>) => {
    const newFS = { ...fileSystem };
    let current = newFS;
    const parts = pathParts[0] === '' ? pathParts.slice(1) : pathParts;

    const target = findNode(pathParts, newFS);
    if (target) {
        Object.assign(target, updates);
        setFileSystem(newFS);
    }
  };

  const deleteNode = (name: string) => {
    const parentPath = currentPath;
    const newFS = { ...fileSystem };
    const parent = findNode(parentPath, newFS);
    if (parent && parent.children) {
      parent.children = parent.children.filter(c => c.name !== name);
      setFileSystem(newFS);
    }
  }

  const resolvePath = (target: string): string[] | null => {
    if (target === '/') return [''];
    if (target === '..') {
      if (currentPath.length <= 1) return [''];
      return currentPath.slice(0, -1);
    }
    if (target.startsWith('/')) {
      // Absolute
      return [''].concat(target.split('/').filter(p => p !== ''));
    }
    // Relative
    return [...currentPath, target];
  };

  // Handler for FileTree double-click navigation
  const handleTreeNavigate = (pathStr: string) => {
    if (!pathStr || pathStr === '/') {
      setCurrentPath(['']);
      return;
    }
    const parts = pathStr.split('/').filter(p => p !== '');
    setCurrentPath(['', ...parts]);
  };

  // Clear save data and restart game
  const handleClearSave = () => {
    if (confirm('确定要清除存档并重新开始吗？')) {
      try {
        localStorage.removeItem(SAVE_KEY);
        localStorage.removeItem(CHECKPOINT_KEY);
      } catch (e) {
        console.warn('Failed to clear save:', e);
      }
      window.location.reload();
    }
  };

  // Save checkpoint before game-ending script execution
  const saveCheckpoint = () => {
    const checkpointData = {
      fileSystem,
      currentPath,
      history,
      discoveredPaths: Array.from(discoveredPaths),
      evidenceCollected: Array.from(evidenceCollected),
      gameState: GameState.PLAYING,
      bootSequence
    };
    try {
      localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(checkpointData));
    } catch (e) {
      console.warn('Failed to save checkpoint:', e);
    }
  };

  // Restore from checkpoint (before game end)
  const restoreFromCheckpoint = () => {
    try {
      const checkpoint = localStorage.getItem(CHECKPOINT_KEY);
      if (checkpoint) {
        const data = JSON.parse(checkpoint);
        setFileSystem(data.fileSystem);
        setCurrentPath(data.currentPath);
        setHistory(data.history);
        setDiscoveredPaths(new Set(data.discoveredPaths));
        setEvidenceCollected(new Set(data.evidenceCollected));
        setGameState(GameState.PLAYING);
        setBootSequence(data.bootSequence);
      }
    } catch (e) {
      console.warn('Failed to restore checkpoint:', e);
    }
  };

  // Commands
  const handleCommand = (cmdStr: string) => {
    if (!cmdStr.trim()) return;
    addToHistory('input', cmdStr);

    // Check for password prompt interception
    if (passwordPrompt && passwordPrompt.active) {
       return; 
    }

    const parts = cmdStr.trim().split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);

    switch (cmd) {
      case 'help':
        addToHistory('output', `可用的指令:
  help                    显示所有可用指令
  ls                      列出当前目录下的所有文件
  cd 文件夹名 密码         进入指定文件夹（如果文件夹被加密，需要输入密码）
  cd ..                   回退到上一级目录
  cat 文件名 密码          查看文件内容（如果文件被加密，需要输入密码）
  search 文件名            查找隐藏文件
  rm 文件名                删除文件（仅在/home/user下生效）
  ./脚本名称.sh            运行脚本文件`);
        break;

      case 'ls': {
        const node = findNode(currentPath, fileSystem);
        if (node && node.type === FileType.DIRECTORY) {
          // Mark this path as discovered so it shows in the tree when ls is called
          setDiscoveredPaths(prev => new Set(prev).add(getPathString(currentPath)));
          
          const visibleChildren = node.children?.filter(c => !c.isHidden).map(c => {
             return c.type === FileType.DIRECTORY ? `[DIR] ${c.name}` : c.name;
          });
          
          if (!visibleChildren || visibleChildren.length === 0) {
            addToHistory('output', '(空目录)');
          } else {
            addToHistory('output', visibleChildren.join('\n'));
          }
        }
        break;
      }

      case 'cd': {
        if (!args[0]) {
           setCurrentPath(['']);
           break;
        }
        const targetPath = resolvePath(args[0]);
        if (!targetPath) {
           addToHistory('output', `无效路径: ${args[0]}`);
           break;
        }

        const targetNode = findNode(targetPath, fileSystem);
        if (!targetNode || targetNode.type !== FileType.DIRECTORY) {
          addToHistory('output', `找不到目录: ${args[0]}`);
          break;
        }
        
        if (targetNode.isHidden && !targetNode.isLocked) {
             // Hidden folders act normally if you know path
        }

        if (targetNode.password) {
           if (args[1] === targetNode.password) {
              updateFileSystemNode(targetPath, { isLocked: false, password: undefined }); // Remove password once entered successfully
              setCurrentPath(targetPath);
              // Note: We do NOT update discoveredPaths here, so it doesn't expand in tree until ls is called
           } else {
              addToHistory('output', `访问被拒绝：需要密码才能打开 ${targetNode.name}`);
           }
        } else {
          setCurrentPath(targetPath);
          // Note: We do NOT update discoveredPaths here
        }
        break;
      }

      case 'cat': {
         if (!args[0]) {
             addToHistory('output', 'Usage: cat <filename>');
             break;
         }
         // Handle absolute or relative file path
         let targetFilePath = resolvePath(args[0]);
         let fileNode = targetFilePath ? findNode(targetFilePath, fileSystem) : null;
         
         // If resolvePath returned a directory path by mistake or file doesn't exist
         if (!fileNode || fileNode.type !== FileType.FILE) {
             // Try looking in current directory strictly by name if complex path fails
             const currentNode = findNode(currentPath, fileSystem);
             fileNode = currentNode?.children?.find(c => c.name === args[0]) || null;
         }

         if (!fileNode || fileNode.type !== FileType.FILE) {
             addToHistory('output', `找不到文件: ${args[0]}`);
             break;
         }

         if (fileNode.isHidden) {
             addToHistory('output', `找不到文件: ${args[0]} (可能被隐藏)`);
             break;
         }

         // Evidence Collection Logic
         if (fileNode.isEvidence && !evidenceCollected.has(fileNode.name)) {
            setEvidenceCollected(prev => new Set(prev).add(fileNode.name));
            addToHistory('system', `证据已收集: ${fileNode.name} 已保存至 /home/user/`);
            // Add to /home/user
            const homeUser = findNode(['', 'home', 'user'], fileSystem);
            if (homeUser && homeUser.children) {
                // Check if already exists
                if (!homeUser.children.find(c => c.name === fileNode!.name)) {
                    updateFileSystemNode(['', 'home', 'user'], {
                        children: [...homeUser.children, { ...fileNode, isEvidence: false }] // Clone it
                    });
                }
            }
         }
         
         // Script Execution Logic
         if (fileNode.scriptAction) {
             executeScript(fileNode.scriptAction, args);
         } else {
             addToHistory('output', fileNode.content || '');
         }
         break;
      }

      case 'search': {
        if (!args[0]) {
          addToHistory('output', 'Usage: search <filename> or search <name1>-<name2>');
          break;
        }
        const term = args[0];
        const currentNode = findNode(currentPath, fileSystem);
        
        const found = currentNode?.children?.find(c => c.name === term);
        
        if (found) {
            if (found.isHidden) {
                // Reveal it
                const childPath = [...currentPath, found.name];
                updateFileSystemNode(childPath, { isHidden: false });
                addToHistory('system', `找到隐藏文件: ${found.name}`);
                
                // Auto-open or auto-enter based on type and password requirement
                if (found.password) {
                    addToHistory('output', `需要密码才能${found.type === FileType.DIRECTORY ? '进入' : '打开'} ${found.name}`);
                } else if (found.type === FileType.DIRECTORY) {
                    // Auto-enter directory if no password
                    setCurrentPath(childPath);
                    addToHistory('system', `已进入: ${found.name}`);
                } else if (found.type === FileType.FILE) {
                    // For script files, don't auto-execute; just show content and hint
                    if (found.scriptAction) {
                        addToHistory('output', `找到脚本文件: ${found.name}\n内容: ${found.content || '(脚本)'}\n请使用命令 ./${found.name} 来运行此脚本`);                 } else {
                        // For non-script files, show content directly
                        addToHistory('output', found.content || '');
                        // Evidence Collection Logic
                        if (found.isEvidence && !evidenceCollected.has(found.name)) {
                            setEvidenceCollected(prev => new Set(prev).add(found.name));
                            addToHistory('system', `证据已收集: ${found.name} 已保存至 /home/user/`);
                            const homeUser = findNode(['', 'home', 'user'], fileSystem);
                            if (homeUser && homeUser.children) {
                                if (!homeUser.children.find(c => c.name === found!.name)) {
                                    updateFileSystemNode(['', 'home', 'user'], {
                                        children: [...homeUser.children, { ...found, isEvidence: false }]
                                    });
                                }
                            }
                        }
                    }
                }
            } else {
                addToHistory('output', `文件 ${found.name} 已存在`);
            }
        } else {
             addToHistory('output', '无此名称的隐藏文件');
        }
        break;
      }

      case 'rm': {
        if (!args[0]) {
            addToHistory('output', 'Usage: rm <filename>');
            break;
        }
        
        // Strict Check: Only allow removal in /home/user
        const currentPathStr = getPathString(currentPath);
        if (currentPathStr !== '/home/user') {
            addToHistory('output', '权限被拒绝：rm 命令仅在 /home/user 目录中可用，用于管理证据。');
            break;
        }

        const fileName = args[0];
        const currentNode = findNode(currentPath, fileSystem);
        const fileExists = currentNode?.children?.find(c => c.name === fileName);
        
        if (fileExists) {
            deleteNode(fileName);
            // Also remove from collected evidence if it was an evidence file
            if (evidenceCollected.has(fileName)) {
                const newSet = new Set(evidenceCollected);
                newSet.delete(fileName);
                setEvidenceCollected(newSet);
            }
            addToHistory('output', `File ${fileName} deleted.`);
        } else {
            addToHistory('output', `File not found: ${fileName}`);
        }
        break;
      }

      case './伪装.sh': 
      case './报警.sh':
      case './seconddemo.sh': {
         const scriptName = cmd.replace('./', '');
         const currentNode = findNode(currentPath, fileSystem);
         const scriptNode = currentNode?.children?.find(c => c.name === scriptName);
         if (scriptNode && scriptNode.scriptAction) {
             executeScript(scriptNode.scriptAction, args);
         } else {
             addToHistory('output', `Script not found: ${scriptName}`);
         }
         break;
      }

      default:
        addToHistory('output', `Command not found: ${cmd}`);
    }
  };

  const executeScript = (action: string, args: string[]) => {
      switch (action) {
          case 'ALARM_SCRIPT':
              addToHistory('system', '正在尝试建立外部连接...');
              setTimeout(() => {
                   alert("警察：喂？哪位？\n玩家：我要报警，“未来之星”公司非法囚禁并进行人体实验！\n警察：先生，请不要开玩笑，如果你没有确凿的证据，我们将按照骚扰电话处理。\n(通话挂断)");
                   addToHistory('monologue', '（看来没有证据是行不通的，要先收集公司犯罪的证据，找到之后先放在/home/user文件夹下好了，找全之后再打包，我记得公司的数据都放在data文件夹）');
              }, 1000);
              break;
          case 'CRACK_SCRIPT':
              addToHistory('system', '正在破解...');
              setTimeout(() => {
                  alert("破解成功！\n密钥: fygr5673o");
                  addToHistory('system', '密钥: fygr5673o');
              }, 1500);
              break;
          case 'DISGUISE_SCRIPT':
              // Check evidence in /home/user
              const userFolder = findNode(['', 'home', 'user'], fileSystem);
              const userFiles = userFolder?.children?.map(c => c.name) || [];
              
              const required = ['证据_1.txt', '陈冰-刘青原', '证据_3.txt', '证据_5.txt', '证据_6.txt', '证据_8.txt']; 
              const forbidden = ['证据_4.txt', '证据_7.txt'];
              
              const hasAllRequired = required.every(f => userFiles.includes(f));
              const hasForbidden = forbidden.some(f => userFiles.includes(f));
              
              // Must have found all 6 at some point to know what to delete
              if (evidenceCollected.size < 6) {
                  addToHistory('output', '错误：证据收集不完整。检查是否多删了可用的证据碎片。');
                  return;
              }

              addToHistory('system', '正在打包并伪装数据...');
              saveCheckpoint();
              setTimeout(() => {
                  if (hasForbidden) {
                      setGameState(GameState.LOSE);
                  } else if (hasAllRequired) {
                      setGameState(GameState.WIN);
                  } else {
                      addToHistory('output', '错误：文件校验失败，关键证据丢失或文件不完整。');
                  }
              }, 2000);
              break;
      }
  }

  // Render
  if (gameState === GameState.BOOT) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center p-10 font-mono text-green-500">
        <div className="w-full max-w-2xl">
          {bootSequence.map((line, i) => (
            <div key={i} className="mb-1">{line}</div>
          ))}
          <div className="typing-caret ml-1"></div>
        </div>
      </div>
    );
  }

  if (gameState === GameState.WIN) {
      return (
          <div className="h-screen w-screen bg-zinc-900 flex items-center justify-center text-zinc-200 p-8 font-mono">
              <div className="max-w-3xl space-y-6 animate-fade-in">
                  <h1 className="text-4xl text-green-400 font-bold mb-4">HAPPY END —— 审判</h1>
                  <p>你成功将文件发送到警局。</p>
                  <p>很快，公司的真面目浮出水面，“灵魂之桥”计划只是吴天赐的敛财工具，他和想要实现“永生”的富豪合作，研发“意识上传”技术，获取大量融资，全都打进了自己的海外账户。其名下的基金会只是空壳摆设，并没有绝症患者做志愿者，因此吴天赐私下安排人将公司员工伪装成“患者”，供给科研团队做实验。</p>
                  <p>吴天赐及相关人员入狱后，“未来之星”科技有限公司宣布破产。</p>
                  <p>林墨带领科研团队重新创立了一家公司“数字生命”，继续投身于“绝症患者意识上传”的研究当中，同时，还推出新一代“智研AI”——小墨，其功能不再局限于帮助实验，是真正意义上的有“意识”的人工智能。</p>
                  <p>也许在未来，冷冻技术将不再是无奈之选，而是成为像打针吃药一样寻常的医疗选择。</p>
                  <p className="text-blue-400 mt-4">感谢游玩，期待与你的下次见面。^—^</p>
                  <div className="flex space-x-4">
                    <button onClick={restoreFromCheckpoint} className="mt-8 px-4 py-2 border border-green-500 text-green-500 hover:bg-green-500 hover:text-black transition">重启系统</button>
                    <button onClick={handleClearSave} className="mt-8 px-4 py-2 border border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black transition">清除存档</button>
                  </div>
              </div>
          </div>
      )
  }

  if (gameState === GameState.LOSE) {
    return (
        <div className="h-screen w-screen bg-zinc-950 flex items-center justify-center text-red-500 p-8 font-mono">
            <div className="max-w-3xl space-y-6">
                <h1 className="text-4xl font-bold mb-4">BAN END —— 拦截</h1>
                <p>你发送的证据文件被公司拦截。</p>
                <p>原来他们在部分文件中注入了病毒，一旦检测到病毒，不管文件伪装成什么样子都会被发现。</p>
                <p>很可惜，你失败了。</p>
                <p className="text-blue-400 mt-4">……数据已删除……</p>
                <div className="flex space-x-4">
                  <button onClick={restoreFromCheckpoint} className="mt-8 px-4 py-2 border border-red-500 hover:bg-red-500 hover:text-black transition">重启系统</button>
                  <button onClick={handleClearSave} className="mt-8 px-4 py-2 border border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black transition">清除存档</button>
                </div>
            </div>
        </div>
    )
}

  return (
    <div className="flex h-screen w-screen bg-black text-zinc-300 font-mono overflow-hidden">
      {/* Sidebar - 20% width */}
      <div className="w-1/5 h-full border-r border-zinc-800 hidden md:block">
          <FileTree root={fileSystem} currentPath={currentPath} discoveredPaths={discoveredPaths} onNavigate={handleTreeNavigate} />
      </div>

      {/* Main Terminal */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Status Bar */}
        <div className="h-8 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 text-xs text-zinc-500 select-none">
             <div className="flex items-center space-x-4">
                 <span className="flex items-center"><Monitor size={12} className="mr-1"/> terminal@escape-computer</span>
                 <span className="flex items-center"><Wifi size={12} className="mr-1"/> Connected</span>
             </div>
             <div className="flex items-center space-x-4">
                 <span className="flex items-center"><Clock size={12} className="mr-1"/> {new Date().toLocaleTimeString()}</span>
                 <span className="flex items-center"><Battery size={12} className="mr-1"/> 100%</span>
                 <button 
                   onClick={handleClearSave}
                   className="flex items-center hover:text-yellow-500 cursor-pointer transition"
                   title="Clear save and restart"
                 >
                   <RotateCcw size={12} className="mr-1"/> 重置
                 </button>
             </div>
        </div>

        {/* Commands hint box (top-right) */}
        <div className="absolute top-6 right-4 z-20 w-64 bg-zinc-900/90 border border-zinc-800 text-sm text-zinc-300 p-3 rounded-md shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-green-400 font-semibold">可用指令</span>
          </div>
          <ul className="text-xs leading-tight space-y-1">
            <li><span className="text-green-400">help</span> — 查看所有可用指令</li>
            <li><span className="text-green-400">ls</span> — 列出当前目录</li>
            <li><span className="text-green-400">cd</span> — 进入目录 / 返回上级</li>
            <li><span className="text-green-400">cat</span> — 查看文件内容</li>
            <li><span className="text-green-400">search</span> — 查找隐藏文件</li>
            <li><span className="text-green-400">rm</span> — 删除 /home/user 下的文件</li>
            <li><span className="text-green-400">./脚本.sh</span> — 运行脚本</li>
            <br />
            <li>提示：本游戏自动存档，点击右上角重置按钮可清除存档</li>
          </ul>
        </div>

        {/* Terminal Area */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar" onClick={() => inputRef.current?.focus()}>
          <TerminalOutput lines={history} />
          
          <div className="flex items-center text-zinc-300 select-text" ref={endRef}>
             <span className="text-green-500 mr-2 shrink-0">[{getPathString(currentPath)}] $</span>
             <input
               ref={inputRef}
               type="text"
               value={input}
               onChange={(e) => setInput(e.target.value)}
               onKeyDown={(e) => {
                 if (e.key === 'Enter') {
                   handleCommand(input);
                   setInput('');
                 }
               }}
               className="bg-transparent border-none outline-none flex-1 text-zinc-100 placeholder-zinc-700 select-text"
               autoFocus
               autoComplete="off"
               spellCheck="false"
             />
          </div>
          <div className="h-10"></div> 
        </div>
      </div>
    </div>
  );
};

export default App;