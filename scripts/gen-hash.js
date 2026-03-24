const bcrypt = require('bcryptjs');
bcrypt.hash('Demo@2026!', 12).then(h => {
    console.log('HASH:', h);
    // Verify it works
    bcrypt.compare('Demo@2026!', h).then(ok => {
        console.log('VERIFY:', ok);
    });
});
