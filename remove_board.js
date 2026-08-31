const fs = require('fs');
const file = 'd:\\DEVELOPMENT\\insta-crm_phase_1\\client-new\\src\\pages\\LeadsPipeline.jsx';
let content = fs.readFileSync(file, 'utf8');

// Remove draggingRef
content = content.replace(/  const draggingRef = useRef\(false\);\n/, '');

// Remove viewMode and draggedOverColumnId state
content = content.replace(/  const \[viewMode, setViewMode\] = useState[\s\S]*?  const \[draggedOverColumnId, setDraggedOverColumnId\] = useState\(null\);\n/, '');

// Remove handleSetViewMode
content = content.replace(/  const handleSetViewMode[\s\S]*?localStorage\.setItem\('leads_view_mode', mode\);\n  };\n/, '');

// Remove drag and drop handlers
content = content.replace(/  \/\/ Drag and Drop handlers[\s\S]*?  const onDrop = \(e, columnId\) => \{[\s\S]*?  };\n/, '');
content = content.replace(/  const handleMove = \(lead, direction\) => \{[\s\S]*?  };\n/, '');

// Fix layout wrapper class
content = content.replace(/<div className=\{\`fade-in space-y-6 flex flex-col \$\{viewMode === 'board' \? 'h-\[calc\(100vh-100px\)\]' : ''\}\`\}>/, '<div className="fade-in space-y-6 flex flex-col">');

// Remove View Mode Switcher UI
content = content.replace(/  \{\/\* View Mode Switcher \*\/\}[\s\S]*?<\/button>\n  <\/div>\n/, '');

// Simplify ternary rendering the table vs board
content = content.replace(/\) : viewMode === 'list' \? \(/, ') : (');

// Remove the board view chunk
const rx = /\s*\) : \(\n\s*<div className="flex-1 flex gap-4 overflow-x-auto[\s\S]*?\}\)\}\n\s*<\/div>\n\s*\)\}\n/;
if (rx.test(content)) {
    content = content.replace(rx, '\n  )}\n\n');
    fs.writeFileSync(file, content);
    console.log("Successfully removed board view");
} else {
    console.log("Could not find the board view chunk to remove.");
}
