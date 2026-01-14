import { getUncachableStripeClient } from './stripeClient';

async function updateDonationPrices() {
  const stripe = await getUncachableStripeClient();

  console.log('Finding existing donation product...');
  
  const existingProducts = await stripe.products.search({ 
    query: "metadata['app']:'go-tracker' AND metadata['type']:'donation'" 
  });

  let productId: string;

  if (existingProducts.data.length > 0) {
    productId = existingProducts.data[0].id;
    console.log(`Found existing product: ${productId}`);
    
    console.log('Deactivating old prices...');
    const oldPrices = await stripe.prices.list({ product: productId, active: true });
    for (const price of oldPrices.data) {
      await stripe.prices.update(price.id, { active: false });
      console.log(`  Deactivated: ${price.id}`);
    }
  } else {
    console.log('Creating new donation product...');
    const product = await stripe.products.create({
      name: 'Support GO Tracker',
      description: 'Thank you for supporting GO Tracker! Your donation helps keep the app free and maintained.',
      metadata: {
        app: 'go-tracker',
        type: 'donation'
      }
    });
    productId = product.id;
    console.log(`Created product: ${productId}`);
  }

  console.log('Creating new prices...');

  const prices = [
    { amount: 200, tier: 'small' },
    { amount: 500, tier: 'medium' },
    { amount: 1000, tier: 'large' },
  ];

  for (const priceInfo of prices) {
    const price = await stripe.prices.create({
      product: productId,
      unit_amount: priceInfo.amount,
      currency: 'cad',
      metadata: {
        tier: priceInfo.tier
      }
    });
    console.log(`Created price: $${(priceInfo.amount / 100).toFixed(0)} CAD (${price.id})`);
  }

  console.log('Done! Donation prices updated successfully.');
}

updateDonationPrices().catch(console.error);
