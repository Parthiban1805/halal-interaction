const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'cities.txt');
const outputPath = path.join(__dirname, 'city_dictionary.json');

const content = fs.readFileSync(inputPath, 'utf8');
const lines = content.split('\n').filter(line => line.trim() !== '');

const dictionary = {};

const phoneRegex = /\b\d{10}\b/;

function standardizeCity(cityRaw) {
    let cleaned = cityRaw.replace(/[^a-zA-Z\s]/g, ' ').trim().toLowerCase();
    
    const mapping = {
        'bangaalore': 'Bangalore',
        'bangalore': 'Bangalore',
        'banglore': 'Bangalore',
        'bnagalore': 'Bangalore',
        'bng': 'Bangalore',
        'blr': 'Bangalore',
        'bengaluru': 'Bangalore',
        'chennai': 'Chennai',
        'hyd': 'Hyderabad',
        'hydeerabad': 'Hyderabad',
        'hyderabaad': 'Hyderabad',
        'hyderabad': 'Hyderabad',
        'hyder': 'Hyderabad',
        'mumbai': 'Mumbai',
        'pune': 'Pune',
        'delhi': 'Delhi',
        'coimbatore': 'Coimbatore',
        'kolkata': 'Kolkata',
        'kolkatta': 'Kolkata',
        'mysore': 'Mysore',
        'mysuru': 'Mysore',
        'vijawada': 'Vijayawada',
        'vijayawada': 'Vijayawada',
        'vijaywada': 'Vijayawada',
        'vizag': 'Visakhapatnam',
        'vishakpatnam': 'Visakhapatnam',
        'ap': 'Andhra Pradesh',
        'andhra pradesh': 'Andhra Pradesh',
        'mh': 'Maharashtra',
        'maharashtra': 'Maharashtra',
        'up': 'Uttar Pradesh',
        'kerala': 'Kerala',
        'karnataka': 'Karnataka',
        'telangana': 'Telangana',
        'tamil nadu': 'Tamil Nadu'
    };

    if (mapping[cleaned]) {
        return mapping[cleaned];
    }
    
    // Capitalize first letter of each word
    return cleaned.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

lines.forEach(line => {
    let key = line.replace(/^- /, '').trim();
    if (!key) return;

    if (phoneRegex.test(key) || !isNaN(key.replace(/[-+\s]/g, ''))) {
        dictionary[key] = null;
    } else {
        // Handle multiple cities
        // Split by /, ,, and, or
        const parts = key.split(/[/,]| and | or /i);
        const standardizedCities = parts.map(part => {
            let cleanedPart = part.replace(/\(.*\)/, part.match(/\((.*?)\)/)?.[1] || part); // Handle (Bangalore)
            return standardizeCity(cleanedPart);
        }).filter(c => c && c.toLowerCase() !== 'he' && c.toLowerCase() !== 'test' && c.toLowerCase() !== 'forgot');
        
        // Remove duplicates and empty
        const uniqueCities = [...new Set(standardizedCities)].filter(Boolean);
        
        dictionary[key] = uniqueCities.length > 0 ? uniqueCities : null;
    }
});

fs.writeFileSync(outputPath, JSON.stringify(dictionary, null, 2), 'utf8');
console.log(`Dictionary created successfully at ${outputPath}`);
