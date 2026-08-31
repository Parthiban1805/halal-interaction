const fs = require('fs');
const file = 'd:\\DEVELOPMENT\\insta-crm_phase_1\\client-new\\src\\pages\\LeadsPipeline.jsx';
let content = fs.readFileSync(file, 'utf8');

const startStr = '  ) : (\n <div className="flex-1 flex gap-4 overflow-x-auto pb-4 scroll-smooth min-h-0">';
const endStr = '  )}\n\n {/* Lead details Modal */}';

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
    // We want to replace everything from startIndex up to endIndex (inclusive of the '  )}' part of endStr)
    // and replace it with just '  )}\n\n'
    // Actually, we can just replace the chunk from startIndex to endIndex (inclusive) with '' 
    // and keep the endStr. Wait, endStr ALREADY HAS `  )}\n\n {/* Lead details Modal */}`.
    // So if we just delete from startIndex to endIndex, we will have `endStr` remaining, which is exactly what we want!
    content = content.substring(0, startIndex) + content.substring(endIndex);
    fs.writeFileSync(file, content);
    console.log("Success! Replaced board view");
} else {
    console.log("Could not find start or end index", startIndex, endIndex);
}
