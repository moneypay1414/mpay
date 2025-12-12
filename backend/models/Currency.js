import mongoose from 'mongoose';

const currencySchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true },
  symbol: { type: String, default: '' },
  // countries that belong to this tier (array of country names or ISO codes)
  countries: [{ type: String }],
  // exchange rate relative to platform base currency (e.g. SSP)
  exchangeRate: { type: Number },
  // selling price (what admin charges when users buy this currency)
  sellingPrice: { type: Number },
  // buying price (what admin pays when users sell this currency)
  buyingPrice: { type: Number },
  // price type: 'fixed' or 'percentage'
  priceType: { type: String, enum: ['fixed', 'percentage'], default: 'fixed' },
  // optional tier name
  tier: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('Currency', currencySchema);
