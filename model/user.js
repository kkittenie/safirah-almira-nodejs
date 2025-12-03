const mongoose = require('mongoose');

const User = mongoose.model('user', {
  username: String,
  password: String,
});

async function createDefaultAdmin() {
    const admin = await User.findOne({ username: 'admin' });

    if (!admin) {
        await User.create({
            username: 'admin',
            password: 'admin',
        });
        console.log('Default admin user created');
    } else {
        console.log('Admin already exists');
    }
}
 
createDefaultAdmin();

module.exports = User;