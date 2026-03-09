
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'cylane.database.json');
try {
    const data = fs.readFileSync(dbPath, 'utf8');
    const json = JSON.parse(data);
    console.log(JSON.stringify(json.comment, null, 2));
} catch (err) {
    console.error(err);
}
