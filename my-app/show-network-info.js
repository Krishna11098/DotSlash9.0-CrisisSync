const os = require('os');

function getLocalIPAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({
          name: name,
          address: iface.address
        });
      }
    }
  }

  return addresses;
}

console.log('\n🚀 XORcists Server Starting...\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('📱 TEST ON YOUR PHONE - USE THESE URLs:\n');

const addresses = getLocalIPAddresses();

if (addresses.length === 0) {
  console.log('⚠️  No network interfaces found!');
  console.log('   Make sure you\'re connected to WiFi\n');
} else {
  addresses.forEach((addr, index) => {
    console.log(`   ${index + 1}. http://${addr.address}:3000`);
    console.log(`      └─ Network: ${addr.name}\n`);
  });
}

console.log('💻 LOCAL ACCESS:\n');
console.log('   http://localhost:3000\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('📥 INSTALL APP PAGE:\n');

if (addresses.length > 0) {
  const primaryIP = addresses[0].address;
  console.log(`   👉 http://${primaryIP}:3000/install\n`);
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('✅ STEPS TO INSTALL ON PHONE:\n');
console.log('   1. Make sure phone is on SAME WiFi');
console.log('   2. Open phone browser and go to URL above');
console.log('   3. Click "INSTALL APP" button');
console.log('   4. Confirm installation');
console.log('   5. App appears on home screen!\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
