
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'cylane.database.json');
try {
    const data = fs.readFileSync(dbPath, 'utf8');
    const json = JSON.parse(data);
    
    // Find and update the specific comment
    const commentIndex = json.comment.findIndex(c => c.id === "7e677711-ee38-4f72-9eaa-1468bf2fa342");
    
    if (commentIndex !== -1) {
        // Reset report count and hidden status
        json.comment[commentIndex].value.reportCount = 0;
        json.comment[commentIndex].value.hidden = false;
        
        // Write back to file
        fs.writeFileSync(dbPath, JSON.stringify(json, null, 2));
        console.log('Successfully updated comment status: reportCount=0, hidden=false');
    } else {
        console.log('Comment not found');
    }
} catch (err) {
    console.error(err);
}
