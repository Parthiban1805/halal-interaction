const fs = require('fs');
const file = 'd:\\DEVELOPMENT\\insta-crm_phase_1\\client-new\\src\\pages\\LeadsPipeline.jsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

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
    const newLines = [
        ...lines.slice(0, startIdx),
        '  )}',
        '',
        ...lines.slice(endIdx)
    ];
    fs.writeFileSync(file, newLines.join('\n'));
    console.log("Success with line-based removal", startIdx, endIdx);
} else {
    console.log("Failed to find boundaries", startIdx, endIdx);
}
