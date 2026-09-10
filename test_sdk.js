// Test pi-backend locally to see what the exact error is
import PiNetworkPkg from 'pi-backend';
const PiNetwork = PiNetworkPkg.default || PiNetworkPkg;

console.log('PiNetworkPkg type:', typeof PiNetworkPkg);
console.log('PiNetworkPkg keys:', Object.keys(PiNetworkPkg));
console.log('PiNetwork type:', typeof PiNetwork);

const apiKey = 'fnobm1afj6tpfn8ocfmv3htmnaedn5jnqf0uzylg0tf5doeuk6ajc9y7zofvhm8r';
const seed = process.argv[2];

if (!seed) {
  console.log('Pass WALLET_PRIVATE_SEED as argument: node test_sdk.js SYOURSEED');
  process.exit(1);
}

try {
  const pi = new PiNetwork(apiKey, seed);
  console.log('SDK initialized OK, type:', typeof pi);
  console.log('Methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(pi)));
  
  console.log('Checking incomplete payments...');
  const incomplete = await pi.getIncompleteServerPayments();
  console.log('Incomplete:', JSON.stringify(incomplete));

  console.log('Creating payment...');
  const paymentId = await pi.createPayment({
    amount: 1,
    memo: 'B4U Esports refund to rinzindo4ji',
    metadata: { type: 'refund' },
    uid: 'c8ade70c-7f39-4152-9b43-de252babfa80'
  });
  console.log('paymentId:', paymentId);

  const txid = await pi.submitPayment(paymentId);
  console.log('txid:', txid);

  const done = await pi.completePayment(paymentId, txid);
  console.log('DONE:', JSON.stringify(done?.status));
} catch (e) {
  console.log('Error:', e.message);
  if (e.response?.data) console.log('Pi API:', JSON.stringify(e.response.data, null, 2));
}
