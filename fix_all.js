const fs = require('fs');
const file = 'd:\\DEVELOPMENT\\insta-crm_phase_1\\client-new\\src\\pages\\LeadsPipeline.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove draggingRef
content = content.replace(/  const draggingRef = useRef\(false\);\n/, '');

// 2. Remove viewMode state
content = content.replace(/  const \[viewMode, setViewMode\] = useState\(\(\) => \{\n  return localStorage\.getItem\('leads_view_mode'\) \|\| 'list';\n  \}\);\n/, '');
content = content.replace(/  const \[draggedOverColumnId, setDraggedOverColumnId\] = useState\(null\);\n/, '');

// 3. Remove handleSetViewMode
content = content.replace(/  const handleSetViewMode = \(mode\) => \{\n  setViewMode\(mode\);\n  localStorage\.setItem\('leads_view_mode', mode\);\n  \};\n/, '');

// 4. Remove drag handlers
content = content.replace(/  \/\/ Drag and Drop handlers[\s\S]*?  const onDrop = \(e, columnId\) => \{[\s\S]*?  };\n/, '');
content = content.replace(/  const handleMove = \(lead, direction\) => \{[\s\S]*?  };\n/, '');

// 5. Remove unused imports
content = content.replace(/  ChevronRight, \n  ChevronLeft,\n  Users,\n  Copy,\n  LayoutGrid,\n  List,\n/, '');

// 6. Fix class wrapper
content = content.replace(/<div className=\{\`fade-in space-y-6 flex flex-col \$\{viewMode === 'board' \? 'h-\[calc\(100vh-100px\)\]' : ''\}\`\}>/, '<div className="fade-in space-y-6 flex flex-col">');

// 7. Remove view mode switcher
content = content.replace(/  \{\/\* View Mode Switcher \*\/\}[\s\S]*?<\/button>\n  <\/div>\n/, '');

// 8. Simplify ternary rendering
content = content.replace(/\) : viewMode === 'list' \? \(/, ') : (');

// 9. Remove board view chunk
const lines = content.split('\n');
let startIdx = -1;
let endIdx = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(') : (') && lines[i+1] && lines[i+1].includes('<div className="flex-1 flex gap-4 overflow-x-auto pb-4 scroll-smooth min-h-0">')) {
        startIdx = i;
    }
    if (lines[i].includes('{/* Lead details Modal */}')) {
        endIdx = i;
        break;
    }
}

if (startIdx !== -1 && endIdx !== -1) {
    content = [...lines.slice(0, startIdx), '  )}', '', ...lines.slice(endIdx)].join('\n');
}

// 10. Add "Last 2 Days" filter (date logic)
content = content.replace(
/      case 'last_7_days':\n        start = new Date\(now\.getFullYear\(\), now\.getMonth\(\), now\.getDate\(\) - 7\);\n        end = now;\n        break;/,
`      case 'last_2_days':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);
        end = now;
        break;
      case 'last_7_days':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        end = now;
        break;`
);

// 11. Add "Last 2 Days" to button rendering
content = content.replace(
/      datePreset === 'yesterday' \? 'Yesterday' :\n      datePreset === 'last_7_days' \? 'Last 7 Days' :/,
`      datePreset === 'yesterday' ? 'Yesterday' :
      datePreset === 'last_2_days' ? 'Last 2 Days' :
      datePreset === 'last_7_days' ? 'Last 7 Days' :`
);

// 12. Add "Last 2 Days" to presets array
content = content.replace(
/\{\[\'all\', \'today\', \'yesterday\', \'last_7_days\'/,
`{['all', 'today', 'yesterday', 'last_2_days', 'last_7_days'`
);

// 13. Add "Last 2 Days" to dropdown render
content = content.replace(
/            preset === 'yesterday' \? 'Yesterday' :\n            preset === 'last_7_days' \? 'Last 7 Days' :/,
`            preset === 'yesterday' ? 'Yesterday' :
            preset === 'last_2_days' ? 'Last 2 Days' :
            preset === 'last_7_days' ? 'Last 7 Days' :`
);

// 14. Add formatAge and getCurrentStageAge
content = content.replace(
/  \/\/ Internal Table component handles pagination in List View\n/,
`  // Internal Table component handles pagination in List View
  const formatAge = (dateString) => {
    if (!dateString) return '-';
    const diffInMs = new Date() - new Date(dateString);
    if (diffInMs < 0) return '0m';
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInHours = Math.floor((diffInMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffInMins = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffInDays > 0) {
      return \`\${diffInDays}d \${diffInHours}h\`;
    }
    if (diffInHours > 0) {
      return \`\${diffInHours}h \${diffInMins}m\`;
    }
    return \`\${diffInMins}m\`;
  };

  const getCurrentStageAge = (lead) => {
    if (!lead.statusHistory || lead.statusHistory.length === 0) {
      return formatAge(lead.createdAt);
    }
    const currentStatusEntry = [...lead.statusHistory].reverse().find(h => h.status === lead.status);
    if (currentStatusEntry) {
      return formatAge(currentStatusEntry.timestamp);
    }
    return formatAge(lead.createdAt);
  };
`
);

// 15. Add Total Age to table columns and Status aging
content = content.replace(
/ return <Badge variant=\{variant\}>\{column\?\.label \|\| lead\.status\}<\/Badge>;\n \}\n \},/,
` const stageAge = getCurrentStageAge(lead);
 return <Badge variant={variant}>{column?.label || lead.status} ({stageAge})</Badge>;
 }
 },`
);

content = content.replace(
/  \{\n  label: 'Date',\n  render: \(lead\) => \(/,
`  {
  label: 'Total Age',
  render: (lead) => (
  <span className="text-[var(--color-text-main)] text-sm font-medium">
  {formatAge(lead.createdAt)}
  </span>
  )
  },
  {
  label: 'Date',
  render: (lead) => (`
);

fs.writeFileSync(file, content);
console.log("ALL RESTORATIONS COMPLETED");
