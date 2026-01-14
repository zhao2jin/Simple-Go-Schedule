import { getUncachableStripeClient } from './stripeClient';

async function createDonationProducts() {
  const stripe = await getUncachableStripeClient();

  console.log('Checking for existing donation products...');
  
  const existingProducts = await stripe.products.search({ 
    query: "metadata['app']:'go-tracker'" 
  });

  if (existingProducts.data.length > 0) {
    console.log('Donation products already exist:');
    for (const product of existingProducts.data) {
      console.log(`  - ${product.name} (${product.id})`);
    }
    return;
  }

  console.log('Creating donation products...');

  const product = await stripe.products.create({
    name: 'Support GO Tracker',
    description: 'Thank you for supporting GO Tracker! Your donation helps keep the app free and maintained.',
    metadata: {
      app: 'go-tracker',
      type: 'donation'
    }
  });

  console.log(`Created product: ${product.id}`);

  const prices = [
    { amount: 299, name: 'Coffee' },
    { amount: 599, name: 'Lunch' },
    { amount: 999, name: 'Generous' },
  ];

  for (const priceInfo of prices) {
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: priceInfo.amount,
      currency: 'cad',
      metadata: {
        tier: priceInfo.name.toLowerCase()
      }
    });
    console.log(`Created price: $${(priceInfo.amount / 100).toFixed(2)} CAD - ${priceInfo.name} (${price.id})`);
  }

  console.log('Done! Donation products created successfully.');
}

createDonationProducts().catch(console.error);
